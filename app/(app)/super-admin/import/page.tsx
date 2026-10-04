"use client";

import { Suspense, useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { PageHeader } from "@/components/common/page-header";
import { UrlTabs } from "@/components/common/url-tabs";
import { AppSelect } from "@/components/common/app-select";
import { EmptyState } from "@/components/common/empty-state";
import { RequirePermission } from "@/components/layout/app-shell";
import { ProgrammeImport, StudentImport, SubjectImport, TeacherImport, TemplateButton, programmeTemplate, studentTemplate, subjectTemplate, teacherTemplate } from "@/components/admin/bulk-imports";
import { CATEGORY_SHORT } from "@/lib/school-meta";
import { COUNTRIES, DEFAULT_COUNTRY, countryById, countryIdOf } from "@/lib/data/geography";
import { sessionLabel, useCurrentUser } from "@/lib/session";
import { useStore } from "@/lib/store";
import type { ID } from "@/lib/types";
import { cn } from "@/lib/utils";

type Tab = "students" | "teachers" | "subjects" | "programmes";
const TAB_PERM: Record<Tab, string> = { students: "students.import", teachers: "teachers.create", subjects: "subjects.create", programmes: "programmes.create" };

/**
 * Super Administrator bulk imports from CSV or Excel (spec section 23.1): students and teachers
 * into any school of a chosen country; programmes and subjects into that country's catalogue,
 * which its schools choose from.
 */
export default function SuperAdminImportPage() {
  return (
    <RequirePermission perm={Object.values(TAB_PERM)}>
      <Suspense>
        <UrlTabs
          tabs={[
            { value: "students", label: "Students" },
            { value: "teachers", label: "Teachers" },
            { value: "subjects", label: "Subjects" },
            { value: "programmes", label: "Programmes" },
          ]}
        >
          {(tab) => <ImportTab key={tab} tab={tab as Tab} />}
        </UrlTabs>
      </Suspense>
    </RequirePermission>
  );
}

function ImportTab({ tab }: { tab: Tab }) {
  const me = useCurrentUser();
  const schools = useStore((s) => s.schools);
  const sessions = useStore((s) => s.academicSessions);
  const years = useStore((s) => s.academicYears);
  const classes = useStore((s) => s.classes);
  // Every import starts from a country: its schools, or its own catalogue (spec section 23.1).
  const [countryId, setCountryId] = useState<ID>(DEFAULT_COUNTRY);
  const country = countryById(countryId)!;
  const [schoolId, setSchoolId] = useState<ID | undefined>();
  const [chosenSession, setChosenSession] = useState<ID | undefined>();

  const school = schools.find((s) => s.id === schoolId);
  const schoolSessions = useMemo(() => sessions.filter((s) => s.schoolId === schoolId).sort((a, b) => b.startDate.localeCompare(a.startDate)), [sessions, schoolId]);
  const sessionId = chosenSession && schoolSessions.some((s) => s.id === chosenSession) ? chosenSession : (schoolSessions.find((s) => s.status === "active") ?? schoolSessions[0])?.id;
  const sessionClasses = useMemo(() => classes.filter((c) => c.sessionId === sessionId).sort((a, b) => a.name.localeCompare(b.name)), [classes, sessionId]);
  const needsSchool = tab === "students" || tab === "teachers";
  const allowed = !!me?.can(TAB_PERM[tab]);

  const copy: Record<Tab, { title: string; text: string }> = {
    students: { title: "Import Students", text: "Choose the country and school, then upload a CSV or Excel file of its students. They're placed into the chosen session's classes by class name, and the 12-digit index number (JHS index + admission year) finds students already registered anywhere on the platform. Student IDs are generated." },
    teachers: { title: "Import Teachers", text: "Choose the country and school, then upload a CSV or Excel file of its teachers. Each is invited by email; blank staff IDs are generated. Assign subjects and classes afterwards." },
    subjects: { title: "Import Subjects", text: `Add subjects to ${country.name}'s catalogue, which every school in ${country.name} chooses from. Each country has its own catalogue; codes or names already in it are skipped as duplicates.` },
    programmes: { title: "Import Programmes", text: `Add programmes to ${country.name}'s catalogue, which every school in ${country.name} chooses from. Each country has its own catalogue; codes or names already in it are skipped as duplicates.` },
  };
  const template = () => {
    if (tab === "students") studentTemplate(sessionClasses);
    else if (tab === "teachers") teacherTemplate();
    else if (tab === "subjects") subjectTemplate();
    else programmeTemplate();
  };

  return (
    <>
      <PageHeader title={copy[tab].title} description={copy[tab].text} breadcrumbs={[{ label: "Import Data" }, { label: copy[tab].title.replace("Import ", "") }]} actions={<TemplateButton onClick={template} />} />
      {!allowed ? (
        <EmptyState title="You don't have access to this page" description="Your role doesn't include the permission needed for this page. A Super Administrator can grant it under Access Control → Permissions." />
      ) : (
        <>
          <Card className="mb-4">
            <CardContent className={cn("grid gap-4 md:items-end", tab === "students" ? "md:grid-cols-[220px_1fr_260px]" : "md:grid-cols-[220px_1fr]")}>
              <div className="space-y-2">
                <Label>Country</Label>
                <AppSelect aria-label="Country" value={countryId} onChange={(id) => (setCountryId(id), setSchoolId(undefined), setChosenSession(undefined))} options={COUNTRIES.map((c) => ({ value: c.id, label: c.name }))} />
              </div>
              {needsSchool ? (
                <div className="space-y-2">
                  <Label>School</Label>
                  <SchoolSelect countryId={countryId} value={schoolId} onChange={(id) => (setSchoolId(id), setChosenSession(undefined))} />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Imported into {country.name}&apos;s catalogue. Schools in other countries don&apos;t see these entries.</p>
              )}
                {tab === "students" && (
                  <div className="space-y-2">
                    <Label>Academic session</Label>
                    <AppSelect
                      value={sessionId}
                      onChange={setChosenSession}
                      disabled={!schoolSessions.length}
                      placeholder={school ? "No sessions yet" : "Select a school first"}
                      options={schoolSessions.map((s) => ({ value: s.id, label: `${sessionLabel(s, years.filter((y) => y.schoolId === schoolId))}${s.status === "active" ? " (active)" : ""}` }))}
                    />
                  </div>
                )}
            </CardContent>
          </Card>

          {needsSchool && !school ? (
            <EmptyState title="Choose a school" description={`Pick the school in ${country.name} the file belongs to. Records are created inside that school only.`} />
          ) : tab === "students" ? (
            <>
              {!sessionId && <p className="mb-3 text-sm text-amber-700 dark:text-amber-400">This school has no academic session yet, so students are created without a class. Place them once its sessions are set up.</p>}
              <StudentImport key={`${schoolId}:${sessionId}`} schoolId={schoolId!} sessionId={sessionId ?? null} classes={sessionClasses} viewHref={`/super-admin/users?role=student`} />
            </>
          ) : tab === "teachers" ? (
            <TeacherImport key={schoolId} schoolId={schoolId!} viewHref="/super-admin/users?role=teacher" />
          ) : tab === "subjects" ? (
            <SubjectImport key={countryId} countryId={countryId} viewHref="/super-admin/catalogue?tab=subjects" />
          ) : (
            <ProgrammeImport key={countryId} countryId={countryId} viewHref="/super-admin/catalogue?tab=programmes" />
          )}
        </>
      )}
    </>
  );
}

/** Searchable list of one country's schools (not Vacation Classes, which its coordinator manages). */
function SchoolSelect({ countryId, value, onChange }: { countryId: ID; value?: ID; onChange: (id: ID | undefined) => void }) {
  const schools = useStore((s) => s.schools);
  const [open, setOpen] = useState(false);
  const options = useMemo(() => schools.filter((s) => s.kind !== "vacation" && s.status !== "archived" && countryIdOf(s) === countryId).sort((a, b) => a.name.localeCompare(b.name)), [schools, countryId]);
  const selected = options.find((o) => o.id === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 text-left text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30"
          />
        }
      >
        <span className={cn("truncate", !selected && "text-muted-foreground")}>{selected ? `${selected.name} · ${CATEGORY_SHORT[selected.type]}` : `Search ${options.length} schools…`}</span>
        <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-(--anchor-width) min-w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder="School name, WAEC or EMIS code…" />
          <CommandList>
            <CommandEmpty>No school found.</CommandEmpty>
            <CommandGroup>
              {options.map((o) => (
                <CommandItem
                  key={o.id}
                  value={`${o.name} ${o.shortName} ${o.waecCode} ${o.emisCode}`}
                  onSelect={() => {
                    onChange(o.id);
                    setOpen(false);
                  }}
                >
                  <span className="min-w-0 flex-1 truncate">{o.name}</span>
                  <span className="text-xs text-muted-foreground">{CATEGORY_SHORT[o.type]}</span>
                  <Check className={cn("size-4", o.id === value ? "opacity-100" : "opacity-0")} />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

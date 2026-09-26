"use client";

import { useMemo, useState } from "react";
import { UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/common/page-header";
import { AppSelect } from "@/components/common/app-select";
import { EmptyState } from "@/components/common/empty-state";
import { SessionBanner, useSessionEditable } from "@/components/academic/session-banner";
import { RequirePermission } from "@/components/layout/app-shell";
import { useSchoolData } from "@/lib/queries";
import { studentName } from "@/lib/session";
import { enroll, unenroll } from "@/lib/actions";
import { cn } from "@/lib/utils";

/**
 * Student subject registration (spec §21): register an individual student,
 * an entire class, or a bulk selection; remove registrations.
 */
export default function EnrolmentsPage() {
  return (
    <RequirePermission perm="subjects.assign">
      <Enrolments />
    </RequirePermission>
  );
}

function Enrolments() {
  const d = useSchoolData();
  const editable = useSessionEditable();
  const [classId, setClassId] = useState<string>("");
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const activeClass = d.byId.class.get(classId) ?? d.classes[0];

  const roster = useMemo(
    () =>
      d.placements
        .filter((p) => p.classId === activeClass?.id)
        .map((p) => d.byId.student.get(p.studentId)!)
        .filter(Boolean)
        .sort((a, b) => a.lastName.localeCompare(b.lastName)),
    [d, activeClass],
  );
  // Subjects offered to this class = those with a teacher assigned, plus anything already registered.
  const subjects = useMemo(() => {
    const ids = new Set([...d.teachingAssignments.filter((t) => t.classId === activeClass?.id).map((t) => t.subjectId), ...d.enrollments.filter((e) => e.classId === activeClass?.id).map((e) => e.subjectId)]);
    return d.subjects.filter((s) => ids.has(s.id));
  }, [d, activeClass]);
  const enrolled = useMemo(() => new Set(d.enrollments.map((e) => `${e.studentId}:${e.subjectId}`)), [d.enrollments]);

  if (!activeClass) return <EmptyState title="No classes in this session" description="Create classes before registering students for subjects." />;
  const isOn = (sid: string, sub: string) => enrolled.has(`${sid}:${sub}`);
  const colCount = (sub: string) => roster.filter((s) => isOn(s.id, sub)).length;
  const toggle = (sid: string, sub: string, on: boolean) => {
    if (on) enroll(d.schoolId!, d.sessionId!, activeClass.id, [sid], [sub]);
    else unenroll(d.sessionId!, [sid], [sub]);
  };
  const visible = roster.filter((s) => `${s.firstName} ${s.lastName} ${s.studentNumber}`.toLowerCase().includes(q.toLowerCase()));
  const targets = picked.size ? [...picked] : roster.map((s) => s.id);

  return (
    <>
      <PageHeader title="Subject Enrolment" description={`Register ${activeClass.name} students for subjects in ${d.session.label}.`} breadcrumbs={[{ label: "Students", href: "/school/students" }, { label: "Enrolments" }]} />
      <SessionBanner />
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <AppSelect className="sm:w-56" value={activeClass.id} onChange={(v) => (setClassId(v), setPicked(new Set()))} options={d.classes.map((c) => ({ value: c.id, label: `${c.name} — ${d.byId.programme.get(c.programmeId)?.name}` }))} />
        <Input className="sm:max-w-xs" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search students" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[280px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>{activeClass.name}</CardTitle>
            <CardDescription>Register the {picked.size ? `${picked.size} selected students` : "entire class"} in one step.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {subjects.length === 0 && <p className="text-sm text-muted-foreground">No subjects assigned to this class yet — add them from the class page.</p>}
            {subjects.map((s) => {
              const n = colCount(s.id);
              const all = roster.length > 0 && n === roster.length;
              return (
                <label key={s.id} className="flex items-center gap-2.5 rounded-md px-1 py-1 text-sm">
                  <Checkbox
                    checked={all}
                    indeterminate={n > 0 && !all}
                    disabled={!editable}
                    onCheckedChange={(c) => {
                      if (c) {
                        const added = enroll(d.schoolId!, d.sessionId!, activeClass.id, targets, [s.id]);
                        toast.success(`${s.name}: ${added} registrations added`);
                      } else {
                        const removed = unenroll(d.sessionId!, targets, [s.id]);
                        toast.success(`${s.name}: ${removed} registrations removed`);
                      }
                    }}
                  />
                  <span className="size-2 rounded-full" style={{ background: s.color }} />
                  <span className="flex-1">{s.name}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {n}/{roster.length}
                  </span>
                </label>
              );
            })}
            {editable && subjects.length > 0 && (
              <div className="flex flex-wrap gap-2 border-t pt-3">
                <Button size="sm" onClick={() => toast.success(`${enroll(d.schoolId!, d.sessionId!, activeClass.id, targets, subjects.map((s) => s.id))} registrations added`)}>
                  <UserCheck /> Register all subjects
                </Button>
                <Button size="sm" variant="outline" onClick={() => toast.success(`${unenroll(d.sessionId!, targets, subjects.map((s) => s.id))} registrations removed`)}>
                  <UserX /> Remove all
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="gap-0 overflow-hidden p-0">
          {roster.length === 0 ? (
            <EmptyState title="No students in this class" className="m-4" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="sticky left-0 z-10 w-10 bg-muted/40 px-3 py-2">
                      <Checkbox checked={picked.size === roster.length} indeterminate={picked.size > 0 && picked.size < roster.length} onCheckedChange={(c) => setPicked(c ? new Set(roster.map((s) => s.id)) : new Set())} aria-label="Select all" />
                    </th>
                    <th className="sticky left-10 z-10 min-w-44 bg-muted/40 px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Student</th>
                    {subjects.map((s) => (
                      <th key={s.id} className="px-2 py-2 text-center text-xs font-medium whitespace-nowrap" title={s.name}>
                        {s.code}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visible.map((st) => (
                    <tr key={st.id} className={cn("border-t", picked.has(st.id) && "bg-accent/40")}>
                      <td className="sticky left-0 bg-card px-3 py-1.5">
                        <Checkbox checked={picked.has(st.id)} onCheckedChange={(c) => setPicked((p) => { const n = new Set(p); if (c) n.add(st.id); else n.delete(st.id); return n; })} aria-label={`Select ${studentName(st)}`} />
                      </td>
                      <td className="sticky left-10 bg-card px-3 py-1.5">
                        <p className="font-medium whitespace-nowrap">{studentName(st)}</p>
                        <p className="text-xs text-muted-foreground">{st.studentNumber}</p>
                      </td>
                      {subjects.map((s) => (
                        <td key={s.id} className="px-2 py-1.5 text-center">
                          <Checkbox checked={isOn(st.id, s.id)} disabled={!editable} onCheckedChange={(c) => toggle(st.id, s.id, !!c)} aria-label={`${studentName(st)} — ${s.name}`} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

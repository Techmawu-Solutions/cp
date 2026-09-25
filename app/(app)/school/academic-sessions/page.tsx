"use client";

import { useState } from "react";
import { CalendarPlus, CheckCircle2, Copy, Pencil, Eye } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { EmptyState } from "@/components/common/empty-state";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { AppSelect } from "@/components/common/app-select";
import { Field } from "@/components/forms/field";
import { AcademicSessionForm, suggestYear } from "@/components/academic/forms";
import { RequirePermission } from "@/components/layout/app-shell";
import { useStore } from "@/lib/store";
import { useCurrentUser, useScope } from "@/lib/session";
import { activateSession, copyStructure, createAcademicYear } from "@/lib/actions";
import { fmtDateLong } from "@/lib/helpers";
import type { AcademicSession } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Academic Session Management (spec §6). */
export default function AcademicSessionsPage() {
  return (
    <RequirePermission perm="academic_sessions.view">
      <Sessions />
    </RequirePermission>
  );
}

function Sessions() {
  const { schoolId, school, session } = useScope();
  const me = useCurrentUser();
  const db = useStore();
  const [creating, setCreating] = useState(false);
  const [activating, setActivating] = useState<AcademicSession | null>(null);
  const [editing, setEditing] = useState<AcademicSession | null>(null);
  const [copying, setCopying] = useState<AcademicSession | null>(null);
  const [copyFrom, setCopyFrom] = useState("");
  if (!schoolId || !school) return null;

  const years = session.years;
  const nextYear = years.length ? Number(years[0]!.name.slice(0, 4)) + 1 : new Date().getFullYear();
  const counts = (sid: string) => ({ classes: db.classes.filter((c) => c.sessionId === sid).length, students: db.placements.filter((p) => p.sessionId === sid).length, subjects: db.subjects.filter((s) => s.sessionId === sid).length });
  const canEdit = me?.can("academic_sessions.update");

  return (
    <>
      <PageHeader
        title="Academic Sessions"
        description={`${school.name} uses ${school.sessionStructure === "semester" ? "two semesters" : "three terms"} per academic year. Only one session is active at a time.`}
        breadcrumbs={[{ label: "Academic" }, { label: "Academic Sessions" }]}
        actions={
          me?.can("academic_sessions.create") && (
            <Button onClick={() => setCreating(true)}>
              <CalendarPlus /> New academic year
            </Button>
          )
        }
      />

      {session.active && (
        <Card className="mb-4 border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="flex flex-wrap items-center gap-x-8 gap-y-2">
            <div>
              <p className="text-xs text-muted-foreground">Current Academic Year</p>
              <p className="text-lg font-semibold">{years.find((y) => y.id === session.active!.academicYearId)?.name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Current Session</p>
              <p className="text-lg font-semibold">{session.active.name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <StatusBadge status="active" className="mt-1" />
            </div>
            <p className="text-sm text-muted-foreground sm:ml-auto">
              {fmtDateLong(session.active.startDate)} – {fmtDateLong(session.active.endDate)}
            </p>
          </CardContent>
        </Card>
      )}

      {years.length === 0 && <EmptyState title="No academic years yet" description="Create the first academic year and its semesters or terms." action={<Button onClick={() => setCreating(true)}>New academic year</Button>} />}
      <div className="space-y-4">
        {years.map((y) => (
          <Card key={y.id}>
            <CardHeader>
              <CardTitle>{y.name}</CardTitle>
              <CardDescription>
                {fmtDateLong(y.startDate)} – {fmtDateLong(y.endDate)}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {session.sessions
                .filter((s) => s.academicYearId === y.id)
                .sort((a, b) => a.startDate.localeCompare(b.startDate))
                .map((s) => {
                  const c = counts(s.id);
                  const viewing = s.id === session.current?.id;
                  return (
                    <div key={s.id} className={cn("rounded-xl border p-4", s.status === "active" && "border-emerald-500/50", viewing && "ring-2 ring-primary/30")}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold">{s.name}</p>
                        <StatusBadge status={s.status} />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {fmtDateLong(s.startDate)} – {fmtDateLong(s.endDate)}
                      </p>
                      <p className="mt-3 text-sm text-muted-foreground">
                        {c.classes} classes · {c.subjects} subjects · {c.students} students
                      </p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {!viewing && (
                          <Button size="xs" variant="outline" onClick={() => (useStore.getState().setSession(schoolId, s.id), toast.message(`Viewing ${y.name} — ${s.name}`))}>
                            <Eye /> View
                          </Button>
                        )}
                        {s.status !== "active" && me?.can("academic_sessions.activate") && (
                          <Button size="xs" onClick={() => setActivating(s)}>
                            <CheckCircle2 /> Set active
                          </Button>
                        )}
                        {canEdit && (
                          <Button size="xs" variant="ghost" onClick={() => setEditing(s)}>
                            <Pencil /> Dates
                          </Button>
                        )}
                        {canEdit && c.classes === 0 && s.status !== "closed" && (
                          <Button size="xs" variant="ghost" onClick={() => (setCopying(s), setCopyFrom(session.sessions.find((x) => x.id !== s.id && counts(x.id).classes > 0)?.id ?? ""))}>
                            <Copy /> Copy structure
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>New academic year</DialogTitle>
            <DialogDescription>Sessions are created as Upcoming. Activate one when it begins.</DialogDescription>
          </DialogHeader>
          <AcademicSessionForm
            initial={suggestYear(nextYear, school.sessionStructure)}
            takenYears={years.map((y) => y.name)}
            onCancel={() => setCreating(false)}
            onSubmit={(v) => {
              createAcademicYear(schoolId, { name: v.name, startDate: v.startDate, endDate: v.endDate, type: v.type, sessions: v.sessions });
              setCreating(false);
              toast.success(`${v.name} created with ${v.sessions.length} ${v.type === "semester" ? "semesters" : "terms"}`);
            }}
          />
        </DialogContent>
      </Dialog>

      <EditDates session={editing} onClose={() => setEditing(null)} />

      <ConfirmDialog
        open={!!activating}
        onOpenChange={(o) => !o && setActivating(null)}
        title={`Activate ${activating?.name}?`}
        description="The currently active session will be closed. Teachers and students will see this session by default."
        confirmLabel="Activate session"
        onConfirm={() => {
          if (!activating) return;
          activateSession(activating.id);
          toast.success(`${activating.name} is now the active session`);
        }}
      />

      <Dialog open={!!copying} onOpenChange={(o) => !o && setCopying(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Copy academic structure</DialogTitle>
            <DialogDescription>Copy programmes, classes, subjects and teacher assignments into {copying?.name}. Students and enrolments are not copied. The two sessions stay separate.</DialogDescription>
          </DialogHeader>
          <Field label="Copy from">
            <AppSelect
              value={copyFrom}
              onChange={setCopyFrom}
              options={session.sessions
                .filter((s) => s.id !== copying?.id && counts(s.id).classes > 0)
                .map((s) => ({ value: s.id, label: `${years.find((y) => y.id === s.academicYearId)?.name} — ${s.name} (${counts(s.id).classes} classes)` }))}
            />
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCopying(null)}>
              Cancel
            </Button>
            <Button
              disabled={!copyFrom}
              onClick={() => {
                if (!copying) return;
                const r = copyStructure(copyFrom, copying.id);
                toast.success(`Copied ${r.programmes} programmes, ${r.classes} classes and ${r.subjects} subjects`);
                setCopying(null);
              }}
            >
              Copy structure
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function EditDates({ session, onClose }: { session: AcademicSession | null; onClose: () => void }) {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [lastId, setLastId] = useState<string | null>(null);
  if (session && session.id !== lastId) {
    setLastId(session.id);
    setStart(session.startDate);
    setEnd(session.endDate);
  }
  const invalid = !start || !end || end <= start;
  return (
    <Dialog open={!!session} onOpenChange={(o) => !o && (onClose(), setLastId(null))}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {session?.name} dates</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Start date">
            <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label="End date" error={end && start && end <= start ? "Must be after the start date" : undefined}>
            <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={invalid}
            onClick={() => {
              if (!session) return;
              const st = useStore.getState();
              st.update("academicSessions", session.id, { startDate: start, endDate: end });
              st.audit({ schoolId: session.schoolId, action: "Academic session updated", target: `${session.name}: ${start} → ${end}`, category: "academic" });
              toast.success("Dates updated");
              onClose();
              setLastId(null);
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

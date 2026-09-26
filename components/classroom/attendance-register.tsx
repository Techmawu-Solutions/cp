"use client";

import { useMemo, useState } from "react";
import { CheckCheck, Save } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppSelect } from "@/components/common/app-select";
import { EmptyState } from "@/components/common/empty-state";
import { useSchoolData } from "@/lib/queries";
import { studentName } from "@/lib/session";
import { useStore } from "@/lib/store";
import { uid } from "@/lib/helpers";
import type { AttendanceStatus, SchoolClass } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUSES: { value: AttendanceStatus; label: string; short: string; cls: string }[] = [
  { value: "present", label: "Present", short: "P", cls: "bg-emerald-600 text-white" },
  { value: "late", label: "Late", short: "L", cls: "bg-amber-500 text-white" },
  { value: "absent", label: "Absent", short: "A", cls: "bg-red-600 text-white" },
  { value: "excused", label: "Excused", short: "E", cls: "bg-violet-600 text-white" },
];

/** Physical class register (spec §40). One record per student per day. */
export function AttendanceRegister({ classes, editable }: { classes: SchoolClass[]; editable: boolean }) {
  const d = useSchoolData();
  const [classId, setClassId] = useState(classes[0]?.id ?? "");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const cls = classes.find((c) => c.id === classId) ?? classes[0];
  const roster = useMemo(() => d.placements.filter((p) => p.classId === cls?.id).map((p) => d.byId.student.get(p.studentId)!).filter(Boolean).sort((a, b) => a.lastName.localeCompare(b.lastName)), [d, cls]);
  const existing = useMemo(() => new Map(d.attendance.filter((a) => a.kind === "physical" && a.classId === cls?.id && a.date.slice(0, 10) === date).map((a) => [a.studentId, a.status])), [d.attendance, cls, date]);
  const [draft, setDraft] = useState<Record<string, AttendanceStatus>>({});
  const [key, setKey] = useState("");
  if (`${cls?.id}:${date}` !== key) {
    setKey(`${cls?.id}:${date}`);
    setDraft(Object.fromEntries(existing));
  }
  if (!cls) return <EmptyState title="No classes" />;
  const marked = roster.filter((s) => draft[s.id]).length;
  const dirty = roster.some((s) => draft[s.id] && draft[s.id] !== existing.get(s.id));

  const save = () => {
    const st = useStore.getState();
    st.removeWhere("attendance", (a) => a.kind === "physical" && a.classId === cls.id && a.date.slice(0, 10) === date);
    st.insertMany(
      "attendance",
      roster.filter((s) => draft[s.id]).map((s) => ({ id: uid("att"), schoolId: cls.schoolId, sessionId: cls.sessionId, classId: cls.id, studentId: s.id, date: `${date}T07:30:00.000Z`, kind: "physical" as const, status: draft[s.id]! })),
    );
    st.audit({ schoolId: cls.schoolId, action: "Attendance recorded", target: `${cls.name} — ${date} (${marked}/${roster.length})`, category: "academic" });
    toast.success(`Attendance saved for ${cls.name}`);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        {classes.length > 1 && <AppSelect className="sm:w-48" value={cls.id} onChange={setClassId} options={classes.map((c) => ({ value: c.id, label: c.name }))} />}
        <Input type="date" value={date} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)} className="sm:w-44" />
        <div className="flex flex-wrap gap-2 sm:ml-auto">
          {editable && (
            <Button variant="outline" onClick={() => setDraft(Object.fromEntries(roster.map((s) => [s.id, draft[s.id] ?? "present"])))}>
              <CheckCheck /> Mark rest present
            </Button>
          )}
          {editable && (
            <Button onClick={save} disabled={!dirty}>
              <Save /> Save register
            </Button>
          )}
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        {marked}/{roster.length} marked · {STATUSES.map((s) => `${roster.filter((r) => draft[r.id] === s.value).length} ${s.label.toLowerCase()}`).join(" · ")}
      </p>
      <Card className="gap-0 p-0">
        <CardContent className="divide-y p-0">
          {roster.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">No students in this class.</p>}
          {roster.map((s, i) => (
            <div key={s.id} className="flex items-center gap-3 px-3 py-2 sm:px-4">
              <span className="w-6 text-xs text-muted-foreground tabular-nums">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{studentName(s)}</span>
              <div className="flex gap-1" role="radiogroup" aria-label={`Attendance for ${studentName(s)}`}>
                {STATUSES.map((st) => (
                  <button
                    key={st.value}
                    type="button"
                    role="radio"
                    aria-checked={draft[s.id] === st.value}
                    disabled={!editable}
                    title={st.label}
                    onClick={() => setDraft((x) => ({ ...x, [s.id]: st.value }))}
                    className={cn("size-8 rounded-md border text-xs font-semibold transition-colors sm:w-auto sm:px-2.5", draft[s.id] === st.value ? st.cls : "bg-background text-muted-foreground hover:bg-muted")}
                  >
                    <span className="sm:hidden">{st.short}</span>
                    <span className="hidden sm:inline">{st.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { Link2, Sparkles, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { AppSelect } from "@/components/common/app-select";
import { UserAvatar } from "@/components/common/user-avatar";
import { LinkButton } from "@/components/common/link-button";
import { VacationGuard } from "@/components/vacation/vacation-guard";
import { useSchoolData } from "@/lib/queries";
import { useStore } from "@/lib/store";
import { assignTeacher } from "@/lib/actions";
import { autoMatch, linkExistingTeacher, rankTeachers } from "@/lib/vacation";
import { teacherName } from "@/lib/session";

/** Teacher matching for vacation subject classes (spec §49.1.5). */
export default function VacationMatchingPage() {
  return (
    <VacationGuard>
      <Matching />
    </VacationGuard>
  );
}

function Matching() {
  const d = useSchoolData();
  const db = useStore();
  const [linkOpen, setLinkOpen] = useState(false);
  const rows = useMemo(() => {
    const pairs = new Map<string, number>();
    d.enrollments.forEach((e) => pairs.set(`${e.classId}:${e.subjectId}`, (pairs.get(`${e.classId}:${e.subjectId}`) ?? 0) + 1));
    return [...pairs.entries()]
      .map(([k, students]) => {
        const [classId, subjectId] = k.split(":") as [string, string];
        const ta = d.teachingAssignments.find((t) => t.classId === classId && t.subjectId === subjectId);
        return { classId, subjectId, students, teacherId: ta?.teacherId };
      })
      .sort((a, b) => Number(!!a.teacherId) - Number(!!b.teacherId) || (d.byId.class.get(a.classId)?.name ?? "").localeCompare(d.byId.class.get(b.classId)?.name ?? ""));
  }, [d]);
  const unmatched = rows.filter((r) => !r.teacherId).length;
  const load = (tid: string) => d.teachingAssignments.filter((t) => t.teacherId === tid).length;

  return (
    <>
      <PageHeader
        title="Teacher Matching"
        description="Every subject class with paid students needs a teacher. Suggestions rank teachers by specialisation, then by current load."
        breadcrumbs={[{ label: "Vacation Classes", href: "/school/vacation" }, { label: "Teacher Matching" }]}
        actions={
          <>
            <Button variant="outline" onClick={() => setLinkOpen(true)}>
              <Link2 /> Add a teacher from a school
            </Button>
            <LinkButton href="/school/teachers" variant="outline">
              <UserPlus /> New vacation teacher
            </LinkButton>
            <Button
              disabled={unmatched === 0}
              onClick={() => {
                const n = autoMatch(d.schoolId!, d.sessionId!);
                if (n) toast.success(`${n} subject classes matched`);
                else toast.message("No suitable teachers found — add a teacher with that specialisation.");
              }}
            >
              <Sparkles /> Auto-match {unmatched > 0 && `(${unmatched})`}
            </Button>
          </>
        }
      />
      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <Card className="gap-0 p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Subject class</th>
                  <th className="px-4 py-2 text-right font-medium">Students</th>
                  <th className="px-4 py-2 text-left font-medium">Teacher</th>
                  <th className="px-4 py-2 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const subject = d.byId.subject.get(r.subjectId)!;
                  const ranked = rankTeachers(db, d.schoolId!, d.sessionId!, subject.name, subject.code);
                  return (
                    <tr key={`${r.classId}:${r.subjectId}`} className="border-t">
                      <td className="px-4 py-2.5">
                        <p className="font-medium">{subject.name}</p>
                        <p className="text-xs text-muted-foreground">{d.byId.class.get(r.classId)?.name}</p>
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{r.students}</td>
                      <td className="px-4 py-2.5">
                        <AppSelect
                          className="w-64"
                          value={r.teacherId ?? ""}
                          placeholder="Choose teacher"
                          onChange={(tid) => {
                            const already = d.teachingAssignments.filter((t) => t.subjectId === r.subjectId && t.teacherId === tid).map((t) => t.classId);
                            assignTeacher(d.schoolId!, d.sessionId!, r.subjectId, tid, [...already, r.classId]);
                            toast.success(`${teacherName(d.byId.teacher.get(tid))} → ${subject.name}, ${d.byId.class.get(r.classId)?.name}`);
                          }}
                          options={ranked.map((x) => ({ value: x.teacher.id, label: `${teacherName(x.teacher)}${x.match ? " ★" : ""} · ${x.load} classes`, group: x.match ? "Suggested (specialisation match)" : "Other teachers" }))}
                        />
                      </td>
                      <td className="px-4 py-2.5">{r.teacherId ? <StatusBadge status="active">Matched</StatusBadge> : <StatusBadge tone="amber">Needs teacher</StatusBadge>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
        <Card className="self-start">
          <CardHeader>
            <CardTitle>Vacation teachers</CardTitle>
            <CardDescription>{d.teachers.length} teachers · workload this session</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {d.teachers.map((t) => {
              const u = db.users.find((x) => x.id === t.userId);
              const home = u?.schoolId !== d.schoolId ? db.schools.find((s) => s.id === u?.schoolId) : undefined;
              return (
                <div key={t.id} className="flex items-center gap-3 text-sm">
                  <UserAvatar name={`${t.firstName} ${t.lastName}`} color={u?.avatarColor} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{teacherName(t)}</p>
                    <p className="truncate text-xs text-muted-foreground">{t.specialization}</p>
                    {home && <Badge variant="secondary" className="mt-0.5 text-[10px]">From {home.shortName}</Badge>}
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums">{load(t.id)} classes</span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
      <LinkTeacherDialog open={linkOpen} onOpenChange={setLinkOpen} />
    </>
  );
}

/** Existing teachers from partner schools can teach vacation classes with the same account. */
function LinkTeacherDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const d = useSchoolData();
  const db = useStore();
  const [q, setQ] = useState("");
  const linked = new Set(d.teachers.map((t) => t.userId));
  const candidates = db.teachers.filter((t) => t.schoolId !== d.schoolId && !linked.has(t.userId) && `${t.firstName} ${t.lastName} ${t.specialization}`.toLowerCase().includes(q.toLowerCase())).slice(0, 40);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a teacher from a school</DialogTitle>
          <DialogDescription>They keep one account and switch between their school and Vacation Classes from the top bar.</DialogDescription>
        </DialogHeader>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or subject" />
        <div className="max-h-72 overflow-y-auto rounded-lg border">
          {candidates.length === 0 && <p className="p-4 text-center text-sm text-muted-foreground">No teachers found.</p>}
          {candidates.map((t) => (
            <div key={t.id} className="flex items-center gap-3 border-b px-3 py-2 last:border-0">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{teacherName(t)}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {t.specialization} · {db.schools.find((s) => s.id === t.schoolId)?.shortName}
                </p>
              </div>
              <Button size="sm" onClick={() => (linkExistingTeacher(t.userId), toast.success(`${teacherName(t)} added to Vacation Classes`))}>
                Add
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

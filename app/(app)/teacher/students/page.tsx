"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/common/page-header";
import { DataTable } from "@/components/tables/data-table";
import { SessionBanner } from "@/components/academic/session-banner";
import { GradePill, PerformanceBreakdown } from "@/components/assessment/gradebook";
import { useTeacherData } from "@/lib/teacher";
import { gradebook } from "@/lib/queries";
import { studentName, useCurrentUser } from "@/lib/session";
import { useStore } from "@/lib/store";
import { openConversation } from "@/lib/communication";
import { fmtAgo } from "@/lib/helpers";
import type { Student } from "@/lib/types";

export default function TeacherStudentsPage() {
  const t = useTeacherData();
  const me = useCurrentUser();
  const router = useRouter();
  const users = useStore((s) => s.users);
  const [open, setOpen] = useState<Student | null>(null);
  const { d } = t;
  const scores = useMemo(() => {
    const m = new Map<string, number[]>();
    t.courses.forEach((c) => gradebook(c, d).rows.forEach((r) => r.percent != null && m.set(r.student.id, [...(m.get(r.student.id) ?? []), r.percent])));
    return m;
  }, [t.courses, d]);
  const overall = (id: string) => {
    const v = scores.get(id);
    return v?.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  };
  const myCoursesFor = (s: Student) => t.courses.filter((c) => c.classId === d.classOf.get(s.id));

  return (
    <>
      <PageHeader title="Students" description="Everyone you teach this session." />
      <SessionBanner />
      <DataTable
        rows={t.students}
        search={(s) => `${s.firstName} ${s.lastName} ${s.studentNumber}`}
        onRowClick={setOpen}
        initialSort={{ key: "name", dir: "asc" }}
        filters={[{ key: "class", label: "Classes", options: [...new Set(t.courses.map((c) => c.classId))].map((id) => ({ value: id, label: d.byId.class.get(id)?.name ?? "" })), predicate: (s, v) => d.classOf.get(s.id) === v }]}
        columns={[
          { key: "name", header: "Student", sort: (s) => `${s.lastName} ${s.firstName}`, cell: (s) => <span className="font-medium">{studentName(s)}</span> },
          { key: "class", header: "Class", cell: (s) => d.byId.class.get(d.classOf.get(s.id) ?? "")?.name },
          { key: "subjects", header: "My subjects", cell: (s) => myCoursesFor(s).map((c) => d.byId.subject.get(c.subjectId)?.code).join(", ") },
          { key: "score", header: "Average", sort: (s) => overall(s.id) ?? -1, cell: (s) => { const o = overall(s.id); return o == null ? "—" : <span className="flex items-center gap-2 tabular-nums">{o.toFixed(0)}% <GradePill percent={o} /></span>; } },
          { key: "active", header: "Last active", cell: (s) => { const la = users.find((u) => u.id === s.userId)?.lastActive; return <span className="text-xs text-muted-foreground">{la ? fmtAgo(la) : "Never"}</span>; } },
        ]}
      />
      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Student Performance</DialogTitle>
            <DialogDescription>
              {studentName(open)} · {d.byId.class.get(d.classOf.get(open?.id ?? "") ?? "")?.name}
            </DialogDescription>
          </DialogHeader>
          {open &&
            myCoursesFor(open).map((c) => (
              <div key={c.id} className="rounded-lg border p-3">
                <p className="mb-2 font-medium">{d.byId.subject.get(c.subjectId)?.name}</p>
                <PerformanceBreakdown studentId={open.id} course={c} data={d} />
              </div>
            ))}
          {open && me && (
            <Button
              variant="outline"
              onClick={() => {
                const u = users.find((x) => x.id === open.userId);
                if (u) router.push(`/messages?c=${openConversation(me.user, u)}`);
              }}
            >
              <MessageSquare /> Message {open.firstName}
            </Button>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

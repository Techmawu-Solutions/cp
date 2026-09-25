"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { SessionBanner } from "@/components/academic/session-banner";
import { GradePill, PerformanceBreakdown } from "@/components/assessment/gradebook";
import { useStudentData } from "@/lib/student";
import { studentPerformance, gradeLetter } from "@/lib/queries";
import { teacherName } from "@/lib/session";
import { fmtDate } from "@/lib/helpers";

/** Student grades (spec §64 screen 40). */
export default function StudentGradesPage() {
  const s = useStudentData();
  const { d } = s;
  if (!s.student) return null;
  const rows = s.courses.map((c) => ({ c, perf: studentPerformance(s.student!.id, d.assessments.filter((a) => a.courseId === c.id), d.submissions) }));
  const graded = rows.filter((r) => r.perf.overall != null);
  const overall = graded.length ? graded.reduce((a, r) => a + r.perf.overall!, 0) / graded.length : null;

  return (
    <>
      <PageHeader title="Grades" description={d.session.label} />
      <SessionBanner />
      {overall != null && (
        <Card className="mb-4">
          <CardContent className="flex flex-wrap items-center gap-4">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Overall average</p>
              <p className="text-3xl font-semibold tabular-nums">{overall.toFixed(1)}%</p>
            </div>
            <div className="text-right">
              <GradePill percent={overall} />
              <p className="mt-1 text-xs text-muted-foreground">{gradeLetter(overall).remark}</p>
            </div>
          </CardContent>
        </Card>
      )}
      {rows.length === 0 && <EmptyState title="No subjects this session" />}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.map(({ c, perf }) => {
          const items = d.assessments
            .filter((a) => a.courseId === c.id && a.status !== "draft")
            .map((a) => ({ a, sub: d.submissions.find((x) => x.assessmentId === a.id && x.studentId === s.student!.id) }))
            .sort((x, y) => x.a.dueDate.localeCompare(y.a.dueDate));
          return (
            <Card key={c.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full" style={{ background: d.byId.subject.get(c.subjectId)?.color }} />
                  {d.byId.subject.get(c.subjectId)?.name}
                  {perf.overall != null && <span className="ml-auto flex items-center gap-2 text-base tabular-nums">{perf.overall.toFixed(0)}% <GradePill percent={perf.overall} /></span>}
                </CardTitle>
                <CardDescription>{teacherName(d.byId.teacher.get(c.teacherId))}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <PerformanceBreakdown studentId={s.student!.id} course={c} data={d} />
                <ul className="divide-y border-t text-sm">
                  {items.map(({ a, sub }) => (
                    <li key={a.id} className="flex items-center gap-2 py-1.5">
                      <span className="min-w-0 flex-1 truncate">{a.title}</span>
                      <span className="text-xs text-muted-foreground">{fmtDate(a.dueDate)}</span>
                      <span className="w-14 text-right tabular-nums">{sub?.score != null ? `${sub.score}/${a.totalMarks}` : sub ? "…" : "—"}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}

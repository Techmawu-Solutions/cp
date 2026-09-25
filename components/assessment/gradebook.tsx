"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/common/empty-state";
import { ExportButton } from "@/components/tables/export-button";
import { UsageChart } from "@/components/dashboard/charts";
import { gradebook, gradeLetter, studentPerformance, type SchoolData } from "@/lib/queries";
import { studentName } from "@/lib/session";
import { useStore } from "@/lib/store";
import { setScore } from "@/lib/actions";
import { avg } from "@/lib/helpers";
import type { Course, Student } from "@/lib/types";
import { cn } from "@/lib/utils";

const TYPE_LABEL: Record<string, string> = { assignment: "Assignment", quiz: "Quiz", test: "Test", project: "Project", examination: "Exam" };

/** Gradebook (spec §38) with class performance (spec §39). */
export function Gradebook({ course, data, editable }: { course: Course; data: Pick<SchoolData, "assessments" | "submissions" | "placements" | "byId">; editable: boolean }) {
  const gb = useMemo(() => gradebook(course, data), [course, data]);
  const [perfFor, setPerfFor] = useState<Student | null>(null);
  const percents = gb.rows.map((r) => r.percent).filter((p): p is number => p != null);
  const stats = { average: avg(percents), highest: percents.length ? Math.max(...percents) : 0, lowest: percents.length ? Math.min(...percents) : 0, pass: percents.length ? (percents.filter((p) => p >= 50).length / percents.length) * 100 : 0 };
  const distribution = ["A1", "B2", "B3", "C4", "C5", "C6", "D7", "E8", "F9"].map((g) => ({ label: g, students: percents.filter((p) => gradeLetter(p).letter === g).length }));

  if (gb.rows.length === 0) return <EmptyState title="No students in this class" />;
  if (gb.assessments.length === 0) return <EmptyState title="No assessments yet" description="Grades appear here once you create and grade assessments." />;

  const exportRows = () => gb.rows.map((r) => [r.student.studentNumber, studentName(r.student), ...r.cells.map((c) => c?.score ?? ""), r.earned, r.possible, r.percent != null ? Number(r.percent.toFixed(1)) : "", r.percent != null ? gradeLetter(r.percent).letter : ""]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Average score", value: `${stats.average.toFixed(1)}%` },
          { label: "Highest score", value: `${stats.highest.toFixed(0)}%` },
          { label: "Lowest score", value: `${stats.lowest.toFixed(0)}%` },
          { label: "Pass rate", value: `${stats.pass.toFixed(0)}%` },
        ].map((s) => (
          <Card key={s.label} size="sm" className="px-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-2xl font-semibold tabular-nums">{s.value}</p>
          </Card>
        ))}
      </div>

      <Card className="gap-0 p-0">
        <div className="flex flex-wrap items-center gap-2 border-b p-3 print:hidden">
          <p className="flex-1 text-sm text-muted-foreground">{editable ? "Click a score to edit it. Totals and grades update instantly." : "Scores are read-only."}</p>
          <ExportButton
            print
            filename={`gradebook-${course.title.replace(/\W+/g, "-")}`}
            header={["Student ID", "Student", ...gb.assessments.map((a) => `${a.title} (/${a.totalMarks})`), "Total", "Out of", "%", "Grade"]}
            rows={exportRows}
            onExported={(f) => useStore.getState().audit({ schoolId: course.schoolId, action: "Grade exported", target: `${course.title} gradebook (${f === "excel" ? "Excel" : "CSV"})`, category: "assessment" })}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="sticky left-0 z-10 min-w-44 bg-muted/40 px-3 py-2 text-left font-medium uppercase">Student</th>
                {gb.assessments.map((a) => (
                  <th key={a.id} className="min-w-24 px-2 py-2 text-right font-medium" title={a.title}>
                    <span className="block text-[10px] tracking-wide uppercase">{TYPE_LABEL[a.type]}</span>
                    <span className="block max-w-28 truncate normal-case">{a.title.replace(/^(Assignment|Quiz) \d+ — /, "")}</span>
                    <span className="font-normal">/{a.totalMarks}</span>
                  </th>
                ))}
                <th className="px-3 py-2 text-right font-medium uppercase">Total</th>
                <th className="px-3 py-2 text-right font-medium uppercase">%</th>
                <th className="px-3 py-2 text-center font-medium uppercase">Grade</th>
              </tr>
            </thead>
            <tbody>
              {gb.rows.map((r) => (
                <tr key={r.student.id} className="border-t hover:bg-muted/30">
                  <td className="sticky left-0 bg-card px-3 py-1.5">
                    <button className="text-left font-medium hover:underline" onClick={() => setPerfFor(r.student)}>
                      {studentName(r.student)}
                    </button>
                  </td>
                  {gb.assessments.map((a, i) => (
                    <td key={a.id} className="px-2 py-1 text-right">
                      <ScoreCell value={r.cells[i]?.score ?? null} max={a.totalMarks} editable={editable} pending={r.cells[i]?.status === "submitted" || r.cells[i]?.status === "late"} onChange={(v) => setScore(a, r.student.id, v)} />
                    </td>
                  ))}
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    {r.earned}
                    <span className="text-muted-foreground">/{r.possible}</span>
                  </td>
                  <td className="px-3 py-1.5 text-right font-semibold tabular-nums">{r.percent != null ? r.percent.toFixed(0) : "—"}</td>
                  <td className="px-3 py-1.5 text-center">{r.percent != null && <GradePill percent={r.percent} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Grade distribution</CardTitle>
          <CardDescription>WAEC grading bands</CardDescription>
        </CardHeader>
        <CardContent>
          <UsageChart data={distribution} series={[{ key: "students", label: "Students" }]} height={200} />
        </CardContent>
      </Card>

      <Dialog open={!!perfFor} onOpenChange={(o) => !o && setPerfFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Student Performance</DialogTitle>
            <DialogDescription>
              {studentName(perfFor)} · {course.title}
            </DialogDescription>
          </DialogHeader>
          {perfFor && <PerformanceBreakdown studentId={perfFor.id} course={course} data={data} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function PerformanceBreakdown({ studentId, course, data }: { studentId: string; course: Course; data: Pick<SchoolData, "assessments" | "submissions"> }) {
  const perf = studentPerformance(studentId, data.assessments.filter((a) => a.courseId === course.id), data.submissions);
  const rows = Object.entries(perf.byType);
  if (!rows.length) return <p className="text-sm text-muted-foreground">No graded work yet.</p>;
  return (
    <div className="space-y-3">
      {rows.map(([type, pct]) => (
        <div key={type}>
          <div className="mb-1 flex justify-between text-sm">
            <span>{TYPE_LABEL[type]}s</span>
            <span className="font-medium tabular-nums">{pct.toFixed(0)}%</span>
          </div>
          <Progress value={pct} />
        </div>
      ))}
      {perf.overall != null && (
        <div className="flex items-center justify-between border-t pt-3">
          <span className="font-medium">Overall</span>
          <span className="flex items-center gap-2 text-lg font-semibold tabular-nums">
            {perf.overall.toFixed(0)}% <GradePill percent={perf.overall} />
          </span>
        </div>
      )}
    </div>
  );
}

export function GradePill({ percent }: { percent: number }) {
  const g = gradeLetter(percent);
  const tone = percent >= 70 ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : percent >= 50 ? "bg-blue-500/12 text-blue-700 dark:text-blue-300" : percent >= 40 ? "bg-amber-500/15 text-amber-800 dark:text-amber-300" : "bg-red-500/12 text-red-700 dark:text-red-300";
  return <span className={cn("inline-block rounded px-1.5 py-0.5 text-xs font-semibold", tone)} title={g.remark}>{g.letter}</span>;
}

function ScoreCell({ value, max, editable, pending, onChange }: { value: number | null; max: number; editable: boolean; pending?: boolean; onChange: (v: number | null) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  if (!editable || !editing)
    return (
      <button
        type="button"
        disabled={!editable}
        onClick={() => (setDraft(value == null ? "" : String(value)), setEditing(true))}
        className={cn("w-full rounded px-1.5 py-1 text-right tabular-nums", editable && "hover:bg-accent", value == null && "text-muted-foreground")}
        title={pending ? "Submitted — awaiting grading" : undefined}
      >
        {value ?? (pending ? <span className="text-xs text-amber-600">to grade</span> : "—")}
      </button>
    );
  const commit = () => {
    setEditing(false);
    if (draft.trim() === "") return value !== null && onChange(null);
    const n = Number(draft);
    if (Number.isNaN(n) || n < 0 || n > max) return toast.error(`Score must be between 0 and ${max}`);
    if (n !== value) onChange(n);
  };
  return (
    <input
      autoFocus
      inputMode="decimal"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") setEditing(false);
      }}
      className="w-16 rounded border border-primary bg-background px-1.5 py-0.5 text-right tabular-nums outline-none"
      aria-label="Score"
    />
  );
}

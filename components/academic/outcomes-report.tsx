"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpenCheck, CircleDashed, ListChecks, Target, UserCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { StatCard } from "@/components/dashboard/stat-card";
import { StatusBadge } from "@/components/common/status-badge";
import { EmptyState } from "@/components/common/empty-state";
import { DataTable } from "@/components/tables/data-table";
import { ExportButton } from "@/components/tables/export-button";
import { useStore } from "@/lib/store";
import { OUTCOME_LABEL, outcomeCoverage, teacherState, type LessonRow } from "@/lib/outcomes";
import { fmtAgo, fmtDate } from "@/lib/helpers";
import type { Course } from "@/lib/types";

const STATUS_TONE = { complete: "green", partial: "amber", missing: "red" } as const;

/**
 * Which teachers have written learning outcomes and indicators for their
 * lessons (spec §25.2). Used by school administrators (their school, the
 * session being viewed) and the Super Administrator (every school's active
 * session). Lesson content itself isn't shown — only whether it's been written.
 */
export function OutcomesReport({ courses, showSchool, lessonHref }: { courses: Course[]; showSchool?: boolean; lessonHref?: (row: LessonRow) => string }) {
  const teachers = useStore((s) => s.teachers);
  const contents = useStore((s) => s.contents);
  const schools = useStore((s) => s.schools);
  const modules = useStore((s) => s.modules);
  const [picked, setPicked] = useState<string | null>(null);
  const { teachers: rows, lessons } = outcomeCoverage({ teachers, contents }, courses);
  const school = (id: string) => schools.find((x) => x.id === id)?.shortName ?? "";
  const total = lessons.length;
  const complete = lessons.filter((l) => l.status === "complete").length;
  const partial = lessons.filter((l) => l.status === "partial").length;
  const missing = total - complete - partial;
  const doneTeachers = rows.filter((r) => r.lessons > 0 && r.complete === r.lessons).length;
  const withLessons = rows.filter((r) => r.lessons > 0).length;
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);
  const chosen = rows.find((r) => r.teacherId === picked);
  const chosenLessons = chosen ? lessons.filter((l) => l.course.teacherId === chosen.teacherId).sort((a, b) => a.course.title.localeCompare(b.course.title) || a.item.order - b.item.order) : [];
  const moduleTitle = (id: string) => modules.find((m) => m.id === id)?.title ?? "";

  if (!courses.length) return <EmptyState icon={Target} title="No courses in this session" description="Courses and their lessons appear here once teachers are assigned." />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Lessons" value={total} icon={BookOpenCheck} hint={`${rows.length} teachers · ${courses.length} courses`} />
        <StatCard label="Outcomes and indicators" value={`${pct(complete)}%`} icon={ListChecks} tone="green" hint={`${complete} of ${total} lessons`} />
        <StatCard label="Outcomes only" value={partial} icon={Target} tone="amber" hint="Indicators still to add" />
        <StatCard label="Not added" value={missing} icon={CircleDashed} tone="rose" hint={`${withLessons - doneTeachers} teachers still to finish · ${doneTeachers} complete`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Teachers</CardTitle>
          <CardDescription>Select a teacher to see each lesson. Outcomes and indicators are for staff only; students never see them.</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            rows={rows.map((r) => ({ ...r, id: r.teacherId }))}
            search={(r) => `${r.name} ${school(r.schoolId)}`}
            searchPlaceholder="Search teacher…"
            initialSort={{ key: "pct", dir: "asc" }}
            onRowClick={(r) => setPicked(r.teacherId === picked ? null : r.teacherId)}
            filters={[
              { key: "state", label: "Statuses", options: ["Complete", "In progress", "Not started"].map((v) => ({ value: v, label: v })), predicate: (r, v) => teacherState(r).label === v },
              ...(showSchool ? [{ key: "school", label: "Schools", options: [...new Set(rows.map((r) => r.schoolId))].map((id) => ({ value: id, label: schools.find((s) => s.id === id)?.name ?? id })), predicate: (r: { schoolId: string }, v: string) => r.schoolId === v }] : []),
            ]}
            toolbar={
              <ExportButton
                filename="learning-outcomes-by-teacher"
                header={["Teacher", ...(showSchool ? ["School"] : []), "Courses", "Lessons", "Outcomes and indicators", "Outcomes only", "Not added", "Complete %", "Status", "Last updated"]}
                rows={() => rows.map((r) => [r.name, ...(showSchool ? [school(r.schoolId)] : []), r.courses, r.lessons, r.complete, r.partial, r.missing, r.percent, teacherState(r).label, r.lastUpdated ? r.lastUpdated.slice(0, 10) : ""])}
              />
            }
            columns={[
              { key: "name", header: "Teacher", sort: (r) => r.name, cell: (r) => (<div><p className="font-medium">{r.name}</p>{showSchool && <p className="text-xs text-muted-foreground">{school(r.schoolId)}</p>}</div>) },
              { key: "lessons", header: "Lessons", sort: (r) => r.lessons, cell: (r) => r.lessons, className: "tabular-nums" },
              { key: "complete", header: "Done", sort: (r) => r.complete, cell: (r) => r.complete, className: "tabular-nums" },
              { key: "partial", header: "Outcomes only", sort: (r) => r.partial, cell: (r) => r.partial, className: "tabular-nums" },
              { key: "missing", header: "Not added", sort: (r) => r.missing, cell: (r) => r.missing, className: "tabular-nums" },
              { key: "pct", header: "Complete", sort: (r) => r.percent, cell: (r) => (<div className="flex min-w-32 items-center gap-2"><Progress value={r.percent} className="h-2 flex-1" /><span className="w-9 text-right text-xs tabular-nums">{r.percent}%</span></div>) },
              { key: "state", header: "Status", sort: (r) => teacherState(r).label, cell: (r) => { const s = teacherState(r); return <StatusBadge tone={s.tone}>{s.label}</StatusBadge>; } },
              { key: "updated", header: "Last updated", sort: (r) => r.lastUpdated ?? "", cell: (r) => (r.lastUpdated ? <span className="text-xs whitespace-nowrap text-muted-foreground" title={fmtDate(r.lastUpdated)}>{fmtAgo(r.lastUpdated)}</span> : "—") },
            ]}
          />
        </CardContent>
      </Card>

      {chosen && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="size-5" /> {chosen.name}
            </CardTitle>
            <CardDescription>
              {chosen.complete} of {chosen.lessons} lessons have outcomes and indicators{showSchool ? ` · ${school(chosen.schoolId)}` : ""}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              rows={chosenLessons.map((l) => ({ ...l, id: l.item.id }))}
              search={(l) => `${l.item.title} ${l.course.title}`}
              searchPlaceholder="Search lesson…"
              filters={[{ key: "status", label: "Statuses", options: (["missing", "partial", "complete"] as const).map((v) => ({ value: v, label: OUTCOME_LABEL[v] })), predicate: (l, v) => l.status === v }]}
              toolbar={<ExportButton filename={`learning-outcomes-${chosen.name.replace(/\W+/g, "-")}`} header={["Course", "Section", "Lesson", "Status", "Outcomes", "Indicators", "Updated"]} rows={() => chosenLessons.map((l) => [l.course.title, moduleTitle(l.item.moduleId), l.item.title, OUTCOME_LABEL[l.status], l.item.learningOutcomes?.length ?? 0, l.item.learningIndicators?.length ?? 0, l.item.outcomesUpdatedAt?.slice(0, 10) ?? ""])} />}
              columns={[
                { key: "course", header: "Course", sort: (l) => l.course.title, cell: (l) => (<div><p>{l.course.title}</p><p className="text-xs text-muted-foreground">{moduleTitle(l.item.moduleId)}</p></div>) },
                { key: "lesson", header: "Lesson", sort: (l) => l.item.title, cell: (l) => (lessonHref ? <Link href={lessonHref(l)} className="font-medium hover:underline" onClick={(e) => e.stopPropagation()}>{l.item.title}</Link> : <span className="font-medium">{l.item.title}</span>) },
                { key: "status", header: "Status", sort: (l) => l.status, cell: (l) => <StatusBadge tone={STATUS_TONE[l.status]}>{OUTCOME_LABEL[l.status]}</StatusBadge> },
                { key: "counts", header: "Written", cell: (l) => <span className="text-xs text-muted-foreground tabular-nums">{l.item.learningOutcomes?.length ?? 0} outcomes · {l.item.learningIndicators?.length ?? 0} indicators</span> },
                { key: "updated", header: "Updated", sort: (l) => l.item.outcomesUpdatedAt ?? "", cell: (l) => (l.item.outcomesUpdatedAt ? <span className="text-xs whitespace-nowrap text-muted-foreground">{fmtAgo(l.item.outcomesUpdatedAt)}</span> : "—") },
              ]}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

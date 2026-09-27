"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/tables/data-table";
import { ExportButton } from "@/components/tables/export-button";
import { StatusBadge } from "@/components/common/status-badge";
import { StudentName, studentUsername } from "@/components/common/student-name";
import { useSchoolData } from "@/lib/queries";
import { useStore } from "@/lib/store";
import { packageResult } from "@/lib/scorm/attempts";
import { fmtDateTime } from "@/lib/helpers";
import type { ContentItem, Student } from "@/lib/types";

const TONE: Record<string, "green" | "red" | "amber" | "gray" | "blue"> = { Passed: "green", Completed: "green", Failed: "red", "In progress": "amber", "Not started": "gray" };
const mins = (s: number) => (s ? `${Math.max(1, Math.round(s / 60))} min` : "—");

/** Per-learner SCORM results for teachers (spec §26.2): status, score, time, last activity. */
export function ScormResults({ item }: { item: ContentItem }) {
  const d = useSchoolData();
  const attempts = useStore((s) => s.scormAttempts);
  const users = useStore((s) => s.users);
  const course = d.byId.course.get(item.courseId);
  const roster = d.students.filter((s) => d.enrollments.some((e) => e.studentId === s.id && e.classId === course?.classId && e.subjectId === course?.subjectId));
  const rows = roster.map((s) => ({ id: s.id, student: s, ...packageResult(item, attempts.filter((a) => a.contentId === item.id && a.studentId === s.id)) }));
  const done = rows.filter((r) => r.status === "Completed" || r.status === "Passed").length;
  const name = (s: Student) => `${s.firstName} ${s.lastName}`;

  return (
    <Card className="mx-auto mt-6 max-w-4xl">
      <CardHeader>
        <CardTitle>Learner results</CardTitle>
        <CardDescription>
          {done} of {rows.length} students completed · recorded from the package through the SCORM run-time ({item.scorm?.versionLabel})
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DataTable
          rows={rows}
          search={(r) => `${name(r.student)} ${r.student.schoolUsername ?? ""}`}
          searchPlaceholder="Search student…"
          initialSort={{ key: "student", dir: "asc" }}
          toolbar={
            <ExportButton
              filename={`scorm-results-${item.title.replace(/\W+/g, "-")}`}
              header={["Student", "Username", "Status", "Score %", "Time (min)", "Last activity", "Completed"]}
              rows={() => rows.map((r) => [name(r.student), studentUsername({ users, students: [] }, r.student) ?? "", r.status, r.scorePercent ?? "", Math.round(r.totalSeconds / 60), r.lastActivity ?? "", r.completedAt ?? ""])}
            />
          }
          columns={[
            { key: "student", header: "Student", sort: (r) => `${r.student.lastName} ${r.student.firstName}`, cell: (r) => <StudentName student={r.student} /> },
            { key: "status", header: "Status", sort: (r) => r.status, cell: (r) => <StatusBadge tone={TONE[r.status] ?? "gray"}>{r.status}</StatusBadge> },
            { key: "score", header: "Score", sort: (r) => r.scorePercent ?? -1, cell: (r) => (r.scorePercent != null ? `${r.scorePercent}%` : "—"), className: "tabular-nums" },
            { key: "time", header: "Time", sort: (r) => r.totalSeconds, cell: (r) => mins(r.totalSeconds), className: "tabular-nums" },
            { key: "last", header: "Last activity", sort: (r) => r.lastActivity ?? "", cell: (r) => (r.lastActivity ? <span className="text-xs whitespace-nowrap">{fmtDateTime(r.lastActivity)}</span> : "—") },
          ]}
        />
      </CardContent>
    </Card>
  );
}

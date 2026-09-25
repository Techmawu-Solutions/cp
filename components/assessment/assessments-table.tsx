"use client";

import { DataTable } from "@/components/tables/data-table";
import { StatusBadge } from "@/components/common/status-badge";
import { useStore } from "@/lib/store";
import { fmtDateTime } from "@/lib/helpers";
import type { Assessment } from "@/lib/types";

export const ASSESSMENT_TYPES: { value: Assessment["type"]; label: string }[] = [
  { value: "quiz", label: "Quiz" },
  { value: "assignment", label: "Assignment" },
  { value: "test", label: "Test" },
  { value: "project", label: "Project" },
  { value: "examination", label: "Examination" },
];

export function AssessmentsTable({ rows, showSchool, onRowClick }: { rows: Assessment[]; showSchool?: boolean; onRowClick?: (a: Assessment) => void }) {
  const db = useStore();
  const subs = (id: string) => db.submissions.filter((s) => s.assessmentId === id);
  const cls = (id: string) => db.classes.find((c) => c.id === id)?.name;
  const subject = (id: string) => db.subjects.find((s) => s.id === id)?.name;
  const teacher = (id: string) => {
    const t = db.teachers.find((x) => x.id === id);
    return t ? `${t.title} ${t.lastName}` : "";
  };
  return (
    <DataTable
      rows={rows}
      onRowClick={onRowClick}
      search={(a) => `${a.title} ${subject(a.subjectId)} ${cls(a.classId)}`}
      initialSort={{ key: "due", dir: "desc" }}
      filters={[
        { key: "type", label: "Types", options: ASSESSMENT_TYPES, predicate: (a, v) => a.type === v },
        { key: "status", label: "Statuses", options: ["draft", "published", "closed"].map((s) => ({ value: s, label: s[0]!.toUpperCase() + s.slice(1) })), predicate: (a, v) => a.status === v },
      ]}
      emptyTitle="No assessments"
      columns={[
        { key: "title", header: "Assessment", sort: (a) => a.title, cell: (a) => (<div><p className="font-medium">{a.title}</p><p className="text-xs text-muted-foreground">{subject(a.subjectId)} — {cls(a.classId)}</p></div>) },
        { key: "type", header: "Type", sort: (a) => a.type, cell: (a) => ASSESSMENT_TYPES.find((t) => t.value === a.type)?.label },
        { key: "teacher", header: "Teacher", cell: (a) => teacher(a.teacherId) },
        ...(showSchool ? [{ key: "school", header: "School", cell: (a: Assessment) => db.schools.find((s) => s.id === a.schoolId)?.shortName }] : []),
        { key: "marks", header: "Marks", cell: (a) => a.totalMarks, className: "tabular-nums" },
        { key: "due", header: "Due", sort: (a) => a.dueDate, cell: (a) => <span className="whitespace-nowrap">{fmtDateTime(a.dueDate)}</span> },
        { key: "subs", header: "Submitted", sort: (a) => subs(a.id).length, cell: (a) => { const s = subs(a.id); return <span className="tabular-nums">{s.length} <span className="text-muted-foreground">({s.filter((x) => x.status === "graded").length} graded)</span></span>; } },
        { key: "status", header: "Status", sort: (a) => a.status, cell: (a) => <StatusBadge status={a.status} /> },
      ]}
    />
  );
}

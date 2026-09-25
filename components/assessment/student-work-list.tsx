"use client";

import { useRouter } from "next/navigation";
import { CircleHelp, NotebookPen, ClipboardCheck } from "lucide-react";
import { DataTable } from "@/components/tables/data-table";
import { StatusBadge, type Tone } from "@/components/common/status-badge";
import { GradePill } from "@/components/assessment/gradebook";
import { ASSESSMENT_TYPES } from "@/components/assessment/assessments-table";
import { useStudentData, type WorkState } from "@/lib/student";
import { fmtAgo, fmtDateTime } from "@/lib/helpers";
import type { Assessment } from "@/lib/types";

const STATE: Record<WorkState, { label: string; tone: Tone }> = {
  todo: { label: "To do", tone: "blue" },
  overdue: { label: "Overdue", tone: "red" },
  submitted: { label: "Submitted", tone: "violet" },
  graded: { label: "Graded", tone: "green" },
  missed: { label: "Missed", tone: "gray" },
};

export function StudentWorkList({ assessments }: { assessments: Assessment[] }) {
  const s = useStudentData();
  const router = useRouter();
  const order: WorkState[] = ["overdue", "todo", "submitted", "graded", "missed"];
  return (
    <DataTable
      rows={assessments}
      search={(a) => a.title}
      onRowClick={(a) => router.push(`/student/assessments/${a.id}`)}
      initialSort={{ key: "state", dir: "asc" }}
      filters={[{ key: "state", label: "Statuses", options: order.map((o) => ({ value: o, label: STATE[o].label })), predicate: (a, v) => s.stateOf(a) === v }]}
      emptyTitle="Nothing assigned yet"
      columns={[
        {
          key: "title",
          header: "Title",
          sort: (a) => a.title,
          cell: (a) => {
            const Icon = a.type === "quiz" ? CircleHelp : a.type === "assignment" ? NotebookPen : ClipboardCheck;
            return (
              <span className="flex items-center gap-2">
                <Icon className="size-4 shrink-0 text-muted-foreground" />
                <span>
                  <span className="block font-medium">{a.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {s.d.byId.subject.get(a.subjectId)?.name} · {ASSESSMENT_TYPES.find((t) => t.value === a.type)?.label}
                  </span>
                </span>
              </span>
            );
          },
        },
        { key: "due", header: "Due", sort: (a) => a.dueDate, cell: (a) => (<span className="whitespace-nowrap"><span className="block">{fmtDateTime(a.dueDate)}</span><span className="text-xs text-muted-foreground">{fmtAgo(a.dueDate)}</span></span>) },
        { key: "marks", header: "Marks", cell: (a) => a.totalMarks, className: "tabular-nums" },
        { key: "state", header: "Status", sort: (a) => order.indexOf(s.stateOf(a)), cell: (a) => { const st = STATE[s.stateOf(a)]; return <StatusBadge tone={st.tone}>{st.label}</StatusBadge>; } },
        { key: "score", header: "Score", cell: (a) => { const sub = s.submissionFor(a); return sub?.score != null ? <span className="flex items-center gap-2 tabular-nums">{sub.score}/{a.totalMarks} <GradePill percent={(sub.score / a.totalMarks) * 100} /></span> : "—"; } },
      ]}
    />
  );
}

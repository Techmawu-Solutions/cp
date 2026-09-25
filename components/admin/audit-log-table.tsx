"use client";

import { DataTable } from "@/components/tables/data-table";
import { ExportButton } from "@/components/tables/export-button";
import { StatusBadge, type Tone } from "@/components/common/status-badge";
import { useStore } from "@/lib/store";
import { fmtDateTime } from "@/lib/helpers";
import type { AuditLog } from "@/lib/types";

const CATEGORY_TONE: Record<AuditLog["category"], Tone> = { school: "blue", user: "violet", academic: "green", rbac: "red", lms: "blue", assessment: "amber", live: "red", system: "gray" };

/** Audit trail (spec §50). */
export function AuditLogTable({ logs, showSchool }: { logs: AuditLog[]; showSchool?: boolean }) {
  const schools = useStore((s) => s.schools);
  const school = (id: string | null) => (id ? schools.find((s) => s.id === id)?.shortName ?? "—" : "Platform");
  return (
    <DataTable
      rows={logs}
      pageSize={25}
      search={(l) => `${l.actorName} ${l.action} ${l.target}`}
      searchPlaceholder="Search actor, action or target…"
      initialSort={{ key: "at", dir: "desc" }}
      filters={[
        { key: "cat", label: "Categories", options: Object.keys(CATEGORY_TONE).map((c) => ({ value: c, label: c === "rbac" ? "Access control" : c[0]!.toUpperCase() + c.slice(1) })), predicate: (l, v) => l.category === v },
        { key: "range", label: "Time", options: [{ value: "1", label: "Last 24 hours" }, { value: "7", label: "Last 7 days" }, { value: "30", label: "Last 30 days" }], predicate: (l, v) => Date.now() - Date.parse(l.at) < Number(v) * 86_400_000 },
      ]}
      toolbar={<ExportButton filename="audit-log" header={["Time", "Actor", "Action", "Target", "School", "Category"]} rows={() => logs.map((l) => [l.at, l.actorName, l.action, l.target, school(l.schoolId), l.category])} />}
      dense
      columns={[
        { key: "at", header: "Time", sort: (l) => l.at, cell: (l) => <span className="whitespace-nowrap tabular-nums">{fmtDateTime(l.at)}</span> },
        { key: "actor", header: "Actor", sort: (l) => l.actorName, cell: (l) => l.actorName },
        { key: "action", header: "Action", sort: (l) => l.action, cell: (l) => <span className="font-medium">{l.action}</span> },
        { key: "target", header: "Target", cell: (l) => <span className="text-muted-foreground">{l.target}</span> },
        ...(showSchool ? [{ key: "school", header: "School", sort: (l: AuditLog) => school(l.schoolId), cell: (l: AuditLog) => school(l.schoolId) }] : []),
        { key: "cat", header: "Category", cell: (l) => <StatusBadge tone={CATEGORY_TONE[l.category]} dot={false}>{l.category === "rbac" ? "Access control" : l.category}</StatusBadge> },
      ]}
    />
  );
}

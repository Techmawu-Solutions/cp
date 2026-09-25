"use client";

import { useRouter } from "next/navigation";
import { DataTable } from "@/components/tables/data-table";
import { ExportButton } from "@/components/tables/export-button";
import { Progress } from "@/components/ui/progress";
import { fmtNumber } from "@/lib/helpers";
import type { Aggregate } from "@/lib/analytics";

export interface BreakdownRow extends Aggregate {
  id: string;
  name: string;
  sub?: string;
  href?: string;
}

/** Comparison table used at every analytics level to drill down to the next. */
export function BreakdownTable({ rows, entity, filename, showSchools = true }: { rows: BreakdownRow[]; entity: string; filename: string; showSchools?: boolean }) {
  const router = useRouter();
  return (
    <DataTable
      rows={rows}
      search={(r) => `${r.name} ${r.sub ?? ""}`}
      searchPlaceholder={`Search ${entity.toLowerCase()}…`}
      onRowClick={(r) => r.href && router.push(r.href)}
      initialSort={{ key: "students", dir: "desc" }}
      pageSize={20}
      toolbar={<ExportButton filename={filename} header={[entity, "Schools", "Students", "Teachers", "Active users", "Live classes", "Engagement %"]} rows={() => rows.map((r) => [r.name, r.schools, r.students, r.teachers, r.activeStudents + r.activeTeachers, r.liveClasses, r.engagement])} />}
      columns={[
        { key: "name", header: entity, sort: (r) => r.name, cell: (r) => (<div><p className="font-medium">{r.name}</p>{r.sub && <p className="text-xs text-muted-foreground">{r.sub}</p>}</div>) },
        ...(showSchools ? [{ key: "schools", header: "Schools", sort: (r: BreakdownRow) => r.schools, cell: (r: BreakdownRow) => fmtNumber(r.schools), className: "text-right tabular-nums", headClassName: "text-right" }] : []),
        { key: "students", header: "Students", sort: (r) => r.students, cell: (r) => fmtNumber(r.students), className: "text-right tabular-nums", headClassName: "text-right" },
        { key: "teachers", header: "Teachers", sort: (r) => r.teachers, cell: (r) => fmtNumber(r.teachers), className: "text-right tabular-nums", headClassName: "text-right" },
        { key: "active", header: "Active users", sort: (r) => r.activeStudents + r.activeTeachers, cell: (r) => fmtNumber(r.activeStudents + r.activeTeachers), className: "text-right tabular-nums", headClassName: "text-right" },
        { key: "live", header: "Live classes", sort: (r) => r.liveClasses, cell: (r) => fmtNumber(r.liveClasses), className: "text-right tabular-nums", headClassName: "text-right" },
        {
          key: "engagement",
          header: "Engagement",
          sort: (r) => r.engagement,
          cell: (r) => (
            <div className="flex min-w-28 items-center gap-2">
              <Progress value={r.engagement} className="flex-1" />
              <span className="w-9 text-right text-xs tabular-nums">{r.engagement}%</span>
            </div>
          ),
        },
      ]}
    />
  );
}

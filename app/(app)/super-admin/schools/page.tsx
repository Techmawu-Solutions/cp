"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, Upload } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { LinkButton } from "@/components/common/link-button";
import { DataTable, type Column } from "@/components/tables/data-table";
import { ExportButton } from "@/components/tables/export-button";
import { StatusBadge } from "@/components/common/status-badge";
import { SchoolLogo } from "@/components/common/user-avatar";
import { RequirePermission } from "@/components/layout/app-shell";
import { useStore } from "@/lib/store";
import { useCurrentUser } from "@/lib/session";
import { schoolStats } from "@/lib/analytics";
import { missingProfileFields } from "@/lib/school-profile";
import { DISTRICTS, REGIONS } from "@/lib/data/geography";
import { fmtDate, fmtNumber } from "@/lib/helpers";
import type { School } from "@/lib/types";

export default function SchoolsPage() {
  return (
    <RequirePermission perm="schools.view">
      <Schools />
    </RequirePermission>
  );
}

function Schools() {
  const db = useStore();
  const me = useCurrentUser();
  const router = useRouter();
  const rows = useMemo(() => db.schools.map((s) => ({ ...s, computed: schoolStats(db, s) })), [db]);
  type Row = (typeof rows)[number];
  const region = (id: string) => REGIONS.find((r) => r.id === id)?.name ?? "";
  const district = (id: string) => DISTRICTS.find((d) => d.id === id)?.name ?? "";

  const columns: Column<Row>[] = [
    {
      key: "name",
      header: "School",
      sort: (r) => r.name,
      cell: (r) => (
        <div className="flex items-center gap-3">
          <SchoolLogo name={r.name} color={r.logoColor} size="sm" />
          <div className="min-w-0">
            <p className="truncate font-medium">{r.name}</p>
            <p className="text-xs text-muted-foreground">
              WAEC {r.waecCode} · EMIS {r.emisCode}
            </p>
          </div>
        </div>
      ),
    },
    { key: "type", header: "Type", cell: (r) => r.type, sort: (r) => r.type },
    { key: "location", header: "Region / District", sort: (r) => region(r.regionId) + district(r.districtId), cell: (r) => (<div><p>{region(r.regionId)}</p><p className="text-xs text-muted-foreground">{district(r.districtId)}</p></div>) },
    { key: "students", header: "Students", sort: (r) => r.computed.students, cell: (r) => fmtNumber(r.computed.students), className: "tabular-nums text-right", headClassName: "text-right" },
    { key: "teachers", header: "Teachers", sort: (r) => r.computed.teachers, cell: (r) => fmtNumber(r.computed.teachers), className: "tabular-nums text-right", headClassName: "text-right" },
    { key: "structure", header: "Structure", cell: (r) => (r.sessionStructure === "semester" ? "Semesters" : "Terms") },
    {
      key: "status",
      header: "Status",
      sort: (r) => r.status,
      cell: (r) => (
        <div className="flex flex-wrap gap-1">
          <StatusBadge status={r.status} />
          {missingProfileFields(r).length > 0 && (
            <StatusBadge tone="amber" dot={false}>
              Profile incomplete
            </StatusBadge>
          )}
        </div>
      ),
    },
    { key: "onboarded", header: "Onboarded", sort: (r) => r.dateOnboarded, cell: (r) => fmtDate(r.dateOnboarded), className: "whitespace-nowrap" },
  ];

  return (
    <>
      <PageHeader
        title="Schools"
        description={`${fmtNumber(db.schools.length)} tenants on the platform. Each school's data is isolated from every other school.`}
        breadcrumbs={[{ label: "Dashboard", href: "/super-admin/dashboard" }, { label: "Schools" }]}
        actions={
          me?.can("schools.create") && (
            <>
              <LinkButton href="/super-admin/schools/import" variant="outline">
                <Upload /> Import
              </LinkButton>
              <LinkButton href="/super-admin/schools/new">
                <Plus /> Add School
              </LinkButton>
            </>
          )
        }
      />
      <DataTable<Row>
        rows={rows}
        columns={columns}
        search={(r) => `${r.name} ${r.waecCode} ${r.emisCode} ${r.shortName}`}
        searchPlaceholder="Search name, WAEC or EMIS code…"
        onRowClick={(r) => router.push(`/super-admin/schools/${r.id}`)}
        initialSort={{ key: "name", dir: "asc" }}
        filters={[
          { key: "region", label: "Regions", options: REGIONS.map((r) => ({ value: r.id, label: r.name })), predicate: (r, v) => r.regionId === v },
          { key: "status", label: "Statuses", options: ["active", "pending", "suspended", "archived"].map((s) => ({ value: s, label: s[0]!.toUpperCase() + s.slice(1) })), predicate: (r, v) => r.status === v },
          { key: "profile", label: "Profiles", options: [{ value: "incomplete", label: "Profile incomplete" }, { value: "complete", label: "Profile complete" }], predicate: (r, v) => (missingProfileFields(r).length > 0) === (v === "incomplete") },
          { key: "type", label: "Types", options: ["SHS", "JHS", "Primary", "TVET", "College", "University"].map((t) => ({ value: t, label: t })), predicate: (r, v) => r.type === v },
        ]}
        toolbar={
          <ExportButton
            filename="schools"
            header={["School", "Type", "WAEC", "EMIS", "Region", "District", "Students", "Teachers", "Status", "Onboarded"]}
            rows={() => rows.map((r: School & { computed: { students: number; teachers: number } }) => [r.name, r.type, r.waecCode, r.emisCode, region(r.regionId), district(r.districtId), r.computed.students, r.computed.teachers, r.status, r.dateOnboarded.slice(0, 10)])}
          />
        }
      />
    </>
  );
}

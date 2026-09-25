"use client";

import { useMemo } from "react";
import { PageHeader } from "@/components/common/page-header";
import { RequirePermission } from "@/components/layout/app-shell";
import { BreakdownTable } from "@/components/analytics/breakdown-table";
import { useStore } from "@/lib/store";
import { schoolStats } from "@/lib/analytics";
import { locationLabel } from "@/lib/data/geography";

export default function SchoolsAnalyticsPage() {
  const db = useStore();
  const rows = useMemo(
    () =>
      db.schools
        .filter((s) => s.status !== "archived")
        .map((s) => ({ ...schoolStats(db, s), schools: 1, activeSchools: s.status === "active" ? 1 : 0, id: s.id, name: s.name, sub: locationLabel(s), href: `/super-admin/analytics/schools/${s.id}` })),
    [db],
  );
  return (
    <RequirePermission perm={["analytics.school", "analytics.national"]}>
      <PageHeader title="School Analytics" description="Compare schools across the platform." breadcrumbs={[{ label: "Analytics", href: "/super-admin/analytics" }, { label: "Schools" }]} />
      <BreakdownTable rows={rows} entity="School" filename="schools-analytics" showSchools={false} />
    </RequirePermission>
  );
}

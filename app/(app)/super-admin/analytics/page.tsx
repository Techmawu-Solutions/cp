"use client";

import { useMemo } from "react";
import { PageHeader } from "@/components/common/page-header";
import { RequirePermission } from "@/components/layout/app-shell";
import { ScopeAnalytics } from "@/components/analytics/scope-analytics";
import { BreakdownTable } from "@/components/analytics/breakdown-table";
import { useStore } from "@/lib/store";
import { aggregate, byRegion } from "@/lib/analytics";

/** National analytics (spec §44). */
export default function NationalAnalyticsPage() {
  const db = useStore();
  const agg = useMemo(() => aggregate(db, db.schools), [db]);
  const regions = useMemo(() => byRegion(db).map((r) => ({ ...r, id: r.region.id, name: r.region.name, sub: `Capital: ${r.region.capital}`, href: `/super-admin/analytics/regions/${r.region.id}` })), [db]);
  return (
    <RequirePermission perm="analytics.national">
      <PageHeader title="National Analytics" description="Platform usage across Ghana. Select a region to drill down to districts and schools." breadcrumbs={[{ label: "Analytics" }, { label: "National" }]} />
      <ScopeAnalytics scopeKey="national" agg={agg} breakdownTitle="Regions" breakdown={<BreakdownTable rows={regions} entity="Region" filename="national-by-region" />} />
    </RequirePermission>
  );
}

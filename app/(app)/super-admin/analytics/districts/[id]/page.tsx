"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { RequirePermission } from "@/components/layout/app-shell";
import { ScopeAnalytics } from "@/components/analytics/scope-analytics";
import { BreakdownTable } from "@/components/analytics/breakdown-table";
import { useStore } from "@/lib/store";
import { aggregate, schoolStats } from "@/lib/analytics";
import { districtById, regionById } from "@/lib/data/geography";

/** District analytics (spec §46). */
export default function DistrictPage() {
  const { id } = useParams<{ id: string }>();
  const db = useStore();
  const district = districtById(id);
  const schools = useMemo(() => db.schools.filter((s) => s.districtId === id), [db, id]);
  const agg = useMemo(() => aggregate(db, schools), [db, schools]);
  const rows = useMemo(() => schools.map((s) => ({ ...schoolStats(db, s), schools: 1, activeSchools: s.status === "active" ? 1 : 0, id: s.id, name: s.name, sub: `WAEC ${s.waecCode} · ${s.status}`, href: `/super-admin/analytics/schools/${s.id}` })), [db, schools]);
  if (!district) return <EmptyState title="District not found" />;
  const region = regionById(district.regionId)!;
  return (
    <RequirePermission perm={["analytics.district", "analytics.region", "analytics.national"]}>
      <PageHeader title={district.name} description={`${region.name} Region · ${schools.length} schools`} breadcrumbs={[{ label: "Analytics", href: "/super-admin/analytics" }, { label: region.name, href: `/super-admin/analytics/regions/${region.id}` }, { label: district.name }]} />
      <ScopeAnalytics scopeKey={`district-${id}`} agg={agg} breakdownTitle="Schools" breakdown={<BreakdownTable rows={rows} entity="School" filename={`${district.name}-schools`} showSchools={false} />} />
    </RequirePermission>
  );
}

"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { RequirePermission } from "@/components/layout/app-shell";
import { ScopeAnalytics } from "@/components/analytics/scope-analytics";
import { BreakdownTable } from "@/components/analytics/breakdown-table";
import { useStore } from "@/lib/store";
import { aggregate, byDistrict } from "@/lib/analytics";
import { regionById } from "@/lib/data/geography";

/** Regional analytics (spec §45). */
export default function RegionPage() {
  const { id } = useParams<{ id: string }>();
  const db = useStore();
  const region = regionById(id);
  const agg = useMemo(() => aggregate(db, db.schools.filter((s) => s.regionId === id)), [db, id]);
  const districts = useMemo(() => byDistrict(db, id).map((d) => ({ ...d, id: d.district.id, name: d.district.name, href: `/super-admin/analytics/districts/${d.district.id}` })), [db, id]);
  if (!region) return <EmptyState title="Region not found" />;
  return (
    <RequirePermission perm={["analytics.region", "analytics.national"]}>
      <PageHeader title={`${region.name} Region`} description={`Regional capital: ${region.capital}`} breadcrumbs={[{ label: "Analytics", href: "/super-admin/analytics" }, { label: "Regions", href: "/super-admin/analytics/regions" }, { label: region.name }]} />
      <ScopeAnalytics scopeKey={`region-${id}`} agg={agg} breakdownTitle="Districts" breakdown={<BreakdownTable rows={districts} entity="District" filename={`${region.name}-districts`} />} />
    </RequirePermission>
  );
}

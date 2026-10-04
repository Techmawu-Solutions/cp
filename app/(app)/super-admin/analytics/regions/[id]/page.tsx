"use client";

import { useParams } from "next/navigation";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { RequirePermission } from "@/components/layout/app-shell";
import { ScopeAnalytics } from "@/components/analytics/scope-analytics";
import { BreakdownTable } from "@/components/analytics/breakdown-table";
import { useStore } from "@/lib/store";
import { aggregate, byDistrict } from "@/lib/analytics";
import { countryById, regionById, labelWord } from "@/lib/data/geography";

/** Regional analytics (spec section 45). A region is a state in Nigeria; the labels follow the country. */
export default function RegionPage() {
  const { id } = useParams<{ id: string }>();
  const db = useStore();
  const region = regionById(id);
  const agg = aggregate(db, db.schools.filter((s) => s.regionId === id));
  const districts = byDistrict(db, id).map((d) => ({ ...d, id: d.district.id, name: d.district.name, href: `/super-admin/analytics/districts/${d.district.id}` }));
  if (!region) return <EmptyState title="Region not found" />;
  const country = countryById(region.countryId)!;
  return (
    <RequirePermission perm={["analytics.region", "analytics.national", "analytics.global"]}>
      <PageHeader
        title={`${region.name} ${country.regionLabel}`}
        description={`${country.name} · capital: ${region.capital}`}
        breadcrumbs={[{ label: "Analytics", href: "/super-admin/analytics" }, { label: country.name, href: `/super-admin/analytics/countries/${country.id}` }, { label: region.name }]}
      />
      <ScopeAnalytics scopeKey={`region-${id}`} agg={agg} breakdownTitle={`${country.districtLabel}s`} breakdown={<BreakdownTable rows={districts} entity={country.districtLabel} filename={`${region.name}-${labelWord(country.districtLabel)}s`} />} />
    </RequirePermission>
  );
}

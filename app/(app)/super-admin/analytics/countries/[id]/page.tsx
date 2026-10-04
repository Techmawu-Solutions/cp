"use client";

import { useParams } from "next/navigation";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { RequirePermission } from "@/components/layout/app-shell";
import { ScopeAnalytics } from "@/components/analytics/scope-analytics";
import { BreakdownTable } from "@/components/analytics/breakdown-table";
import { useStore } from "@/lib/store";
import { aggregate, byRegion } from "@/lib/analytics";
import { countryById, countryIdOf, regionsOf, labelWord } from "@/lib/data/geography";

/** National analytics for one country (spec section 44), broken down by its regions (or states). */
export default function CountryAnalyticsPage() {
  const { id } = useParams<{ id: string }>();
  const db = useStore();
  const country = countryById(id);
  const agg = aggregate(db, db.schools.filter((s) => countryIdOf(s) === id));
  const regions = byRegion(db, id).map((r) => ({ ...r, id: r.region.id, name: r.region.name, sub: `Capital: ${r.region.capital}`, href: `/super-admin/analytics/regions/${r.region.id}` }));
  if (!country) return <EmptyState title="Country not found" />;
  const plural = `${country.regionLabel}s`;
  return (
    <RequirePermission perm={["analytics.national", "analytics.global"]}>
      <PageHeader
        title={`${country.name} — National Analytics`}
        description={`Platform usage across ${country.name}'s ${regionsOf(id).length} ${labelWord(plural)}. Select one to drill down to ${labelWord(country.districtLabel)}s and schools.`}
        breadcrumbs={[{ label: "Analytics", href: "/super-admin/analytics" }, { label: "Countries", href: "/super-admin/analytics/countries" }, { label: country.name }]}
      />
      <ScopeAnalytics scopeKey={`country-${id}`} agg={agg} breakdownTitle={plural} breakdown={<BreakdownTable rows={regions} entity={country.regionLabel} filename={`${country.name}-by-${labelWord(country.regionLabel)}`} />} />
    </RequirePermission>
  );
}

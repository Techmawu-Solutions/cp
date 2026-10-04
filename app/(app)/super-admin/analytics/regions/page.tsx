"use client";

import { Suspense, useMemo } from "react";
import { PageHeader } from "@/components/common/page-header";
import { RequirePermission } from "@/components/layout/app-shell";
import { BreakdownTable } from "@/components/analytics/breakdown-table";
import { CountryFilter, useCountryFilter } from "@/components/analytics/country-filter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UsageChart } from "@/components/dashboard/charts";
import { useStore } from "@/lib/store";
import { byRegion } from "@/lib/analytics";
import { countryById, labelWord } from "@/lib/data/geography";

export default function RegionsPage() {
  return (
    <RequirePermission perm={["analytics.region", "analytics.national", "analytics.global"]}>
      <Suspense>
        <Regions />
      </Suspense>
    </RequirePermission>
  );
}

/** Regions (states in Nigeria) across the platform, or in one country (spec section 45). */
function Regions() {
  const db = useStore();
  const country = useCountryFilter();
  const rows = useMemo(
    () => byRegion(db, country?.id).map((r) => ({ ...r, id: r.region.id, name: r.region.name, sub: `${countryById(r.region.countryId)?.name} · capital: ${r.region.capital}`, href: `/super-admin/analytics/regions/${r.region.id}` })),
    [db, country],
  );
  const label = country ? `${country.regionLabel}s` : "Regions";
  return (
    <>
      <PageHeader
        title={country ? `${country.name} — ${label}` : "Regional Analytics"}
        description={country ? `Compare ${country.name}'s ${rows.length} ${labelWord(label)}. Select one for its ${labelWord(country.districtLabel)} breakdown.` : `Compare the ${rows.length} regions and states in every country. Filter by country, or select a region for its breakdown.`}
        breadcrumbs={[{ label: "Analytics", href: "/super-admin/analytics" }, { label: "Regions" }]}
        actions={<CountryFilter />}
      />
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Engagement by {country ? labelWord(country.regionLabel) : "region"}</CardTitle>
        </CardHeader>
        <CardContent>
          <UsageChart data={[...rows].sort((a, b) => b.engagement - a.engagement).map((r) => ({ label: r.name, engagement: r.engagement }))} series={[{ key: "engagement", label: "Engagement" }]} layout="vertical" height={Math.max(220, rows.length * 22)} percent />
        </CardContent>
      </Card>
      <BreakdownTable rows={rows} entity={country?.regionLabel ?? "Region"} filename={country ? `${country.name}-${labelWord(label)}` : "regions"} />
    </>
  );
}

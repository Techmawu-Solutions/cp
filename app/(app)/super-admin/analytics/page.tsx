"use client";

import { useMemo } from "react";
import { PageHeader } from "@/components/common/page-header";
import { RequirePermission } from "@/components/layout/app-shell";
import { ScopeAnalytics } from "@/components/analytics/scope-analytics";
import { BreakdownTable } from "@/components/analytics/breakdown-table";
import { useStore } from "@/lib/store";
import { aggregate, byCountry } from "@/lib/analytics";
import { regionsOf, labelWord } from "@/lib/data/geography";

/** Global analytics (spec section 43.1): every country the platform serves, drilling down to each country's national view. */
export default function GlobalAnalyticsPage() {
  const db = useStore();
  const agg = useMemo(() => aggregate(db, db.schools), [db]);
  const countries = useMemo(() => byCountry(db).map((c) => ({ ...c, id: c.country.id, name: c.country.name, sub: `${regionsOf(c.country.id).length} ${labelWord(c.country.regionLabel)}s · ${c.country.currency}`, href: `/super-admin/analytics/countries/${c.country.id}` })), [db]);
  return (
    <RequirePermission perm="analytics.global">
      <PageHeader title="Global Analytics" description="Platform usage in every country. Select a country for its national view, then drill down to regions, districts and schools." breadcrumbs={[{ label: "Analytics" }, { label: "Global" }]} />
      <ScopeAnalytics scopeKey="global" agg={agg} breakdownTitle="Countries" breakdown={<BreakdownTable rows={countries} entity="Country" filename="global-by-country" />} />
    </RequirePermission>
  );
}

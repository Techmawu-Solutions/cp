"use client";

import { useMemo } from "react";
import { PageHeader } from "@/components/common/page-header";
import { RequirePermission } from "@/components/layout/app-shell";
import { BreakdownTable } from "@/components/analytics/breakdown-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UsageChart } from "@/components/dashboard/charts";
import { useStore } from "@/lib/store";
import { byCountry } from "@/lib/analytics";
import { regionsOf, labelWord } from "@/lib/data/geography";

/** Countries compared side by side (spec section 43.1). */
export default function CountriesPage() {
  const db = useStore();
  const rows = useMemo(() => byCountry(db).map((c) => ({ ...c, id: c.country.id, name: c.country.name, sub: `${regionsOf(c.country.id).length} ${labelWord(c.country.regionLabel)}s · ${c.country.currency}`, href: `/super-admin/analytics/countries/${c.country.id}` })), [db]);
  return (
    <RequirePermission perm="analytics.global">
      <PageHeader title="Country Analytics" description="Compare the countries the platform serves. Select a country for its national view." breadcrumbs={[{ label: "Analytics", href: "/super-admin/analytics" }, { label: "Countries" }]} />
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Engagement by country</CardTitle>
        </CardHeader>
        <CardContent>
          <UsageChart data={[...rows].sort((a, b) => b.engagement - a.engagement).map((r) => ({ label: r.name, engagement: r.engagement }))} series={[{ key: "engagement", label: "Engagement" }]} layout="vertical" height={220} percent />
        </CardContent>
      </Card>
      <BreakdownTable rows={rows} entity="Country" filename="countries" />
    </RequirePermission>
  );
}

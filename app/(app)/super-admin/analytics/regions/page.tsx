"use client";

import { useMemo } from "react";
import { PageHeader } from "@/components/common/page-header";
import { RequirePermission } from "@/components/layout/app-shell";
import { BreakdownTable } from "@/components/analytics/breakdown-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UsageChart } from "@/components/dashboard/charts";
import { useStore } from "@/lib/store";
import { byRegion } from "@/lib/analytics";

export default function RegionsPage() {
  const db = useStore();
  const rows = useMemo(() => byRegion(db).map((r) => ({ ...r, id: r.region.id, name: r.region.name, sub: `Capital: ${r.region.capital}`, href: `/super-admin/analytics/regions/${r.region.id}` })), [db]);
  return (
    <RequirePermission perm={["analytics.region", "analytics.national"]}>
      <PageHeader title="Regional Analytics" description="Compare Ghana's 16 regions. Select a region for its district breakdown." breadcrumbs={[{ label: "Analytics", href: "/super-admin/analytics" }, { label: "Regions" }]} />
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Engagement by region</CardTitle>
        </CardHeader>
        <CardContent>
          <UsageChart data={[...rows].sort((a, b) => b.engagement - a.engagement).map((r) => ({ label: r.name, engagement: r.engagement }))} series={[{ key: "engagement", label: "Engagement" }]} layout="vertical" height={420} percent />
        </CardContent>
      </Card>
      <BreakdownTable rows={rows} entity="Region" filename="regions" />
    </RequirePermission>
  );
}

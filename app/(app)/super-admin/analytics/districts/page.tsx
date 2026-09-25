"use client";

import { useMemo } from "react";
import { PageHeader } from "@/components/common/page-header";
import { RequirePermission } from "@/components/layout/app-shell";
import { BreakdownTable } from "@/components/analytics/breakdown-table";
import { useStore } from "@/lib/store";
import { byDistrict } from "@/lib/analytics";
import { regionById } from "@/lib/data/geography";

export default function DistrictsPage() {
  const db = useStore();
  const rows = useMemo(() => byDistrict(db).map((d) => ({ ...d, id: d.district.id, name: d.district.name, sub: `${regionById(d.district.regionId)?.name} Region`, href: `/super-admin/analytics/districts/${d.district.id}` })), [db]);
  return (
    <RequirePermission perm={["analytics.district", "analytics.region", "analytics.national"]}>
      <PageHeader title="District Analytics" description="Every district on the platform. Select one to see its schools." breadcrumbs={[{ label: "Analytics", href: "/super-admin/analytics" }, { label: "Districts" }]} />
      <BreakdownTable rows={rows} entity="District" filename="districts" />
    </RequirePermission>
  );
}

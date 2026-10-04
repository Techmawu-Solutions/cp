"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { RequirePermission } from "@/components/layout/app-shell";
import { ScopeAnalytics } from "@/components/analytics/scope-analytics";
import { useStore } from "@/lib/store";
import { aggregate } from "@/lib/analytics";
import { countryOf, districtById, locationLabel, regionById } from "@/lib/data/geography";

/** School analytics from the platform view (spec section 47). */
export default function SchoolAnalyticsPage() {
  const { id } = useParams<{ id: string }>();
  const db = useStore();
  const school = db.schools.find((s) => s.id === id);
  const agg = useMemo(() => aggregate(db, school ? [school] : []), [db, school]);
  if (!school) return <EmptyState title="School not found" />;
  const district = districtById(school.districtId);
  const region = regionById(school.regionId);
  const country = countryOf(school);
  return (
    <RequirePermission perm={["analytics.school", "analytics.national", "analytics.global"]}>
      <PageHeader
        title={school.name}
        description={`School performance · ${locationLabel(school)}`}
        breadcrumbs={[
          { label: "Analytics", href: "/super-admin/analytics" },
          { label: country.name, href: `/super-admin/analytics/countries/${country.id}` },
          ...(region ? [{ label: region.name, href: `/super-admin/analytics/regions/${region.id}` }] : []),
          ...(district ? [{ label: district.name, href: `/super-admin/analytics/districts/${district.id}` }] : []),
          { label: school.shortName },
        ]}
      />
      <ScopeAnalytics scopeKey={`school-${id}`} agg={agg} showSchools={false} />
    </RequirePermission>
  );
}

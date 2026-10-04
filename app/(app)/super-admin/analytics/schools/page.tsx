"use client";

import { Suspense, useMemo } from "react";
import { PageHeader } from "@/components/common/page-header";
import { RequirePermission } from "@/components/layout/app-shell";
import { BreakdownTable } from "@/components/analytics/breakdown-table";
import { useStore } from "@/lib/store";
import { schoolStats } from "@/lib/analytics";
import { countryIdOf, locationLabel } from "@/lib/data/geography";
import { CountryFilter, useCountryFilter } from "@/components/analytics/country-filter";

export default function SchoolsAnalyticsPage() {
  return (
    <RequirePermission perm={["analytics.school", "analytics.national", "analytics.global"]}>
      <Suspense>
        <Schools />
      </Suspense>
    </RequirePermission>
  );
}

/** Every school in every country, or one country (spec section 47). */
function Schools() {
  const db = useStore();
  const country = useCountryFilter();
  const rows = useMemo(
    () =>
      db.schools
        .filter((s) => s.status !== "archived" && (!country || countryIdOf(s) === country.id))
        .map((s) => ({ ...schoolStats(db, s), schools: 1, activeSchools: s.status === "active" ? 1 : 0, id: s.id, name: s.name, sub: locationLabel(s), href: `/super-admin/analytics/schools/${s.id}` })),
    [db, country],
  );
  return (
    <>
      <PageHeader title={country ? `${country.name} — Schools` : "School Analytics"} description={country ? `Compare schools in ${country.name}.` : "Compare schools across the platform, in every country."} breadcrumbs={[{ label: "Analytics", href: "/super-admin/analytics" }, { label: "Schools" }]} actions={<CountryFilter />} />
      <BreakdownTable rows={rows} entity="School" filename={country ? `${country.name}-schools` : "schools-analytics"} showSchools={false} />
    </>
  );
}

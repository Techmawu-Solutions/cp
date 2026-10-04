"use client";

import { Suspense, useMemo } from "react";
import { PageHeader } from "@/components/common/page-header";
import { RequirePermission } from "@/components/layout/app-shell";
import { BreakdownTable } from "@/components/analytics/breakdown-table";
import { CountryFilter, useCountryFilter } from "@/components/analytics/country-filter";
import { useStore } from "@/lib/store";
import { byDistrict } from "@/lib/analytics";
import { countryById, regionById, labelWord } from "@/lib/data/geography";

export default function DistrictsPage() {
  return (
    <RequirePermission perm={["analytics.district", "analytics.region", "analytics.national", "analytics.global"]}>
      <Suspense>
        <Districts />
      </Suspense>
    </RequirePermission>
  );
}

/** Districts (LGAs in Nigeria, departments in Côte d'Ivoire) across the platform or one country (spec section 46). */
function Districts() {
  const db = useStore();
  const country = useCountryFilter();
  const rows = useMemo(
    () =>
      byDistrict(db, undefined, country?.id).map((d) => {
        const region = regionById(d.district.regionId);
        const c = countryById(region?.countryId);
        return { ...d, id: d.district.id, name: d.district.name, sub: `${region?.name} ${c?.regionLabel ?? ""} · ${c?.name ?? ""}`, href: `/super-admin/analytics/districts/${d.district.id}` };
      }),
    [db, country],
  );
  return (
    <>
      <PageHeader
        title={country ? `${country.name} — ${country.districtLabel}s` : "District Analytics"}
        description={country ? `Every ${labelWord(country.districtLabel)} in ${country.name} on the platform. Select one to see its schools.` : "Every district on the platform, in every country. Filter by country, or select one to see its schools."}
        breadcrumbs={[{ label: "Analytics", href: "/super-admin/analytics" }, { label: "Districts" }]}
        actions={<CountryFilter />}
      />
      <BreakdownTable rows={rows} entity={country?.districtLabel ?? "District"} filename={country ? `${country.name}-${labelWord(country.districtLabel)}s` : "districts"} />
    </>
  );
}

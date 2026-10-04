"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AppSelect } from "@/components/common/app-select";
import { COUNTRIES, countryById } from "@/lib/data/geography";
import type { Country } from "@/lib/types";

/** The country picked in `?country=` on analytics lists (spec section 43.1); none means every country. */
export function useCountryFilter(): Country | undefined {
  return countryById(useSearchParams().get("country") ?? undefined);
}

export function CountryFilter() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  return (
    <AppSelect
      aria-label="Country"
      className="w-56"
      value={params.get("country") ?? "all"}
      onChange={(v) => router.replace(v === "all" ? pathname : `${pathname}?country=${v}`)}
      options={[{ value: "all", label: "All countries" }, ...COUNTRIES.map((c) => ({ value: c.id, label: c.name }))]}
    />
  );
}

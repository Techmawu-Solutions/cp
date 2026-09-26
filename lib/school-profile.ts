import type { School } from "@/lib/types";
import { districtById } from "@/lib/data/geography";

/** Profile fields a school must have before setup can continue (spec §5.2). */
export const REQUIRED_PROFILE_FIELDS: { key: keyof School; label: string }[] = [
  { key: "waecCode", label: "WAEC / school code" },
  { key: "emisCode", label: "GES EMIS code" },
  { key: "regionId", label: "Region" },
  { key: "districtId", label: "District" },
  { key: "address", label: "Address" },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
];

export function missingProfileFields(school: School): { key: keyof School; label: string }[] {
  // The platform-run Vacation Classes workspace has no WAEC/EMIS registration.
  if (school.kind === "vacation") return [];
  return REQUIRED_PROFILE_FIELDS.filter(({ key }) => {
    const v = school[key];
    if (typeof v !== "string" || v.trim() === "") return true;
    // A district that doesn't belong to the school's region counts as missing.
    if (key === "districtId") return districtById(v)?.regionId !== school.regionId;
    return false;
  });
}

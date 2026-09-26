import type { SchoolOwnership, SchoolType } from "@/lib/types";

/** School categories (levels) in display order — spec §5. */
export const SCHOOL_CATEGORIES = ["Primary", "JHS", "SHS", "TVET", "College", "University"] as const satisfies readonly SchoolType[];

export const CATEGORY_LABEL: Record<SchoolType, string> = {
  Primary: "Basic School (Primary 1–6)",
  JHS: "Junior High School (JHS)",
  SHS: "Senior High School (SHS)",
  TVET: "Technical / Vocational (TVET)",
  College: "College",
  University: "University",
};

/** Compact label for tables and badges. */
export const CATEGORY_SHORT: Record<SchoolType, string> = { Primary: "Basic", JHS: "JHS", SHS: "SHS", TVET: "TVET", College: "College", University: "University" };

export const SCHOOL_OWNERSHIPS = ["public", "private"] as const satisfies readonly SchoolOwnership[];
export const OWNERSHIP_LABEL: Record<SchoolOwnership, string> = { public: "Public", private: "Private" };

/** The levels a vacation student's current school can be (spec §49.1.4). */
export const STUDENT_SCHOOL_LEVELS = ["Primary", "JHS", "SHS"] as const satisfies readonly SchoolType[];

/**
 * Reads a category from a spreadsheet cell. Accepts codes and common wordings
 * ("Basic", "Primary School", "Junior High", "senior high school"…).
 */
export function parseCategory(raw: string | undefined): SchoolType | null {
  const v = (raw ?? "").trim().toLowerCase();
  if (!v) return null;
  if (/^(basic|primary|prim|kg)/.test(v) || v.includes("primary") || v.includes("basic")) return "Primary";
  if (v === "jhs" || v.includes("junior")) return "JHS";
  if (v === "shs" || v.includes("senior") || v.includes("secondary")) return "SHS";
  if (v.includes("tvet") || v.includes("technical") || v.includes("vocational")) return "TVET";
  if (v.includes("college")) return "College";
  if (v.includes("university")) return "University";
  return null;
}

export function parseOwnership(raw: string | undefined): SchoolOwnership | null {
  const v = (raw ?? "").trim().toLowerCase();
  if (!v) return null;
  if (["public", "government", "govt", "gov"].includes(v)) return "public";
  if (["private", "mission/private"].includes(v) || v.startsWith("priv")) return "private";
  return null;
}

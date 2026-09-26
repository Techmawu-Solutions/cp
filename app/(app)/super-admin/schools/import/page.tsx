"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { PageHeader } from "@/components/common/page-header";
import { RequirePermission } from "@/components/layout/app-shell";
import { ImportWizard, type ImportIssue } from "@/components/tables/import-wizard";
import { StatusBadge } from "@/components/common/status-badge";
import { AppSelect } from "@/components/common/app-select";
import { Field } from "@/components/forms/field";
import { CATEGORY_LABEL, CATEGORY_SHORT, OWNERSHIP_LABEL, SCHOOL_CATEGORIES, SCHOOL_OWNERSHIPS, parseCategory, parseOwnership } from "@/lib/school-meta";
import { useStore } from "@/lib/store";
import { DISTRICTS, REGIONS } from "@/lib/data/geography";
import { AVATAR_COLORS, downloadBlob, toCsv, uid } from "@/lib/helpers";
import type { School, SchoolOwnership, SchoolType, User } from "@/lib/types";

const COLUMNS = ["name", "short_name", "category", "school_type", "waec_code", "ges_emis_code", "region", "district", "address", "phone", "email", "admin_name", "admin_email"] as const;
type Row = Record<(typeof COLUMNS)[number], string>;

const findRegion = (name?: string) => REGIONS.find((x) => x.name.toLowerCase() === name?.trim().toLowerCase().replace(/ region$/, ""));
const findDistrict = (regionId: string | undefined, name?: string) => DISTRICTS.find((d) => (!regionId || d.regionId === regionId) && d.name.toLowerCase() === name?.trim().toLowerCase());

/**
 * Bulk school upload (spec §5.1). Only the name is required: WAEC/EMIS codes,
 * region and district are validated when present and collected from the
 * school administrator later when missing (spec §5.2). Each upload has a
 * category (Basic/JHS/SHS…) and school type (public/private); a row's own
 * `category` / `school_type` cells override them.
 */
export default function ImportSchoolsPage() {
  return (
    <RequirePermission perm="schools.create">
      <ImportSchools />
    </RequirePermission>
  );
}

function ImportSchools() {
  const router = useRouter();
  const schools = useStore((s) => s.schools);
  const users = useStore((s) => s.users);
  const [activate, setActivate] = useState(true);
  const [category, setCategory] = useState<SchoolType>("SHS");
  const [ownership, setOwnership] = useState<SchoolOwnership>("public");
  const [done, setDone] = useState<{ total: number; incomplete: number; admins: number; breakdown: string } | null>(null);

  const validate = useCallback(
    (rows: Row[]): ImportIssue[][] => {
      const waec = new Set(schools.map((s) => s.waecCode).filter(Boolean));
      const emis = new Set(schools.map((s) => s.emisCode).filter(Boolean));
      const emails = new Set(users.map((u) => u.email.toLowerCase()));
      const seenWaec = new Set<string>();
      const seenEmis = new Set<string>();
      return rows.map((r) => {
        const issues: ImportIssue[] = [];
        const w = r.waec_code?.trim() ?? "";
        const e = r.ges_emis_code?.trim() ?? "";
        if (!r.name?.trim()) issues.push({ field: "name", message: "Missing school name" });
        if (r.category?.trim() && !parseCategory(r.category)) issues.push({ field: "category", message: "Unknown category (Basic, JHS, SHS, TVET…)" });
        if (r.school_type?.trim() && !parseOwnership(r.school_type)) issues.push({ field: "school_type", message: "School type must be Public or Private" });
        if (w && !/^\d{7}$/.test(w)) issues.push({ field: "waec_code", message: "Invalid WAEC code (7 digits)" });
        else if (w && (waec.has(w) || seenWaec.has(w))) issues.push({ field: "waec_code", message: "Duplicate WAEC code", kind: "duplicate" });
        if (e && !/^\d{6,10}$/.test(e)) issues.push({ field: "ges_emis_code", message: "Invalid GES EMIS code" });
        else if (e && (emis.has(e) || seenEmis.has(e))) issues.push({ field: "ges_emis_code", message: "Duplicate GES EMIS code", kind: "duplicate" });
        const region = r.region?.trim() ? findRegion(r.region) : undefined;
        if (r.region?.trim() && !region) issues.push({ field: "region", message: "Unknown region" });
        if (r.district?.trim()) {
          const district = findDistrict(region?.id, r.district);
          if (!district) issues.push({ field: "district", message: region ? "District not in region" : "Unknown district" });
        }
        if (r.admin_email?.trim() && (!/^\S+@\S+\.\S+$/.test(r.admin_email) || emails.has(r.admin_email.trim().toLowerCase()))) issues.push({ field: "admin_email", message: emails.has(r.admin_email.trim().toLowerCase()) ? "Admin email already in use" : "Invalid admin email" });
        const missing = [!w && "WAEC code", !e && "GES EMIS code", !r.region?.trim() && "region", !r.district?.trim() && "district"].filter(Boolean);
        if (missing.length) issues.push({ field: "", message: `Missing ${missing.join(", ")} — admin will be prompted`, kind: "warning" });
        if (w) seenWaec.add(w);
        if (e) seenEmis.add(e);
        return issues;
      });
    },
    [schools, users],
  );

  const tally = (created: School[]) =>
    Object.entries(created.reduce<Record<string, number>>((acc, x) => ((acc[`${OWNERSHIP_LABEL[x.ownership]} ${CATEGORY_SHORT[x.type]}`] = (acc[`${OWNERSHIP_LABEL[x.ownership]} ${CATEGORY_SHORT[x.type]}`] ?? 0) + 1), acc), {}))
      .map(([k, v]) => `${v} ${k}`)
      .join(", ");

  const template = () =>
    downloadBlob(
      new Blob(
        [
          toCsv([
            [...COLUMNS],
            ["Keta Senior High Technical School", "KETASCO", "SHS", "Public", "0070101", "71020031", "Volta", "Keta Municipal", "P.O. Box 44, Keta", "+233 36 219 0012", "info@ketasco.edu.gh", "Esi Agbeko", "admin@ketasco.edu.gh"],
            ["Anloga Community SHS", "ACSHS", "", "", "", "", "Volta", "", "Anloga", "", "", "", ""],
          ]),
        ],
        { type: "text/csv" },
      ),
      "schools-import-template.csv",
    );

  return (
    <>
      <PageHeader
        title="Import Schools"
        description="Upload schools with their WAEC code, GES EMIS code, region and district. Only the school name is required — anything missing is collected from the school administrator when they first sign in."
        breadcrumbs={[{ label: "Schools", href: "/super-admin/schools" }, { label: "Import" }]}
        actions={
          <Button variant="outline" onClick={template}>
            <Download /> Download template
          </Button>
        }
      />
      {done ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-lg font-semibold">{done.total} schools imported</p>
            <p className="text-sm">{done.breakdown}</p>
            <p className="text-sm text-muted-foreground">
              {done.admins} administrators invited · {done.incomplete} schools have missing details their administrator will be asked to complete.
            </p>
            <Button className="mt-4" onClick={() => router.push("/super-admin/schools")}>
              View schools
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>This upload</CardTitle>
            <CardDescription>Upload one file per category and type — e.g. all public JHS schools. Rows with their own category or school type column keep theirs.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Category">
              <AppSelect value={category} onChange={(v) => setCategory(v as SchoolType)} options={SCHOOL_CATEGORIES.map((t) => ({ value: t, label: CATEGORY_LABEL[t] }))} />
            </Field>
            <Field label="School type">
              <AppSelect value={ownership} onChange={(v) => setOwnership(v as SchoolOwnership)} options={SCHOOL_OWNERSHIPS.map((t) => ({ value: t, label: OWNERSHIP_LABEL[t] }))} />
            </Field>
          </CardContent>
        </Card>
        <ImportWizard<Row>
          columns={[...COLUMNS]}
          requiredColumns={["name"]}
          validate={validate}
          previewColumns={[
            { key: "name", label: "School" },
            { key: "category", label: "Category" },
            { key: "school_type", label: "Type" },
            { key: "waec_code", label: "WAEC" },
            { key: "ges_emis_code", label: "GES EMIS" },
            { key: "region", label: "Region" },
            { key: "district", label: "District" },
            { key: "admin_email", label: "Admin" },
          ]}
          entityLabel="schools"
          extraOptions={
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={activate} onCheckedChange={(c) => setActivate(!!c)} /> Activate imported schools immediately (otherwise they are Pending)
            </label>
          }
          onConfirm={(rows) => {
            const st = useStore.getState();
            let incomplete = 0;
            const admins: User[] = [];
            const created: School[] = rows.map((r, i) => {
              const region = findRegion(r.region);
              const district = r.district?.trim() ? findDistrict(region?.id, r.district) : undefined;
              const id = uid("sch");
              if (!r.waec_code?.trim() || !r.ges_emis_code?.trim() || !district) incomplete++;
              if (r.admin_email?.trim()) admins.push({ id: uid("usr"), name: r.admin_name?.trim() || "School Administrator", email: r.admin_email.trim(), roleId: "role_school_admin", schoolId: id, status: "invited", avatarColor: AVATAR_COLORS[i % AVATAR_COLORS.length]! });
              return {
                id,
                name: r.name.trim(),
                shortName: (r.short_name || r.name.split(/\s+/).map((w) => w[0]).join("")).slice(0, 6).toUpperCase(),
                type: parseCategory(r.category) ?? category,
                ownership: parseOwnership(r.school_type) ?? ownership,
                waecCode: r.waec_code?.trim() ?? "",
                emisCode: r.ges_emis_code?.trim() ?? "",
                regionId: region?.id ?? (district ? district.regionId : ""),
                districtId: district?.id ?? "",
                address: r.address ?? "",
                phone: r.phone ?? "",
                email: r.email ?? "",
                logoColor: AVATAR_COLORS[i % AVATAR_COLORS.length]!,
                status: activate ? "active" : "pending",
                dateOnboarded: new Date().toISOString(),
                sessionStructure: st.settings.defaultSessionStructure,
                stats: { students: 0, teachers: 0, activeStudents: 0, activeTeachers: 0, liveClasses: 0, assignments: 0, quizzes: 0, engagement: 0 },
              };
            });
            st.insertMany("schools", created);
            st.insertMany("users", admins);
            st.audit({ schoolId: null, action: "Schools imported", target: `${created.length} schools — ${tally(created)} (${incomplete} with missing details)`, category: "school" });
            toast.success(`${created.length} schools imported`);
            setDone({ total: created.length, incomplete, admins: admins.length, breakdown: tally(created) });
          }}
          renderStatus={(issues) => {
            const err = issues.find((i) => i.kind !== "warning");
            const warn = issues.find((i) => i.kind === "warning");
            return err ? <StatusBadge tone="red">{err.message}</StatusBadge> : warn ? <StatusBadge tone="amber">{warn.message}</StatusBadge> : <StatusBadge status="ready">Ready</StatusBadge>;
          }}
        />
        </>
      )}
    </>
  );
}

"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { PageHeader } from "@/components/common/page-header";
import { RequirePermission } from "@/components/layout/app-shell";
import { ImportWizard, type ImportIssue } from "@/components/tables/import-wizard";
import { StatusBadge } from "@/components/common/status-badge";
import { useStore } from "@/lib/store";
import { DISTRICTS, REGIONS } from "@/lib/data/geography";
import { AVATAR_COLORS, downloadBlob, toCsv, uid } from "@/lib/helpers";
import type { School, User } from "@/lib/types";

const COLUMNS = ["name", "short_name", "type", "waec_code", "emis_code", "region", "district", "address", "phone", "email", "admin_name", "admin_email"] as const;
type Row = Record<(typeof COLUMNS)[number], string>;

const findRegion = (name?: string) => REGIONS.find((x) => x.name.toLowerCase() === name?.trim().toLowerCase().replace(/ region$/, ""));
const findDistrict = (regionId: string | undefined, name?: string) => DISTRICTS.find((d) => (!regionId || d.regionId === regionId) && d.name.toLowerCase() === name?.trim().toLowerCase());

/**
 * Bulk school upload (spec §5.1). Only the name is required: WAEC/EMIS codes,
 * region and district are validated when present and collected from the
 * school administrator later when missing (spec §5.2).
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
  const [done, setDone] = useState<{ total: number; incomplete: number; admins: number } | null>(null);

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
        const e = r.emis_code?.trim() ?? "";
        if (!r.name?.trim()) issues.push({ field: "name", message: "Missing school name" });
        if (w && !/^\d{7}$/.test(w)) issues.push({ field: "waec_code", message: "Invalid WAEC code (7 digits)" });
        else if (w && (waec.has(w) || seenWaec.has(w))) issues.push({ field: "waec_code", message: "Duplicate WAEC code", kind: "duplicate" });
        if (e && !/^\d{6,10}$/.test(e)) issues.push({ field: "emis_code", message: "Invalid EMIS code" });
        else if (e && (emis.has(e) || seenEmis.has(e))) issues.push({ field: "emis_code", message: "Duplicate EMIS code", kind: "duplicate" });
        const region = r.region?.trim() ? findRegion(r.region) : undefined;
        if (r.region?.trim() && !region) issues.push({ field: "region", message: "Unknown region" });
        if (r.district?.trim()) {
          const district = findDistrict(region?.id, r.district);
          if (!district) issues.push({ field: "district", message: region ? "District not in region" : "Unknown district" });
        }
        if (r.admin_email?.trim() && (!/^\S+@\S+\.\S+$/.test(r.admin_email) || emails.has(r.admin_email.trim().toLowerCase()))) issues.push({ field: "admin_email", message: emails.has(r.admin_email.trim().toLowerCase()) ? "Admin email already in use" : "Invalid admin email" });
        const missing = [!w && "WAEC code", !e && "EMIS code", !r.region?.trim() && "region", !r.district?.trim() && "district"].filter(Boolean);
        if (missing.length) issues.push({ field: "", message: `Missing ${missing.join(", ")} — admin will be prompted`, kind: "warning" });
        if (w) seenWaec.add(w);
        if (e) seenEmis.add(e);
        return issues;
      });
    },
    [schools, users],
  );

  const template = () =>
    downloadBlob(
      new Blob(
        [
          toCsv([
            [...COLUMNS],
            ["Keta Senior High Technical School", "KETASCO", "SHS", "0070101", "71020031", "Volta", "Keta Municipal", "P.O. Box 44, Keta", "+233 36 219 0012", "info@ketasco.edu.gh", "Esi Agbeko", "admin@ketasco.edu.gh"],
            ["Anloga Community SHS", "ACSHS", "SHS", "", "", "Volta", "", "Anloga", "", "", "", ""],
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
        description="Upload schools with their WAEC code, EMIS code, region and district. Only the school name is required — anything missing is collected from the school administrator when they first sign in."
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
            <p className="text-sm text-muted-foreground">
              {done.admins} administrators invited · {done.incomplete} schools have missing details their administrator will be asked to complete.
            </p>
            <Button className="mt-4" onClick={() => router.push("/super-admin/schools")}>
              View schools
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ImportWizard<Row>
          columns={[...COLUMNS]}
          requiredColumns={["name"]}
          validate={validate}
          previewColumns={[
            { key: "name", label: "School" },
            { key: "waec_code", label: "WAEC" },
            { key: "emis_code", label: "EMIS" },
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
              if (!r.waec_code?.trim() || !r.emis_code?.trim() || !district) incomplete++;
              if (r.admin_email?.trim()) admins.push({ id: uid("usr"), name: r.admin_name?.trim() || "School Administrator", email: r.admin_email.trim(), roleId: "role_school_admin", schoolId: id, status: "invited", avatarColor: AVATAR_COLORS[i % AVATAR_COLORS.length]! });
              return {
                id,
                name: r.name.trim(),
                shortName: (r.short_name || r.name.split(/\s+/).map((w) => w[0]).join("")).slice(0, 6).toUpperCase(),
                type: (["SHS", "JHS", "Primary", "TVET", "College", "University"].includes(r.type) ? r.type : "SHS") as School["type"],
                waecCode: r.waec_code?.trim() ?? "",
                emisCode: r.emis_code?.trim() ?? "",
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
            st.audit({ schoolId: null, action: "Schools imported", target: `${created.length} schools (${incomplete} with missing details)`, category: "school" });
            toast.success(`${created.length} schools imported`);
            setDone({ total: created.length, incomplete, admins: admins.length });
          }}
          renderStatus={(issues) => {
            const err = issues.find((i) => i.kind !== "warning");
            const warn = issues.find((i) => i.kind === "warning");
            return err ? <StatusBadge tone="red">{err.message}</StatusBadge> : warn ? <StatusBadge tone="amber">{warn.message}</StatusBadge> : <StatusBadge status="ready">Ready</StatusBadge>;
          }}
        />
      )}
    </>
  );
}

"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { ImportWizard, type ImportIssue } from "@/components/tables/import-wizard";
import { RequirePermission } from "@/components/layout/app-shell";
import { useSchoolData } from "@/lib/queries";
import { createStudents } from "@/lib/actions";
import { downloadBlob, toCsv } from "@/lib/helpers";
import { useStore } from "@/lib/store";
import { admissionYearProblem, indexNumberOf, takenIndexNumbers } from "@/lib/students";

const COLUMNS = ["first_name", "last_name", "gender", "date_of_birth", "admission_year", "jhs_index_number", "class", "guardian_name", "guardian_phone", "email"] as const;
type Row = Record<(typeof COLUMNS)[number] | "index_number", string>;

/** Header names schools commonly use for these columns. */
const ALIASES: Record<string, string[]> = {
  jhs_index_number: ["jhs_index", "jhs_index_no", "bece_index", "bece_index_number", "bece_index_no", "index_no", "jhs_number"],
  admission_year: ["year_of_admission", "admitted", "admission", "year_admitted", "intake_year"],
  date_of_birth: ["dob", "birth_date"],
  first_name: ["firstname", "given_name"],
  last_name: ["lastname", "surname", "family_name"],
};

/**
 * The JHS index from a row: digits only, with leading zeros Excel may have
 * dropped put back. A full 12-digit index number (JHS index + admission year)
 * is accepted too and trimmed back to the JHS index.
 */
const jhsOf = (r: Row) => {
  const digits = (r.jhs_index_number ?? "").replace(/\D/g, "");
  if (digits.length === 12 && digits.endsWith((r.admission_year ?? "").trim().slice(-2))) return digits.slice(0, 10);
  return digits.length >= 7 && digits.length < 10 ? digits.padStart(10, "0") : digits;
};
const rowIndex = (r: Row) => (/^\d{10}$/.test(jhsOf(r)) && !admissionYearProblem((r.admission_year ?? "").trim()) ? indexNumberOf(jhsOf(r), r.admission_year.trim()) : "");

/** Bulk student import (spec §23). Student IDs are generated; the index number matches existing students. */
export default function ImportStudentsPage() {
  return (
    <RequirePermission perm="students.import">
      <ImportStudents />
    </RequirePermission>
  );
}

function ImportStudents() {
  const d = useSchoolData();
  const router = useRouter();
  const [autoEnroll, setAutoEnroll] = useState(true);
  const [done, setDone] = useState<number | null>(null);
  const allStudents = useStore((s) => s.students);
  const schools = useStore((s) => s.schools);
  const classByName = new Map(d.classes.map((c) => [c.name.toLowerCase().replace(/\s+/g, ""), c]));

  const validate = useCallback(
    (rows: Row[]): ImportIssue[][] => {
      // Index numbers already on the platform — a match means the student is already registered.
      const existing = takenIndexNumbers(allStudents, schools);
      const seen = new Map<string, number>();
      rows.forEach((r) => {
        const k = rowIndex(r);
        if (k) seen.set(k, (seen.get(k) ?? 0) + 1);
      });
      return rows.map((r) => {
        const issues: ImportIssue[] = [];
        const jhs = jhsOf(r);
        const yearProblem = admissionYearProblem((r.admission_year ?? "").trim());
        if (yearProblem) issues.push({ field: "admission_year", message: r.admission_year ? "Invalid admission year" : "Missing admission year" });
        if (!/^\d{10}$/.test(jhs)) issues.push({ field: "jhs_index_number", message: r.jhs_index_number ? "JHS index must be 10 digits" : "Missing JHS index number" });
        else if ((r.jhs_index_number ?? "").replace(/\D/g, "").length < 10) issues.push({ field: "jhs_index_number", message: "Leading zeros restored", kind: "warning" });
        const idx = rowIndex(r);
        if (idx && existing.has(idx)) issues.push({ field: "jhs_index_number", message: `Already registered: ${existing.get(idx)}`, kind: "duplicate" });
        else if (idx && (seen.get(idx) ?? 0) > 1) issues.push({ field: "jhs_index_number", message: "Same index number twice in this file", kind: "duplicate" });
        if (!r.first_name || !r.last_name) issues.push({ field: "first_name", message: "Missing name" });
        if (r.class && !classByName.has(r.class.toLowerCase().replace(/\s+/g, ""))) issues.push({ field: "class", message: "Invalid class" });
        if (r.gender && !/^(m|f|male|female)$/i.test(r.gender)) issues.push({ field: "gender", message: "Invalid gender" });
        if (r.date_of_birth && Number.isNaN(Date.parse(r.date_of_birth))) issues.push({ field: "date_of_birth", message: "Invalid date of birth" });
        return issues;
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allStudents, schools, d.classes],
  );

  const template = () => {
    const c1 = d.classes[0]?.name ?? "SHS 1A";
    downloadBlob(
      new Blob([toCsv([[...COLUMNS], ["Akosua", "Mensah", "F", "2010-04-12", String(new Date().getFullYear()), "0012345678", c1, "Yaw Mensah", "+233 24 555 0101", ""], ["Kwabena", "Asare", "M", "2010-08-30", String(new Date().getFullYear()), "0012345679", c1, "Ama Asare", "+233 20 555 0192", ""]])], { type: "text/csv" }),
      "students-import-template.csv",
    );
  };

  return (
    <>
      <PageHeader
        title="Import Students"
        description={`Upload a CSV or Excel file. Students are placed into ${d.session.label} classes by class name. Include each student's 10-digit JHS index number and admission year — together they make the 12-digit index number used to find and match students. Student IDs are generated automatically.`}
        breadcrumbs={[{ label: "Students", href: "/school/students" }, { label: "Import" }]}
        actions={
          <Button variant="outline" onClick={template}>
            <Download /> Download template
          </Button>
        }
      />
      {done !== null ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-lg font-semibold">{done} students created</p>
            <p className="text-sm text-muted-foreground">They&apos;ve been invited to sign in{autoEnroll ? " and registered for their class subjects" : ""}.</p>
            <div className="mt-4 flex justify-center gap-2">
              <Button variant="outline" onClick={() => setDone(null)}>
                Import another file
              </Button>
              <Button onClick={() => router.push("/school/students")}>View students</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <ImportWizard<Row>
          columns={[...COLUMNS]}
          requiredColumns={["first_name", "last_name", "admission_year", "jhs_index_number"]}
          aliases={ALIASES}
          prepare={(r) => ({ ...r, index_number: rowIndex(r) })}
          validate={validate}
          entityLabel="students"
          previewColumns={[
            { key: "first_name", label: "First name" },
            { key: "jhs_index_number", label: "JHS index" },
            { key: "admission_year", label: "Admitted" },
            { key: "index_number", label: "Index number" },
            { key: "last_name", label: "Last name" },
            { key: "gender", label: "Gender" },
            { key: "class", label: "Class" },
            { key: "guardian_phone", label: "Guardian phone" },
          ]}
          renderStatus={(issues) => (issues.length ? <StatusBadge tone="red">{issues.map((i) => i.message).join(", ")}</StatusBadge> : <StatusBadge status="ready">Ready</StatusBadge>)}
          extraOptions={
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={autoEnroll} onCheckedChange={(c) => setAutoEnroll(!!c)} /> Register imported students for all subjects taught in their class
            </label>
          }
          onConfirm={(rows) => {
            const created = createStudents(
              d.schoolId!,
              d.sessionId,
              rows.map((r) => ({
                jhsIndexNumber: jhsOf(r),
                admissionYear: Number(r.admission_year),
                firstName: r.first_name.trim(),
                lastName: r.last_name.trim(),
                gender: /^f/i.test(r.gender ?? "") ? "F" : "M",
                dateOfBirth: r.date_of_birth || "",
                guardianName: r.guardian_name ?? "",
                guardianPhone: r.guardian_phone ?? "",
                email: r.email,
                classId: r.class ? classByName.get(r.class.toLowerCase().replace(/\s+/g, ""))?.id : undefined,
              })),
              { autoEnroll, source: "import" },
            );
            toast.success(`${created.length} students imported`);
            setDone(created.length);
          }}
        />
      )}
    </>
  );
}

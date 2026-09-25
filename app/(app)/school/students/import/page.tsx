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

const COLUMNS = ["student_id", "first_name", "last_name", "gender", "date_of_birth", "class", "guardian_name", "guardian_phone", "email"] as const;
type Row = Record<(typeof COLUMNS)[number], string>;

/** Bulk student import (spec §23). */
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
  const classByName = new Map(d.classes.map((c) => [c.name.toLowerCase().replace(/\s+/g, ""), c]));

  const validate = useCallback(
    (rows: Row[]): ImportIssue[][] => {
      const existing = new Set(d.allStudents.map((s) => s.studentNumber.toLowerCase()));
      const seen = new Map<string, number>();
      rows.forEach((r) => {
        const k = (r.student_id ?? "").trim().toLowerCase();
        if (k) seen.set(k, (seen.get(k) ?? 0) + 1);
      });
      return rows.map((r) => {
        const issues: ImportIssue[] = [];
        const id = (r.student_id ?? "").trim();
        if (!id) issues.push({ field: "student_id", message: "Missing Student ID" });
        else if (existing.has(id.toLowerCase()) || (seen.get(id.toLowerCase()) ?? 0) > 1) issues.push({ field: "student_id", message: "Duplicate record", kind: "duplicate" });
        if (!r.first_name || !r.last_name) issues.push({ field: "first_name", message: "Missing name" });
        if (r.class && !classByName.has(r.class.toLowerCase().replace(/\s+/g, ""))) issues.push({ field: "class", message: "Invalid class" });
        if (r.gender && !/^(m|f|male|female)$/i.test(r.gender)) issues.push({ field: "gender", message: "Invalid gender" });
        if (r.date_of_birth && Number.isNaN(Date.parse(r.date_of_birth))) issues.push({ field: "date_of_birth", message: "Invalid date of birth" });
        return issues;
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [d.allStudents, d.classes],
  );

  const template = () => {
    const c1 = d.classes[0]?.name ?? "SHS 1A";
    downloadBlob(
      new Blob([toCsv([[...COLUMNS], [`${d.school?.shortName}/26/9001`, "Akosua", "Mensah", "F", "2010-04-12", c1, "Yaw Mensah", "+233 24 555 0101", ""], [`${d.school?.shortName}/26/9002`, "Kwabena", "Asare", "M", "2010-08-30", c1, "Ama Asare", "+233 20 555 0192", ""]])], { type: "text/csv" }),
      "students-import-template.csv",
    );
  };

  return (
    <>
      <PageHeader
        title="Import Students"
        description={`Upload a CSV or Excel file. Students are placed into ${d.session.label} classes by class name.`}
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
          requiredColumns={["student_id", "first_name", "last_name"]}
          validate={validate}
          entityLabel="students"
          previewColumns={[
            { key: "student_id", label: "Student ID" },
            { key: "first_name", label: "First name" },
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
                studentNumber: r.student_id.trim(),
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

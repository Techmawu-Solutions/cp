"use client";

import { PageHeader } from "@/components/common/page-header";
import { RequirePermission } from "@/components/layout/app-shell";
import { StudentImport, TemplateButton, studentTemplate } from "@/components/admin/bulk-imports";
import { useSchoolData } from "@/lib/queries";

/** Bulk student import (spec section 23). Student IDs are generated; the index number matches existing students. */
export default function ImportStudentsPage() {
  return (
    <RequirePermission perm="students.import">
      <ImportStudents />
    </RequirePermission>
  );
}

function ImportStudents() {
  const d = useSchoolData();
  return (
    <>
      <PageHeader
        title="Import Students"
        description={`Upload a CSV or Excel file. Students are placed into ${d.session.label} classes by class name. Include each student's 10-digit JHS index number and admission year — together they make the 12-digit index number used to find and match students. Student IDs are generated automatically.`}
        breadcrumbs={[{ label: "Students", href: "/school/students" }, { label: "Import" }]}
        actions={<TemplateButton onClick={() => studentTemplate(d.classes)} />}
      />
      <StudentImport schoolId={d.schoolId!} sessionId={d.sessionId} classes={d.classes} viewHref="/school/students" />
    </>
  );
}

"use client";

import { PageHeader } from "@/components/common/page-header";
import { SessionBanner } from "@/components/academic/session-banner";
import { OutcomesReport } from "@/components/academic/outcomes-report";
import { RequirePermission } from "@/components/layout/app-shell";
import { useSchoolData } from "@/lib/queries";

/** Which teachers have written learning outcomes and indicators for their lessons (spec §25.2). */
export default function SchoolLearningOutcomesPage() {
  return (
    <RequirePermission perm="courses.view">
      <Report />
    </RequirePermission>
  );
}

function Report() {
  const d = useSchoolData();
  return (
    <>
      <PageHeader
        title="Learning Outcomes"
        description={`Which teachers have written learning outcomes and indicators for their lessons in ${d.session.label}. Students never see them.`}
        breadcrumbs={[{ label: "Learning Outcomes" }]}
      />
      <SessionBanner />
      <OutcomesReport courses={d.courses} lessonHref={(l) => `/school/courses/${l.course.id}/items/${l.item.id}`} />
    </>
  );
}

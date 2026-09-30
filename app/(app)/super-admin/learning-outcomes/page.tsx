"use client";

import { PageHeader } from "@/components/common/page-header";
import { OutcomesReport } from "@/components/academic/outcomes-report";
import { RequirePermission } from "@/components/layout/app-shell";
import { useStore } from "@/lib/store";

/** Learning outcomes and indicators across every school's active session (spec section 25.2). */
export default function PlatformLearningOutcomesPage() {
  const courses = useStore((s) => s.courses);
  const sessions = useStore((s) => s.academicSessions);
  const active = new Set(sessions.filter((x) => x.status === "active").map((x) => x.id));
  return (
    <RequirePermission perm="courses.view">
      <PageHeader
        title="Learning Outcomes"
        description="Which teachers in each school have written learning outcomes and indicators for their lessons, in each school's active session. Students never see them."
        breadcrumbs={[{ label: "Content", href: "/super-admin/content" }, { label: "Learning Outcomes" }]}
      />
      <OutcomesReport courses={courses.filter((c) => active.has(c.sessionId))} showSchool />
    </RequirePermission>
  );
}

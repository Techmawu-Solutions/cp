"use client";

import { RequirePermission } from "@/components/layout/app-shell";
import { SessionListPage } from "@/components/academic/session-list-page";

/** Academic Sessions (spec section 6.5) — only for roles granted academic_sessions.view. */
export default function AcademicSessionsPage() {
  return (
    <RequirePermission perm="academic_sessions.view">
      <SessionListPage />
    </RequirePermission>
  );
}

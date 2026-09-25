"use client";

import { RequirePermission } from "@/components/layout/app-shell";
import { StaffItemPage } from "@/components/course/staff-item-page";

export default function SchoolItemPage() {
  return (
    <RequirePermission perm="courses.view">
      <StaffItemPage base="/school" />
    </RequirePermission>
  );
}

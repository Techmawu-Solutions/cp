"use client";

import { Suspense } from "react";
import { RequirePermission } from "@/components/layout/app-shell";
import { UsersDirectory } from "@/components/admin/users-directory";

export default function AdministratorsPage() {
  return (
    <RequirePermission perm="users.view">
      <Suspense>
        <UsersDirectory onlyRole="school_admin" title="School Administrators" description="Administrators manage a single school and cannot see any other school's data." />
      </Suspense>
    </RequirePermission>
  );
}

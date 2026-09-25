"use client";

import { Suspense } from "react";
import { RequirePermission } from "@/components/layout/app-shell";
import { UsersDirectory } from "@/components/admin/users-directory";

export default function UsersPage() {
  return (
    <RequirePermission perm="users.view">
      <Suspense>
        <UsersDirectory />
      </Suspense>
    </RequirePermission>
  );
}

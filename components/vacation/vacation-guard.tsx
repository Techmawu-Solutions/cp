"use client";

import { Sun } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { LinkButton } from "@/components/common/link-button";
import { RequirePermission } from "@/components/layout/app-shell";
import { useTenant } from "@/lib/session";

/** Vacation coordinator pages only make sense inside the Vacation Classes workspace. */
export function VacationGuard({ children }: { children: React.ReactNode }) {
  const { school } = useTenant();
  if (school?.kind !== "vacation")
    return <EmptyState icon={Sun} title="This page belongs to Vacation Classes" description="Open the Vacation Classes workspace to manage bundles, registrations and teacher matching." action={<LinkButton href="/super-admin/vacation">Go to Vacation Classes</LinkButton>} className="mt-10" />;
  return <RequirePermission perm="students.view">{children}</RequirePermission>;
}

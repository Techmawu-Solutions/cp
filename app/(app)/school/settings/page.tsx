"use client";

import { offerUsernameGeneration } from "@/components/school/username-banner";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/common/page-header";
import { SchoolForm } from "@/components/forms/school-form";
import { RequirePermission } from "@/components/layout/app-shell";
import { useStore } from "@/lib/store";
import { useTenant } from "@/lib/session";

export default function SchoolSettingsPage() {
  const { school } = useTenant();
  const schools = useStore((s) => s.schools);
  if (!school) return null;
  const others = schools.filter((s) => s.id !== school.id);
  return (
    <RequirePermission perm="academic_sessions.update">
      <PageHeader title="School Settings" description="Your school's profile as it appears across the platform." />
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>School profile</CardTitle>
          <CardDescription>WAEC and GES EMIS codes must be unique across the platform. Status and structure are managed by the platform administrator.</CardDescription>
        </CardHeader>
        <CardContent>
          <SchoolForm
            initial={school}
            takenCodes={{ waec: new Set(others.map((s) => s.waecCode)), emis: new Set(others.map((s) => s.emisCode)) }}
            submitLabel="Save changes"
            onSubmit={(v) => {
              const st = useStore.getState();
              st.update("schools", school.id, { ...v, shortName: v.shortName.toUpperCase(), website: v.website || undefined });
              st.audit({ schoolId: school.id, action: "School profile updated", target: v.name, category: "school" });
              toast.success("School profile saved");
              offerUsernameGeneration(school.id);
            }}
          />
        </CardContent>
      </Card>
    </RequirePermission>
  );
}

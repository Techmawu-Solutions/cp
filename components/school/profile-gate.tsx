"use client";

import { AlertTriangle, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SchoolForm } from "@/components/forms/school-form";
import { useStore } from "@/lib/store";
import { missingProfileFields } from "@/lib/school-profile";
import type { School } from "@/lib/types";

/**
 * Shown instead of the school workspace while the profile is incomplete
 * (spec §5.2). The administrator can't continue setup until it's saved.
 */
export function ProfileGate({ school }: { school: School }) {
  const schools = useStore((s) => s.schools);
  const missing = missingProfileFields(school);
  const others = schools.filter((s) => s.id !== school.id);
  return (
    <div className="mx-auto max-w-3xl py-4">
      <div className="mb-6 flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-500/15">
          <ClipboardList className="size-5 text-amber-600" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Complete your school profile</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {school.name} was added to the platform without some details. Please provide them before continuing to set up your school — they&apos;re used for WAEC/EMIS reporting and district, regional and national analytics.
          </p>
        </div>
      </div>
      <Card className="mb-4 border-amber-500/40 bg-amber-500/5">
        <CardContent className="flex flex-wrap items-center gap-2 text-sm">
          <AlertTriangle className="size-4 text-amber-600" />
          <span className="font-medium">Missing:</span>
          {missing.map((m) => (
            <Badge key={m.key} variant="outline" className="border-amber-500/50">
              {m.label}
            </Badge>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>School profile</CardTitle>
          <CardDescription>Every field marked * is required.</CardDescription>
        </CardHeader>
        <CardContent>
          <SchoolForm
            initial={school}
            takenCodes={{ waec: new Set(others.map((s) => s.waecCode).filter(Boolean)), emis: new Set(others.map((s) => s.emisCode).filter(Boolean)) }}
            submitLabel="Save and continue"
            validateOnMount
            onSubmit={(v) => {
              const st = useStore.getState();
              st.update("schools", school.id, { ...v, shortName: v.shortName.toUpperCase(), website: v.website || undefined });
              st.audit({ schoolId: school.id, action: "School profile completed", target: missing.map((m) => m.label).join(", "), category: "school" });
              toast.success("Profile complete — you can now continue setting up your school");
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}

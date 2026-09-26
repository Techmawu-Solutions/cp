"use client";

import { AtSign, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LinkButton } from "@/components/common/link-button";
import { useStore } from "@/lib/store";
import { useCurrentUser } from "@/lib/session";
import { generateSchoolUsernames } from "@/lib/actions";
import { isValidWaec, needsSchoolUsername } from "@/lib/usernames";
import { plural } from "@/lib/helpers";
import type { ID } from "@/lib/types";

/**
 * School username status for a school's students (spec §10.1): explains that
 * students use platform usernames until the WAEC code is added, and offers to
 * generate WAEC-prefixed usernames once it is.
 */
export function SchoolUsernameBanner({ schoolId }: { schoolId: ID }) {
  const me = useCurrentUser();
  const school = useStore((s) => s.schools.find((x) => x.id === schoolId));
  const pending = useStore((s) => s.students.filter((st) => st.schoolId === schoolId && needsSchoolUsername(st, school)).length);
  const total = useStore((s) => s.students.filter((st) => st.schoolId === schoolId).length);
  if (!school || school.kind === "vacation" || total === 0) return null;

  if (!isValidWaec(school.waecCode))
    return (
      <Alert className="mb-4">
        <AtSign />
        <AlertTitle>Students are signing in with platform usernames</AlertTitle>
        <AlertDescription>
          School usernames start with your WAEC code (e.g. 0010712-0001). Add {school.name}&apos;s WAEC code and you can generate them for all students.
          {me?.can("academic_sessions.update") && (
            <LinkButton href="/school/settings" size="sm" variant="outline" className="mt-2">
              Add WAEC code
            </LinkButton>
          )}
        </AlertDescription>
      </Alert>
    );

  if (pending === 0) return null;
  return (
    <Alert className="mb-4 border-amber-500/40 bg-amber-500/5">
      <KeyRound className="text-amber-600" />
      <AlertTitle>{plural(pending, "student")} without a school username</AlertTitle>
      <AlertDescription>
        Your WAEC code {school.waecCode} is set. Generate usernames like {school.waecCode}-0001 for these students — their platform usernames keep working.
        {me?.can("students.update") && (
          <Button
            size="sm"
            className="mt-2"
            onClick={() => {
              const n = generateSchoolUsernames(schoolId);
              toast.success(`${plural(n, "school username")} generated`, { description: "Students were notified of their new username." });
            }}
          >
            <KeyRound /> Generate usernames
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

/**
 * Call after a school profile save: once the school has a WAEC code and
 * students without school usernames, offer to generate them (spec §10.1).
 * School administrators are also notified when someone else added the code.
 */
export function offerUsernameGeneration(schoolId: ID) {
  const st = useStore.getState();
  const school = st.schools.find((x) => x.id === schoolId);
  if (!school || !isValidWaec(school.waecCode)) return;
  const pending = st.students.filter((s) => s.schoolId === schoolId && needsSchoolUsername(s, school)).length;
  if (!pending) return;
  toast(`${plural(pending, "student")} can now get school usernames`, {
    description: `Generate usernames starting with ${school.waecCode}.`,
    duration: 12000,
    action: { label: "Generate now", onClick: () => toast.success(`${plural(generateSchoolUsernames(schoolId), "school username")} generated`) },
  });
  for (const admin of st.users.filter((u) => u.schoolId === schoolId && u.roleId === "role_school_admin" && u.id !== st.userId))
    st.notify({ userId: admin.id, schoolId, kind: "system", title: "Generate student usernames", body: `${school.name}'s WAEC code ${school.waecCode} was added. ${plural(pending, "student")} can now get school usernames.`, href: "/school/students" });
}

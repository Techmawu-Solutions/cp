"use client";

import { GraduationCap, History } from "lucide-react";
import { useStore } from "@/lib/store";
import { useAcademicSession, useCurrentUser, useMyStudent, useTenant } from "@/lib/session";
import { fmtDateLong } from "@/lib/helpers";
import { isSessionClosed } from "@/lib/session-lock";
import type { ID } from "@/lib/types";

/**
 * Closed sessions are read-only history for everyone, administrators included
 * (spec section 6.5); screens disable editing while one is selected. The store
 * refuses any change to a closed session regardless (`lib/session-lock.ts`).
 */
export function useSessionEditable(): boolean {
  const { schoolId } = useTenant();
  const { current } = useAcademicSession(schoolId);
  const alumnus = useAlumnus();
  return !!current && current.status !== "closed" && !alumnus;
}

/** The signed-in student's record when they've graduated: alumni look back read-only (spec section 22.4). */
export function useAlumnus() {
  const me = useCurrentUser();
  const student = useMyStudent();
  return me?.portal === "student" && student?.status === "graduated" ? student : null;
}

/** False when a record's own session is closed — for screens that open a record outside the selected session (forums, the classroom lobby). */
export function useRecordSessionOpen(sessionId: ID | null | undefined): boolean {
  const sessions = useStore((s) => s.academicSessions);
  return !isSessionClosed({ academicSessions: sessions }, sessionId);
}

export function SessionBanner() {
  const { schoolId } = useTenant();
  const { current, active, label } = useAcademicSession(schoolId);
  const setSession = useStore((s) => s.setSession);
  const alumnus = useAlumnus();
  if (alumnus)
    return (
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-violet-500/40 bg-violet-500/10 px-3 py-2 text-sm text-violet-900 dark:text-violet-200">
        <GraduationCap className="size-4" />
        <span>
          {alumnus.alumniAccessUntil
            ? `You graduated on ${fmtDateLong(alumnus.graduatedOn ?? alumnus.alumniAccessUntil)}. You can look back at your courses, grades and recordings until ${fmtDateLong(alumnus.alumniAccessUntil)}, but nothing you do is recorded.`
            : "You've graduated. You can look back at your courses, grades and recordings, but nothing you do is recorded."}
        </span>
      </div>
    );
  if (!current || current.status !== "closed") return null;
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-200">
      <History className="size-4" />
      <span>
        You&apos;re viewing <strong>{label}</strong>, a closed session. Records are read-only.
      </span>
      {active && schoolId && (
        <button className="ml-auto font-medium underline underline-offset-2" onClick={() => setSession(schoolId, active.id)}>
          Switch to the active session
        </button>
      )}
    </div>
  );
}

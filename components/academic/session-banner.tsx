"use client";

import { History } from "lucide-react";
import { useStore } from "@/lib/store";
import { useAcademicSession, useTenant } from "@/lib/session";
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
  return !!current && current.status !== "closed";
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

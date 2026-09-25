"use client";

import { History } from "lucide-react";
import { useStore } from "@/lib/store";
import { useAcademicSession, useTenant } from "@/lib/session";

/** Closed sessions are read-only history; screens disable editing while one is selected. */
export function useSessionEditable(): boolean {
  const { schoolId } = useTenant();
  const { current } = useAcademicSession(schoolId);
  return !!current && current.status !== "closed";
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

"use client";

import Link from "next/link";
import { CalendarRange } from "lucide-react";
import { useAcademicSession, useCurrentUser, useTenant } from "@/lib/session";
import { cn } from "@/lib/utils";

/** Where each portal sets or switches the session (spec §6.5). */
export const SESSIONS_HREF = { "super-admin": "/school/academic-sessions", school: "/school/academic-sessions", teacher: "/teacher/academic-sessions", student: "/student/academic-sessions" } as const;

/**
 * Sidebar display of the school's **active** session (spec §6.5). It doesn't
 * switch sessions — that is done on the Academic Sessions page, which this
 * links to. When someone is viewing another session, a small note says so.
 */
export function ActiveSessionBadge({ collapsed = false, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const me = useCurrentUser();
  const { schoolId, school } = useTenant();
  const { active, current, years } = useAcademicSession(schoolId);
  if (!schoolId || !me || (!active && !current)) return null;
  // Vacation Classes run in batches (spec §49.1.7).
  const noun = school?.kind === "vacation" ? "Active batch" : "Active session";
  const name = (s: typeof active) => (s ? `${years.find((y) => y.id === s.academicYearId)?.name ?? ""} — ${s.name}` : "None active");
  const viewingOther = !!current && !!active && current.id !== active.id;
  const href = SESSIONS_HREF[me.portal];

  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "relative flex items-center rounded-lg text-left outline-none hover:bg-sidebar-accent focus-visible:ring-3 focus-visible:ring-ring/50",
        collapsed ? "mx-auto size-10 justify-center" : "w-full gap-2.5 border bg-background/60 px-2.5 py-2",
      )}
      aria-label={`${noun}: ${name(active)}${viewingOther ? `. Viewing ${name(current)}` : ""}. Open Academic Sessions`}
      title={collapsed ? `${noun}: ${name(active)}${viewingOther ? ` · viewing ${name(current)}` : ""}` : "Set or switch sessions on the Academic Sessions page"}
    >
      <CalendarRange className={cn("shrink-0 text-muted-foreground", collapsed ? "size-[18px]" : "size-4")} />
      {!collapsed && (
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-[11px] leading-tight text-muted-foreground">
            <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden /> {noun}
          </span>
          <span className="block truncate text-sm font-medium">{name(active)}</span>
          {viewingOther && <span className="block truncate text-[11px] text-amber-700 dark:text-amber-400">Viewing {name(current)}</span>}
        </span>
      )}
      {viewingOther && collapsed && <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-amber-500" aria-hidden />}
    </Link>
  );
}

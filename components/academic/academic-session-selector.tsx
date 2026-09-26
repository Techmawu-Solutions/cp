"use client";

import { CalendarRange, Check, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/common/status-badge";
import { useStore } from "@/lib/store";
import { useAcademicSession, useTenant } from "@/lib/session";
import { cn } from "@/lib/utils";

/**
 * Sidebar selector (spec §6.5). Switching session re-scopes every school
 * screen: classes, students, subjects, enrolments, assessments, grades,
 * attendance, live classes, reports and analytics. `collapsed` renders an
 * icon button for the sidebar's icon rail.
 */
export function AcademicSessionSelector({ collapsed = false, className }: { collapsed?: boolean; className?: string }) {
  const { schoolId, school } = useTenant();
  // Vacation Classes run in batches (spec §49.1.7), so their sessions are called batches.
  const noun = school?.kind === "vacation" ? "Batch" : "Academic session";
  const { sessions, years, current, label, active } = useAcademicSession(schoolId);
  const setSession = useStore((s) => s.setSession);
  if (!schoolId || sessions.length === 0) return null;
  const notActive = !!current && current.id !== active?.id;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "relative flex items-center rounded-lg text-left outline-none hover:bg-sidebar-accent focus-visible:ring-3 focus-visible:ring-ring/50",
          collapsed ? "mx-auto size-10 justify-center" : "w-full gap-2.5 border bg-background/60 px-2.5 py-2",
          className,
        )}
        aria-label={`${noun}: ${label}`}
        title={collapsed ? `${noun}: ${label}` : undefined}
      >
        <CalendarRange className={cn("shrink-0 text-muted-foreground", collapsed ? "size-[18px]" : "size-4")} />
        {!collapsed && (
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] leading-tight text-muted-foreground">{noun}</span>
            <span className="block truncate text-sm font-medium">{label}</span>
          </span>
        )}
        {notActive && <span className={cn("size-2 shrink-0 rounded-full bg-amber-500", collapsed && "absolute top-1.5 right-1.5")} title="Not the active session" />}
        {!collapsed && <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />}
      </DropdownMenuTrigger>
      <DropdownMenuContent side={collapsed ? "right" : "bottom"} align="start" className="w-72">
        {years.map((y, i) => (
          <DropdownMenuGroup key={y.id}>
            {i > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel>{y.name}</DropdownMenuLabel>
            {sessions
              .filter((s) => s.academicYearId === y.id)
              .sort((a, b) => a.startDate.localeCompare(b.startDate))
              .map((s) => (
                <DropdownMenuItem
                  key={s.id}
                  onClick={() => {
                    setSession(schoolId, s.id);
                    toast.message(`Viewing ${y.name} — ${s.name}`, { description: s.status === "active" ? "This is the active session." : "Records shown are from this session only." });
                  }}
                >
                  <Check className={cn("size-4", s.id === current?.id ? "opacity-100" : "opacity-0")} />
                  <span className="flex-1">{s.name}</span>
                  <StatusBadge status={s.status} />
                </DropdownMenuItem>
              ))}
          </DropdownMenuGroup>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

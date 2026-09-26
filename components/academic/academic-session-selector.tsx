"use client";

import { CalendarRange, Check, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
 * Header selector (spec §6.5). Switching session re-scopes every school
 * screen: classes, students, subjects, enrolments, assessments, grades,
 * attendance, live classes, reports and analytics.
 */
export function AcademicSessionSelector({ className }: { className?: string }) {
  const { schoolId } = useTenant();
  const { sessions, years, current, label, active } = useAcademicSession(schoolId);
  const setSession = useStore((s) => s.setSession);
  if (!schoolId || sessions.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" className={cn("h-9 max-w-full min-w-0 shrink justify-start gap-2", className)} />}>
        <CalendarRange className="text-muted-foreground" />
        <span className="hidden text-xs text-muted-foreground sm:inline">Academic Session</span>
        <span className="truncate font-medium">{label}</span>
        {current && current.id !== active?.id && <span className="size-2 shrink-0 rounded-full bg-amber-500" title="Not the active session" />}
        <ChevronDown className="ml-auto text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
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

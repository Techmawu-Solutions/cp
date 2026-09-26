"use client";

import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown, Sun } from "lucide-react";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SchoolLogo } from "@/components/common/user-avatar";
import { useStore } from "@/lib/store";
import { PORTAL_HOME, useCurrentUser, useTenant } from "@/lib/session";
import { cn } from "@/lib/utils";

/**
 * The current school in the sidebar. Users who belong to more than one
 * workspace (spec §49.1.1) — e.g. a school and Vacation Classes — switch from
 * here; for everyone else it is a plain label. `collapsed` renders the
 * school's logo only, for the sidebar's icon rail.
 */
export function WorkspaceSwitcher({ collapsed = false }: { collapsed?: boolean }) {
  const me = useCurrentUser();
  const { school, workspaces } = useTenant();
  const router = useRouter();
  if (!me || !school) return null;
  const name = school.kind === "vacation" ? "Vacation Classes" : school.name;
  const canSwitch = workspaces.length > 1;
  const face = (
    <>
      <SchoolLogo name={school.name} color={school.logoColor} size="sm" className="size-7 shrink-0 text-[10px]" />
      {!collapsed && (
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] leading-tight text-muted-foreground">{canSwitch ? "Workspace" : "School"}</span>
          <span className="block truncate text-sm font-medium" title={name}>{name}</span>
        </span>
      )}
      {!collapsed && canSwitch && <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />}
    </>
  );
  const cls = cn("flex items-center rounded-lg text-left", collapsed ? "mx-auto size-10 justify-center" : "w-full gap-2.5 px-2.5 py-1.5");

  if (!canSwitch)
    return (
      <div className={cls} title={collapsed ? name : undefined}>
        {face}
      </div>
    );
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={cn(cls, "outline-none hover:bg-sidebar-accent focus-visible:ring-3 focus-visible:ring-ring/50")} aria-label={`Switch workspace (current: ${name})`} title={collapsed ? `Switch workspace (current: ${name})` : undefined}>
        {face}
      </DropdownMenuTrigger>
      <DropdownMenuContent side={collapsed ? "right" : "bottom"} align="start" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Switch workspace</DropdownMenuLabel>
          {workspaces.map((w) => (
            <DropdownMenuItem
              key={w.id}
              onClick={() => {
                useStore.getState().setWorkspace(w.id === me.user.schoolId ? null : w.id);
                router.push(PORTAL_HOME[me.portal]);
                toast.message(`Switched to ${w.kind === "vacation" ? "Vacation Classes" : w.name}`);
              }}
            >
              <Check className={cn("size-4", w.id === school.id ? "opacity-100" : "opacity-0")} />
              <span className="flex-1 truncate">{w.name}</span>
              {w.kind === "vacation" && <Sun className="size-4 text-orange-500" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

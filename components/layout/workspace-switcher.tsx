"use client";

import { useRouter } from "next/navigation";
import { Check, ChevronDown, Sun } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SchoolLogo } from "@/components/common/user-avatar";
import { useStore } from "@/lib/store";
import { PORTAL_HOME, useCurrentUser, useTenant } from "@/lib/session";
import { cn } from "@/lib/utils";

/**
 * Switch between a user's school and Vacation Classes (spec §49.1.1). Shown
 * only to users who belong to more than one workspace.
 */
export function WorkspaceSwitcher() {
  const me = useCurrentUser();
  const { school, workspaces } = useTenant();
  const router = useRouter();
  if (!me || workspaces.length < 2 || !school) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" className="h-9 max-w-56 gap-2" />}>
        <SchoolLogo name={school.name} color={school.logoColor} size="sm" className="size-6 text-[10px]" />
        <span className="truncate text-sm">{school.kind === "vacation" ? "Vacation Classes" : school.shortName}</span>
        <ChevronDown className="text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
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

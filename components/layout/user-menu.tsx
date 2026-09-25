"use client";

import { useRouter } from "next/navigation";
import { LogOut, Monitor, Moon, RefreshCw, Sun, UserRound, Settings, Users } from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/common/user-avatar";
import { useStore } from "@/lib/store";
import { PORTAL_HOME, portalFor, useCurrentUser } from "@/lib/session";
import { DEMO_ACCOUNTS } from "@/lib/demo-accounts";
import { DEMO_PASSWORD } from "@/lib/data/seed";
import { useUi } from "@/lib/ui-store";

export function UserMenu() {
  const me = useCurrentUser();
  const router = useRouter();
  const { setTheme } = useTheme();
  const logout = useStore((s) => s.logout);
  const login = useStore((s) => s.login);
  const roles = useStore((s) => s.roles);
  const users = useStore((s) => s.users);
  if (!me) return null;

  const switchTo = (email: string) => {
    const res = login(email, DEMO_PASSWORD);
    if (!res.ok) return toast.error(res.error);
    const u = users.find((x) => x.id === res.userId)!;
    const home = PORTAL_HOME[portalFor(roles.filter((r) => u.roleId === r.id))];
    useUi.getState().setNavigatingTo(home);
    router.push(home);
    toast.success(`Signed in as ${u.name}`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50" aria-label="Account menu">
        <UserAvatar name={me.user.name} color={me.user.avatarColor} size="sm" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="py-2">
            <p className="text-sm font-medium text-foreground">{me.user.name}</p>
            <p className="truncate text-xs font-normal">{me.user.email}</p>
            <p className="mt-1 text-xs font-normal">{me.roles.map((r) => r.name).join(", ")}</p>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/profile")}>
          <UserRound /> Profile
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push("/settings")}>
          <Settings /> Preferences
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Sun /> Theme
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem onClick={() => setTheme("light")}>
              <Sun /> Light
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("dark")}>
              <Moon /> Dark
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("system")}>
              <Monitor /> System
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Users /> Switch demo account
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-72">
            {DEMO_ACCOUNTS.map((a) => (
              <DropdownMenuItem key={a.email} onClick={() => switchTo(a.email)} disabled={a.email === me.user.email}>
                <div>
                  <p className="text-sm">{a.label}</p>
                  <p className="text-xs text-muted-foreground">{a.description}</p>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            useStore.getState().resetDemo();
            router.push("/login");
            toast.success("Demo data reset");
          }}
        >
          <RefreshCw /> Reset demo data
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          onClick={() => {
            logout();
            router.push("/login");
          }}
        >
          <LogOut /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

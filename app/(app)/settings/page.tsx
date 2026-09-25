"use client";

import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/common/page-header";
import { useUi } from "@/lib/ui-store";
import { cn } from "@/lib/utils";

/** Personal preferences (spec §64 screen 53). */
export default function PreferencesPage() {
  const { theme, setTheme } = useTheme();
  const collapsed = useUi((s) => s.sidebarCollapsed);
  const toggle = useUi((s) => s.toggleSidebar);
  return (
    <>
      <PageHeader title="Preferences" description="Settings that apply to you on this device." />
      <div className="grid max-w-2xl gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Choose light, dark, or follow your device.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-2">
            {[
              { v: "light", label: "Light", icon: Sun },
              { v: "dark", label: "Dark", icon: Moon },
              { v: "system", label: "System", icon: Monitor },
            ].map((o) => (
              <button key={o.v} onClick={() => setTheme(o.v)} className={cn("flex flex-col items-center gap-2 rounded-lg border p-4 text-sm", theme === o.v && "border-primary bg-accent")}>
                <o.icon className="size-5" /> {o.label}
              </button>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Navigation</CardTitle>
          </CardHeader>
          <CardContent>
            <label className="flex items-center justify-between gap-4">
              <span>
                <span className="block text-sm font-medium">Compact sidebar</span>
                <span className="text-xs text-muted-foreground">Show icons only on large screens. You can also use the collapse button in the sidebar.</span>
              </span>
              <Switch checked={collapsed} onCheckedChange={toggle} />
            </label>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { BellRing, Download, Mail, Monitor, Moon, Sun } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/common/page-header";
import { useUi } from "@/lib/ui-store";
import { useStore } from "@/lib/store";
import { useCurrentUser } from "@/lib/session";
import { devicePermission, requestDevicePermission, showDeviceNotification, type DevicePermission } from "@/lib/device-notifications";
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
        <NotificationPrefs />
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

/** The browser's install prompt, captured so we can offer "Install app" (Chromium only). */
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function NotificationPrefs() {
  const me = useCurrentUser();
  const update = useStore((s) => s.update);
  const deviceAlerts = useUi((s) => s.deviceAlerts);
  const setDeviceAlerts = useUi((s) => s.setDeviceAlerts);
  // The app shell renders pages only after hydrating in the browser, so window is available here.
  const [permission, setPermission] = useState<DevicePermission>(devicePermission);
  const [install, setInstall] = useState<InstallPromptEvent | null>(null);
  const [standalone] = useState(() => window.matchMedia("(display-mode: standalone)").matches);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstall(e as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!me) return null;
  const hasEmail = /\S+@\S+\.\S+/.test(me.user.email);
  const emailOn = me.user.emailNotifications !== false;
  const deviceOn = deviceAlerts && permission === "granted";

  const toggleDevice = async (on: boolean) => {
    if (!on) return setDeviceAlerts(false);
    const p = permission === "granted" ? "granted" : await requestDevicePermission();
    setPermission(p);
    if (p === "granted") {
      setDeviceAlerts(true);
      toast.success("Device notifications are on");
    } else toast.error(p === "unsupported" ? "This browser doesn't support notifications" : "Notifications are blocked — allow them in your browser's site settings");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
        <CardDescription>How we tell you when a live class starts. You always get an in-app notification too.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <label className="flex items-center justify-between gap-4">
          <span className="flex gap-3">
            <Mail className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span>
              <span className="block text-sm font-medium">Email alerts</span>
              <span className="text-xs text-muted-foreground">{hasEmail ? <>Sent to {me.user.email}</> : "Your account has no email address. Ask your school to add one."}</span>
            </span>
          </span>
          <Switch checked={hasEmail && emailOn} disabled={!hasEmail} onCheckedChange={(on) => (update("users", me.user.id, { emailNotifications: on }), toast.success(on ? "Email alerts on" : "Email alerts off"))} />
        </label>
        <label className="flex items-center justify-between gap-4">
          <span className="flex gap-3">
            <BellRing className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span>
              <span className="block text-sm font-medium">Device notifications</span>
              <span className="text-xs text-muted-foreground">
                {permission === "unsupported" ? "Not supported in this browser. On iPhone, add ClassProject to your Home Screen first." : permission === "denied" ? "Blocked in your browser's site settings." : "Pop-up alerts on this phone or computer, even when ClassProject is in the background."}
              </span>
            </span>
          </span>
          <Switch checked={deviceOn} disabled={permission === "unsupported"} onCheckedChange={toggleDevice} />
        </label>
        <div className="flex flex-wrap gap-2 border-t pt-4">
          {deviceOn && (
            <Button variant="outline" size="sm" onClick={() => showDeviceNotification({ title: "Test notification", body: "Live class alerts will look like this.", href: "/notifications", tag: "test" })}>
              <BellRing /> Send a test
            </Button>
          )}
          {install && !standalone && (
            <Button
              size="sm"
              onClick={async () => {
                await install.prompt();
                const { outcome } = await install.userChoice;
                if (outcome === "accepted") setInstall(null);
              }}
            >
              <Download /> Install ClassProject app
            </Button>
          )}
          {!install && !standalone && <p className="text-xs text-muted-foreground">Tip: install ClassProject from your browser menu (“Install app” or “Add to Home Screen”) to get alerts like a native app.</p>}
          {standalone && <p className="text-xs text-muted-foreground">You&apos;re using the installed ClassProject app.</p>}
        </div>
      </CardContent>
    </Card>
  );
}

"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Eye, LogOut, Menu, PanelLeftClose, PanelLeftOpen, ShieldAlert } from "lucide-react";
import { MessageBell } from "@/components/layout/message-bell";
import { useUi } from "@/lib/ui-store";
import { missingProfileFields } from "@/lib/school-profile";
import { ProfileGate } from "@/components/school/profile-gate";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { NotificationBell } from "@/components/layout/notification-bell";
import { UserMenu } from "@/components/layout/user-menu";
import { FullPageLoader } from "@/components/common/full-page-loader";
import { LinkButton } from "@/components/common/link-button";
import { LiveClassAlerts } from "@/components/classroom/live-class-alerts";
import { useHydrated, useStore } from "@/lib/store";
import { PORTAL_HOME, useCurrentUser, useTenant, type Portal } from "@/lib/session";

const PORTAL_PREFIX: [string, Portal][] = [
  ["/super-admin", "super-admin"],
  ["/school", "school"],
  ["/teacher", "teacher"],
  ["/student", "student"],
];

export function portalOfPath(pathname: string): Portal | null {
  return PORTAL_PREFIX.find(([p]) => pathname === p || pathname.startsWith(p + "/"))?.[1] ?? null;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const hydrated = useHydrated();
  const me = useCurrentUser();
  const { school, isImpersonating } = useTenant();
  const pathname = usePathname();
  const router = useRouter();
  const setActingSchool = useStore((s) => s.setActingSchool);
  const [mobileOpen, setMobileOpen] = useState(false);
  const collapsed = useUi((s) => s.sidebarCollapsed);
  const toggleSidebar = useUi((s) => s.toggleSidebar);

  const navigatingTo = useUi((s) => s.navigatingTo);
  const setNavigatingTo = useUi((s) => s.setNavigatingTo);
  useEffect(() => {
    if (hydrated && !me) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [hydrated, me, pathname, router]);
  useEffect(() => {
    if (navigatingTo && pathname === navigatingTo) setNavigatingTo(null);
  }, [navigatingTo, pathname, setNavigatingTo]);

  if (!hydrated || !me || (navigatingTo && pathname !== navigatingTo)) return <FullPageLoader />;

  const pathPortal = portalOfPath(pathname);
  // The Super Admin may use the school portal only while "entered" into a school.
  const canEnterSchool = me.portal === "super-admin" && pathPortal === "school" && isImpersonating;
  const denied = pathPortal !== null && pathPortal !== me.portal && !canEnterSchool;
  const navPortal: Portal = canEnterSchool ? "school" : me.portal;
  // School admins must complete a partially imported profile before anything else (spec §5.2).
  const missing = school && navPortal === "school" ? missingProfileFields(school) : [];
  const mustCompleteProfile = missing.length > 0 && me.roles.some((r) => r.key === "school_admin") && pathPortal !== null;

  return (
    <div className="flex min-h-screen">
      <LiveClassAlerts />
      <aside className={cn("sticky top-0 hidden h-screen shrink-0 border-r bg-sidebar transition-[width] duration-200 lg:block print:hidden", collapsed ? "w-16" : "w-64")}>
        <Suspense>
          <SidebarNav portal={navPortal} collapsed={collapsed} onToggle={toggleSidebar} />
        </Suspense>
      </aside>
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 bg-sidebar p-0" showCloseButton={false}>
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Suspense>
            <SidebarNav portal={navPortal} onNavigate={() => setMobileOpen(false)} />
          </Suspense>
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        {canEnterSchool && school && (
          <div className="flex flex-wrap items-center gap-2 bg-amber-500/15 px-4 py-2 text-sm text-amber-900 dark:text-amber-200 print:hidden">
            <Eye className="size-4" />
            <span>
              You are viewing <strong>{school.name}</strong> as Super Administrator.
            </span>
            <Button
              size="xs"
              variant="outline"
              className="ml-auto"
              onClick={() => {
                router.push(`/super-admin/schools/${school.id}`);
                setActingSchool(null);
              }}
            >
              <LogOut /> Exit school
            </Button>
          </div>
        )}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/85 px-3 backdrop-blur sm:px-4 print:hidden">
          <Button variant="ghost" size="icon" className="shrink-0 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
            <Menu />
          </Button>
          <Button variant="ghost" size="icon" className="hidden lg:inline-flex" onClick={toggleSidebar} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} title={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
            {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
          </Button>
          <div className="ml-auto flex shrink-0 items-center gap-1">
            <MessageBell />
            <NotificationBell />
            <UserMenu />
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {canEnterSchool && missing.length > 0 && (
            <p className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-200">
              This school&apos;s profile is incomplete ({missing.map((m) => m.label).join(", ")}). Its administrator will be asked to complete it on sign-in.
            </p>
          )}
          {denied ? <AccessDenied home={PORTAL_HOME[me.portal]} superAdminOnSchool={me.portal === "super-admin" && pathPortal === "school"} /> : mustCompleteProfile && school ? <ProfileGate school={school} /> : children}
        </main>
      </div>
    </div>
  );
}

export function AccessDenied({ home, superAdminOnSchool, message }: { home: string; superAdminOnSchool?: boolean; message?: string }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-20 text-center">
      <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-red-500/10">
        <ShieldAlert className="size-7 text-red-600" />
      </div>
      <h1 className="text-xl font-semibold">You don&apos;t have access to this page</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {message ??
          (superAdminOnSchool
            ? "Open a school from the Schools list and choose “Open school workspace” to manage it as its administrator."
            : "This area belongs to a different role or school. If you think this is a mistake, contact your administrator.")}
      </p>
      <LinkButton href={superAdminOnSchool ? "/super-admin/schools" : home} className="mt-6">
        {superAdminOnSchool ? "Go to Schools" : "Back to dashboard"}
      </LinkButton>
    </div>
  );
}

/** Guard for a single page or action inside a portal (permission-level RBAC). */
export function RequirePermission({ perm, children }: { perm: string | string[]; children: React.ReactNode }) {
  const me = useCurrentUser();
  if (!me) return null;
  if (!me.can(perm)) return <AccessDenied home={PORTAL_HOME[me.portal]} message="Your role doesn't include the permission needed for this page. A Super Administrator can grant it under Access Control → Roles." />;
  return <>{children}</>;
}

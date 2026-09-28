"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useHydrated } from "@/lib/store";
import { PORTAL_HOME, useCurrentUser } from "@/lib/session";
import { requiredPermissions } from "@/lib/route-permissions";
import { AccessDenied } from "@/components/layout/app-shell";
import { FullPageLoader } from "@/components/common/full-page-loader";

/** Full-screen classroom shell (no sidebar), with its own sign-in guard. */
export default function ClassroomLayout({ children }: { children: React.ReactNode }) {
  const hydrated = useHydrated();
  const me = useCurrentUser();
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    if (hydrated && !me) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [hydrated, me, pathname, router]);
  // The classroom is always dark, including dialogs and menus portalled to <body>.
  useEffect(() => {
    const html = document.documentElement;
    const wasDark = html.classList.contains("dark");
    html.classList.add("dark");
    return () => {
      if (!wasDark) html.classList.remove("dark");
    };
  }, []);
  if (!hydrated || !me) return <FullPageLoader />;
  const needed = requiredPermissions(pathname);
  if (needed && !me.can(needed)) return <div className="dark min-h-dvh bg-slate-950 text-slate-100"><AccessDenied home={PORTAL_HOME[me.portal]} message="Your role doesn't include live classes. A Super Administrator can grant it under Access Control → Permissions." /></div>;
  return <div className="dark min-h-dvh bg-slate-950 text-slate-100">{children}</div>;
}

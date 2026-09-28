"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { FullPageLoader } from "@/components/common/full-page-loader";
import { LiveClassAlerts } from "@/components/classroom/live-class-alerts";
import { SchoolTheme } from "@/components/school/school-theme";
import { useHydrated } from "@/lib/store";
import { PORTAL_HOME, useCurrentUser } from "@/lib/session";
import { requiredPermissions } from "@/lib/route-permissions";
import { AccessDenied } from "@/components/layout/app-shell";

/**
 * The learning area: a focused, full-screen course view with no app sidebar
 * (like Moodle's course page). Students reach it from their subjects; staff
 * can open it as a preview.
 */
export default function LearnLayout({ children }: { children: React.ReactNode }) {
  const hydrated = useHydrated();
  const me = useCurrentUser();
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    if (hydrated && !me) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [hydrated, me, pathname, router]);
  if (!hydrated || !me) return <FullPageLoader />;
  const needed = requiredPermissions(pathname);
  if (needed && !me.can(needed)) return <AccessDenied home={PORTAL_HOME[me.portal]} message="Your role doesn't include courses. A Super Administrator can grant it under Access Control → Permissions." />;
  return (
    <>
      <LiveClassAlerts />
      <SchoolTheme />
      {children}
    </>
  );
}

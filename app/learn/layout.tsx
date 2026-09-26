"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { FullPageLoader } from "@/components/common/full-page-loader";
import { LiveClassAlerts } from "@/components/classroom/live-class-alerts";
import { SchoolTheme } from "@/components/school/school-theme";
import { useHydrated } from "@/lib/store";
import { useCurrentUser } from "@/lib/session";

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
  return (
    <>
      <LiveClassAlerts />
      <SchoolTheme />
      {children}
    </>
  );
}

"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useHydrated } from "@/lib/store";
import { useCurrentUser } from "@/lib/session";
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
  return <div className="dark min-h-dvh bg-slate-950 text-slate-100">{children}</div>;
}

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useHydrated } from "@/lib/store";
import { PORTAL_HOME, useCurrentUser } from "@/lib/session";
import { FullPageLoader } from "@/components/common/full-page-loader";

export default function Home() {
  const hydrated = useHydrated();
  const me = useCurrentUser();
  const router = useRouter();
  useEffect(() => {
    if (!hydrated) return;
    router.replace(me ? PORTAL_HOME[me.portal] : "/login");
  }, [hydrated, me, router]);
  return <FullPageLoader />;
}

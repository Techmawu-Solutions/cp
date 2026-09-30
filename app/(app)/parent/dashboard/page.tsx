"use client";

import { PageHeader } from "@/components/common/page-header";
import { WardList } from "@/components/parent/ward-views";
import { greeting } from "@/lib/helpers";
import { useCurrentUser } from "@/lib/session";

/** Parent dashboard: one summary per child (spec section 22.3). */
export default function ParentDashboard() {
  const me = useCurrentUser();
  return (
    <>
      <PageHeader title={`${greeting()}, ${me?.user.name ?? ""}`} description="How your children are doing this session: progress, scores, live-class attendance and work due." />
      <WardList />
    </>
  );
}

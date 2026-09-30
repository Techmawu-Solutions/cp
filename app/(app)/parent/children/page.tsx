"use client";

import { PageHeader } from "@/components/common/page-header";
import { WardList } from "@/components/parent/ward-views";

/** Every child linked to the signed-in parent (spec section 22.3). */
export default function ParentChildren() {
  return (
    <>
      <PageHeader title="My Children" description="Children the school has linked to your account. Open one for subjects, grades, work and attendance." />
      <WardList />
    </>
  );
}

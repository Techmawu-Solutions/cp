"use client";

import { useEffect, useState } from "react";
import { Logo } from "@/components/common/logo";

export function FullPageLoader() {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 8000);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="animate-pulse">
          <Logo />
        </div>
        <p className="text-sm text-muted-foreground">Loading your workspace…</p>
        {/* Browser storage can be held by another tab (e.g. during a data upgrade). */}
        {slow && <p className="max-w-xs text-xs text-muted-foreground">This is taking longer than usual. If EduMawu is open in another tab, close it and reload this page.</p>}
      </div>
    </div>
  );
}

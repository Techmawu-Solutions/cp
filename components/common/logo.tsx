"use client";

import { GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  const name = useStore((s) => s.settings.platformName);
  return (
    <div className={cn("flex items-center gap-2 font-semibold [&>span:first-child]:shrink-0", className)}>
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
        <GraduationCap className="size-5" />
      </span>
      {!compact && <span className="text-lg tracking-tight">{name}</span>}
    </div>
  );
}

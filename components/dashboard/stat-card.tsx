import type { LucideIcon } from "lucide-react";
import { TrendingDown, TrendingUp } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  trend,
  href,
  tone = "blue",
}: {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  hint?: React.ReactNode;
  /** Percent change vs previous period. */
  trend?: number;
  href?: string;
  tone?: "blue" | "green" | "amber" | "violet" | "rose" | "teal";
}) {
  const tones = {
    blue: "bg-blue-500/10 text-blue-600 dark:text-blue-300",
    green: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
    amber: "bg-amber-500/12 text-amber-700 dark:text-amber-300",
    violet: "bg-violet-500/10 text-violet-600 dark:text-violet-300",
    rose: "bg-rose-500/10 text-rose-600 dark:text-rose-300",
    teal: "bg-teal-500/10 text-teal-600 dark:text-teal-300",
  };
  const body = (
    <Card className={cn("h-full gap-3 px-4", href && "transition-shadow hover:shadow-md hover:ring-primary/30")}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-muted-foreground">{label}</p>
        {Icon && (
          <span className={cn("flex size-8 items-center justify-center rounded-lg", tones[tone])}>
            <Icon className="size-4" />
          </span>
        )}
      </div>
      <p className="text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      {(hint || trend !== undefined) && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {trend !== undefined && (
            <span className={cn("inline-flex items-center gap-0.5 font-medium", trend >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
              {trend >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
              {Math.abs(trend).toFixed(1)}%
            </span>
          )}
          {hint}
        </div>
      )}
    </Card>
  );
  return href ? (
    <Link href={href} className="block rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
      {body}
    </Link>
  ) : (
    body
  );
}

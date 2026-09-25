import { cn } from "@/lib/utils";

const TONES = {
  green: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 ring-emerald-500/25",
  blue: "bg-blue-500/12 text-blue-700 dark:text-blue-300 ring-blue-500/25",
  amber: "bg-amber-500/15 text-amber-800 dark:text-amber-300 ring-amber-500/30",
  red: "bg-red-500/12 text-red-700 dark:text-red-300 ring-red-500/25",
  gray: "bg-muted text-muted-foreground ring-border",
  violet: "bg-violet-500/12 text-violet-700 dark:text-violet-300 ring-violet-500/25",
} as const;

export type Tone = keyof typeof TONES;

const STATUS_TONE: Record<string, Tone> = {
  active: "green",
  present: "green",
  ready: "green",
  graded: "green",
  published: "green",
  live: "red",
  pending: "amber",
  upcoming: "blue",
  scheduled: "blue",
  submitted: "blue",
  processing: "amber",
  late: "amber",
  invited: "amber",
  on_leave: "amber",
  draft: "gray",
  closed: "gray",
  ended: "gray",
  archived: "gray",
  inactive: "gray",
  graduated: "violet",
  excused: "violet",
  suspended: "red",
  absent: "red",
  disabled: "red",
  cancelled: "red",
  withdrawn: "red",
};

export function StatusBadge({ status, tone, children, dot = true, className }: { status?: string; tone?: Tone; children?: React.ReactNode; dot?: boolean; className?: string }) {
  const t = tone ?? STATUS_TONE[status ?? ""] ?? "gray";
  const label = children ?? (status ? status.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase()) : "");
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap", TONES[t], className)}>
      {dot && <span className={cn("size-1.5 rounded-full bg-current", status === "live" && "animate-pulse")} />}
      {label}
    </span>
  );
}

import { Activity, BookOpen, ClipboardCheck, School, Settings, ShieldCheck, Users, Video } from "lucide-react";
import type { AuditLog } from "@/lib/types";
import { fmtAgo } from "@/lib/helpers";

const ICONS = { school: School, user: Users, academic: BookOpen, rbac: ShieldCheck, lms: BookOpen, assessment: ClipboardCheck, live: Video, system: Settings };

export function RecentActivity({ logs, limit = 8 }: { logs: AuditLog[]; limit?: number }) {
  if (!logs.length) return <p className="py-6 text-center text-sm text-muted-foreground">No recent activity.</p>;
  return (
    <ol className="relative space-y-4">
      {logs.slice(0, limit).map((l) => {
        const Icon = ICONS[l.category] ?? Activity;
        return (
          <li key={l.id} className="flex gap-3">
            <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted">
              <Icon className="size-3.5 text-muted-foreground" />
            </span>
            <div className="min-w-0 text-sm">
              <p className="leading-snug">
                <span className="font-medium">{l.actorName}</span> <span className="text-muted-foreground">{l.action.toLowerCase()}</span> <span className="font-medium">{l.target}</span>
              </p>
              <p className="text-xs text-muted-foreground">{fmtAgo(l.at)}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

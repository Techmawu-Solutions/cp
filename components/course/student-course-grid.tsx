"use client";

import Link from "next/link";
import { ArrowRight, Video } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/common/empty-state";
import { useStudentData } from "@/lib/student";
import { teacherName } from "@/lib/session";
import { useLiveNow } from "@/lib/live";
import { LiveBadge } from "@/components/classroom/live-badge";
import { LinkButton } from "@/components/common/link-button";
import { cn } from "@/lib/utils";

export function StudentCourseGrid({ showContinue }: { showContinue?: boolean }) {
  const s = useStudentData();
  const { d } = s;
  const { byCourse } = useLiveNow();
  if (s.courses.length === 0) return <EmptyState title="You're not registered for any subjects yet" description="Your school registers you for subjects at the start of each session." />;
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {s.courses.map((c) => {
        const p = s.progressOf(c.id);
        const subject = d.byId.subject.get(c.subjectId);
        const live = byCourse.get(c.id);
        return (
          <Card key={c.id} className={cn("overflow-hidden pt-0", live && "ring-2 ring-red-500/60")}>
            <div className="h-2" style={{ background: subject?.color }} />
            <CardContent className="space-y-3">
              <div className="flex items-start gap-2">
                <Link href={`/learn/${c.id}`} className="block min-w-0 flex-1">
                  <p className="font-semibold hover:underline">{subject?.name}</p>
                  <p className="text-sm text-muted-foreground">{teacherName(d.byId.teacher.get(c.teacherId))}</p>
                </Link>
                {live && <LiveBadge liveId={live.id} />}
              </div>
              {live && (
                <LinkButton href={`/classroom/${live.id}/lobby`} size="sm" className="w-full bg-red-600 text-white hover:bg-red-500">
                  <Video /> Join live class: <span className="truncate">{live.title}</span>
                </LinkButton>
              )}
              <div>
                <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                  <span>
                    {p.done}/{p.total} completed
                  </span>
                  <span className="tabular-nums">{p.percent.toFixed(0)}%</span>
                </div>
                <Progress value={p.percent} />
              </div>
              {showContinue && p.next && (
                <Link href={`/learn/${c.id}/${p.next.id}`} className="flex items-center gap-1 text-sm text-primary hover:underline">
                  <span className="truncate">Next: {p.next.title}</span> <ArrowRight className="size-3.5 shrink-0" />
                </Link>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

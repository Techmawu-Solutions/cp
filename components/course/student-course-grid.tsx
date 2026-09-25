"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/common/empty-state";
import { useStudentData } from "@/lib/student";
import { teacherName } from "@/lib/session";

export function StudentCourseGrid({ showContinue }: { showContinue?: boolean }) {
  const s = useStudentData();
  const { d } = s;
  if (s.courses.length === 0) return <EmptyState title="You're not registered for any subjects yet" description="Your school registers you for subjects at the start of each session." />;
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {s.courses.map((c) => {
        const p = s.progressOf(c.id);
        const subject = d.byId.subject.get(c.subjectId);
        return (
          <Card key={c.id} className="overflow-hidden pt-0">
            <div className="h-2" style={{ background: subject?.color }} />
            <CardContent className="space-y-3">
              <Link href={`/student/courses/${c.id}`} className="block">
                <p className="font-semibold hover:underline">{subject?.name}</p>
                <p className="text-sm text-muted-foreground">{teacherName(d.byId.teacher.get(c.teacherId))}</p>
              </Link>
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
                <Link href={`/student/courses/${c.id}/lessons/${p.next.id}`} className="flex items-center gap-1 text-sm text-primary hover:underline">
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

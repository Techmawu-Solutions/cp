"use client";

import Link from "next/link";
import { Users, UserSquare2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { SessionBanner } from "@/components/academic/session-banner";
import { useStudentData } from "@/lib/student";
import { teacherName } from "@/lib/session";
import { useLiveNow } from "@/lib/live";
import { LiveBadge } from "@/components/classroom/live-badge";
import { cn } from "@/lib/utils";

/** Student: My Classes (spec §64 screen 35). */
export default function StudentClassesPage() {
  const s = useStudentData();
  const { d } = s;
  const { byCourse } = useLiveNow();
  const cls = d.byId.class.get(s.classId ?? "");
  if (!cls)
    return (
      <>
        <PageHeader title="My Classes" />
        <SessionBanner />
        <EmptyState title="You're not in a class this session" description="Your school administrator places you in a class." />
      </>
    );
  const classmates = d.placements.filter((p) => p.classId === cls.id).length;
  return (
    <>
      <PageHeader title="My Classes" description={d.session.label} />
      <SessionBanner />
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-xl">{cls.name}</CardTitle>
          <CardDescription>{d.byId.programme.get(cls.programmeId)?.name}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-6 text-sm">
          <span className="flex items-center gap-2">
            <UserSquare2 className="size-4 text-muted-foreground" /> Class teacher: {teacherName(d.byId.teacher.get(cls.classTeacherId ?? ""))}
          </span>
          <span className="flex items-center gap-2">
            <Users className="size-4 text-muted-foreground" /> {classmates} students
          </span>
        </CardContent>
      </Card>
      <h2 className="mb-2 font-semibold">Subjects in {cls.name}</h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {s.courses.map((c) => (
          <Link key={c.id} href={`/student/courses/${c.id}`}>
            <Card className={cn("h-full hover:shadow-md hover:ring-primary/30", byCourse.has(c.id) && "ring-2 ring-red-500/60")}>
              <CardContent className="flex items-center gap-3">
                <span className="h-10 w-1.5 rounded-full" style={{ background: d.byId.subject.get(c.subjectId)?.color }} />
                <div className="min-w-0">
                  <p className="font-medium">
                    {d.byId.subject.get(c.subjectId)?.name} — {cls.name}
                  </p>
                  <p className="text-sm text-muted-foreground">{teacherName(d.byId.teacher.get(c.teacherId))}</p>
                </div>
                {byCourse.has(c.id) && <LiveBadge className="ml-auto" />}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}

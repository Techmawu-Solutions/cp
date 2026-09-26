"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowRight, MessagesSquare, Radio, Megaphone, Video } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { LinkButton } from "@/components/common/link-button";
import { StatusBadge } from "@/components/common/status-badge";
import { UrlTabs } from "@/components/common/url-tabs";
import { ModuleList } from "@/components/course/module-list";
import { RecordingsGrid } from "@/components/classroom/live-tables";
import { LiveBadge } from "@/components/classroom/live-badge";
import { PerformanceBreakdown } from "@/components/assessment/gradebook";
import { StudentWorkList } from "@/components/assessment/student-work-list";
import { useStudentData } from "@/lib/student";
import { teacherName } from "@/lib/session";
import { fmtAgo, fmtDay, fmtTime } from "@/lib/helpers";

/** Course Workspace — student view (spec §64 screen 36). */
export default function StudentCoursePage() {
  const { id } = useParams<{ id: string }>();
  const s = useStudentData();
  const { d } = s;
  const course = s.courses.find((c) => c.id === id);
  if (!course) return <EmptyState title="Course not available" description="You can only open subjects you're registered for in this session." className="mt-8" />;
  const p = s.progressOf(course.id);
  const subject = d.byId.subject.get(course.subjectId);
  const upcoming = s.liveSessions.filter((l) => l.courseId === course.id && l.status !== "ended" && l.status !== "cancelled").sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  const liveNow = upcoming.find((l) => l.status === "live");
  const announcements = d.announcements.filter((a) => a.courseId === course.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Learning", href: "/student/learning" }, { label: course.title }]}
        title={
          <span className="flex items-center gap-3">
            <span className="size-3 rounded-full" style={{ background: subject?.color }} /> {subject?.name} — {d.byId.class.get(course.classId)?.name}
            {liveNow && <LiveBadge liveId={liveNow.id} />}
          </span>
        }
        description={teacherName(d.byId.teacher.get(course.teacherId))}
        actions={
          <>
            {liveNow && (
              <LinkButton href={`/classroom/${liveNow.id}/lobby`} className="bg-red-600 text-white hover:bg-red-500">
                <Video /> Join live class
              </LinkButton>
            )}
            <LinkButton variant="outline" href={`/forums/${course.id}`}>
              <MessagesSquare /> Class forum
            </LinkButton>
            {p.next && (
              <LinkButton href={`/student/courses/${course.id}/lessons/${p.next.id}`}>
                Continue <ArrowRight />
              </LinkButton>
            )}
          </>
        }
      />
      <Card className="mb-4">
        <CardContent className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">Progress</span>
          <Progress value={p.percent} className="flex-1" />
          <span className="text-sm font-semibold tabular-nums">
            {p.done}/{p.total} · {p.percent.toFixed(0)}%
          </span>
        </CardContent>
      </Card>
      {upcoming[0] && (
        <Card className="mb-4 border-primary/30 bg-primary/5">
          <CardContent className="flex flex-wrap items-center gap-3">
            <Radio className="size-5 text-primary" />
            <div className="flex-1">
              <p className="font-medium">{upcoming[0].title}</p>
              <p className="text-sm text-muted-foreground">
                {fmtDay(upcoming[0].scheduledAt)} — {fmtTime(upcoming[0].scheduledAt)}
              </p>
            </div>
            {upcoming[0].status === "live" && <StatusBadge status="live">Live now</StatusBadge>}
            <LinkButton href={`/classroom/${upcoming[0].id}/lobby`}>{upcoming[0].status === "live" ? "Join Class" : "Open lobby"}</LinkButton>
          </CardContent>
        </Card>
      )}
      <Suspense>
        <UrlTabs tabs={[{ value: "content", label: "Content" }, { value: "work", label: "Assignments & Quizzes" }, { value: "recordings", label: "Recordings" }, { value: "grades", label: "Grades" }, { value: "announcements", label: `Announcements (${announcements.length})` }]}>
          {(tab) =>
            tab === "content" ? (
              <ModuleList course={course} mode="learn" completed={s.done} itemHref={(it) => `/student/courses/${course.id}/lessons/${it.id}`} />
            ) : tab === "work" ? (
              <StudentWorkList assessments={s.assessments.filter((a) => a.courseId === course.id)} />
            ) : tab === "recordings" ? (
              <RecordingsGrid rows={s.recordings.filter((r) => r.courseId === course.id)} />
            ) : tab === "grades" ? (
              <Card className="max-w-lg">
                <CardHeader>
                  <CardTitle>My performance</CardTitle>
                </CardHeader>
                <CardContent>{s.student && <PerformanceBreakdown studentId={s.student.id} course={course} data={d} />}</CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {announcements.length === 0 && <EmptyState icon={Megaphone} title="No announcements" />}
                {announcements.map((a) => (
                  <Card key={a.id}>
                    <CardContent>
                      <p className="font-medium">{a.title}</p>
                      <p className="mt-1 text-sm whitespace-pre-wrap text-muted-foreground">{a.body}</p>
                      <p className="mt-2 text-xs text-muted-foreground">{fmtAgo(a.createdAt)}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )
          }
        </UrlTabs>
      </Suspense>
      <p className="mt-6 text-center text-xs text-muted-foreground">
        Questions? Ask in the <Link href={`/forums/${course.id}`} className="text-primary hover:underline">class forum</Link> — only your classmates in this subject and your teacher can see it.
      </p>
    </>
  );
}

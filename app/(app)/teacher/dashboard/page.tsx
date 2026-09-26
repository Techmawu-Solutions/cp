"use client";

import Link from "next/link";
import { BookOpen, ClipboardCheck, MessagesSquare, Radio, Users, Video } from "lucide-react";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { LinkButton } from "@/components/common/link-button";
import { StatusBadge } from "@/components/common/status-badge";
import { SessionBanner } from "@/components/academic/session-banner";
import { useTeacherData } from "@/lib/teacher";
import { useCurrentUser, studentName } from "@/lib/session";
import { useMyForums } from "@/lib/communication";
import { fmtAgo, fmtDay, fmtTime, greeting, plural } from "@/lib/helpers";
import { useNow } from "@/lib/use-now";
import { isUpcomingOrLive } from "@/lib/live-reports";

/** Teacher dashboard (spec §28). */
export default function TeacherDashboard() {
  const me = useCurrentUser();
  const t = useTeacherData();
  const forums = useMyForums();
  const now = useNow();
  const { d } = t;
  const upcoming = t.liveSessions.filter((l) => isUpcomingOrLive(l, now)).sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)).slice(0, 5);
  const toGrade = d.submissions.filter((s) => (s.status === "submitted" || s.status === "late") && t.assessments.some((a) => a.id === s.assessmentId));
  const title = t.teacher ? `${t.teacher.title} ${t.teacher.lastName}` : me?.user.name;

  return (
    <>
      <PageHeader title={`${greeting()}, ${title}`} description={`${d.school?.name} · ${d.session.label}`} />
      <SessionBanner />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="My classes" value={t.courses.length} icon={BookOpen} href="/teacher/classes" />
        <StatCard label="Students" value={t.students.length} icon={Users} tone="green" href="/teacher/students" />
        <StatCard label="To grade" value={toGrade.length} icon={ClipboardCheck} tone="amber" href="/teacher/assessments" />
        <StatCard label="Live classes" value={upcoming.length} icon={Video} tone="rose" hint="upcoming" href="/teacher/live" />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>My Classes</CardTitle>
            <CardAction>
              <Link href="/teacher/subjects" className="text-xs text-primary hover:underline">
                All subjects
              </Link>
            </CardAction>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {t.courses.length === 0 && <p className="text-sm text-muted-foreground">You haven&apos;t been assigned any classes this session.</p>}
            {t.courses.map((c) => {
              const subject = d.byId.subject.get(c.subjectId);
              return (
                <Link key={c.id} href={`/teacher/courses/${c.id}`} className="group rounded-xl border p-4 transition-colors hover:border-primary/40 hover:bg-accent/30">
                  <div className="flex items-center gap-2">
                    <span className="h-8 w-1.5 rounded-full" style={{ background: subject?.color }} />
                    <div className="min-w-0">
                      <p className="truncate font-semibold">
                        {d.byId.class.get(c.classId)?.name} — {subject?.name}
                      </p>
                      <p className="text-sm text-muted-foreground">{t.studentsOf(c.id).length} Students</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming classes</CardTitle>
            <CardAction>
              <Link href="/teacher/live" className="text-xs text-primary hover:underline">
                Schedule
              </Link>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcoming.length === 0 && <p className="text-sm text-muted-foreground">No live classes scheduled.</p>}
            {upcoming.map((l) => {
              const startable = l.status === "live" || Date.parse(l.scheduledAt) - now < 30 * 60_000;
              return (
                <div key={l.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-semibold tabular-nums">{fmtTime(l.scheduledAt)}</p>
                    {l.status === "live" ? <StatusBadge status="live">Live</StatusBadge> : <span className="text-xs text-muted-foreground">{fmtDay(l.scheduledAt)}</span>}
                  </div>
                  <p className="text-sm">
                    {d.byId.subject.get(l.subjectId)?.name} — {d.byId.class.get(l.classId)?.name}
                  </p>
                  <p className="mb-2 truncate text-xs text-muted-foreground">{l.title}</p>
                  <LinkButton href={`/classroom/${l.id}/lobby`} size="sm" variant={startable ? "default" : "outline"} className="w-full">
                    <Radio /> {l.status === "live" ? "Rejoin class" : startable ? "Join Class" : "Open lobby"}
                  </LinkButton>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Waiting to be graded</CardTitle>
            <CardDescription>{toGrade.length} submissions</CardDescription>
          </CardHeader>
          <CardContent>
            {toGrade.length === 0 ? (
              <p className="text-sm text-muted-foreground">You&apos;re all caught up.</p>
            ) : (
              <ul className="divide-y">
                {toGrade.slice(0, 6).map((s) => {
                  const a = d.byId.assessment.get(s.assessmentId)!;
                  return (
                    <li key={s.id} className="flex items-center gap-3 py-2 text-sm">
                      <div className="min-w-0 flex-1">
                        <p className="truncate">
                          <span className="font-medium">{studentName(d.byId.student.get(s.studentId))}</span> · {a.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {d.byId.course.get(a.courseId)?.title} · {fmtAgo(s.submittedAt)}
                        </p>
                      </div>
                      <LinkButton size="xs" variant="outline" href={`/teacher/assessments/${a.id}`}>
                        Grade
                      </LinkButton>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessagesSquare className="size-4" /> Forum activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {forums.filter((f) => f.threads > 0).slice(0, 5).map((f) => (
              <Link key={f.course.id} href={`/forums/${f.course.id}`} className="flex items-center gap-2 rounded-md p-1.5 text-sm hover:bg-muted">
                <span className="flex-1 truncate">{f.course.title}</span>
                {f.unread > 0 ? <span className="text-xs font-medium text-primary">{f.unread} new</span> : <span className="text-xs text-muted-foreground">{plural(f.threads, "thread")}</span>}
              </Link>
            ))}
            {forums.every((f) => f.threads === 0) && <p className="text-sm text-muted-foreground">No forum posts yet.</p>}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

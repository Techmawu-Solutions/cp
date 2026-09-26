"use client";

import Link from "next/link";
import { ArrowRight, CalendarClock, Megaphone, PlayCircle, Radio } from "lucide-react";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/common/page-header";
import { LinkButton } from "@/components/common/link-button";
import { StatusBadge } from "@/components/common/status-badge";
import { GradePill } from "@/components/assessment/gradebook";
import { CONTENT_META } from "@/components/course/content-meta";
import { SessionBanner } from "@/components/academic/session-banner";
import { useStudentData } from "@/lib/student";
import { fmtAgo, fmtDay, fmtTime } from "@/lib/helpers";
import { isUpcomingOrLive } from "@/lib/live-reports";
import { useNow } from "@/lib/use-now";

/** Student learning dashboard (spec §30). */
export default function StudentDashboard() {
  const s = useStudentData();
  const { d } = s;
  // Continue where the student left off: the most-progressed course with something left to do.
  const cont = s.courses
    .map((c) => ({ c, p: s.progressOf(c.id) }))
    .filter((x) => x.p.next)
    .sort((a, b) => b.p.percent - a.p.percent)[0];
  const now = useNow();
  const upcoming = s.liveSessions.filter((l) => isUpcomingOrLive(l, now)).sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)).slice(0, 3);
  const due = s.assessments.filter((a) => s.stateOf(a) === "todo").sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 4);
  const recentGrades = s.assessments
    .map((a) => ({ a, sub: s.submissionFor(a) }))
    .filter((x) => x.sub?.score != null)
    .sort((a, b) => (b.sub!.gradedAt ?? "").localeCompare(a.sub!.gradedAt ?? ""))
    .slice(0, 4);
  const announcements = d.announcements.filter((a) => !a.courseId || s.courses.some((c) => c.id === a.courseId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 3);

  return (
    <>
      <PageHeader title={`Welcome Back, ${s.student?.firstName ?? "Student"}`} description={`${d.byId.class.get(s.classId ?? "")?.name ?? ""} · ${d.session.label}`} />
      <SessionBanner />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Learning Progress</CardTitle>
            <CardDescription>Across all your subjects</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center gap-4">
              <Progress value={s.overall} className="flex-1 [&_[data-slot=progress-track]]:h-3" />
              <span className="text-2xl font-semibold tabular-nums">{s.overall.toFixed(0)}%</span>
            </div>
            {cont && (
              <div className="rounded-xl border bg-accent/40 p-4">
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Continue Learning</p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  {(() => {
                    const M = CONTENT_META[cont.p.next!.type];
                    return <M.icon className={`size-5 ${M.color}`} />;
                  })()}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{cont.p.next!.title}</p>
                    <p className="text-sm text-muted-foreground">{cont.c.title}</p>
                  </div>
                  <LinkButton href={`/learn/${cont.c.id}/${cont.p.next!.id}`}>
                    Continue <ArrowRight />
                  </LinkButton>
                </div>
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              {s.courses.slice(0, 6).map((c) => {
                const p = s.progressOf(c.id);
                return (
                  <Link key={c.id} href={`/learn/${c.id}`} className="rounded-lg border p-3 hover:bg-muted/50">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="size-2.5 rounded-full" style={{ background: d.byId.subject.get(c.subjectId)?.color }} />
                      <span className="truncate text-sm font-medium">{d.byId.subject.get(c.subjectId)?.name}</span>
                      <span className="ml-auto text-xs text-muted-foreground tabular-nums">{p.percent.toFixed(0)}%</span>
                    </div>
                    <Progress value={p.percent} />
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Radio className="size-4" /> Upcoming
            </CardTitle>
            <CardAction>
              <Link href="/student/live" className="text-xs text-primary hover:underline">
                All live classes
              </Link>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcoming.length === 0 && <p className="text-sm text-muted-foreground">No live classes scheduled.</p>}
            {upcoming.map((l) => (
              <div key={l.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Live Class</p>
                  {l.status === "live" && <StatusBadge status="live">Live now</StatusBadge>}
                </div>
                <p className="mt-1 font-semibold">
                  {d.byId.subject.get(l.subjectId)?.name} — {d.byId.class.get(l.classId)?.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {fmtDay(l.scheduledAt)} — {fmtTime(l.scheduledAt)}
                </p>
                <p className="truncate text-xs text-muted-foreground">{l.title}</p>
                <LinkButton href={`/classroom/${l.id}/lobby`} size="sm" className="mt-2 w-full" variant={l.status === "live" ? "default" : "outline"}>
                  {l.status === "live" ? "Join Class" : "Open lobby"}
                </LinkButton>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="size-4" /> Due soon
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {due.length === 0 && <p className="text-sm text-muted-foreground">Nothing due. Nice work!</p>}
            {due.map((a) => (
              <Link key={a.id} href={`/student/assessments/${a.id}`} className="flex items-center gap-3 rounded-lg border p-2.5 hover:bg-muted/50">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{a.title}</p>
                  <p className="text-xs text-muted-foreground">{d.byId.subject.get(a.subjectId)?.name}</p>
                </div>
                <span className="text-xs whitespace-nowrap text-amber-700 dark:text-amber-300">due {fmtAgo(a.dueDate)}</span>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent grades</CardTitle>
            <CardAction>
              <Link href="/student/grades" className="text-xs text-primary hover:underline">
                All grades
              </Link>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentGrades.length === 0 && <p className="text-sm text-muted-foreground">No grades yet.</p>}
            {recentGrades.map(({ a, sub }) => {
              const pct = (sub!.score! / a.totalMarks) * 100;
              return (
                <div key={a.id} className="flex items-center gap-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{a.title}</p>
                    <p className="text-xs text-muted-foreground">{d.byId.subject.get(a.subjectId)?.name}</p>
                  </div>
                  <span className="tabular-nums">
                    {sub!.score}/{a.totalMarks}
                  </span>
                  <GradePill percent={pct} />
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="size-4" /> Announcements
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {announcements.length === 0 && <p className="text-sm text-muted-foreground">No announcements.</p>}
            {announcements.map((a) => (
              <div key={a.id}>
                <p className="text-sm font-medium">{a.title}</p>
                <p className="line-clamp-2 text-xs text-muted-foreground">{a.body}</p>
              </div>
            ))}
            {s.recordings.length > 0 && (
              <Link href="/student/live?tab=recordings" className="flex items-center gap-2 border-t pt-3 text-sm text-primary hover:underline">
                <PlayCircle className="size-4" /> {s.recordings.length} class recordings to watch
              </Link>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

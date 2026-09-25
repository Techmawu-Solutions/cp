"use client";

import { useMemo } from "react";
import Link from "next/link";
import { BookMarked, Layers, Rocket, UserCheck, Users, UserSquare2, Video, Megaphone } from "lucide-react";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { ActivityChart, UsageChart } from "@/components/dashboard/charts";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { StatusBadge } from "@/components/common/status-badge";
import { LinkButton } from "@/components/common/link-button";
import { SessionBanner } from "@/components/academic/session-banner";
import { useSchoolData } from "@/lib/queries";
import { useStore } from "@/lib/store";
import { useCurrentUser } from "@/lib/session";
import { dailySeries } from "@/lib/analytics";
import { useNow } from "@/lib/use-now";
import { avg, fmtNumber, fmtTime, fmtAgo, greeting } from "@/lib/helpers";

/** School Administrator dashboard (spec §14). */
export default function SchoolDashboard() {
  const d = useSchoolData();
  const me = useCurrentUser();
  const auditLogs = useStore((s) => s.auditLogs);
  const users = useStore((s) => s.users);
  const today = new Date().toDateString();

  const now = useNow(60_000);
  const activeStudents = useMemo(() => {
    const byUser = new Map(users.map((u) => [u.id, u]));
    return d.students.filter((s) => {
      const la = byUser.get(s.userId)?.lastActive;
      return la && now - Date.parse(la) < 7 * 86_400_000;
    }).length;
  }, [d.students, users, now]);
  const liveToday = d.liveSessions.filter((l) => new Date(l.scheduledAt).toDateString() === today).sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  const series = useMemo(() => dailySeries(`school-${d.schoolId}-${d.sessionId}`, activeStudents * 0.8), [d.schoolId, d.sessionId, activeStudents]);
  const classFill = d.classes.map((c) => ({ label: c.name, students: d.placements.filter((p) => p.classId === c.id).length, capacity: c.capacity }));
  const physical = d.attendance.filter((a) => a.kind === "physical");
  const attendanceRate = physical.length ? (physical.filter((a) => a.status === "present" || a.status === "late").length / physical.length) * 100 : 0;
  const scores = d.submissions.filter((s) => s.score != null).map((s) => (s.score! / (d.byId.assessment.get(s.assessmentId)?.totalMarks ?? 1)) * 100);
  const setupDone = [d.programmes.length, d.classes.length, d.subjects.length, d.teachers.length, d.students.length, d.enrollments.length].filter(Boolean).length;

  return (
    <>
      <PageHeader title="School Dashboard" description={`${greeting()}, ${me?.user.name.split(" ")[0]}. Here's ${d.school?.shortName ?? "your school"} for ${d.session.label}.`} />
      <SessionBanner />

      {setupDone < 6 && (
        <Card className="mb-4 border-primary/30 bg-primary/5">
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Rocket className="size-5 text-primary" />
            <div className="flex-1">
              <p className="font-medium">Finish setting up this session</p>
              <p className="text-sm text-muted-foreground">{setupDone} of 6 setup steps complete.</p>
            </div>
            <LinkButton href="/school/setup">Open setup guide</LinkButton>
          </CardContent>
        </Card>
      )}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="Students" value={fmtNumber(d.students.length)} icon={Users} tone="green" href="/school/students" hint={`${d.allStudents.filter((s) => s.status === "active").length} active in school`} />
        <StatCard label="Teachers" value={fmtNumber(d.teachers.length)} icon={UserSquare2} tone="violet" href="/school/teachers" />
        <StatCard label="Classes" value={fmtNumber(d.classes.length)} icon={Layers} tone="blue" href="/school/classes" />
        <StatCard label="Subjects" value={fmtNumber(d.subjects.length)} icon={BookMarked} tone="amber" href="/school/subjects" />
        <StatCard label="Live Classes Today" value={fmtNumber(liveToday.length)} icon={Video} tone="rose" href="/school/live-classes" />
        <StatCard label="Active Students" value={fmtNumber(activeStudents)} icon={UserCheck} tone="teal" hint="signed in within 7 days" />
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Student activity</CardTitle>
            <CardDescription>Daily active students, last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityChart data={series} series={[{ key: "value", label: "Active students" }]} height={230} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Session at a glance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <div className="mb-1.5 flex justify-between text-sm">
                <span>Attendance rate (last 5 days)</span>
                <span className="font-semibold tabular-nums">{attendanceRate.toFixed(1)}%</span>
              </div>
              <Progress value={attendanceRate} />
            </div>
            <div>
              <div className="mb-1.5 flex justify-between text-sm">
                <span>Average assessment score</span>
                <span className="font-semibold tabular-nums">{avg(scores).toFixed(1)}%</span>
              </div>
              <Progress value={avg(scores)} />
            </div>
            <div className="grid grid-cols-2 gap-3 border-t pt-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Assessments</p>
                <p className="text-lg font-semibold">{d.assessments.length}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Recordings</p>
                <p className="text-lg font-semibold">{d.recordings.length}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Programmes</p>
                <p className="text-lg font-semibold">{d.programmes.length}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Enrolments</p>
                <p className="text-lg font-semibold">{fmtNumber(d.enrollments.length)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="size-4" /> Live classes today
            </CardTitle>
            <CardAction>
              <Link href="/school/live-classes" className="text-xs text-primary hover:underline">
                View all
              </Link>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-2">
            {liveToday.length === 0 && <p className="text-sm text-muted-foreground">No live classes scheduled today.</p>}
            {liveToday.map((l) => (
              <div key={l.id} className="flex items-center gap-3 rounded-lg border p-2.5">
                <span className="w-16 shrink-0 text-sm font-medium tabular-nums">{fmtTime(l.scheduledAt)}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">
                    {d.byId.subject.get(l.subjectId)?.name} — {d.byId.class.get(l.classId)?.name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{l.title}</p>
                </div>
                <StatusBadge status={l.status} />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Class enrolment</CardTitle>
            <CardDescription>Students per class</CardDescription>
          </CardHeader>
          <CardContent>
            <UsageChart data={classFill} series={[{ key: "students", label: "Students" }]} height={240} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <CardAction>
              <Link href="/school/audit-logs" className="text-xs text-primary hover:underline">
                Audit logs
              </Link>
            </CardAction>
          </CardHeader>
          <CardContent>
            <RecentActivity logs={auditLogs.filter((l) => l.schoolId === d.schoolId)} limit={6} />
          </CardContent>
        </Card>
      </section>

      {d.announcements.length > 0 && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="size-4" /> Announcements
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {d.announcements.map((a) => (
              <div key={a.id} className="rounded-lg border p-3">
                <p className="font-medium">{a.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{a.body}</p>
                <p className="mt-2 text-xs text-muted-foreground">{fmtAgo(a.createdAt)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </>
  );
}

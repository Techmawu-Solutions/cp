"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Activity, BookOpen, ClipboardCheck, HardDrive, NotebookPen, Plus, School, UserCheck, Users, UserSquare2, Video, CalendarClock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardAction } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { ActivityChart, UsageChart } from "@/components/dashboard/charts";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { LinkButton } from "@/components/common/link-button";
import { SchoolLogo } from "@/components/common/user-avatar";
import { StatusBadge } from "@/components/common/status-badge";
import { useStore } from "@/lib/store";
import { useCurrentUser } from "@/lib/session";
import { byRegion, dailySeries, monthlySeries, platformTotals } from "@/lib/analytics";
import { fmtAgo, fmtCompact, fmtNumber, fmtTime, greeting } from "@/lib/helpers";
import { locationLabel } from "@/lib/data/geography";

export default function SuperAdminDashboardPage() {
  const me = useCurrentUser();
  const router = useRouter();
  // Custom platform roles (e.g. Regional Officer) without user management land on their analytics instead.
  const limited = !!me && !me.can("users.view");
  useEffect(() => {
    if (limited) router.replace(me!.can("analytics.national") ? "/super-admin/analytics" : "/super-admin/analytics/regions");
  }, [limited, me, router]);
  return limited ? null : <SuperAdminDashboard />;
}

function SuperAdminDashboard() {
  const db = useStore();
  const me = useCurrentUser();
  const totals = useMemo(() => platformTotals(db), [db]);
  const regions = useMemo(() => byRegion(db).sort((a, b) => b.students - a.students), [db]);
  const dau = useMemo(() => dailySeries("platform-dau", totals.activeUsers * 0.55), [totals.activeUsers]);
  const mau = useMemo(() => monthlySeries("platform-mau", totals.mau), [totals.mau]);
  const pending = db.schools.filter((s) => s.status === "pending");
  const today = new Date().toDateString();
  const liveToday = db.liveSessions.filter((l) => new Date(l.scheduledAt).toDateString() === today).sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${me?.user.name.split(" ")[0] === "Platform" ? "Administrator" : me?.user.name.split(" ")[0]}`}
        description="Platform overview across every school, region and district."
        actions={
          me?.can("schools.create") && (
            <LinkButton href="/super-admin/schools/new">
              <Plus /> Add School
            </LinkButton>
          )
        }
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Schools" value={fmtNumber(totals.schools)} icon={School} hint={`${fmtNumber(totals.activeSchools)} active`} href="/super-admin/schools" />
        <StatCard label="Students" value={fmtNumber(totals.students)} icon={Users} tone="green" trend={4.2} hint="vs last month" href="/super-admin/users?role=student" />
        <StatCard label="Teachers" value={fmtNumber(totals.teachers)} icon={UserSquare2} tone="violet" trend={2.1} hint="vs last month" href="/super-admin/users?role=teacher" />
        <StatCard label="Active Users" value={fmtNumber(totals.activeUsers)} icon={UserCheck} tone="teal" hint="active in the last 7 days" href="/super-admin/analytics" />
      </section>
      <section className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Live Classes Today" value={fmtNumber(totals.liveToday)} icon={Video} tone="rose" href="/super-admin/live" />
        <StatCard label="Courses" value={fmtCompact(totals.courses)} icon={BookOpen} tone="blue" href="/super-admin/content" />
        <StatCard label="Assessments" value={fmtCompact(totals.assessments)} icon={ClipboardCheck} tone="amber" href="/super-admin/assessments" />
        <StatCard label="Assignments" value={fmtCompact(totals.assignments)} icon={NotebookPen} tone="violet" />
        <StatCard label="Platform Storage" value={`${fmtNumber(totals.storageGb)} GB`} icon={HardDrive} tone="teal" hint={`${((totals.storageGb / totals.storageQuotaGb) * 100).toFixed(0)}% of quota`} />
        <StatCard label="Monthly Active Users" value={fmtCompact(totals.mau)} icon={Activity} tone="green" trend={6.8} />
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Daily active users</CardTitle>
            <CardDescription>Students and teachers signed in, last 30 days. Weekend dips are expected.</CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityChart data={dau} series={[{ key: "value", label: "Active users" }]} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent platform activity</CardTitle>
            <CardAction>
              <Link href="/super-admin/audit-logs" className="text-xs text-primary hover:underline">
                Audit logs
              </Link>
            </CardAction>
          </CardHeader>
          <CardContent>
            <RecentActivity logs={db.auditLogs} limit={7} />
          </CardContent>
        </Card>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Students by region</CardTitle>
            <CardDescription>Enrolled students across Ghana&apos;s 16 regions.</CardDescription>
            <CardAction>
              <Link href="/super-admin/analytics/regions" className="text-xs text-primary hover:underline">
                Regional analytics
              </Link>
            </CardAction>
          </CardHeader>
          <CardContent>
            <UsageChart data={regions.map((r) => ({ label: r.region.name, students: r.students }))} series={[{ key: "students", label: "Students" }]} layout="vertical" height={420} />
          </CardContent>
        </Card>
        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Monthly active users</CardTitle>
              <CardDescription>Last 12 months</CardDescription>
            </CardHeader>
            <CardContent>
              <ActivityChart data={mau} series={[{ key: "value", label: "MAU", color: "var(--chart-2)" }]} height={170} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Awaiting activation</CardTitle>
              <CardDescription>{pending.length} schools pending</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {pending.slice(0, 4).map((s) => (
                <Link key={s.id} href={`/super-admin/schools/${s.id}`} className="flex items-center gap-3 rounded-lg p-1 hover:bg-muted">
                  <SchoolLogo name={s.name} color={s.logoColor} src={s.logoUrl} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{s.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {locationLabel(s)}
                    </p>
                  </div>
                  <StatusBadge status="pending" />
                </Link>
              ))}
              {pending.length === 0 && <p className="text-sm text-muted-foreground">No schools waiting.</p>}
            </CardContent>
          </Card>
        </div>
      </section>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="size-4" /> Live classes today (demo tenants)
          </CardTitle>
          <CardAction>
            <Link href="/super-admin/live" className="text-xs text-primary hover:underline">
              All live sessions
            </Link>
          </CardAction>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {liveToday.map((l) => {
              const school = db.schools.find((s) => s.id === l.schoolId);
              const cls = db.classes.find((c) => c.id === l.classId);
              const subject = db.subjects.find((s) => s.id === l.subjectId);
              return (
                <div key={l.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium tabular-nums">{fmtTime(l.scheduledAt)}</span>
                    <StatusBadge status={l.status} />
                  </div>
                  <p className="mt-1 truncate text-sm">
                    {subject?.name} — {cls?.name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {school?.shortName} · {l.title} · {fmtAgo(l.scheduledAt)}
                  </p>
                </div>
              );
            })}
          </div>
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs text-muted-foreground">
              <span>Recording storage</span>
              <span>
                {fmtNumber(totals.storageGb)} / {fmtNumber(totals.storageQuotaGb)} GB
              </span>
            </div>
            <Progress value={(totals.storageGb / totals.storageQuotaGb) * 100} />
          </div>
        </CardContent>
      </Card>
    </>
  );
}

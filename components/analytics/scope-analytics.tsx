"use client";

import { useMemo } from "react";
import { Activity, BookOpen, ClipboardCheck, NotebookPen, School, UserCheck, Users, UserSquare2, Video, Gauge } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { StatCard } from "@/components/dashboard/stat-card";
import { ActivityChart, DonutChart, ChartLegend, CHART_COLORS, UsageChart } from "@/components/dashboard/charts";
import { dailySeries, monthlySeries, weeklyActivity, type Aggregate } from "@/lib/analytics";
import { fmtCompact, fmtNumber, hashString, rng } from "@/lib/helpers";

/**
 * Shared analytics body for national / regional / district / school scopes
 * (spec §43–49). `scopeKey` seeds the synthetic time series so each scope has
 * its own stable shape.
 */
export function ScopeAnalytics({ scopeKey, agg, breakdown, breakdownTitle, showSchools = true }: { scopeKey: string; agg: Aggregate; breakdown?: React.ReactNode; breakdownTitle?: string; showSchools?: boolean }) {
  const r = rng(hashString(scopeKey));
  const dau = useMemo(() => dailySeries(scopeKey, (agg.activeStudents + agg.activeTeachers) * 0.62), [scopeKey, agg]);
  const mau = useMemo(() => monthlySeries(scopeKey, (agg.students + agg.teachers) * 0.84), [scopeKey, agg]);
  const weekly = useMemo(() => weeklyActivity(scopeKey, agg.students * 0.9), [scopeKey, agg]);
  const studentActivity = agg.students ? (agg.activeStudents / agg.students) * 100 : 0;
  const teacherActivity = agg.teachers ? (agg.activeTeachers / agg.teachers) * 100 : 0;
  const liveUsage = Math.min(96, 55 + r.next() * 35);
  const submissions = Math.round(agg.assignments * agg.students / Math.max(1, agg.teachers) * 0.7);
  const courseViews = Math.round(agg.activeStudents * 23.4);
  const engagement = [
    { name: "Highly engaged", value: Math.round(agg.activeStudents * 0.46) },
    { name: "Engaged", value: Math.round(agg.activeStudents * 0.54) },
    { name: "At risk", value: Math.round((agg.students - agg.activeStudents) * 0.6) },
    { name: "Inactive", value: Math.round((agg.students - agg.activeStudents) * 0.4) },
  ];

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {showSchools && <StatCard label="Schools" value={fmtNumber(agg.schools)} icon={School} hint={`${fmtNumber(agg.activeSchools)} active`} />}
        <StatCard label="Students" value={fmtNumber(agg.students)} icon={Users} tone="green" />
        <StatCard label="Teachers" value={fmtNumber(agg.teachers)} icon={UserSquare2} tone="violet" />
        <StatCard label="Monthly Active Users" value={fmtCompact(mau[mau.length - 1]!.value)} icon={Activity} tone="teal" trend={5.4} />
        <StatCard label="Daily Active Users" value={fmtCompact(dau[dau.length - 1]!.value)} icon={UserCheck} tone="blue" />
        <StatCard label="Live Classes" value={fmtNumber(agg.liveClasses)} icon={Video} tone="rose" />
        <StatCard label="Course Activity" value={fmtCompact(courseViews)} icon={BookOpen} hint="lesson views this month" />
        <StatCard label="Assessment Activity" value={fmtCompact(agg.quizzes + agg.assignments)} icon={ClipboardCheck} tone="amber" hint="assessments created" />
        <StatCard label="Assignment Submissions" value={fmtCompact(submissions)} icon={NotebookPen} tone="violet" />
        <StatCard label="Average Engagement" value={`${agg.engagement}%`} icon={Gauge} tone="green" hint="students active in 7 days" />
      </section>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Daily active users</CardTitle>
            <CardDescription>Last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityChart data={dau} series={[{ key: "value", label: "Active users" }]} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Usage rates</CardTitle>
            <CardDescription>Share of people active this week</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {[
              { label: "Student activity", value: studentActivity },
              { label: "Teacher activity", value: teacherActivity },
              { label: "Live class usage", value: liveUsage },
            ].map((m) => (
              <div key={m.label}>
                <div className="mb-1.5 flex justify-between text-sm">
                  <span>{m.label}</span>
                  <span className="font-semibold tabular-nums">{m.value.toFixed(0)}%</span>
                </div>
                <Progress value={m.value} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Learning activity by week</CardTitle>
            <CardDescription>Lesson completions, assignment submissions and live-class attendance this session</CardDescription>
          </CardHeader>
          <CardContent>
            <UsageChart
              data={weekly}
              series={[
                { key: "lessons", label: "Lesson completions" },
                { key: "submissions", label: "Submissions" },
                { key: "liveAttendance", label: "Live attendance" },
              ]}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Student engagement</CardTitle>
            <CardDescription>By activity over the last 30 days</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <DonutChart data={engagement} centerLabel="students" height={180} />
            <ChartLegend items={engagement.map((e, i) => ({ label: e.name, color: CHART_COLORS[i]!, value: fmtNumber(e.value) }))} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Monthly active users</CardTitle>
          <CardDescription>Last 12 months — dips reflect school holidays</CardDescription>
        </CardHeader>
        <CardContent>
          <ActivityChart data={mau} series={[{ key: "value", label: "MAU", color: "var(--chart-2)" }]} height={220} />
        </CardContent>
      </Card>

      {breakdown && (
        <Card>
          <CardHeader>
            <CardTitle>{breakdownTitle}</CardTitle>
          </CardHeader>
          <CardContent>{breakdown}</CardContent>
        </Card>
      )}
    </div>
  );
}

"use client";

import { useMemo } from "react";
import { ClipboardCheck, Clock, FileText, GraduationCap, Video, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { UsageChart, ActivityChart } from "@/components/dashboard/charts";
import { SessionBanner } from "@/components/academic/session-banner";
import { useTeacherData } from "@/lib/teacher";
import { gradebook } from "@/lib/queries";
import { useStore } from "@/lib/store";
import { avg, sum } from "@/lib/helpers";
import { dailySeries } from "@/lib/analytics";
import { isLive } from "@/lib/publishing";

/** Teacher analytics: activity (spec §49) and class performance (spec §39). */
export default function TeacherAnalyticsPage() {
  const t = useTeacherData();
  const progress = useStore((s) => s.progress);
  const { d } = t;
  const ended = t.liveSessions.filter((l) => l.status === "ended");
  const hours = sum(ended, (l) => (l.endedAt && l.startedAt ? (Date.parse(l.endedAt) - Date.parse(l.startedAt)) / 3_600_000 : 0));
  const content = d.contents.filter((c) => t.courses.some((k) => k.id === c.courseId));
  const graded = d.submissions.filter((s) => s.score != null && t.assessments.some((a) => a.id === s.assessmentId)).length;

  const perCourse = t.courses.map((c) => {
        const gb = gradebook(c, d);
        const p = gb.rows.map((r) => r.percent).filter((x): x is number => x != null);
        const items = d.contents.filter((x) => x.courseId === c.id && isLive(x));
        const roster = t.studentsOf(c.id);
        const done = progress.filter((pr) => roster.includes(pr.studentId) && items.some((i) => i.id === pr.contentId)).length;
        return { label: `${d.byId.class.get(c.classId)?.name} ${d.byId.subject.get(c.subjectId)?.code}`, average: Math.round(avg(p) * 10) / 10, pass: p.length ? Math.round((p.filter((x) => x >= 50).length / p.length) * 100) : 0, completion: items.length && roster.length ? Math.round((done / (items.length * roster.length)) * 100) : 0 };
      });
  const engagement = useMemo(() => dailySeries(`teacher-${t.teacher?.id}`, t.students.length * 0.7), [t.teacher, t.students.length]);

  return (
    <>
      <PageHeader title="Analytics" description="Your teaching activity and how your classes are performing." />
      <SessionBanner />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Students taught" value={t.students.length} icon={Users} tone="green" />
        <StatCard label="Classes conducted" value={ended.length} icon={Video} tone="rose" />
        <StatCard label="Live teaching hours" value={hours.toFixed(1)} icon={Clock} tone="amber" />
        <StatCard label="Content created" value={content.length} icon={FileText} tone="blue" />
        <StatCard label="Assessments created" value={t.assessments.length} icon={ClipboardCheck} tone="violet" />
        <StatCard label="Grades entered" value={graded} icon={GraduationCap} tone="teal" />
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Class performance</CardTitle>
            <CardDescription>Average score and pass rate by class</CardDescription>
          </CardHeader>
          <CardContent>
            <UsageChart data={perCourse} series={[{ key: "average", label: "Average %" }, { key: "pass", label: "Pass rate %" }]} percent height={280} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Content completion</CardTitle>
            <CardDescription>Share of published content completed by each class</CardDescription>
          </CardHeader>
          <CardContent>
            <UsageChart data={perCourse} series={[{ key: "completion", label: "Completion %", color: "var(--chart-2)" }]} percent height={280} />
          </CardContent>
        </Card>
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Student engagement</CardTitle>
            <CardDescription>Your students active on the platform, last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityChart data={engagement} series={[{ key: "value", label: "Active students" }]} height={220} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}

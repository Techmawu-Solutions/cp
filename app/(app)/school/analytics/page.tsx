"use client";

import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/common/page-header";
import { UsageChart } from "@/components/dashboard/charts";
import { ScopeAnalytics } from "@/components/analytics/scope-analytics";
import { RequirePermission } from "@/components/layout/app-shell";
import { useSchoolData, gradebook } from "@/lib/queries";
import { useStore } from "@/lib/store";
import { aggregate } from "@/lib/analytics";
import { avg } from "@/lib/helpers";

/** School analytics (spec §47) with programme / class / subject drill-down (spec §43). */
export default function SchoolAnalyticsPage() {
  const d = useSchoolData();
  const db = useStore();
  const agg = useMemo(() => aggregate(db, d.school ? [d.school] : []), [db, d.school]);
  const avgFor = (courseIds: string[]) => avg(d.courses.filter((c) => courseIds.includes(c.id)).flatMap((c) => gradebook(c, d).rows.map((r) => r.percent).filter((x): x is number => x != null)));
  const byProgramme = useMemo(() => d.programmes.map((p) => ({ label: p.code, average: Math.round(avgFor(d.courses.filter((c) => d.byId.class.get(c.classId)?.programmeId === p.id).map((c) => c.id)) * 10) / 10 })).filter((x) => x.average > 0), [d]); // eslint-disable-line react-hooks/exhaustive-deps
  const byClass = useMemo(() => d.classes.map((c) => ({ label: c.name, average: Math.round(avgFor(d.courses.filter((k) => k.classId === c.id).map((k) => k.id)) * 10) / 10 })), [d]); // eslint-disable-line react-hooks/exhaustive-deps
  const bySubject = useMemo(() => d.subjects.map((s) => ({ label: s.name, average: Math.round(avgFor(d.courses.filter((k) => k.subjectId === s.id).map((k) => k.id)) * 10) / 10 })).filter((x) => x.average > 0).sort((a, b) => b.average - a.average), [d]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <RequirePermission perm="analytics.school">
      <PageHeader title="School Analytics" description={`${d.school?.name} · ${d.session.label}`} />
      <ScopeAnalytics scopeKey={`school-${d.schoolId}`} agg={agg} showSchools={false} />
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Average score by class</CardTitle>
            <CardDescription>Across all graded assessments</CardDescription>
          </CardHeader>
          <CardContent>
            <UsageChart data={byClass} series={[{ key: "average", label: "Average %" }]} percent height={260} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Average score by programme</CardTitle>
          </CardHeader>
          <CardContent>
            <UsageChart data={byProgramme} series={[{ key: "average", label: "Average %", color: "var(--chart-2)" }]} percent height={260} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Average score by subject</CardTitle>
          </CardHeader>
          <CardContent>
            <UsageChart data={bySubject} series={[{ key: "average", label: "Average %", color: "var(--chart-4)" }]} layout="vertical" percent height={Math.max(220, bySubject.length * 30)} />
          </CardContent>
        </Card>
      </div>
    </RequirePermission>
  );
}

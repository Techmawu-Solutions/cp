"use client";

import { Suspense, useMemo } from "react";
import { PageHeader } from "@/components/common/page-header";
import { UrlTabs } from "@/components/common/url-tabs";
import { RequirePermission } from "@/components/layout/app-shell";
import { AssessmentsTable } from "@/components/assessment/assessments-table";
import { DataTable } from "@/components/tables/data-table";
import { ExportButton } from "@/components/tables/export-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UsageChart } from "@/components/dashboard/charts";
import { useStore } from "@/lib/store";
import { avg } from "@/lib/helpers";

export default function PlatformAssessmentsPage() {
  return (
    <RequirePermission perm="assessments.view">
      <PageHeader title="Assessments" description="Assessments, results and reports across all schools." breadcrumbs={[{ label: "Assessments" }]} />
      <Suspense>
        <Body />
      </Suspense>
    </RequirePermission>
  );
}

function Body() {
  const db = useStore();
  const results = useMemo(
    () =>
      db.assessments
        .map((a) => {
          const scores = db.submissions.filter((s) => s.assessmentId === a.id && s.score != null).map((s) => (s.score! / a.totalMarks) * 100);
          return { id: a.id, a, graded: scores.length, average: avg(scores), highest: scores.length ? Math.max(...scores) : 0, lowest: scores.length ? Math.min(...scores) : 0, passRate: scores.length ? (scores.filter((x) => x >= 50).length / scores.length) * 100 : 0 };
        })
        .filter((r) => r.graded > 0),
    [db],
  );
  const bySchool = useMemo(() => {
    const map = new Map<string, number[]>();
    results.forEach((r) => map.set(r.a.schoolId, [...(map.get(r.a.schoolId) ?? []), r.average]));
    return [...map.entries()].map(([id, v]) => ({ id, name: db.schools.find((s) => s.id === id)?.name ?? id, average: avg(v), assessments: v.length }));
  }, [results, db]);
  const bySubject = useMemo(() => {
    const map = new Map<string, number[]>();
    results.forEach((r) => {
      const name = db.subjects.find((s) => s.id === r.a.subjectId)?.name ?? "";
      map.set(name, [...(map.get(name) ?? []), r.average]);
    });
    return [...map.entries()].map(([label, v]) => ({ label, average: Math.round(avg(v) * 10) / 10 })).sort((a, b) => b.average - a.average);
  }, [results, db]);

  return (
    <UrlTabs tabs={[{ value: "assessments", label: "Assessments" }, { value: "results", label: "Results" }, { value: "reports", label: "Reports" }]}>
      {(tab) =>
        tab === "assessments" ? (
          <AssessmentsTable rows={db.assessments} showSchool />
        ) : tab === "results" ? (
          <DataTable
            rows={results}
            search={(r) => r.a.title}
            initialSort={{ key: "avg", dir: "desc" }}
            toolbar={<ExportButton filename="assessment-results" header={["Assessment", "School", "Graded", "Average %", "Highest %", "Lowest %", "Pass rate %"]} rows={() => results.map((r) => [r.a.title, db.schools.find((s) => s.id === r.a.schoolId)?.shortName, r.graded, r.average.toFixed(1), r.highest.toFixed(0), r.lowest.toFixed(0), r.passRate.toFixed(0)])} />}
            columns={[
              { key: "t", header: "Assessment", sort: (r) => r.a.title, cell: (r) => (<div><p className="font-medium">{r.a.title}</p><p className="text-xs text-muted-foreground">{db.courses.find((c) => c.id === r.a.courseId)?.title}</p></div>) },
              { key: "s", header: "School", cell: (r) => db.schools.find((s) => s.id === r.a.schoolId)?.shortName },
              { key: "g", header: "Graded", sort: (r) => r.graded, cell: (r) => r.graded, className: "tabular-nums" },
              { key: "avg", header: "Average", sort: (r) => r.average, cell: (r) => `${r.average.toFixed(1)}%`, className: "tabular-nums" },
              { key: "hi", header: "Highest", cell: (r) => `${r.highest.toFixed(0)}%`, className: "tabular-nums" },
              { key: "lo", header: "Lowest", cell: (r) => `${r.lowest.toFixed(0)}%`, className: "tabular-nums" },
              { key: "pass", header: "Pass rate", sort: (r) => r.passRate, cell: (r) => `${r.passRate.toFixed(0)}%`, className: "tabular-nums" },
            ]}
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Average score by subject</CardTitle>
              </CardHeader>
              <CardContent>
                <UsageChart data={bySubject} series={[{ key: "average", label: "Average %" }]} layout="vertical" height={Math.max(220, bySubject.length * 34)} percent />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Average score by school</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {bySchool.map((s) => (
                  <div key={s.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="font-medium">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.assessments} graded assessments</p>
                    </div>
                    <p className="text-xl font-semibold tabular-nums">{s.average.toFixed(1)}%</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )
      }
    </UrlTabs>
  );
}

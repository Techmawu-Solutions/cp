"use client";

import { Suspense, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/common/page-header";
import { UrlTabs } from "@/components/common/url-tabs";
import { UsageChart } from "@/components/dashboard/charts";
import { SessionBanner, useSessionEditable } from "@/components/academic/session-banner";
import { RequirePermission } from "@/components/layout/app-shell";
import { AttendanceRegister } from "@/components/classroom/attendance-register";
import { LiveAttendanceTable } from "@/components/classroom/live-tables";
import { useSchoolData } from "@/lib/queries";

/** Attendance for physical classes, live classes and course activity (spec §40). */
export default function SchoolAttendancePage() {
  const d = useSchoolData();
  const editable = useSessionEditable();
  const summary = useMemo(
    () =>
      d.classes.map((c) => {
        const rows = d.attendance.filter((a) => a.classId === c.id);
        const phys = rows.filter((a) => a.kind === "physical");
        const live = rows.filter((a) => a.kind === "live");
        const rate = (xs: typeof rows) => (xs.length ? Math.round((xs.filter((a) => a.status === "present" || a.status === "late").length / xs.length) * 1000) / 10 : 0);
        return { label: c.name, physical: rate(phys), live: rate(live) };
      }),
    [d],
  );
  return (
    <RequirePermission perm="students.view">
      <PageHeader title="Attendance" description={`School registers and live-class attendance for ${d.session.label}.`} />
      <SessionBanner />
      <Suspense>
        <UrlTabs tabs={[{ value: "register", label: "Class register" }, { value: "summary", label: "Summary" }, { value: "live", label: "Live classes" }]}>
          {(tab) =>
            tab === "register" ? (
              <AttendanceRegister classes={d.classes} editable={editable} />
            ) : tab === "summary" ? (
              <Card>
                <CardHeader>
                  <CardTitle>Attendance rate by class</CardTitle>
                  <CardDescription>Present or late, as a share of all records this session</CardDescription>
                </CardHeader>
                <CardContent>
                  <UsageChart data={summary} series={[{ key: "physical", label: "School days" }, { key: "live", label: "Live classes" }]} percent height={300} />
                </CardContent>
              </Card>
            ) : (
              <LiveAttendanceTable rows={d.attendance.filter((a) => a.kind === "live")} />
            )
          }
        </UrlTabs>
      </Suspense>
    </RequirePermission>
  );
}

"use client";

import { Suspense } from "react";
import { PageHeader } from "@/components/common/page-header";
import { UrlTabs } from "@/components/common/url-tabs";
import { RequirePermission } from "@/components/layout/app-shell";
import { LiveAttendanceTable, LiveSessionsTable, RecordingsTable } from "@/components/classroom/live-tables";
import { useStore } from "@/lib/store";

export default function PlatformLivePage() {
  return (
    <RequirePermission perm="live_classes.view">
      <PageHeader title="Live Classroom" description="Live sessions, recordings and attendance across all schools." breadcrumbs={[{ label: "Live Classroom" }]} />
      <Suspense>
        <Body />
      </Suspense>
    </RequirePermission>
  );
}

function Body() {
  const db = useStore();
  return (
    <UrlTabs tabs={[{ value: "sessions", label: "Live Sessions" }, { value: "recordings", label: "Recordings" }, { value: "attendance", label: "Attendance" }]}>
      {(tab) =>
        tab === "sessions" ? <LiveSessionsTable rows={db.liveSessions} showSchool joinable /> : tab === "recordings" ? <RecordingsTable rows={db.recordings} showSchool /> : <LiveAttendanceTable rows={db.attendance.filter((a) => a.kind === "live")} showSchool />
      }
    </UrlTabs>
  );
}

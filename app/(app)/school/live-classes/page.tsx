"use client";

import { Suspense, useState } from "react";
import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/page-header";
import { UrlTabs } from "@/components/common/url-tabs";
import { SessionBanner, useSessionEditable } from "@/components/academic/session-banner";
import { RequirePermission } from "@/components/layout/app-shell";
import { LiveAttendanceTable, LiveSessionsTable, RecordingsGrid } from "@/components/classroom/live-tables";
import { ScheduleLiveDialog } from "@/components/classroom/schedule-live-dialog";
import { useSchoolData } from "@/lib/queries";
import { useCurrentUser } from "@/lib/session";

export default function SchoolLivePage() {
  const d = useSchoolData();
  const me = useCurrentUser();
  const editable = useSessionEditable();
  const [open, setOpen] = useState(false);
  return (
    <RequirePermission perm="live_classes.view">
      <PageHeader
        title="Live Classes"
        description={`Virtual classes, recordings and live attendance for ${d.session.label}.`}
        actions={
          editable &&
          me?.can("live_classes.schedule") && (
            <Button onClick={() => setOpen(true)}>
              <CalendarPlus /> Schedule
            </Button>
          )
        }
      />
      <SessionBanner />
      <Suspense>
        <UrlTabs tabs={[{ value: "sessions", label: "Live Sessions" }, { value: "recordings", label: "Recording Library" }, { value: "attendance", label: "Attendance" }]}>
          {(tab) => (tab === "sessions" ? <LiveSessionsTable rows={d.liveSessions} joinable /> : tab === "recordings" ? <RecordingsGrid rows={d.recordings} /> : <LiveAttendanceTable rows={d.attendance.filter((a) => a.kind === "live")} />)}
        </UrlTabs>
      </Suspense>
      <ScheduleLiveDialog open={open} onOpenChange={setOpen} courses={d.courses} />
    </RequirePermission>
  );
}

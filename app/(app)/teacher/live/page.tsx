"use client";

import { Suspense, useState } from "react";
import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/page-header";
import { UrlTabs } from "@/components/common/url-tabs";
import { SessionBanner, useSessionEditable } from "@/components/academic/session-banner";
import { LiveAttendanceTable, LiveSessionsTable, RecordingsTable } from "@/components/classroom/live-tables";
import { ScheduleLiveDialog } from "@/components/classroom/schedule-live-dialog";
import { useTeacherData } from "@/lib/teacher";

export default function TeacherLivePage() {
  const t = useTeacherData();
  const editable = useSessionEditable();
  const [open, setOpen] = useState(false);
  const liveIds = new Set(t.liveSessions.map((l) => l.id));
  return (
    <>
      <PageHeader
        title="Live Classes"
        description="Schedule, start and review your virtual classes."
        actions={
          editable && (
            <Button onClick={() => setOpen(true)}>
              <CalendarPlus /> Schedule live class
            </Button>
          )
        }
      />
      <SessionBanner />
      <Suspense>
        <UrlTabs tabs={[{ value: "sessions", label: "Sessions" }, { value: "recordings", label: "Recordings" }, { value: "attendance", label: "Attendance" }]}>
          {(tab) => (tab === "sessions" ? <LiveSessionsTable rows={t.liveSessions} joinable /> : tab === "recordings" ? <RecordingsTable rows={t.recordings} /> : <LiveAttendanceTable rows={t.d.attendance.filter((a) => a.liveSessionId && liveIds.has(a.liveSessionId))} />)}
        </UrlTabs>
      </Suspense>
      <ScheduleLiveDialog open={open} onOpenChange={setOpen} courses={t.courses} />
    </>
  );
}

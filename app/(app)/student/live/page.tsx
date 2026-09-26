"use client";

import { Suspense } from "react";
import { Radio } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/common/page-header";
import { UrlTabs } from "@/components/common/url-tabs";
import { EmptyState } from "@/components/common/empty-state";
import { LinkButton } from "@/components/common/link-button";
import { StatusBadge } from "@/components/common/status-badge";
import { SessionBanner } from "@/components/academic/session-banner";
import { RecordingsGrid, LiveSessionsTable } from "@/components/classroom/live-tables";
import { useStudentData } from "@/lib/student";
import { fmtDay, fmtTime } from "@/lib/helpers";

export default function StudentLivePage() {
  const s = useStudentData();
  const { d } = s;
  const upcoming = s.liveSessions.filter((l) => l.status === "scheduled" || l.status === "live").sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  return (
    <>
      <PageHeader title="Live Classes" description="Join your virtual classes and watch recordings of past ones." />
      <SessionBanner />
      <Suspense>
        <UrlTabs tabs={[{ value: "upcoming", label: `Upcoming (${upcoming.length})` }, { value: "recordings", label: `Recordings (${s.recordings.length})` }, { value: "past", label: "Past classes" }]}>
          {(tab) =>
            tab === "upcoming" ? (
              upcoming.length === 0 ? (
                <EmptyState icon={Radio} title="No upcoming live classes" />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {upcoming.map((l) => (
                    <Card key={l.id}>
                      <CardContent className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Live Class</span>
                          <StatusBadge status={l.status} />
                        </div>
                        <p className="font-semibold">
                          {d.byId.subject.get(l.subjectId)?.name} — {d.byId.class.get(l.classId)?.name}
                        </p>
                        <p className="text-sm">{l.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {fmtDay(l.scheduledAt)} — {fmtTime(l.scheduledAt)} · {l.durationMinutes} min
                        </p>
                        <LinkButton href={`/classroom/${l.id}/lobby`} className="w-full" variant={l.status === "live" ? "default" : "outline"}>
                          {l.status === "live" ? "Join Class" : "Open lobby"}
                        </LinkButton>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )
            ) : tab === "recordings" ? (
              <RecordingsGrid rows={s.recordings} />
            ) : (
              <LiveSessionsTable rows={s.liveSessions.filter((l) => l.status === "ended")} joinable />
            )
          }
        </UrlTabs>
      </Suspense>
    </>
  );
}

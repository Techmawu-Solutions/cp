"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlarmClock, CalendarClock, PlayCircle, Timer, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { LinkButton } from "@/components/common/link-button";
import { StatusBadge } from "@/components/common/status-badge";
import { StatCard } from "@/components/dashboard/stat-card";
import { DataTable } from "@/components/tables/data-table";
import { ExportButton } from "@/components/tables/export-button";
import { OutcomeBadge } from "@/components/classroom/live-reports";
import { useStore } from "@/lib/store";
import { useCurrentUser, useMyTeacher } from "@/lib/session";
import { useNow } from "@/lib/use-now";
import { fmtDateLong, fmtTime } from "@/lib/helpers";
import { actualMinutes, attended, fmtMinutes, outcomeOf, startDelay } from "@/lib/live-reports";
import type { AttendanceRecord } from "@/lib/types";
import { cn } from "@/lib/utils";

/** One live class: was it held, when it started and ended, and each student's time in the room (spec §40). */
export default function LiveReportPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const now = useNow();
  const me = useCurrentUser();
  const myTeacher = useMyTeacher();
  const live = useStore((s) => s.liveSessions.find((l) => l.id === id));
  const allAttendance = useStore((s) => s.attendance);
  const students = useStore((s) => s.students);
  const teachers = useStore((s) => s.teachers);
  const classes = useStore((s) => s.classes);
  const subjects = useStore((s) => s.subjects);
  const recordings = useStore((s) => s.recordings);
  const rows = useMemo(() => allAttendance.filter((a) => a.liveSessionId === id), [allAttendance, id]);

  const allowed = !!live && !!me && (me.portal === "super-admin" || (me.portal === "teacher" ? live.teacherId === myTeacher?.id : me.portal === "school" && me.user.schoolId === live.schoolId && me.can("live_classes.view")));
  if (!live || !allowed) return <EmptyState title="Report not available" description="You can only see reports for live classes you teach or manage." action={<Button onClick={() => router.back()}>Go back</Button>} className="mt-10" />;

  const outcome = outcomeOf(live, now);
  const delay = startDelay(live);
  const minutes = actualMinutes(live);
  const teacher = teachers.find((t) => t.id === live.teacherId);
  const subject = subjects.find((s) => s.id === live.subjectId);
  const cls = classes.find((c) => c.id === live.classId);
  const came = rows.filter(attended);
  const avgTime = came.length ? came.reduce((t, a) => t + (a.durationMinutes ?? 0), 0) / came.length : null;
  const name = (a: AttendanceRecord) => {
    const s = students.find((x) => x.id === a.studentId);
    return s ? `${s.firstName} ${s.lastName}` : "—";
  };
  // Timeline spans from the scheduled start (or actual start, if earlier) to the end (or planned end).
  const t0 = Math.min(Date.parse(live.scheduledAt), live.startedAt ? Date.parse(live.startedAt) : Infinity);
  const t1 = Math.max(Date.parse(live.scheduledAt) + live.durationMinutes * 60_000, live.endedAt ? Date.parse(live.endedAt) : 0);
  const segs = (a: AttendanceRecord) => a.segments ?? (a.joinTime && a.leaveTime ? [{ joinTime: a.joinTime, leaveTime: a.leaveTime }] : []);
  const share = (a: AttendanceRecord) => (minutes && a.durationMinutes ? Math.min(100, (a.durationMinutes / minutes) * 100) : null);
  const recording = recordings.find((r) => r.id === live.recordingId);
  const diff = minutes != null ? minutes - live.durationMinutes : null;

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Live classes", href: me?.portal === "teacher" ? "/teacher/live?tab=reports" : me?.portal === "super-admin" ? "/super-admin/live?tab=reports" : "/school/live-classes?tab=reports" }, { label: "Class report" }]}
        title={live.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {subject?.name} — {cls?.name} · {teacher ? `${teacher.title} ${teacher.firstName} ${teacher.lastName}` : ""} · <OutcomeBadge outcome={outcome} />
          </span>
        }
        actions={
          <>
            {recording && (
              <LinkButton href={`/recordings/${recording.id}`} variant="outline">
                <PlayCircle /> Recording
              </LinkButton>
            )}
            <ExportButton
              filename={`live-class-${live.id}`}
              header={["Student", "Status", "Joined", "Left", "Minutes in class", "% of class", "Times joined"]}
              rows={() => rows.map((a) => [name(a), a.status, a.joinTime ? fmtTime(a.joinTime) : "", a.leaveTime ? fmtTime(a.leaveTime) : "", a.durationMinutes ?? 0, share(a) == null ? "" : Math.round(share(a)!), segs(a).length])}
            />
          </>
        }
      />

      {outcome === "missed" && (
        <Card className="mb-4 border-red-500/40 bg-red-500/5">
          <CardContent className="text-sm">
            <p className="font-medium text-red-700 dark:text-red-400">This class was not held.</p>
            <p className="text-muted-foreground">It was scheduled for {fmtDateLong(live.scheduledAt)} at {fmtTime(live.scheduledAt)} but the teacher never started it.</p>
          </CardContent>
        </Card>
      )}

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-5">
        <StatCard label="Scheduled" value={fmtTime(live.scheduledAt)} icon={CalendarClock} hint={`${fmtDateLong(live.scheduledAt)} · ${live.durationMinutes} min planned`} />
        <StatCard label="Started" value={live.startedAt ? fmtTime(live.startedAt) : "—"} icon={AlarmClock} hint={delay == null ? "Not started" : delay <= 5 ? "On time" : `${delay} min late`} />
        <StatCard label="Ended" value={live.endedAt ? fmtTime(live.endedAt) : outcome === "live" ? "In progress" : "—"} icon={Timer} hint={diff == null ? undefined : diff < -5 ? `Ended ${-diff} min early` : diff > 5 ? `Ran ${diff} min over` : "About as planned"} />
        <StatCard label="Class length" value={fmtMinutes(minutes)} icon={Timer} hint={`Planned ${fmtMinutes(live.durationMinutes)}`} />
        <StatCard label="Students present" value={`${came.length} / ${rows.length}`} icon={Users} hint={avgTime != null ? `Avg ${fmtMinutes(avgTime)} each` : undefined} />
      </div>

      {rows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Who attended</CardTitle>
            <CardDescription>
              Captured automatically when students join and leave the classroom. The bar shows each student&apos;s time in the room between {fmtTime(new Date(t0).toISOString())} and {fmtTime(new Date(t1).toISOString())}
              {live.startedAt && ", with the teacher's start and end marked"}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              rows={rows}
              search={name}
              initialSort={{ key: "time", dir: "desc" }}
              pageSize={30}
              filters={[{ key: "status", label: "Statuses", options: ["present", "late", "absent"].map((s) => ({ value: s, label: s[0]!.toUpperCase() + s.slice(1) })), predicate: (a, v) => a.status === v }]}
              columns={[
                { key: "student", header: "Student", sort: name, cell: (a) => <span className="font-medium">{name(a)}</span> },
                { key: "status", header: "Status", sort: (a) => a.status, cell: (a) => <StatusBadge status={a.status} /> },
                { key: "join", header: "Joined – left", cell: (a) => (a.joinTime ? <span className="whitespace-nowrap tabular-nums">{fmtTime(a.joinTime)} – {a.leaveTime ? fmtTime(a.leaveTime) : "…"}</span> : "—") },
                { key: "time", header: "Time in class", sort: (a) => a.durationMinutes ?? 0, cell: (a) => (a.durationMinutes ? <span className="whitespace-nowrap tabular-nums">{fmtMinutes(a.durationMinutes)}{share(a) != null && <span className="text-xs text-muted-foreground"> · {Math.round(share(a)!)}%</span>}{segs(a).length > 1 && <span className="text-xs text-amber-700 dark:text-amber-400"> · rejoined {segs(a).length - 1}×</span>}</span> : "—") },
                { key: "timeline", header: "Timeline", headClassName: "w-56", cell: (a) => <Timeline segments={segs(a)} t0={t0} t1={t1} start={live.startedAt} end={live.endedAt} /> },
              ]}
            />
            {live.startedAt && (
              <p className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-5 rounded-full bg-primary" /> In the class
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-px bg-foreground/60" /> Teacher started / ended
                </span>
              </p>
            )}
          </CardContent>
        </Card>
      )}
      {rows.length === 0 && outcome === "held" && <EmptyState title="No attendance was captured" />}
    </>
  );
}

function Timeline({ segments, t0, t1, start, end }: { segments: { joinTime: string; leaveTime: string }[]; t0: number; t1: number; start?: string; end?: string }) {
  const span = Math.max(1, t1 - t0);
  const x = (iso: string) => `${Math.max(0, Math.min(100, ((Date.parse(iso) - t0) / span) * 100))}%`;
  return (
    <div className="relative h-3 w-56 max-w-full rounded-full bg-muted" aria-hidden>
      {segments.map((g, i) => (
        <span key={i} className="absolute top-0 h-full rounded-full bg-primary" style={{ left: x(g.joinTime), width: `calc(${x(g.leaveTime)} - ${x(g.joinTime)})` }} />
      ))}
      {start && <span className={cn("absolute -top-0.5 h-4 w-px bg-foreground/60")} style={{ left: x(start) }} />}
      {end && <span className="absolute -top-0.5 h-4 w-px bg-foreground/60" style={{ left: x(end) }} />}
    </div>
  );
}

"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowRight, CalendarClock, ClipboardList, Lock, PlayCircle, TrendingUp, Video } from "lucide-react";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/common/status-badge";
import { UserAvatar } from "@/components/common/user-avatar";
import { LinkButton } from "@/components/common/link-button";
import { GradePill } from "@/components/assessment/gradebook";
import { RELATIONSHIP_LABEL } from "@/lib/actions";
import { parentAccessOn, wardReport, wardsOf, type WardAttendance, type WardReport, type WardWork } from "@/lib/guardian";
import { fmtAgo, fmtDay, fmtTime } from "@/lib/helpers";
import { studentName, useCurrentUser } from "@/lib/session";
import { useStore } from "@/lib/store";
import { useNow } from "@/lib/use-now";
import type { GuardianLink, School, Student } from "@/lib/types";

export type Ward = { link: GuardianLink; student: Student; school: School; report: WardReport | null; open: boolean };

/** The signed-in parent's wards, each with its report when the school allows parent access (spec section 22.3). */
export function useWards(): Ward[] {
  const me = useCurrentUser();
  const db = useStore();
  const now = useNow(60_000);
  return useMemo(() => {
    if (!me) return [];
    return wardsOf(db, me.user.id).map((w) => {
      const open = parentAccessOn(w.school);
      return { ...w, open, report: open ? wardReport(db, w.student.id, now) : null };
    });
  }, [db, me, now]);
}

export const WORK_LABEL: Record<WardWork, string> = { todo: "To do", overdue: "Overdue", submitted: "Submitted", graded: "Graded", missed: "Missed" };
export const WORK_TONE: Record<WardWork, "blue" | "red" | "amber" | "green" | "gray"> = { todo: "blue", overdue: "red", submitted: "amber", graded: "green", missed: "red" };
export const ATTENDANCE_LABEL: Record<WardAttendance, string> = { present: "Attended", late: "Joined late", left_early: "Left early", absent: "Missed", excused: "Excused" };
export const ATTENDANCE_TONE: Record<WardAttendance, "green" | "amber" | "red" | "gray"> = { present: "green", late: "amber", left_early: "amber", absent: "red", excused: "gray" };

const pct = (v: number | null | undefined) => (v == null ? "—" : `${Math.round(v)}%`);

function Figure({ label, value, extra, icon: Icon }: { label: string; value: React.ReactNode; extra?: React.ReactNode; icon: typeof TrendingUp }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5" /> {label}
      </p>
      <p className="mt-1 flex items-center gap-2 text-xl font-semibold tabular-nums">{value}</p>
      {extra && <p className="text-xs text-muted-foreground">{extra}</p>}
    </div>
  );
}

export function WardFigures({ r }: { r: WardReport }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Figure icon={TrendingUp} label="Learning progress" value={pct(r.progress)} extra={`${r.subjects.length} subjects`} />
      <Figure icon={ClipboardList} label="Average score" value={<>{pct(r.average)} {r.average != null && <GradePill percent={r.average} />}</>} extra={`${r.graded.length} graded`} />
      <Figure icon={Video} label="Live class attendance" value={pct(r.attendanceRate)} extra={`${r.attendance.filter((a) => a.status !== "absent").length} of ${r.attendance.length} classes`} />
      <Figure icon={CalendarClock} label="Work due" value={r.due.length} extra={r.overdue.length ? <span className="text-red-600 dark:text-red-400">{r.overdue.length} overdue or missed</span> : "Nothing overdue"} />
    </div>
  );
}

/** A ward's summary on the parent dashboard. */
export function WardCard({ w }: { w: Ward }) {
  const r = w.report;
  const name = studentName(w.student);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <UserAvatar name={name} size="md" />
          <span className="min-w-0">
            <span className="block truncate">{name}</span>
            <span className="block truncate text-xs font-normal text-muted-foreground">
              {r?.cls?.name ?? "Not in a class"} · {w.school.name} · {RELATIONSHIP_LABEL[w.link.relationship]}
            </span>
          </span>
        </CardTitle>
        {r && (
          <CardAction>
            <LinkButton href={`/parent/children/${w.student.id}`} size="sm" variant="outline">
              Details <ArrowRight />
            </LinkButton>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {!r ? (
          <p className="flex items-center gap-2 rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
            <Lock className="size-4" /> Parent access is turned off at {w.school.name}.
          </p>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              {r.sessionLabel} · {r.lastActive ? <>last active {fmtAgo(r.lastActive)}</> : "hasn't signed in yet"}
            </p>
            <WardFigures r={r} />
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="mb-2 text-sm font-medium">Due next</p>
                {r.overdue.slice(0, 2).map((x) => (
                  <WorkRow key={x.assessment.id} x={x} />
                ))}
                {r.due.slice(0, 3).map((x) => (
                  <WorkRow key={x.assessment.id} x={x} />
                ))}
                {r.due.length + r.overdue.length === 0 && <p className="text-sm text-muted-foreground">Nothing due.</p>}
              </div>
              <div>
                <p className="mb-2 text-sm font-medium">Next live classes</p>
                {r.upcomingLive.slice(0, 3).map((l) => (
                  <div key={l.id} className="flex items-center gap-2 py-1 text-sm">
                    <PlayCircle className="size-4 shrink-0 text-red-500" />
                    <span className="min-w-0 flex-1 truncate">{l.title}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {fmtDay(l.scheduledAt)} · {fmtTime(l.scheduledAt)}
                    </span>
                  </div>
                ))}
                {r.upcomingLive.length === 0 && <p className="text-sm text-muted-foreground">None scheduled.</p>}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function WorkRow({ x }: { x: WardReport["work"][number] }) {
  return (
    <div className="flex items-center gap-2 py-1 text-sm">
      <StatusBadge tone={WORK_TONE[x.state]}>{WORK_LABEL[x.state]}</StatusBadge>
      <span className="min-w-0 flex-1 truncate">{x.assessment.title}</span>
      <span className="shrink-0 text-xs text-muted-foreground">
        {x.subject?.name} · {fmtDay(x.assessment.dueDate)}
      </span>
    </div>
  );
}

export function NoWards() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>No children linked yet</CardTitle>
        <CardDescription>Your child&apos;s school links your account to them. Contact the school if a child is missing.</CardDescription>
      </CardHeader>
    </Card>
  );
}

export function WardList() {
  const wards = useWards();
  if (wards.length === 0) return <NoWards />;
  return (
    <div className="space-y-4">
      {wards.map((w) => (
        <WardCard key={w.link.id} w={w} />
      ))}
    </div>
  );
}

export function WardLink({ w }: { w: Ward }) {
  return (
    <Link href={`/parent/children/${w.student.id}`} className="text-primary hover:underline">
      {studentName(w.student)}
    </Link>
  );
}

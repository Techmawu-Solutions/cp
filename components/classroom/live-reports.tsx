"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlarmClock, CalendarCheck2, CalendarX2, Clock, Timer, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppSelect } from "@/components/common/app-select";
import { StatCard } from "@/components/dashboard/stat-card";
import { TrendLine, UsageChart } from "@/components/dashboard/charts";
import { DataTable } from "@/components/tables/data-table";
import { ExportButton } from "@/components/tables/export-button";
import { useStore } from "@/lib/store";
import { useScope } from "@/lib/session";
import { useNow } from "@/lib/use-now";
import { fmtDateTime, fmtTime } from "@/lib/helpers";
import { ON_TIME_MINUTES, OUTCOME_LABEL, fmtMinutes, inPeriod, periodRange, sessionRows, studentRows, teacherRows, trend, type Outcome, type PeriodKind, type SessionRow } from "@/lib/live-reports";
import type { AcademicSession, AttendanceRecord, ID, LiveSession } from "@/lib/types";
import { cn } from "@/lib/utils";

const OUTCOME_STYLE: Record<Outcome, string> = {
  held: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  missed: "bg-red-500/10 text-red-700 dark:text-red-400",
  cancelled: "bg-muted text-muted-foreground",
  live: "bg-red-600 text-white",
  upcoming: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
};

export function OutcomeBadge({ outcome }: { outcome: Outcome }) {
  return <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap", OUTCOME_STYLE[outcome])}>{OUTCOME_LABEL[outcome]}</span>;
}

const pct = (v: number | null | undefined) => (v == null ? "—" : `${Math.round(v)}%`);

/** Delay pill: green when on time, amber when a little late, red when very late. */
export function DelayBadge({ minutes }: { minutes: number | null }) {
  if (minutes == null) return <span className="text-muted-foreground">—</span>;
  return <span className={cn("rounded px-1.5 py-0.5 text-xs font-medium tabular-nums", minutes <= ON_TIME_MINUTES ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : minutes <= 15 ? "bg-amber-500/15 text-amber-800 dark:text-amber-300" : "bg-red-500/10 text-red-700 dark:text-red-400")}>{minutes <= ON_TIME_MINUTES ? (minutes ? `+${minutes} min` : "On time") : `${minutes} min late`}</span>;
}

/**
 * Live class reports (spec §40): whether teachers held their classes, when
 * they started and ended, and how long each student was present — for this
 * week, this month, the term/semester or the academic year.
 *
 * `lives` is every live class in scope (not limited to one academic session,
 * so the academic-year view works); `term` / `yearSessions` define the term
 * and year periods — for the platform view, the active sessions of all schools.
 */
export function LiveReports({ lives, termSessionIds, yearSessionIds, term, yearSessions, yearName, showTeacher = true, showSchool = false }: { lives: LiveSession[]; termSessionIds: Set<ID>; yearSessionIds: Set<ID>; term?: AcademicSession; yearSessions: AcademicSession[]; yearName?: string; showTeacher?: boolean; showSchool?: boolean }) {
  const router = useRouter();
  const now = useNow(60_000);
  const attendance = useStore((s) => s.attendance);
  const teachers = useStore((s) => s.teachers);
  const students = useStore((s) => s.students);
  const classes = useStore((s) => s.classes);
  const subjects = useStore((s) => s.subjects);
  const schools = useStore((s) => s.schools);
  const [kind, setKind] = useState<PeriodKind>("term");
  const [classId, setClassId] = useState("__all");
  const [view, setView] = useState<"sessions" | "teachers" | "students">("sessions");
  const termWord = term?.type === "term" ? "term" : "semester";

  const period = useMemo(() => periodRange(kind, now, term, yearSessions, yearName), [kind, now, term, yearSessions, yearName]);
  const scoped = useMemo(
    () =>
      lives.filter((l) => {
        if (classId !== "__all" && l.classId !== classId) return false;
        if (kind === "term") return termSessionIds.has(l.sessionId) && Date.parse(l.scheduledAt) <= now;
        if (kind === "year") return yearSessionIds.has(l.sessionId) && Date.parse(l.scheduledAt) <= now;
        return inPeriod(l, period);
      }),
    [lives, classId, kind, termSessionIds, yearSessionIds, period, now],
  );
  const liveById = useMemo(() => new Map(scoped.map((l) => [l.id, l])), [scoped]);
  const attBySession = useMemo(() => {
    const m = new Map<ID, AttendanceRecord[]>();
    for (const a of attendance) if (a.kind === "live" && a.liveSessionId && liveById.has(a.liveSessionId)) m.set(a.liveSessionId, [...(m.get(a.liveSessionId) ?? []), a]);
    return m;
  }, [attendance, liveById]);
  const sessions = useMemo(() => sessionRows(scoped, attBySession, now).sort((a, b) => b.live.scheduledAt.localeCompare(a.live.scheduledAt)), [scoped, attBySession, now]);
  const teacherStats = useMemo(() => teacherRows(sessions), [sessions]);
  const heldIds = useMemo(() => new Set(sessions.filter((s) => s.outcome === "held").map((s) => s.live.id)), [sessions]);
  const studentStats = useMemo(() => studentRows([...attBySession.entries()].filter(([id]) => heldIds.has(id)).flatMap(([, rows]) => rows), liveById, period.weeks), [attBySession, heldIds, liveById, period.weeks]);
  const series = useMemo(() => trend(sessions, period), [sessions, period]);

  const held = sessions.filter((s) => s.outcome === "held");
  const missed = sessions.filter((s) => s.outcome === "missed").length;
  const expected = held.reduce((t, s) => t + s.expected, 0);
  const present = held.reduce((t, s) => t + s.present, 0);
  const attendedRows = studentStats.reduce((t, s) => t + s.attended, 0);
  const avgDelay = held.length ? held.reduce((t, s) => t + (s.delay ?? 0), 0) / held.length : null;
  const avgLength = held.length ? held.reduce((t, s) => t + (s.minutes ?? 0), 0) / held.length : null;
  const avgPlanned = held.length ? held.reduce((t, s) => t + s.live.durationMinutes, 0) / held.length : null;

  const T = (id: ID) => {
    const t = teachers.find((x) => x.id === id);
    return t ? `${t.title} ${t.firstName} ${t.lastName}` : "—";
  };
  const S = (id: ID) => {
    const s = students.find((x) => x.id === id);
    return s ? `${s.firstName} ${s.lastName}` : "—";
  };
  const C = (id: ID) => classes.find((c) => c.id === id)?.name ?? "—";
  const Sub = (id: ID) => subjects.find((c) => c.id === id)?.name ?? "—";
  const Sch = (id: ID) => schools.find((c) => c.id === id)?.shortName ?? "—";
  const classOptions = [...new Set(lives.map((l) => l.classId))].map((id) => ({ value: id, label: C(id) })).sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
  const fileSuffix = `${period.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Tabs value={kind} onValueChange={(v) => setKind(v as PeriodKind)}>
          <TabsList>
            <TabsTrigger value="week">This week</TabsTrigger>
            <TabsTrigger value="month">This month</TabsTrigger>
            <TabsTrigger value="term">This {termWord}</TabsTrigger>
            <TabsTrigger value="year">Academic year</TabsTrigger>
          </TabsList>
        </Tabs>
        {classOptions.length > 1 && <AppSelect aria-label="Class" className="sm:ml-auto sm:w-48" value={classId} onChange={setClassId} options={[{ value: "__all", label: "All classes" }, ...classOptions]} />}
      </div>
      <p className="text-sm text-muted-foreground">
        {period.label} · {new Date(period.from).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} – {new Date(period.to).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
      </p>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Classes held" value={`${held.length} / ${held.length + missed}`} icon={CalendarCheck2} hint={held.length + missed ? `${Math.round((held.length / (held.length + missed)) * 100)}% delivered` : "None due"} />
        <StatCard label="Not held" value={missed} icon={CalendarX2} hint="Scheduled but never started" />
        <StatCard label="Avg start delay" value={fmtMinutes(avgDelay)} icon={AlarmClock} hint={`On time = within ${ON_TIME_MINUTES} min`} />
        <StatCard label="Avg class length" value={fmtMinutes(avgLength)} icon={Timer} hint={avgPlanned ? `Planned ${fmtMinutes(avgPlanned)}` : undefined} />
        <StatCard label="Student attendance" value={pct(expected ? (present / expected) * 100 : null)} icon={Users} hint={`${present} of ${expected} seats`} />
        <StatCard label="Avg time per student" value={fmtMinutes(attendedRows ? studentStats.reduce((t, s) => t + s.totalMinutes, 0) / attendedRows : null)} icon={Clock} hint="Per class attended" />
      </div>

      {series.length > 1 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Classes held vs not held</CardTitle>
              <CardDescription>{period.kind === "week" ? "Per day" : "Per week"}</CardDescription>
            </CardHeader>
            <CardContent>
              <UsageChart data={series} series={[{ key: "held", label: "Held", color: "var(--chart-2)" }, { key: "missed", label: "Not held", color: "var(--chart-5)" }]} stacked height={220} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Student attendance</CardTitle>
              <CardDescription>Share of students who joined the classes that were held</CardDescription>
            </CardHeader>
            <CardContent>
              <TrendLine data={series} series={[{ key: "attendance", label: "Attendance" }]} percent height={220} />
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={view} onValueChange={(v) => setView(v as typeof view)}>
        <TabsList variant="line">
          <TabsTrigger value="sessions">Classes ({sessions.length})</TabsTrigger>
          {showTeacher && <TabsTrigger value="teachers">Teachers ({teacherStats.length})</TabsTrigger>}
          <TabsTrigger value="students">Students ({studentStats.length})</TabsTrigger>
        </TabsList>
      </Tabs>

      {view === "sessions" && (
        <DataTable<SessionRow & { id: string }>
          rows={sessions.map((s) => ({ ...s, id: s.live.id }))}
          search={(s) => `${s.live.title} ${Sub(s.live.subjectId)} ${C(s.live.classId)} ${T(s.live.teacherId)}`}
          filters={[{ key: "outcome", label: "Outcomes", options: (["held", "missed", "cancelled", "upcoming"] as Outcome[]).map((o) => ({ value: o, label: OUTCOME_LABEL[o] })), predicate: (s, v) => s.outcome === v }]}
          onRowClick={(s) => router.push(`/live-report/${s.live.id}`)}
          initialSort={{ key: "when", dir: "desc" }}
          emptyTitle="No live classes in this period"
          toolbar={
            <ExportButton
              filename={`live-classes-${fileSuffix}`}
              header={["Scheduled", "Class", "Subject", "Teacher", ...(showSchool ? ["School"] : []), "Outcome", "Started", "Ended", "Start delay (min)", "Planned (min)", "Actual (min)", "Students", "Attended", "Late", "Attendance %", "Avg minutes per student"]}
              rows={() => sessions.map((s) => [fmtDateTime(s.live.scheduledAt), C(s.live.classId), Sub(s.live.subjectId), T(s.live.teacherId), ...(showSchool ? [Sch(s.live.schoolId)] : []), OUTCOME_LABEL[s.outcome], s.live.startedAt ? fmtTime(s.live.startedAt) : "", s.live.endedAt ? fmtTime(s.live.endedAt) : "", s.delay ?? "", s.live.durationMinutes, s.minutes ?? "", s.expected, s.present, s.late, s.rate == null ? "" : Math.round(s.rate), s.avgMinutes == null ? "" : Math.round(s.avgMinutes)])}
            />
          }
          columns={[
            { key: "when", header: "Scheduled", sort: (s) => s.live.scheduledAt, cell: (s) => <span className="whitespace-nowrap tabular-nums">{fmtDateTime(s.live.scheduledAt)}</span> },
            { key: "class", header: "Class", sort: (s) => `${Sub(s.live.subjectId)} ${C(s.live.classId)}`, cell: (s) => (<div><p className="font-medium">{Sub(s.live.subjectId)} — {C(s.live.classId)}</p>{showTeacher && <p className="text-xs text-muted-foreground">{T(s.live.teacherId)}{showSchool ? ` · ${Sch(s.live.schoolId)}` : ""}</p>}</div>) },
            { key: "outcome", header: "Held?", sort: (s) => s.outcome, cell: (s) => <OutcomeBadge outcome={s.outcome} /> },
            { key: "times", header: "Started – ended", cell: (s) => (s.live.startedAt ? <span className="whitespace-nowrap tabular-nums">{fmtTime(s.live.startedAt)} – {s.live.endedAt ? fmtTime(s.live.endedAt) : "…"}</span> : <span className="text-muted-foreground">—</span>) },
            { key: "delay", header: "Start", sort: (s) => s.delay ?? -1, cell: (s) => <DelayBadge minutes={s.delay} /> },
            { key: "length", header: "Length", sort: (s) => s.minutes ?? -1, cell: (s) => (s.minutes != null ? <span className="whitespace-nowrap tabular-nums">{fmtMinutes(s.minutes)} <span className="text-xs text-muted-foreground">/ {s.live.durationMinutes}</span></span> : "—") },
            { key: "att", header: "Attendance", sort: (s) => s.rate ?? -1, cell: (s) => (s.outcome === "held" ? <span className="whitespace-nowrap tabular-nums">{s.present}/{s.expected} <span className="text-xs text-muted-foreground">· {pct(s.rate)}</span></span> : "—") },
            { key: "avg", header: "Avg time", sort: (s) => s.avgMinutes ?? -1, cell: (s) => <span className="tabular-nums">{fmtMinutes(s.avgMinutes)}</span> },
          ]}
        />
      )}

      {view === "teachers" && (
        <DataTable
          rows={teacherStats}
          search={(r) => T(r.teacherId)}
          initialSort={{ key: "delivery", dir: "asc" }}
          emptyTitle="No classes were due in this period"
          toolbar={<ExportButton filename={`teacher-live-delivery-${fileSuffix}`} header={["Teacher", "Classes due", "Held", "Not held", "Cancelled", "Delivered %", "On time %", "Avg start delay (min)", "Hours taught", "Avg length (min)", "Student attendance %"]} rows={() => teacherStats.map((r) => [T(r.teacherId), r.due, r.held, r.missed, r.cancelled, r.deliveryRate == null ? "" : Math.round(r.deliveryRate), r.onTimeRate == null ? "" : Math.round(r.onTimeRate), r.avgDelay == null ? "" : Math.round(r.avgDelay), +(r.totalMinutes / 60).toFixed(1), r.avgMinutes == null ? "" : Math.round(r.avgMinutes), r.attendanceRate == null ? "" : Math.round(r.attendanceRate)])} />}
          columns={[
            { key: "teacher", header: "Teacher", sort: (r) => T(r.teacherId), cell: (r) => <span className="font-medium">{T(r.teacherId)}</span> },
            { key: "held", header: "Held", sort: (r) => r.held, cell: (r) => <span className="tabular-nums">{r.held} / {r.due}</span> },
            { key: "missed", header: "Not held", sort: (r) => r.missed, cell: (r) => <span className={cn("tabular-nums", r.missed > 0 && "font-semibold text-red-700 dark:text-red-400")}>{r.missed}</span> },
            { key: "delivery", header: "Delivered", sort: (r) => r.deliveryRate ?? 101, cell: (r) => <RateBar value={r.deliveryRate} /> },
            { key: "ontime", header: "On time", sort: (r) => r.onTimeRate ?? -1, cell: (r) => <span className="tabular-nums">{pct(r.onTimeRate)}</span> },
            { key: "delay", header: "Avg delay", sort: (r) => r.avgDelay ?? -1, cell: (r) => <span className="tabular-nums">{fmtMinutes(r.avgDelay)}</span> },
            { key: "hours", header: "Time taught", sort: (r) => r.totalMinutes, cell: (r) => <span className="tabular-nums">{fmtMinutes(r.totalMinutes)}</span> },
            { key: "avg", header: "Avg length", sort: (r) => r.avgMinutes ?? -1, cell: (r) => <span className="tabular-nums">{fmtMinutes(r.avgMinutes)}</span> },
            { key: "att", header: "Student attendance", sort: (r) => r.attendanceRate ?? -1, cell: (r) => <span className="tabular-nums">{pct(r.attendanceRate)}</span> },
          ]}
        />
      )}

      {view === "students" && (
        <DataTable
          rows={studentStats}
          search={(r) => `${S(r.studentId)} ${C(r.classId)}`}
          initialSort={{ key: "rate", dir: "asc" }}
          pageSize={20}
          emptyTitle="No attendance in this period"
          toolbar={<ExportButton filename={`student-live-attendance-${fileSuffix}`} header={["Student", "Class", "Classes held", "Attended", "Late", "Attendance %", "Total time (min)", "Avg per class attended (min)", "Avg share of class %", "Avg per week (min)"]} rows={() => studentStats.map((r) => [S(r.studentId), C(r.classId), r.expected, r.attended, r.late, r.rate == null ? "" : Math.round(r.rate), r.totalMinutes, r.avgPerClass == null ? "" : Math.round(r.avgPerClass), r.avgShare == null ? "" : Math.round(r.avgShare), Math.round(r.avgPerWeek)])} />}
          columns={[
            { key: "student", header: "Student", sort: (r) => S(r.studentId), cell: (r) => (<div><p className="font-medium">{S(r.studentId)}</p><p className="text-xs text-muted-foreground">{C(r.classId)}</p></div>) },
            { key: "att", header: "Attended", sort: (r) => r.attended, cell: (r) => <span className="tabular-nums">{r.attended} / {r.expected}{r.late ? <span className="text-xs text-muted-foreground"> · {r.late} late</span> : null}</span> },
            { key: "rate", header: "Attendance", sort: (r) => r.rate ?? -1, cell: (r) => <RateBar value={r.rate} /> },
            { key: "total", header: "Total time", sort: (r) => r.totalMinutes, cell: (r) => <span className="tabular-nums">{fmtMinutes(r.totalMinutes)}</span> },
            { key: "avg", header: "Avg per class", sort: (r) => r.avgPerClass ?? -1, cell: (r) => <span className="tabular-nums">{fmtMinutes(r.avgPerClass)}{r.avgShare != null && <span className="text-xs text-muted-foreground"> · {Math.round(r.avgShare)}% of class</span>}</span> },
            { key: "week", header: "Avg per week", sort: (r) => r.avgPerWeek, cell: (r) => <span className="tabular-nums">{fmtMinutes(r.avgPerWeek)}</span> },
          ]}
        />
      )}
    </div>
  );
}

function RateBar({ value }: { value: number | null }) {
  if (value == null) return <span className="text-muted-foreground">—</span>;
  const tone = value >= 80 ? "bg-emerald-500" : value >= 60 ? "bg-amber-500" : "bg-red-500";
  return (
    <span className="flex min-w-24 items-center gap-2">
      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <span className={cn("block h-full rounded-full", tone)} style={{ width: `${Math.min(100, value)}%` }} />
      </span>
      <span className="w-9 text-right text-xs tabular-nums">{Math.round(value)}%</span>
    </span>
  );
}

/**
 * Report scope for one school: every live class of the school (optionally
 * only one teacher's), with the selected academic session as the term and
 * its academic year as the year.
 */
export function SchoolLiveReports({ teacherId, showTeacher = true }: { teacherId?: ID; showTeacher?: boolean }) {
  const { schoolId, session } = useScope();
  const all = useStore((s) => s.liveSessions);
  const academicSessions = useStore((s) => s.academicSessions);
  const years = useStore((s) => s.academicYears);
  const term = session.current;
  const yearSessions = useMemo(() => academicSessions.filter((x) => x.academicYearId === term?.academicYearId), [academicSessions, term]);
  const lives = useMemo(() => all.filter((l) => l.schoolId === schoolId && (!teacherId || l.teacherId === teacherId)), [all, schoolId, teacherId]);
  const termIds = useMemo(() => new Set(term ? [term.id] : []), [term]);
  const yearIds = useMemo(() => new Set(yearSessions.map((x) => x.id)), [yearSessions]);
  return <LiveReports lives={lives} termSessionIds={termIds} yearSessionIds={yearIds} term={term} yearSessions={yearSessions} yearName={years.find((y) => y.id === term?.academicYearId)?.name} showTeacher={showTeacher} />;
}

/** Report scope for the whole platform: every school, with each school's active session as its term. */
export function PlatformLiveReports() {
  const lives = useStore((s) => s.liveSessions);
  const academicSessions = useStore((s) => s.academicSessions);
  const active = useMemo(() => academicSessions.filter((x) => x.status === "active"), [academicSessions]);
  const yearSessions = useMemo(() => academicSessions.filter((x) => active.some((a) => a.academicYearId === x.academicYearId)), [academicSessions, active]);
  const termIds = useMemo(() => new Set(active.map((x) => x.id)), [active]);
  const yearIds = useMemo(() => new Set(yearSessions.map((x) => x.id)), [yearSessions]);
  return <LiveReports lives={lives} termSessionIds={termIds} yearSessionIds={yearIds} term={active[0]} yearSessions={yearSessions} showSchool />;
}

/** A student's own live class attendance for the week, month, term/semester and academic year. */
export function StudentLiveSummary({ studentId, title = "My live class attendance" }: { studentId: ID; title?: string }) {
  const now = useNow(60_000);
  const { session } = useScope();
  const attendance = useStore((s) => s.attendance);
  const allLives = useStore((s) => s.liveSessions);
  const academicSessions = useStore((s) => s.academicSessions);
  const years = useStore((s) => s.academicYears);
  const term = session.current;
  const yearSessions = useMemo(() => academicSessions.filter((x) => x.academicYearId === term?.academicYearId), [academicSessions, term]);
  const mine = useMemo(() => attendance.filter((a) => a.kind === "live" && a.studentId === studentId && a.liveSessionId), [attendance, studentId]);
  const liveById = useMemo(() => new Map(allLives.filter((l) => l.status === "ended").map((l) => [l.id, l])), [allLives]);
  const yearName = years.find((y) => y.id === term?.academicYearId)?.name;
  const cols = (["week", "month", "term", "year"] as PeriodKind[]).map((kind) => {
    const p = periodRange(kind, now, term, yearSessions, yearName);
    const ids = kind === "term" ? new Set(term ? [term.id] : []) : new Set(yearSessions.map((x) => x.id));
    const rows = mine.filter((a) => {
      const l = liveById.get(a.liveSessionId!);
      if (!l) return false;
      return kind === "week" || kind === "month" ? inPeriod(l, p) : ids.has(l.sessionId);
    });
    const r = studentRows(rows, liveById, p.weeks)[0];
    return { kind, label: kind === "week" ? "This week" : kind === "month" ? "This month" : kind === "term" ? `This ${term?.type === "term" ? "term" : "semester"}` : "Academic year", r };
  });
  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Recorded automatically each time you join and leave a live class.</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {cols.map(({ kind, label, r }) => (
          <div key={kind} className="rounded-lg border p-3">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
            {r ? (
              <>
                <p className="mt-1 text-2xl font-semibold tabular-nums">{pct(r.rate)}</p>
                <p className="text-xs text-muted-foreground">
                  {r.attended} of {r.expected} classes{r.late ? ` · ${r.late} late` : ""}
                </p>
                <p className="mt-2 text-sm tabular-nums">{fmtMinutes(r.totalMinutes)} in class</p>
                <p className="text-xs text-muted-foreground">Avg {fmtMinutes(r.avgPerClass)} per class</p>
              </>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">No classes yet</p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

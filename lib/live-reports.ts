import type { AcademicSession, AttendanceRecord, ID, LiveSession } from "@/lib/types";

/**
 * Live class accountability (spec §40): whether each scheduled class was
 * held, when it really started and ended, who attended and for how long,
 * summarised per teacher and per student over a week, month, term/semester
 * or academic year. Pure functions over the stored records, so the same
 * numbers can come from the API later.
 */

export type Outcome = "held" | "missed" | "cancelled" | "live" | "upcoming";

export const OUTCOME_LABEL: Record<Outcome, string> = { held: "Held", missed: "Not held", cancelled: "Cancelled", live: "Live now", upcoming: "Upcoming" };

/** A scheduled class counts as missed once its planned end has passed without it starting. */
export function outcomeOf(l: LiveSession, now: number): Outcome {
  if (l.status === "ended") return "held";
  if (l.status === "live") return "live";
  if (l.status === "cancelled") return "cancelled";
  return Date.parse(l.scheduledAt) + l.durationMinutes * 60_000 < now ? "missed" : "upcoming";
}

/** Minutes between the scheduled time and when the teacher actually started (never negative). */
export const startDelay = (l: LiveSession) => (l.startedAt ? Math.max(0, Math.round((Date.parse(l.startedAt) - Date.parse(l.scheduledAt)) / 60_000)) : null);

/** How long the class actually ran, in minutes. */
export const actualMinutes = (l: LiveSession) => (l.startedAt && l.endedAt ? Math.max(0, Math.round((Date.parse(l.endedAt) - Date.parse(l.startedAt)) / 60_000)) : null);

export const attended = (a: AttendanceRecord) => a.status === "present" || a.status === "late";

// ------------------------------------------------------------------ periods

export type PeriodKind = "week" | "month" | "term" | "year";

export interface Period {
  kind: PeriodKind;
  from: number;
  to: number;
  label: string;
  /** Weeks covered so far (at least 1) — for "average per week". */
  weeks: number;
}

export function periodRange(kind: PeriodKind, now: number, term: AcademicSession | undefined, yearSessions: AcademicSession[], yearName?: string): Period {
  const d = new Date(now);
  let from: Date;
  let label: string;
  if (kind === "week") {
    from = new Date(d);
    from.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    from.setHours(0, 0, 0, 0);
    label = "This week";
  } else if (kind === "month") {
    from = new Date(d.getFullYear(), d.getMonth(), 1);
    label = d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  } else if (kind === "term") {
    from = new Date(`${term?.startDate ?? d.toISOString().slice(0, 10)}T00:00:00`);
    label = term ? `${yearName ? `${yearName} ` : ""}${term.name}` : "This term";
  } else {
    const first = [...yearSessions].sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
    from = new Date(`${first?.startDate ?? d.toISOString().slice(0, 10)}T00:00:00`);
    label = yearName ? `Academic year ${yearName}` : "This academic year";
  }
  const end = kind === "term" && term ? Math.min(now, Date.parse(`${term.endDate}T23:59:59`)) : now;
  return { kind, from: from.getTime(), to: end, label, weeks: Math.max(1, (end - from.getTime()) / (7 * 86_400_000)) };
}

export const inPeriod = (l: LiveSession, p: Period) => {
  const t = Date.parse(l.scheduledAt);
  return t >= p.from && t <= p.to;
};

// ------------------------------------------------------------------ per session

export interface SessionRow {
  live: LiveSession;
  outcome: Outcome;
  delay: number | null;
  minutes: number | null;
  expected: number;
  present: number;
  late: number;
  rate: number | null;
  avgMinutes: number | null;
}

export function sessionRows(lives: LiveSession[], attendanceBySession: Map<ID, AttendanceRecord[]>, now: number): SessionRow[] {
  return lives.map((live) => {
    const rows = attendanceBySession.get(live.id) ?? [];
    const came = rows.filter(attended);
    const outcome = outcomeOf(live, now);
    return {
      live,
      outcome,
      delay: startDelay(live),
      minutes: actualMinutes(live),
      expected: rows.length,
      present: came.length,
      late: rows.filter((a) => a.status === "late").length,
      rate: outcome === "held" && rows.length ? (came.length / rows.length) * 100 : null,
      avgMinutes: came.length ? came.reduce((t, a) => t + (a.durationMinutes ?? 0), 0) / came.length : null,
    };
  });
}

// ------------------------------------------------------------------ per teacher

export interface TeacherRow {
  id: ID;
  teacherId: ID;
  due: number;
  held: number;
  missed: number;
  cancelled: number;
  deliveryRate: number | null;
  onTimeRate: number | null;
  avgDelay: number | null;
  totalMinutes: number;
  avgMinutes: number | null;
  plannedMinutes: number;
  attendanceRate: number | null;
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

/** A class starting within 5 minutes of its scheduled time counts as on time. */
export const ON_TIME_MINUTES = 5;

export function teacherRows(sessions: SessionRow[]): TeacherRow[] {
  const by = new Map<ID, SessionRow[]>();
  for (const s of sessions) if (s.outcome !== "upcoming" && s.outcome !== "live") by.set(s.live.teacherId, [...(by.get(s.live.teacherId) ?? []), s]);
  return [...by.entries()].map(([teacherId, list]) => {
    const held = list.filter((s) => s.outcome === "held");
    const missed = list.filter((s) => s.outcome === "missed").length;
    const cancelled = list.filter((s) => s.outcome === "cancelled").length;
    const delays = held.map((s) => s.delay ?? 0);
    const mins = held.map((s) => s.minutes ?? 0);
    const expected = held.reduce((t, s) => t + s.expected, 0);
    return {
      id: teacherId,
      teacherId,
      due: held.length + missed,
      held: held.length,
      missed,
      cancelled,
      deliveryRate: held.length + missed ? (held.length / (held.length + missed)) * 100 : null,
      onTimeRate: held.length ? (delays.filter((d) => d <= ON_TIME_MINUTES).length / held.length) * 100 : null,
      avgDelay: avg(delays),
      totalMinutes: mins.reduce((a, b) => a + b, 0),
      avgMinutes: avg(mins),
      plannedMinutes: held.reduce((t, s) => t + s.live.durationMinutes, 0),
      attendanceRate: expected ? (held.reduce((t, s) => t + s.present, 0) / expected) * 100 : null,
    };
  });
}

// ------------------------------------------------------------------ per student

export interface StudentRow {
  id: ID;
  studentId: ID;
  classId: ID;
  expected: number;
  attended: number;
  late: number;
  rate: number | null;
  totalMinutes: number;
  /** Average minutes per class the student attended. */
  avgPerClass: number | null;
  /** Average share of each attended class the student was present for. */
  avgShare: number | null;
  /** Total minutes divided by weeks in the period. */
  avgPerWeek: number;
}

export function studentRows(attendance: AttendanceRecord[], liveById: Map<ID, LiveSession>, weeks: number): StudentRow[] {
  const by = new Map<ID, AttendanceRecord[]>();
  for (const a of attendance) by.set(a.studentId, [...(by.get(a.studentId) ?? []), a]);
  return [...by.entries()].map(([studentId, rows]) => {
    const came = rows.filter(attended);
    const total = came.reduce((t, a) => t + (a.durationMinutes ?? 0), 0);
    const shares = came.map((a) => {
      const l = liveById.get(a.liveSessionId ?? "");
      const len = l ? (actualMinutes(l) ?? l.durationMinutes) : 0;
      return len ? Math.min(100, ((a.durationMinutes ?? 0) / len) * 100) : 0;
    });
    return {
      id: studentId,
      studentId,
      classId: rows[0]!.classId,
      expected: rows.length,
      attended: came.length,
      late: rows.filter((a) => a.status === "late").length,
      rate: rows.length ? (came.length / rows.length) * 100 : null,
      totalMinutes: total,
      avgPerClass: came.length ? total / came.length : null,
      avgShare: avg(shares),
      avgPerWeek: total / weeks,
    };
  });
}

// ------------------------------------------------------------------ trend

/** Held vs not held classes and attendance rate per week (or per day for a one-week period). */
export function trend(sessions: SessionRow[], p: Period) {
  const byDay = p.kind === "week";
  const key = (t: number) => {
    const d = new Date(t);
    if (!byDay) d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };
  const buckets = new Map<number, SessionRow[]>();
  for (const s of sessions) if (s.outcome === "held" || s.outcome === "missed") buckets.set(key(Date.parse(s.live.scheduledAt)), [...(buckets.get(key(Date.parse(s.live.scheduledAt))) ?? []), s]);
  return [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([t, list]) => {
      const held = list.filter((s) => s.outcome === "held");
      const exp = held.reduce((n, s) => n + s.expected, 0);
      return {
        label: new Date(t).toLocaleDateString("en-GB", byDay ? { weekday: "short", day: "numeric" } : { day: "numeric", month: "short" }),
        held: held.length,
        missed: list.length - held.length,
        attendance: exp ? Math.round((held.reduce((n, s) => n + s.present, 0) / exp) * 100) : 0,
      };
    });
}

export const fmtMinutes = (m: number | null | undefined) => {
  if (m == null) return "—";
  const r = Math.round(m);
  return r >= 60 ? `${Math.floor(r / 60)}h ${String(r % 60).padStart(2, "0")}m` : `${r} min`;
};

/** Live now, or scheduled and not yet past its planned end — what "upcoming" lists should show. */
export const isUpcomingOrLive = (l: LiveSession, now: number) => {
  const o = outcomeOf(l, now);
  return o === "upcoming" || o === "live";
};

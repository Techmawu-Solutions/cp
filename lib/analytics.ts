import type { DB } from "@/lib/data/seed";
import type { ID, School, SchoolStats } from "@/lib/types";
import { hashString, rng } from "@/lib/helpers";
import { DISTRICTS, REGIONS } from "@/lib/data/geography";

const WEEK = 7 * 86_400_000;

/**
 * Headline figures for a school. Demo tenants (which have real records in the
 * prototype) are computed live, so creating a student updates every dashboard;
 * other schools fall back to their stored aggregate.
 */
export function schoolStats(db: DB, school: School): SchoolStats {
  const students = db.students.filter((s) => s.schoolId === school.id && s.status === "active");
  if (students.length === 0 && db.teachers.every((t) => t.schoolId !== school.id)) return school.stats;
  const now = Date.now();
  const userById = new Map(db.users.map((u) => [u.id, u]));
  const isActive = (userId: ID) => {
    const la = userById.get(userId)?.lastActive;
    return !!la && now - new Date(la).getTime() < WEEK;
  };
  const teachers = db.teachers.filter((t) => t.schoolId === school.id && t.status !== "inactive");
  const activeStudents = students.filter((s) => isActive(s.userId)).length;
  const activeTeachers = teachers.filter((t) => isActive(t.userId)).length;
  const assessments = db.assessments.filter((a) => a.schoolId === school.id);
  return {
    students: students.length,
    teachers: teachers.length,
    activeStudents,
    activeTeachers,
    liveClasses: db.liveSessions.filter((l) => l.schoolId === school.id).length,
    assignments: assessments.filter((a) => a.type === "assignment").length,
    quizzes: assessments.filter((a) => a.type === "quiz").length,
    engagement: students.length ? Math.round((activeStudents / students.length) * 100) : 0,
  };
}

export interface Aggregate extends SchoolStats {
  schools: number;
  activeSchools: number;
}

export function aggregate(db: DB, schools: School[]): Aggregate {
  const out: Aggregate = { schools: schools.length, activeSchools: 0, students: 0, teachers: 0, activeStudents: 0, activeTeachers: 0, liveClasses: 0, assignments: 0, quizzes: 0, engagement: 0 };
  for (const sc of schools) {
    if (sc.status === "active") out.activeSchools++;
    const st = schoolStats(db, sc);
    out.students += st.students;
    out.teachers += st.teachers;
    out.activeStudents += st.activeStudents;
    out.activeTeachers += st.activeTeachers;
    out.liveClasses += st.liveClasses;
    out.assignments += st.assignments;
    out.quizzes += st.quizzes;
  }
  out.engagement = out.students ? Math.round((out.activeStudents / out.students) * 100) : 0;
  return out;
}

/**
 * Platform-wide figures for the Super Admin dashboard (spec §12). Detailed
 * records exist only for demo tenants; other schools contribute estimates
 * derived from their aggregate stats.
 */
export function platformTotals(db: DB) {
  const agg = aggregate(db, db.schools);
  const recordSchools = new Set(db.students.map((s) => s.schoolId));
  const estimated = db.schools.filter((s) => !recordSchools.has(s.id));
  const today = new Date().toDateString();
  const est = (f: (s: School) => number) => estimated.reduce((a, s) => a + f(s), 0);
  return {
    ...agg,
    activeUsers: agg.activeStudents + agg.activeTeachers,
    courses: db.courses.length + est((s) => s.stats.teachers * 5),
    assessments: db.assessments.length + est((s) => Math.round((s.stats.assignments + s.stats.quizzes) * 1.35)),
    assignments: agg.assignments,
    liveToday: db.liveSessions.filter((l) => new Date(l.scheduledAt).toDateString() === today).length + est((s) => Math.round(s.stats.liveClasses / 55)),
    storageGb: (db.recordings.reduce((a, r) => a + r.sizeMb, 0) + est((s) => s.stats.liveClasses * 160)) / 1024,
    storageQuotaGb: 25_000,
    mau: Math.round((agg.students + agg.teachers) * 0.86),
  };
}

export function byRegion(db: DB) {
  return REGIONS.map((r) => {
    const schools = db.schools.filter((s) => s.regionId === r.id);
    return { region: r, ...aggregate(db, schools) };
  });
}

export function byDistrict(db: DB, regionId?: ID) {
  return DISTRICTS.filter((d) => !regionId || d.regionId === regionId).map((d) => {
    const schools = db.schools.filter((s) => s.districtId === d.id);
    return { district: d, ...aggregate(db, schools) };
  });
}

/**
 * Activity time series. The prototype has no event history, so series are
 * synthesised deterministically from the scope's real totals — the shape is
 * plausible (weekday peaks, weekend dips) and the level matches the numbers.
 */
export function dailySeries(key: string, base: number, days = 30) {
  const r = rng(hashString(key));
  const out: { date: string; label: string; value: number }[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const weekend = d.getDay() === 0 || d.getDay() === 6;
    const trend = 0.9 + ((days - i) / days) * 0.12;
    const noise = 0.92 + r.next() * 0.16;
    out.push({
      date: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
      value: Math.round(base * trend * noise * (weekend ? 0.38 : 1)),
    });
  }
  return out;
}

export function monthlySeries(key: string, base: number, months = 12) {
  const r = rng(hashString(key + "m"));
  const out: { label: string; value: number }[] = [];
  const today = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const m = d.getMonth();
    // School calendar: August break and December holidays dip.
    const seasonal = m === 7 ? 0.35 : m === 11 ? 0.6 : m === 0 ? 0.85 : 1;
    const growth = 0.7 + ((months - i) / months) * 0.3;
    out.push({ label: d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" }), value: Math.round(base * seasonal * growth * (0.94 + r.next() * 0.12)) });
  }
  return out;
}

export function weeklyActivity(key: string, scale: number) {
  const r = rng(hashString(key + "w"));
  const labels = ["Wk 1", "Wk 2", "Wk 3", "Wk 4", "Wk 5", "Wk 6", "Wk 7", "Wk 8"];
  return labels.map((label, i) => ({
    label,
    lessons: Math.round(scale * (0.6 + i * 0.05) * (0.85 + r.next() * 0.3)),
    submissions: Math.round(scale * 0.45 * (0.6 + i * 0.05) * (0.85 + r.next() * 0.3)),
    liveAttendance: Math.round(scale * 0.35 * (0.6 + i * 0.05) * (0.85 + r.next() * 0.3)),
  }));
}

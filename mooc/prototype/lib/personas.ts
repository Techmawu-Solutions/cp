"use client";

import { activitiesOf, courseBySlug } from "@/lib/data/courses";
import { careerById } from "@/lib/data/graph";
import { ITEMS } from "@/lib/data/items";
import { newCode } from "@/lib/learning";
import { applyEvidence } from "@/lib/mastery";
import { EMPTY, useOpen, type OpenState, type PersonaId, type Profile } from "@/lib/store";
import type { EvidenceSource, Mastery } from "@/lib/types";

/** Demo accounts (like ClassProject's one-click personas). */
export const PERSONAS: { id: PersonaId; name: string; blurb: string; detail: string }[] = [
  { id: "kwesi", name: "Kwesi Mensah, 24", blurb: "Career switcher → Data Analyst", detail: "5 weeks into a personal path. Spreadsheets verified, SQL in progress, capstone project started." },
  { id: "ama", name: "Ama Boateng, 16", blurb: "SHS 2 student from ClassProject", detail: "Arrived from a ClassProject recommendation. Working on quadratics; waiting for a guardian's approval." },
  { id: "new", name: "New learner", blurb: "Start from “What do you want to achieve?”", detail: "No history — try the goal prompt, diagnostic and personal path." },
  { id: "mensah", name: "Dr. Kwame Mensah", blurb: "Instructor · Ashesi University", detail: "Instructor studio: coverage checks, AI drafts that need approval, quality flags." },
];

const ago = (d: number) => new Date(Date.now() - d * 864e5).toISOString();
const ahead = (d: number) => new Date(Date.now() + d * 864e5).toISOString();

const baseProfile = (p: Partial<Profile> & Pick<Profile, "name" | "handle">): Profile => ({
  role: "learner",
  ageBand: "adult",
  guardian: "not_needed",
  country: "GH",
  hoursPerWeek: 5,
  preferredDays: ["mon", "wed", "sat"],
  connectivity: "moderate",
  dataSaver: false,
  aiTutor: true,
  aiPractice: true,
  personalisation: true,
  portfolioPublic: false,
  notifications: "daily",
  ...p,
});

function evidence(m: Record<string, Mastery>, skill: string, list: [EvidenceSource, number, string, number][]) {
  let cur = m[skill];
  for (const [src, outcome, label, daysAgo] of list) cur = applyEvidence(cur, src, outcome, label, ago(daysAgo));
  m[skill] = cur!;
}

/** Marks the first n activities of a course done. */
function doneFirst(progress: OpenState["progress"], slug: string, n: number, daysAgo: number) {
  const acts = activitiesOf(courseBySlug.get(slug)!);
  acts.slice(0, n).forEach((a, i) => (progress[a.id] = { done: true, at: ago(daysAgo - i * 0.3), watchedPct: a.kind === "video" ? 100 : undefined }));
}

function kwesi(): OpenState {
  const career = careerById.get("data-analyst")!;
  const mastery: Record<string, Mastery> = {};
  for (const sk of ["sheet-formulas", "sheet-functions", "sheet-cleaning", "sheet-charts"])
    evidence(mastery, sk, [["exposure", 1, "Watched the lesson", 30], ["practice", 1, "Practice", 29], ["practice", 1, "Practice", 26], ["mastery_check", 1, "Mastery check · Spreadsheets That Think", 21]]);
  evidence(mastery, "stats-averages", [["diagnostic", 0.5, "Diagnostic", 35], ["exposure", 1, "Watched “Which average?”", 12], ["practice", 1, "Practice", 11], ["practice", 1, "Practice", 11]]);
  evidence(mastery, "stats-spread", [["diagnostic", 0, "Diagnostic", 35], ["exposure", 1, "Watched “Spread”", 9], ["practice", 0, "Practice", 9]]);
  evidence(mastery, "stats-critical", [["diagnostic", 0, "Diagnostic", 35]]);
  evidence(mastery, "sql-select", [["diagnostic", 0, "Diagnostic", 35], ["exposure", 1, "Watched “SELECT”", 4], ["practice", 1, "Practice", 4], ["practice", 1, "Practice", 3]]);
  evidence(mastery, "sql-filter", [["diagnostic", 0, "Diagnostic", 35], ["exposure", 1, "Watched “WHERE”", 2]]);
  evidence(mastery, "sql-aggregate", [["diagnostic", 0, "Diagnostic", 35]]);
  evidence(mastery, "data-story", [["diagnostic", 0.5, "Diagnostic", 35]]);
  const progress: OpenState["progress"] = {};
  doneFirst(progress, "spreadsheets-that-think", 13, 30);
  doneFirst(progress, "statistics-in-everyday-life", 5, 12);
  doneFirst(progress, "sql-for-data-analysis", 4, 4);
  const review: OpenState["review"] = {};
  for (const id of ["sh3", "sh8", "sh11", "st2", "sq2"]) review[id] = { due: ago(1), interval: 3, reps: 2 };
  for (const id of ["sh5", "st3"]) review[id] = { due: ahead(4), interval: 6, reps: 3 };
  return {
    ...EMPTY,
    persona: "kwesi",
    profile: baseProfile({ name: "Kwesi Mensah", handle: "kwesi-mensah", hoursPerWeek: 5, connectivity: "slow", portfolioPublic: true }),
    goals: [{ id: "goal_kwesi", kind: "career", label: "Become a data analyst", careerId: "data-analyst", skills: career.courses.flatMap((s) => courseBySlug.get(s)?.skills ?? []), createdAt: ago(35), deadline: ahead(140) }],
    activeGoal: "goal_kwesi",
    path: [
      { kind: "course", ref: "spreadsheets-that-think", reason: "Closes your gaps in cleaning and charts", skipped: [] },
      { kind: "course", ref: "statistics-in-everyday-life", reason: "Closes your gaps in spread and reading charts critically", skipped: [] },
      { kind: "course", ref: "sql-for-data-analysis", reason: "Closes your gaps in SELECT and WHERE", skipped: [] },
      { kind: "course", ref: "data-storytelling", reason: "Turns your analysis into decisions", skipped: [] },
      { kind: "project", ref: "trotro-fares", reason: "Proves you can apply the skills — goes into your portfolio" },
      { kind: "credential", ref: "cred-data-analysis", reason: "Evidence-backed credential employers can verify" },
    ],
    planDeadline: ahead(140),
    planStartedAt: ago(35),
    enrollments: {
      "spreadsheets-that-think": { at: ago(34), source: "path" },
      "statistics-in-everyday-life": { at: ago(13), source: "path" },
      "sql-for-data-analysis": { at: ago(5), source: "path" },
    },
    progress,
    checks: { "spreadsheets-that-think": { pct: 88, at: ago(21) } },
    mastery,
    review,
    notes: [{ id: "note_k1", activityId: "statistics-in-everyday-life.l1.video", at: 56, text: "Median for fares — the taxi outlier trick. Use this in the trotro project.", createdAt: ago(12) }],
    submissions: {
      "trotro-fares": { projectId: "trotro-fares", revision: 0, summary: "", link: "", submittedAt: ago(2), status: "draft", milestonesDone: 1, reviews: [] },
    },
    credentials: [{ code: newCode(), defId: "cert-spreadsheets-that-think", issuedAt: ago(21), status: "active", evidence: ["Passed the Spreadsheets That Think mastery check (88%)"] }],
    downloads: { "statistics-in-everyday-life": "saved" },
  };
}

function ama(): OpenState {
  const mastery: Record<string, Mastery> = {};
  evidence(mastery, "quad-graphs", [["exposure", 1, "Watched “What a, b and c do”", 3], ["video_question", 1, "In-video question", 3], ["practice", 1, "Practice", 3], ["practice", 1, "Practice", 2]]);
  evidence(mastery, "quad-square", [["exposure", 1, "Watched “Completing the square”", 1]]);
  const progress: OpenState["progress"] = {};
  doneFirst(progress, "quadratic-functions-made-visual", 4, 3);
  return {
    ...EMPTY,
    persona: "ama",
    profile: baseProfile({ name: "Ama Boateng", handle: "ama-b", ageBand: "teen", guardian: "pending", hoursPerWeek: 3, preferredDays: ["tue", "thu", "sun"], connectivity: "slow", dataSaver: true, fromPartner: { partner: "classproject", subject: "EMATH", level: "SHS2" } }),
    goals: [{ id: "goal_ama", kind: "exam", label: "Pass WASSCE Elective Maths — quadratics", skills: ["quad-graphs", "quad-square", "quad-formula", "quad-word"], createdAt: ago(4), deadline: ahead(200) }],
    activeGoal: "goal_ama",
    path: [
      { kind: "course", ref: "quadratic-functions-made-visual", reason: "Matches Elective Mathematics — quadratic functions", skipped: [] },
      { kind: "course", ref: "calculus-first-steps", reason: "Goes beyond the syllabus — rates of change", skipped: [] },
    ],
    planDeadline: ahead(200),
    planStartedAt: ago(4),
    enrollments: { "quadratic-functions-made-visual": { at: ago(4), source: "partner_referral" } },
    progress,
    mastery,
    review: { qu1: { due: ago(0.2), interval: 1, reps: 1 }, qu2: { due: ahead(2), interval: 3, reps: 1 } },
    referrals: [{ subject: "EMATH", level: "SHS2", course: "quadratic-functions-made-visual", at: ago(4) }],
    downloads: { "quadratic-functions-made-visual": "saved" },
  };
}

function mensah(): OpenState {
  return {
    ...EMPTY,
    persona: "mensah",
    profile: baseProfile({ name: "Dr. Kwame Mensah", handle: "kwame-mensah", role: "instructor", portfolioPublic: true }),
    drafts: [
      { id: "d1", courseSlug: "statistics-in-everyday-life", kind: "practice_question", title: "Practice: median of an even-sized list", content: "Fares: 4, 6, 9, 11. What is the median?\nA. 6  B. 7.5  C. 9  D. 7\nAnswer: B — average the two middle values (6 and 9).", status: "draft", createdAt: ago(1) },
      { id: "d2", courseSlug: "statistics-in-everyday-life", kind: "summary", title: "Video summary: “Spread: the part averages hide”", content: "Two routes can share a median but differ in predictability. Range = max − min is quick but sensitive to outliers; the IQR describes the middle 50%. Report a middle and a spread together.", status: "draft", createdAt: ago(1) },
      { id: "d3", courseSlug: "statistics-in-everyday-life", kind: "alt_text", title: "Alt text: chart on slide 2 of “Which average?”", content: "Bar chart of five fares: four bars between GH₵5 and GH₵6 and one bar at GH₵40, showing how one outlier pulls the mean up to GH₵12.40 while the median stays at GH₵6.", status: "draft", createdAt: ago(2) },
    ],
    flags: [
      { id: "f1", courseSlug: "statistics-in-everyday-life", kind: "ambiguous_item", target: "Item st6 — “least affected by one extreme value”", detail: "Discrimination 0.11 (below 0.15). Strong learners split between IQR and median — the options may be ambiguous.", source: "psychometrics", status: "open" },
      { id: "f2", courseSlug: "statistics-in-everyday-life", kind: "learner_confusion", target: "Lesson 2 video at 0:42", detail: "31 learners replayed this segment; 12 tutor questions about “interquartile range”. Consider a worked example.", source: "ai", status: "open" },
      { id: "f3", courseSlug: "statistics-in-everyday-life", kind: "broken_link", target: "Reading: Charts and claims that mislead", detail: "External link to the GSS dataset returns 404.", source: "system", status: "open" },
    ],
  };
}

/** Signs in as a demo persona, replacing this browser's state. */
export function signInAs(id: PersonaId) {
  const state = id === "kwesi" ? kwesi() : id === "ama" ? ama() : id === "mensah" ? mensah() : { ...EMPTY, persona: "new" as const };
  useOpen.setState(state, true);
}

export function signOut() {
  useOpen.setState(EMPTY, true);
}

export const itemsCount = ITEMS.length;

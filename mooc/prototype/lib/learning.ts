"use client";

import { CAREERS, CREDENTIALS, careerById, credentialById, projectById, skillName } from "@/lib/data/graph";
import { activitiesOf, courseBySlug, courseOfActivity, findActivity } from "@/lib/data/courses";
import { ITEMS, itemById, itemsForSkill } from "@/lib/data/items";
import { applyEvidence, atLeast } from "@/lib/mastery";
import { setOpen, uid, useOpen, type OpenState } from "@/lib/store";
import type { Activity, Course, CredentialDef, EvidenceSource, Goal, IssuedCredential, Item, PathStep, PeerReview, ProjectSubmission } from "@/lib/types";

/**
 * Learning actions and derived views. Each action corresponds to an API call in
 * spec section 10.2 (enrolments, activity events, attempts, projects, credentials).
 */

const now = () => new Date().toISOString();
const days = (n: number) => new Date(Date.now() + n * 864e5).toISOString();

// ------------------------------------------------------------------ enrolment & progress

export function enrol(slug: string, source: "self" | "path" | "partner_referral" = "self") {
  setOpen((s) => (s.enrollments[slug] ? {} : { enrollments: { ...s.enrollments, [slug]: { at: now(), source } } }));
}

/** Marks an activity done; watching/reading only counts as exposure (FR-AD-3). */
export function completeActivity(activity: Activity, extra: { watchedPct?: number; score?: number } = {}) {
  setOpen((s) => {
    const course = courseOfActivity(activity.id);
    const mastery = { ...s.mastery };
    if (!s.progress[activity.id]?.done && (activity.kind === "video" || activity.kind === "reading"))
      for (const sk of activity.skills) mastery[sk] = applyEvidence(mastery[sk], "exposure", 1, `${activity.kind === "video" ? "Watched" : "Read"} “${activity.title.replace(/^(Watch|Read): /, "")}”`);
    return {
      progress: { ...s.progress, [activity.id]: { ...s.progress[activity.id], done: true, at: now(), ...extra } },
      mastery,
      enrollments: course && !s.enrollments[course.slug] ? { ...s.enrollments, [course.slug]: { at: now(), source: "self" } } : s.enrollments,
    };
  });
}

export function saveResume(activityId: string, resumeAt: number, watchedPct: number) {
  setOpen((s) => ({ progress: { ...s.progress, [activityId]: { done: s.progress[activityId]?.done ?? false, at: now(), resumeAt, watchedPct: Math.max(watchedPct, s.progress[activityId]?.watchedPct ?? 0) } } }), false);
}

// ------------------------------------------------------------------ answers, evidence, review

/** Records an answer as evidence and schedules the item for spaced review (FR-RT-1). */
export function recordAnswer(item: Item, correct: boolean, source: EvidenceSource, hintsUsed = 0) {
  // Hints reduce how much a correct answer counts.
  const outcome = correct ? Math.max(0.5, 1 - hintsUsed * 0.15) : 0;
  setOpen((s) => {
    const r = s.review[item.id];
    const interval = correct ? Math.max(1, Math.round((r?.interval ?? 1) * (hintsUsed ? 1.5 : 2.5))) : 1;
    return {
      mastery: { ...s.mastery, [item.skill]: applyEvidence(s.mastery[item.skill], source, outcome, `${correct ? "Correct" : "Incorrect"}${hintsUsed ? ` (${hintsUsed} hint${hintsUsed > 1 ? "s" : ""})` : ""}: ${item.stem.split("\n")[0]!.slice(0, 70)}`) },
      review: { ...s.review, [item.id]: { due: days(interval), interval, reps: (r?.reps ?? 0) + 1 } },
    };
  });
}

/** Review items due now, interleaved across skills (FR-RT-1, FR-AD-4). */
export function dueReview(s: OpenState, at = Date.now()): Item[] {
  const due = Object.entries(s.review)
    .filter(([, r]) => Date.parse(r.due) <= at)
    .map(([id]) => itemById.get(id))
    .filter((x): x is Item => !!x);
  // Interleave: round-robin across skills.
  const bySkill = new Map<string, Item[]>();
  for (const it of due) bySkill.set(it.skill, [...(bySkill.get(it.skill) ?? []), it]);
  const out: Item[] = [];
  while ([...bySkill.values()].some((l) => l.length)) for (const l of bySkill.values()) if (l.length) out.push(l.shift()!);
  return out;
}

// ------------------------------------------------------------------ mastery check & credentials

export function finishMasteryCheck(course: Course, answers: { itemId: string; correct: boolean }[]) {
  const pct = Math.round((answers.filter((a) => a.correct).length / Math.max(1, answers.length)) * 100);
  setOpen((s) => {
    const mastery = { ...s.mastery };
    for (const a of answers) {
      const it = itemById.get(a.itemId);
      if (it) mastery[it.skill] = applyEvidence(mastery[it.skill], "mastery_check", a.correct ? 1 : 0, `Mastery check · ${course.title}`);
    }
    const best = Math.max(pct, s.checks[course.slug]?.pct ?? 0);
    return { mastery, checks: { ...s.checks, [course.slug]: { pct: best, at: now() } }, progress: { ...s.progress, [`${course.slug}.check.assessment`]: { done: pct >= 70, at: now(), score: pct } } };
  });
  return { pct, passed: pct >= 70, issued: evaluateCredentials() };
}

export function criterionMet(c: CredentialDef["criteria"][number], s: OpenState) {
  if (c.kind === "skill_state") return atLeast(s.mastery[c.skill]?.state ?? "not_started", c.min);
  if (c.kind === "mastery_check") return (s.checks[c.courseSlug]?.pct ?? 0) >= c.minPct;
  return s.submissions[c.projectId]?.status === "passed";
}

export function criterionLabel(c: CredentialDef["criteria"][number]) {
  if (c.kind === "skill_state") return `${skillName(c.skill)} — ${c.min}`;
  if (c.kind === "mastery_check") return `Pass the ${courseBySlug.get(c.courseSlug)?.title ?? c.courseSlug} mastery check (${c.minPct}%+)`;
  return `Pass the project “${projectById.get(c.projectId)?.title ?? c.projectId}”`;
}

const CODE_CHARS = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export const newCode = () => Array.from({ length: 3 }, () => Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join("")).join("-");

/** Issues every credential whose criteria are now all met (event-driven, spec section 16). */
export function evaluateCredentials(): IssuedCredential[] {
  const s = useOpen.getState();
  const issued: IssuedCredential[] = [];
  for (const def of CREDENTIALS) {
    if (s.credentials.some((c) => c.defId === def.id && c.status === "active")) continue;
    if (!def.criteria.every((c) => criterionMet(c, s))) continue;
    issued.push({ code: newCode(), defId: def.id, issuedAt: now(), status: "active", evidence: def.criteria.map(criterionLabel) });
  }
  if (issued.length) setOpen((st) => ({ credentials: [...issued, ...st.credentials] }));
  return issued;
}

// ------------------------------------------------------------------ goals, diagnostic, path

/** Skills a career needs, from its competencies. */
export const careerSkills = (careerId: string) => {
  const c = careerById.get(careerId);
  return c ? [...new Set(c.courses.flatMap((slug) => courseBySlug.get(slug)?.skills ?? []))] : [];
};

/** An adaptive-ish diagnostic: one item per skill, easiest first, at most 8 (FR-DG-1). */
export function diagnosticItems(skills: string[]): Item[] {
  const testable = skills.filter((sk) => itemsForSkill(sk).length > 0);
  // Spread the (at most 8) questions evenly across the goal's skills, so every area is sampled.
  const n = Math.min(8, testable.length);
  const picked = Array.from({ length: n }, (_, i) => testable[Math.floor((i * testable.length) / n)]!);
  return picked.map((sk) => itemsForSkill(sk).sort((a, b) => a.difficulty - b.difficulty)[0]!);
}

export interface DiagnosticResult {
  skill: string;
  status: "known" | "partial" | "gap";
}

/** Creates a goal and a personal path; known skills are skipped (FR-LP-2). */
export function createGoal(input: { kind: Goal["kind"]; label: string; careerId?: string; skills: string[]; weeks?: number }, results: DiagnosticResult[] = []) {
  const goal: Goal = { id: uid("goal"), kind: input.kind, label: input.label, careerId: input.careerId, skills: input.skills, createdAt: now(), deadline: input.weeks ? days(input.weeks * 7) : undefined };
  const known = new Set(results.filter((r) => r.status === "known").map((r) => r.skill));
  const courses = input.careerId ? careerById.get(input.careerId)?.courses ?? [] : [...new Set(input.skills.map((sk) => [...courseBySlug.values()].find((c) => c.authored && c.skills.includes(sk))?.slug).filter((x): x is string => !!x))];
  const steps: PathStep[] = [];
  for (const slug of courses) {
    const course = courseBySlug.get(slug);
    if (!course) continue;
    const skipped = course.skills.filter((sk) => known.has(sk));
    const gaps = course.skills.filter((sk) => !known.has(sk));
    steps.push({
      kind: "course",
      ref: slug,
      skipped,
      reason: course.skills.length === 0 ? "Rounds out the path" : gaps.length === 0 ? "You already know this — take the mastery check to verify it" : `Closes your gap${gaps.length > 1 ? "s" : ""} in ${gaps.map(skillName).slice(0, 2).join(" and ")}`,
    });
  }
  const career = input.careerId ? careerById.get(input.careerId) : undefined;
  for (const p of career?.projects ?? []) steps.push({ kind: "project", ref: p, reason: "Proves you can apply the skills — goes into your portfolio" });
  if (career) steps.push({ kind: "credential", ref: career.credential, reason: "Evidence-backed credential employers can verify" });
  setOpen((s) => {
    const mastery = { ...s.mastery };
    for (const r of results) {
      const it = diagnosticItems([r.skill])[0];
      if (it) mastery[r.skill] = applyEvidence(mastery[r.skill], "diagnostic", r.status === "known" ? 1 : r.status === "partial" ? 0.5 : 0, "Diagnostic");
    }
    const enrollments = { ...s.enrollments };
    const firstCourse = steps.find((st) => st.kind === "course" && (st.skipped?.length ?? 0) < (courseBySlug.get(st.ref)?.skills.length ?? 0));
    if (firstCourse && !enrollments[firstCourse.ref]) enrollments[firstCourse.ref] = { at: now(), source: "path" };
    return { goals: [goal, ...s.goals], activeGoal: goal.id, path: steps, planDeadline: goal.deadline ?? null, planStartedAt: now(), mastery, enrollments };
  });
  return goal;
}

// ------------------------------------------------------------------ progress, next activity, planner

export function courseProgress(course: Course, s: OpenState) {
  const acts = activitiesOf(course);
  const done = acts.filter((a) => s.progress[a.id]?.done).length;
  const next = acts.find((a) => !s.progress[a.id]?.done);
  const mastered = course.skills.filter((sk) => atLeast(s.mastery[sk]?.state ?? "not_started", "understood")).length;
  return { total: acts.length, done, pct: acts.length ? Math.round((done / acts.length) * 100) : 0, next, masteryPct: course.skills.length ? Math.round((mastered / course.skills.length) * 100) : 0 };
}

export interface NextActivity {
  course: Course;
  activity: Activity;
  reason: string;
}

/** The single "next best activity" on Today, always with its reason (FR-LP-3). */
export function nextBestActivity(s: OpenState): NextActivity | null {
  const goal = s.goals.find((g) => g.id === s.activeGoal);
  const candidates = [
    ...s.path.filter((st) => st.kind === "course").map((st) => st.ref),
    ...Object.keys(s.enrollments),
  ];
  for (const slug of [...new Set(candidates)]) {
    const course = courseBySlug.get(slug);
    if (!course) continue;
    const step = s.path.find((st) => st.ref === slug);
    const skippedAll = step?.skipped?.length && step.skipped.length === course.skills.length;
    const p = courseProgress(course, s);
    if (!p.next) continue;
    const activity = skippedAll ? activitiesOf(course).find((a) => a.kind === "mastery_check") ?? p.next : p.next;
    const skill = activity.skills.find((sk) => !atLeast(s.mastery[sk]?.state ?? "not_started", "understood"));
    const reason = skippedAll
      ? "You already know this — verify it and skip ahead"
      : skill && goal
        ? `Builds ${skillName(skill)} for your goal: ${goal.label}`
        : skill
          ? `Next step in ${course.title}: ${skillName(skill)}`
          : `Continue ${course.title}`;
    return { course, activity, reason };
  }
  return null;
}

/** Minutes of learning left on the path, and the projected finish (FR-LP-4). */
export function planStatus(s: OpenState) {
  const courses = s.path.filter((st) => st.kind === "course").map((st) => courseBySlug.get(st.ref)).filter((c): c is Course => !!c);
  const all = courses.flatMap((c) => activitiesOf(c));
  const remaining = all.filter((a) => !s.progress[a.id]?.done).reduce((m, a) => m + a.minutes, 0) + s.path.filter((st) => st.kind === "project" && s.submissions[st.ref]?.status !== "passed").length * 360;
  const totalMin = all.reduce((m, a) => m + a.minutes, 0) + s.path.filter((st) => st.kind === "project").length * 360;
  const hours = s.profile?.hoursPerWeek ?? 3;
  // Assume a realistic 70% of planned time is actually available.
  const weeksLeft = remaining / (hours * 60 * 0.7);
  const projected = new Date(Date.now() + weeksLeft * 7 * 864e5);
  const deadline = s.planDeadline ? new Date(s.planDeadline) : null;
  const behind = !!deadline && projected > deadline;
  const neededHours = deadline ? Math.ceil(remaining / 60 / Math.max(0.5, (deadline.getTime() - Date.now()) / (7 * 864e5)) / 0.7) : hours;
  return { remainingMin: remaining, totalMin, doneMin: totalMin - remaining, projected, deadline, behind, neededHours };
}

// ------------------------------------------------------------------ projects & peer review

const REVIEWERS = ["Reviewer A", "Reviewer B", "Reviewer C"];

/** Submits a project; three calibrated anonymous peers review it (FR-PR-1..3). */
export function submitProject(projectId: string, summary: string, link: string) {
  const project = projectById.get(projectId);
  if (!project) return;
  // Quality proxy for the simulation: a fuller write-up scores better.
  const quality = Math.min(1, 0.45 + summary.trim().split(/\s+/).length / 160 + (link ? 0.1 : 0));
  const reviews: PeerReview[] = REVIEWERS.map((reviewer, i) => {
    const calibration = [0.92, 0.84, 0.61][i]!;
    const noise = (i === 2 ? -0.25 : 0.05 * (i - 0.5));
    const scores = Object.fromEntries(project.rubric.map((c) => [c.id, Math.max(1, Math.min(c.max, Math.round(c.max * (quality + noise))))]));
    return { reviewer, calibration, scores, comment: ["Clear and well structured. The chart makes the point quickly.", "Good analysis. I'd add how you handled the outliers.", "Needs more detail."][i]! };
  });
  const sub: ProjectSubmission = {
    projectId,
    revision: (useOpen.getState().submissions[projectId]?.revision ?? -1) + 1,
    summary,
    link,
    submittedAt: now(),
    status: "in_review",
    milestonesDone: project.milestones.length,
    reviews,
    aiFeedback: `AI feedback (advisory — doesn't count towards your grade): your write-up covers ${Math.round(quality * 100)}% of the brief's requirements. Consider stating your recommendation in the first sentence and saying how you checked that the biggest increases aren't outliers.`,
  };
  setOpen((s) => ({ submissions: { ...s.submissions, [projectId]: sub } }));
}

/** Reliability-weighted peer consensus (low-calibration reviewers count less). */
export function peerConsensus(projectId: string, s: OpenState) {
  const sub = s.submissions[projectId];
  const project = projectById.get(projectId);
  if (!sub || !project) return null;
  const totalW = sub.reviews.reduce((m, r) => m + r.calibration, 0);
  const perCriterion = Object.fromEntries(project.rubric.map((c) => [c.id, sub.reviews.reduce((m, r) => m + (r.scores[c.id] ?? 0) * r.calibration, 0) / totalW]));
  const max = project.rubric.reduce((m, c) => m + c.max, 0);
  const pct = Math.round((Object.values(perCriterion).reduce((a, b) => a + b, 0) / max) * 100);
  // Agreement: spread of the three totals.
  const totals = sub.reviews.map((r) => Object.values(r.scores).reduce((a, b) => a + b, 0));
  const agreement = 1 - (Math.max(...totals) - Math.min(...totals)) / max;
  return { perCriterion, pct, agreement, needsModeration: agreement < 0.75 };
}

/** The instructor's final assessment (a human decides credential-bearing grades — spec section 12.4). */
export function instructorAssess(projectId: string) {
  const s = useOpen.getState();
  const project = projectById.get(projectId);
  const consensus = peerConsensus(projectId, s);
  if (!project || !consensus) return null;
  const instructorScores = Object.fromEntries(project.rubric.map((c) => [c.id, Math.min(c.max, Math.round(consensus.perCriterion[c.id]! + 0.4))]));
  const max = project.rubric.reduce((m, c) => m + c.max, 0);
  const finalPct = Math.round((Object.values(instructorScores).reduce((a, b) => a + b, 0) / max) * 100);
  const passed = finalPct >= 70;
  setOpen((st) => {
    const mastery = { ...st.mastery };
    for (const c of project.rubric) {
      const frac = (instructorScores[c.id] ?? 0) / c.max;
      mastery[c.skill] = applyEvidence(mastery[c.skill], "project_peer", consensus.perCriterion[c.id]! / c.max, `Project “${project.title}” · peers`);
      mastery[c.skill] = applyEvidence(mastery[c.skill], "project_instructor", frac, `Project “${project.title}” · instructor`);
    }
    return { mastery, submissions: { ...st.submissions, [projectId]: { ...st.submissions[projectId]!, instructorScores, finalPct, status: passed ? "passed" : "revision_requested" } } };
  });
  return { passed, finalPct, issued: evaluateCredentials() };
}

// ------------------------------------------------------------------ offline sync, misc

export function setOfflineMode(offline: boolean) {
  const pending = useOpen.getState().pendingSync;
  useOpen.setState({ offline, ...(offline ? {} : { pendingSync: 0 }) });
  return offline ? 0 : pending;
}

export function addNote(activityId: string, text: string, at?: number) {
  setOpen((s) => ({ notes: [{ id: uid("note"), activityId, text, at, createdAt: now() }, ...s.notes] }));
}

export const allItems = ITEMS;
export const careers = CAREERS;
export { credentialById, findActivity };

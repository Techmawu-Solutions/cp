import type { ID, LearningEvent, Question, VideoInteraction, VideoInteractionAttempt, VideoInteractionOption, VideoInteractionResponse, VideoInteractionSet, VideoInteractionType, VideoProgress, VideoProvider } from "@/lib/types";
import { markQuestion } from "@/lib/questions";

/**
 * Interactive video (spec section 26.3): everything that decides what happens,
 * with no React and no store, so the same rules run in the player, the editor,
 * the analytics and the tests — and map one-to-one onto cpback's
 * App\Domain\InteractiveVideo actions, which apply them on the server.
 *
 * Choice answers are option ids, never indexes, so reordering options in a
 * new version can't change what an earlier answer meant.
 */

export const INTERACTION_TYPES: { value: VideoInteractionType; label: string; hint: string; scored: boolean; options: "single" | "many" | "fixed" | "none" }[] = [
  { value: "mcq", label: "Multiple Choice", hint: "One correct option", scored: true, options: "single" },
  { value: "true_false", label: "True / False", hint: "True or false", scored: true, options: "fixed" },
  { value: "multi_select", label: "Multiple Select", hint: "Several correct options", scored: true, options: "many" },
  { value: "poll", label: "Poll", hint: "No right answer — see how the class feels", scored: false, options: "many" },
  { value: "short_answer", label: "Short Answer", hint: "A few words, reviewed by you", scored: true, options: "none" },
];
export const interactionLabel = (t: VideoInteractionType) => INTERACTION_TYPES.find((x) => x.value === t)?.label ?? t;
export const isScored = (t: VideoInteractionType) => !!INTERACTION_TYPES.find((x) => x.value === t)?.scored;
export const isChoice = (t: VideoInteractionType) => t === "mcq" || t === "true_false" || t === "multi_select" || t === "poll";
export const DEFAULT_TITLE = "Quick check";
/** Students may continue without retrying once they've answered; they get this many tries by default. */
export const DEFAULT_MAX_ATTEMPTS = 3;

// ---------------------------------------------------------------------------
// Time
// ---------------------------------------------------------------------------

/** 155 → "2:35"; 3725 → "1:02:05". */
export function fmtTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds + 1e-6));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

/** "2:35", "1:02:05", "155" or "155.5" → seconds; null when it isn't a time. */
export function parseTime(text: string): number | null {
  const t = text.trim();
  if (!t) return null;
  if (/^\d+(\.\d+)?$/.test(t)) return Number(t);
  const m = /^(?:(\d+):)?(\d{1,2}):(\d{2})(\.\d+)?$/.exec(t);
  if (!m) return null;
  const [, h, mm, ss, frac] = m;
  if (Number(ss) > 59 || (h !== undefined && Number(mm) > 59)) return null;
  return Number(h ?? 0) * 3600 + Number(mm) * 60 + Number(ss) + Number(frac ?? 0);
}

// ---------------------------------------------------------------------------
// Video sources
// ---------------------------------------------------------------------------

/** Which player a lesson's video needs (spec section 26.3, "player layer"). */
export function parseVideoUrl(raw: string): { provider: VideoProvider; providerRef?: string } | null {
  if (!raw) return null;
  if (raw.startsWith("blob:") || /\.(mp4|webm|ogg|m4v|mov)(\?|#|$)/i.test(raw)) return { provider: "file" };
  try {
    const u = new URL(raw);
    const host = u.hostname.replace(/^(www\.|m\.)/, "");
    if (host === "youtube.com" || host === "youtube-nocookie.com") {
      const id = u.searchParams.get("v") ?? /^\/(?:embed|shorts|live)\/([\w-]{6,})/.exec(u.pathname)?.[1];
      if (id) return { provider: "youtube", providerRef: id };
    }
    if (host === "youtu.be") {
      const id = u.pathname.slice(1).split("/")[0];
      if (id) return { provider: "youtube", providerRef: id };
    }
    if (host === "vimeo.com" || host === "player.vimeo.com") {
      const id = /\/(\d{5,})/.exec(u.pathname)?.[1];
      if (id) return { provider: "vimeo", providerRef: id };
    }
  } catch {
    return null;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Authoring
// ---------------------------------------------------------------------------

/** A new interaction with sensible defaults for its type. */
export function blankInteraction(type: VideoInteractionType, ids: { id: ID; setId: ID; optionId: () => ID }, timestamp: number): VideoInteraction {
  const base: VideoInteraction = {
    id: ids.id,
    setId: ids.setId,
    type,
    timestamp: Math.max(0, round3(timestamp)),
    order: 0,
    question: "",
    options: [],
    points: 1,
    required: true,
    allowRetry: true,
    maxAttempts: DEFAULT_MAX_ATTEMPTS,
    showFeedback: true,
    pauseVideo: true,
    resumeAfterSubmit: false,
    displayPosition: "center",
    source: "teacher",
  };
  return { ...base, ...optionsFor(type, [], ids.optionId) };
}

/** Changes an interaction's type, keeping the question and whatever options still fit. */
export function changeType(i: VideoInteraction, type: VideoInteractionType, optionId: () => ID): VideoInteraction {
  if (i.type === type) return i;
  return { ...i, type, ...optionsFor(type, i.options, optionId) };
}

function optionsFor(type: VideoInteractionType, keep: VideoInteractionOption[], optionId: () => ID): Partial<VideoInteraction> {
  const blanks = (n: number) => Array.from({ length: n }, () => ({ id: optionId(), text: "", correct: false }));
  const reuse = keep.filter((o) => o.text.trim()).map((o) => ({ ...o }));
  switch (type) {
    case "true_false":
      return { options: [{ id: optionId(), text: "True", correct: true }, { id: optionId(), text: "False", correct: false }], points: 1 };
    case "mcq": {
      const opts = reuse.length >= 2 ? reuse : [...reuse, ...blanks(4 - reuse.length)];
      const first = Math.max(0, opts.findIndex((o) => o.correct));
      return { options: opts.map((o, n) => ({ ...o, correct: n === first })) };
    }
    case "multi_select":
      return { options: reuse.length >= 2 ? reuse : [...reuse, ...blanks(4 - reuse.length)] };
    case "poll":
      // Polls have no right answer and score nothing; they rarely need to stop the video.
      return { options: (reuse.length >= 2 ? reuse : [...reuse, ...blanks(3 - reuse.length)]).map((o) => ({ ...o, correct: false, feedback: undefined })), points: 0, required: false, allowRetry: false };
    case "short_answer":
      return { options: [], points: 2, allowRetry: false };
  }
}

/** The interaction as a platform question, so it is marked exactly like quizzes are (lib/questions.ts). */
export function toQuestion(i: VideoInteraction): Question {
  const correct = i.options.map((o, n) => (o.correct ? n : -1)).filter((n) => n >= 0);
  const base: Question = { id: i.id, type: "mcq", prompt: i.question, marks: Math.max(i.points, 1), options: i.options.map((o) => o.text) };
  switch (i.type) {
    case "true_false":
      return { ...base, type: "true_false", answer: correct[0] === 0 ? "true" : "false" };
    case "multi_select":
      return { ...base, type: "multi_select", answers: correct.map(String) };
    case "short_answer":
      return { ...base, type: "short_answer", options: undefined, answer: i.modelAnswer };
    default:
      return { ...base, answer: correct[0] != null ? String(correct[0]) : undefined };
  }
}

/** Problems that stop an interaction being saved; empty when it's ready. Mirrors cpback's form request. */
export function interactionProblems(i: VideoInteraction, durationSeconds: number | null): string[] {
  const errs: string[] = [];
  if (!INTERACTION_TYPES.some((t) => t.value === i.type)) return ["has an unknown type"];
  if (!Number.isFinite(i.timestamp) || i.timestamp < 0) errs.push("needs a time in the video");
  else if (durationSeconds != null && durationSeconds > 0 && i.timestamp > durationSeconds) errs.push(`is after the end of the video (${fmtTime(durationSeconds)})`);
  if (!i.question.trim()) errs.push("has no question");
  if (!Number.isFinite(i.points) || i.points < 0) errs.push("can't have negative points");
  if (i.maxAttempts != null && (!Number.isInteger(i.maxAttempts) || i.maxAttempts < 1)) errs.push("needs at least one attempt");
  if (isChoice(i.type)) {
    const filled = i.options.filter((o) => o.text.trim());
    if (filled.length < 2) errs.push("needs at least two options");
    if (filled.length !== i.options.length) errs.push("has an empty option");
    const right = i.options.filter((o) => o.correct).length;
    if ((i.type === "mcq" || i.type === "true_false") && right !== 1) errs.push("needs exactly one correct option");
    if (i.type === "multi_select" && right < 1) errs.push("needs at least one correct option");
    if (i.type === "poll" && right > 0) errs.push("is a poll, so no option can be correct");
    if (new Set(filled.map((o) => o.text.trim().toLowerCase())).size !== filled.length) errs.push("has the same option twice");
  }
  return errs;
}

/** Interactions in play order: by time, then by the teacher's order at the same moment. */
export function sortInteractions<T extends Pick<VideoInteraction, "timestamp" | "order">>(list: T[]): T[] {
  return [...list].sort((a, b) => a.timestamp - b.timestamp || a.order - b.order);
}

/** Renumbers `order` within each moment after a move, so ties keep a stable order. */
export function renumber(list: VideoInteraction[]): VideoInteraction[] {
  const seen = new Map<number, number>();
  return sortInteractions(list).map((i) => {
    const n = seen.get(i.timestamp) ?? 0;
    seen.set(i.timestamp, n + 1);
    return i.order === n ? i : { ...i, order: n };
  });
}

/** Puts `id` one place earlier (-1) or later (+1) in play order; at the same moment it swaps order, otherwise it swaps times. */
export function moveInteraction(list: VideoInteraction[], id: ID, dir: -1 | 1): VideoInteraction[] {
  const sorted = sortInteractions(list);
  const at = sorted.findIndex((i) => i.id === id);
  const other = sorted[at + dir];
  const me = sorted[at];
  if (!me || !other) return list;
  const swapped = sorted.map((i) => {
    if (i.id === me.id) return { ...i, timestamp: other.timestamp, order: other.order };
    if (i.id === other.id) return { ...i, timestamp: me.timestamp, order: me.order };
    return i;
  });
  return renumber(swapped);
}

const round3 = (n: number) => Math.round(n * 1000) / 1000;

// ---------------------------------------------------------------------------
// Answering and scoring (the server's rules — the browser only displays them)
// ---------------------------------------------------------------------------

/** Why a response can't be accepted, or null when it can. */
export function responseProblem(i: VideoInteraction, r: VideoInteractionResponse): string | null {
  if (i.type === "short_answer") {
    const text = (r.text ?? "").trim();
    if (!text) return "Write an answer first.";
    if (text.length > 2000) return "That answer is too long (2,000 characters at most).";
    return null;
  }
  const ids = r.optionIds ?? [];
  if (ids.length === 0) return "Choose an answer first.";
  if (new Set(ids).size !== ids.length || ids.some((id) => !i.options.some((o) => o.id === id))) return "That answer doesn't match this question.";
  if ((i.type === "mcq" || i.type === "true_false") && ids.length !== 1) return "Choose one answer.";
  if (i.type === "poll" && ids.length !== 1) return "Choose one answer.";
  return null;
}

/** The answer in the string form lib/questions.ts marks. */
export function responseToRaw(i: VideoInteraction, r: VideoInteractionResponse): string {
  const idx = (r.optionIds ?? []).map((id) => i.options.findIndex((o) => o.id === id)).filter((n) => n >= 0);
  switch (i.type) {
    case "true_false":
      return tfRaw(i, r);
    case "multi_select":
      return JSON.stringify(idx.sort((a, b) => a - b));
    case "short_answer":
      return r.text ?? "";
    default:
      return idx[0] != null ? String(idx[0]) : "";
  }
}

export interface Score {
  correct: boolean | null;
  pointsEarned: number | null;
  review: "auto" | "pending";
}

/**
 * Scores an answer from the stored configuration. Polls aren't scored; short
 * answers wait for the teacher. Multiple select gives partial credit exactly as
 * quizzes do (right picks minus wrong picks), but only full marks is "correct".
 */
export function scoreResponse(i: VideoInteraction, r: VideoInteractionResponse): Score {
  if (i.type === "poll") return { correct: null, pointsEarned: null, review: "auto" };
  if (i.type === "short_answer") return { correct: null, pointsEarned: null, review: "pending" };
  const q = toQuestion(i);
  const got = markQuestion(q, responseToRaw(i, r)) ?? 0;
  const frac = q.marks > 0 ? got / q.marks : 0;
  return { correct: frac >= 1 - 1e-9, pointsEarned: Math.round(i.points * frac * 100) / 100, review: "auto" };
}

// True/false compares the chosen option with the correct one directly (labels may be translated).
function tfRaw(i: VideoInteraction, r: VideoInteractionResponse) {
  const chosen = i.options.findIndex((o) => o.id === r.optionIds?.[0]);
  const right = i.options.findIndex((o) => o.correct);
  if (chosen < 0) return "";
  const q = toQuestion(i);
  return chosen === right ? (q.answer ?? "") : q.answer === "true" ? "false" : "true";
}

/** How many answers a student may give. */
export const attemptLimit = (i: Pick<VideoInteraction, "allowRetry" | "maxAttempts">) => (i.allowRetry ? (i.maxAttempts ?? Infinity) : 1);

export type InteractionState =
  /** Not answered yet. */
  | "open"
  /** Skipped (optional questions only); can still be answered. */
  | "skipped"
  /** Answered wrongly with tries left. */
  | "retry"
  | "correct"
  /** Wrong with no tries left. */
  | "incorrect"
  /** A poll answer, or a short answer waiting for (or past) review. */
  | "answered";

export interface InteractionStatus {
  state: InteractionState;
  attempts: VideoInteractionAttempt[];
  attemptsLeft: number;
  /** The attempt that counts: the best score, latest on ties. */
  best: VideoInteractionAttempt | null;
  /** The student has answered at least once, so the video may go on. */
  resolved: boolean;
}

/** Where one student stands on one interaction. `attempts` may contain other students' or questions' rows. */
export function interactionStatus(i: VideoInteraction, attempts: VideoInteractionAttempt[], studentSkipped = false): InteractionStatus {
  const mine = attempts.filter((a) => a.interactionId === i.id).sort((a, b) => a.attemptNumber - b.attemptNumber);
  const left = Math.max(0, attemptLimit(i) - mine.length);
  const best = mine.reduce<VideoInteractionAttempt | null>((b, a) => (!b || (a.pointsEarned ?? -1) >= (b.pointsEarned ?? -1) ? a : b), null);
  const last = mine[mine.length - 1];
  let state: InteractionState;
  if (!last) state = studentSkipped ? "skipped" : "open";
  else if (i.type === "poll" || i.type === "short_answer") state = i.type === "short_answer" && last.review === "reviewed" ? (last.correct ? "correct" : "incorrect") : "answered";
  else if (mine.some((a) => a.correct)) state = "correct";
  else state = left > 0 ? "retry" : "incorrect";
  return { state, attempts: mine, attemptsLeft: left, best, resolved: !!last };
}

/** Whether a new attempt is allowed, and why not. */
export function canAttempt(i: VideoInteraction, status: InteractionStatus): string | null {
  if (status.state === "correct") return "You've already answered this correctly.";
  if (status.state === "answered" || (i.type === "short_answer" && status.resolved)) return "Your answer is already recorded.";
  if (status.attemptsLeft <= 0) return "You've used all your attempts for this question.";
  return null;
}

// ---------------------------------------------------------------------------
// Playback: when questions appear, and gentle anti-skipping
// ---------------------------------------------------------------------------

/**
 * Interactions playback reached between two moments (from ≤ t < to), in order.
 * Called with the previous and current time on every tick, so a question at
 * 0:00 fires as soon as playing starts and several close together queue up.
 */
export function crossed<T extends Pick<VideoInteraction, "timestamp" | "order">>(sorted: T[], from: number, to: number): T[] {
  if (to <= from) return [];
  return sorted.filter((i) => i.timestamp >= from - 1e-6 && i.timestamp < to);
}

/**
 * The question that stops a forward seek: the earliest required question not
 * yet answered that lies before where the student wants to go. Seeking back,
 * or forward up to it, is always allowed. Null when nothing is in the way.
 */
export function seekBlocker(sorted: VideoInteraction[], target: number, isResolved: (i: VideoInteraction) => boolean, preventSkipping: boolean): VideoInteraction | null {
  if (!preventSkipping) return null;
  return sorted.find((i) => i.required && i.timestamp < target - 0.25 && !isResolved(i)) ?? null;
}

/** Adds a played stretch to the merged list of watched ranges. */
export function addRange(ranges: [number, number][], start: number, end: number): [number, number][] {
  if (!(end > start)) return ranges;
  const all = [...ranges, [start, end] as [number, number]].sort((a, b) => a[0] - b[0]);
  const out: [number, number][] = [];
  for (const [s, e] of all) {
    const last = out[out.length - 1];
    // Ranges within half a second of each other join, so tick gaps don't fragment them.
    if (last && s <= last[1] + 0.5) last[1] = Math.max(last[1], e);
    else out.push([round3(s), round3(e)]);
  }
  return out.map(([s, e]) => [round3(s), round3(e)]);
}

/** Percent of the video actually played (0–100). Skipping to the end doesn't count as watching. */
export function watchedPercent(ranges: [number, number][], duration: number): number {
  if (!(duration > 0)) return 0;
  const covered = ranges.reduce((n, [s, e]) => n + Math.max(0, Math.min(e, duration) - Math.max(0, s)), 0);
  // The last second or two often never reports; count the video as fully seen within 1 s of the end.
  const pct = covered >= duration - 1 ? 100 : (covered / duration) * 100;
  return Math.round(Math.min(100, pct) * 10) / 10;
}

// ---------------------------------------------------------------------------
// Progress
// ---------------------------------------------------------------------------

export interface ProgressSummary {
  total: number;
  encountered: number;
  /** Answered (any result). */
  completed: number;
  skipped: number;
  correct: number;
  incorrect: number;
  pendingReview: number;
  attempts: number;
  score: number;
  maxScore: number;
  /** null when nothing in the video is scored. */
  scorePercent: number | null;
  requiredLeft: number;
  watchedPercent: number;
}

/** One student's numbers for one version of a lesson's questions. */
export function summarize(interactions: VideoInteraction[], attempts: VideoInteractionAttempt[], progress: Pick<VideoProgress, "encountered" | "skipped" | "completionPercent"> | null): ProgressSummary {
  const skipped = new Set(progress?.skipped ?? []);
  let completed = 0, correct = 0, incorrect = 0, pendingReview = 0, score = 0, maxScore = 0, requiredLeft = 0, n = 0, skippedCount = 0;
  for (const i of interactions) {
    const st = interactionStatus(i, attempts, skipped.has(i.id));
    n += st.attempts.length;
    if (st.resolved) completed++;
    else if (i.required) requiredLeft++;
    if (st.state === "skipped") skippedCount++;
    if (st.state === "correct") correct++;
    if (st.state === "incorrect" || st.state === "retry") incorrect++;
    if (i.type === "short_answer" && st.resolved && st.best?.review === "pending") pendingReview++;
    if (isScored(i.type)) {
      maxScore += i.points;
      score += st.best?.pointsEarned ?? 0;
    }
  }
  const encountered = new Set([...(progress?.encountered ?? []), ...attempts.map((a) => a.interactionId)].filter((id) => interactions.some((i) => i.id === id))).size;
  return {
    total: interactions.length,
    encountered,
    completed,
    skipped: skippedCount,
    correct,
    incorrect,
    pendingReview,
    attempts: n,
    score: Math.round(score * 100) / 100,
    maxScore,
    scorePercent: maxScore > 0 ? Math.round((score / maxScore) * 1000) / 10 : null,
    requiredLeft,
    watchedPercent: progress?.completionPercent ?? 0,
  };
}

/** The lesson is complete once enough is watched and every required question is answered. */
export function isComplete(set: Pick<VideoInteractionSet, "completionPercent">, s: Pick<ProgressSummary, "requiredLeft" | "watchedPercent">): boolean {
  return s.requiredLeft === 0 && s.watchedPercent >= set.completionPercent;
}

// ---------------------------------------------------------------------------
// Teacher analytics (spec section 26.3, "Results")
// ---------------------------------------------------------------------------

export interface InteractionStats {
  interactionId: ID;
  /** Students who answered at least once. */
  answered: number;
  /** Of those, the share whose best answer is fully correct (scored types). */
  correctPct: number | null;
  /** Share right on the first try. */
  firstTryPct: number | null;
  avgAttempts: number;
  /** Students' first answers, per option (choice types and polls). */
  options: { option: VideoInteractionOption; count: number; pct: number }[];
  /** The wrong option most often picked first: the likeliest misconception. */
  commonWrong: { option: VideoInteractionOption; pct: number } | null;
  /** Students still wrong, or wrong more than once before getting it. */
  struggling: ID[];
  pendingReview: number;
}

export function interactionStats(i: VideoInteraction, attempts: VideoInteractionAttempt[]): InteractionStats {
  const byStudent = new Map<ID, VideoInteractionAttempt[]>();
  for (const a of attempts) if (a.interactionId === i.id) byStudent.set(a.studentId, [...(byStudent.get(a.studentId) ?? []), a]);
  const students = [...byStudent.values()].map((l) => l.sort((a, b) => a.attemptNumber - b.attemptNumber));
  const answered = students.length;
  const scored = isScored(i.type) && i.type !== "short_answer";
  const reviewed = i.type === "short_answer" ? students.filter((l) => l.some((a) => a.review === "reviewed")) : students;
  const correctN = reviewed.filter((l) => l.some((a) => a.correct)).length;
  const firstN = reviewed.filter((l) => l[0]?.correct).length;
  const firsts = students.map((l) => l[0]!);
  const counts = i.options.map((option) => {
    const count = firsts.filter((a) => a.response.optionIds?.includes(option.id)).length;
    return { option, count, pct: answered ? Math.round((count / answered) * 100) : 0 };
  });
  const wrong = scored ? counts.filter((c) => !c.option.correct && c.count > 0).sort((a, b) => b.count - a.count)[0] : undefined;
  const struggling = scored || i.type === "short_answer" ? [...byStudent.entries()].filter(([, l]) => l.filter((a) => a.correct === false).length >= 2 || (l.length > 0 && !l.some((a) => a.correct) && l[l.length - 1]!.correct === false)).map(([id]) => id) : [];
  const graded = scored || i.type === "short_answer";
  return {
    interactionId: i.id,
    answered,
    correctPct: graded && reviewed.length ? Math.round((correctN / reviewed.length) * 100) : null,
    firstTryPct: graded && reviewed.length ? Math.round((firstN / reviewed.length) * 100) : null,
    avgAttempts: answered ? Math.round((students.reduce((n, l) => n + l.length, 0) / answered) * 10) / 10 : 0,
    options: counts,
    commonWrong: wrong ? { option: wrong.option, pct: wrong.pct } : null,
    struggling,
    pendingReview: i.type === "short_answer" ? students.filter((l) => l.some((a) => a.review === "pending")).length : 0,
  };
}

export interface SetAnalytics {
  students: number;
  started: number;
  completed: number;
  avgWatchedPercent: number | null;
  avgScorePercent: number | null;
  perInteraction: InteractionStats[];
}

/** Class-level numbers for one version. `studentIds` is everyone enrolled in the course. */
export function setAnalytics(interactions: VideoInteraction[], attempts: VideoInteractionAttempt[], progresses: VideoProgress[], studentIds: ID[]): SetAnalytics {
  const roster = new Set(studentIds);
  const mine = progresses.filter((p) => roster.has(p.studentId));
  const scores = mine
    .map((p) => summarize(interactions, attempts.filter((a) => a.studentId === p.studentId), p).scorePercent)
    .filter((x): x is number => x != null);
  const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);
  return {
    students: roster.size,
    started: mine.length,
    completed: mine.filter((p) => p.status === "completed").length,
    avgWatchedPercent: avg(mine.map((p) => p.completionPercent)),
    avgScorePercent: avg(scores),
    perInteraction: sortInteractions(interactions).map((i) => interactionStats(i, attempts.filter((a) => roster.has(a.studentId)))),
  };
}

// ---------------------------------------------------------------------------
// Learning science (the feed for mastery and spaced review later)
// ---------------------------------------------------------------------------

/**
 * Concepts a student keeps getting wrong: answered incorrectly at least twice
 * with no correct answer since. A mastery model replaces this rule later; the
 * events it reads are already recorded.
 */
export function conceptsToReview(events: LearningEvent[], studentId: ID): { concept: string; wrong: number; lastAt: string }[] {
  const by = new Map<string, { wrong: number; lastAt: string }>();
  const mine = events.filter((e) => e.studentId === studentId && e.verb === "answered" && e.concept).sort((a, b) => a.at.localeCompare(b.at));
  for (const e of mine) {
    const cur = by.get(e.concept!) ?? { wrong: 0, lastAt: e.at };
    if (e.correct === true) cur.wrong = 0;
    else if (e.correct === false) cur.wrong++;
    cur.lastAt = e.at;
    by.set(e.concept!, cur);
  }
  return [...by.entries()].filter(([, v]) => v.wrong >= 2).map(([concept, v]) => ({ concept, ...v }));
}

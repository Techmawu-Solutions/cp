import { useStore } from "@/lib/store";
import type { DB } from "@/lib/data/seed";
import { uid } from "@/lib/helpers";
import type { ContentItem, Course, ID, LearningEvent, VideoAiSuggestion, VideoAsset, VideoInteraction, VideoInteractionAttempt, VideoInteractionResponse, VideoInteractionSet, VideoProgress } from "@/lib/types";
import { addRange, canAttempt, interactionProblems, interactionStatus, isComplete, parseVideoUrl, renumber, responseProblem, scoreResponse, sortInteractions, summarize, watchedPercent } from "@/lib/interactive-video/engine";
import { GENERATORS } from "@/lib/interactive-video/suggestions";

/**
 * Interactive video writes (spec section 26.3). Each function is one API call
 * in cpback (BACKEND_PLAN.md section 8.3) and applies the same checks the
 * server does: who may do it, validation, attempt limits, idempotency and
 * scoring from the stored answers. The browser never decides whether an
 * answer was right — screens call these and show what they return.
 */

type Result<T> = { ok: true; value: T } | { ok: false; error: string };
const S = () => useStore.getState();
const nowIso = () => new Date().toISOString();

// ---------------------------------------------------------------------------
// Who may do what (cpback: VideoInteractionSetPolicy, VideoAttemptPolicy)
// ---------------------------------------------------------------------------

function permissionsOf(db: Pick<DB, "users" | "roles">, userId: ID | null) {
  const user = db.users.find((u) => u.id === userId);
  const perms = new Set(db.roles.filter((r) => r.id === user?.roleId).flatMap((r) => r.permissions));
  return { user, perms };
}

/** The course's own teacher, or school staff with content.update in that school (the Super Admin while entered). */
export function canManageCourseVideo(db: Pick<DB, "users" | "roles" | "teachers">, userId: ID | null, course: Course): boolean {
  const { user, perms } = permissionsOf(db, userId);
  if (!user || !perms.has("content.update")) return false;
  const teacher = db.teachers.find((t) => t.userId === user.id);
  if (teacher) return course.teacherId === teacher.id;
  return !user.schoolId || user.schoolId === course.schoolId;
}

/** The signed-in user is this student and is enrolled in the course. */
function studentMayAnswer(db: DB, userId: ID | null, studentId: ID, course: Course): boolean {
  const student = db.students.find((s) => s.id === studentId);
  if (!student || student.userId !== userId || student.schoolId !== course.schoolId) return false;
  return db.enrollments.some((e) => e.studentId === studentId && e.subjectId === course.subjectId && e.classId === course.classId && e.sessionId === course.sessionId);
}

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

export const publishedSetOf = (db: Pick<DB, "videoInteractionSets">, contentId: ID) => db.videoInteractionSets.find((s) => s.contentId === contentId && s.status === "published") ?? null;
export const draftSetOf = (db: Pick<DB, "videoInteractionSets">, contentId: ID) => db.videoInteractionSets.find((s) => s.contentId === contentId && s.status === "draft") ?? null;
export const interactionsOf = (db: Pick<DB, "videoInteractions">, setId: ID) => sortInteractions(db.videoInteractions.filter((i) => i.setId === setId));

// ---------------------------------------------------------------------------
// Assets and drafts (teachers)
// ---------------------------------------------------------------------------

/** The video asset behind a lesson, created from its link the first time. Reused across the school's courses. */
export function ensureVideoAsset(item: ContentItem): Result<VideoAsset> {
  const db = S();
  const existing = item.videoId && db.videoAssets.find((v) => v.id === item.videoId);
  if (existing) return { ok: true, value: existing };
  const course = db.courses.find((c) => c.id === item.courseId);
  const src = item.url ? parseVideoUrl(item.url) : null;
  if (!course || !src) return { ok: false, error: "Interactive questions need an uploaded video file or a YouTube or Vimeo link." };
  const same = src.providerRef ? db.videoAssets.find((v) => v.schoolId === course.schoolId && v.provider === src.provider && v.providerRef === src.providerRef) : db.videoAssets.find((v) => v.schoolId === course.schoolId && v.url === item.url);
  const asset: VideoAsset = same ?? { id: uid("vid"), schoolId: course.schoolId, title: item.title, provider: src.provider, providerRef: src.providerRef, url: item.url!, durationSeconds: (item.durationMinutes ?? 0) * 60, createdBy: db.userId ?? undefined, createdAt: nowIso() };
  db.mutate((d) => ({
    videoAssets: same ? d.videoAssets : [...d.videoAssets, asset],
    contents: d.contents.map((c) => (c.id === item.id ? { ...c, videoId: asset.id } : c)),
  }));
  return { ok: true, value: asset };
}

/** The player reports the real length once the video loads; timestamps are checked against it. */
export function setVideoDuration(videoId: ID, seconds: number) {
  const v = S().videoAssets.find((x) => x.id === videoId);
  if (!v || !(seconds > 0) || Math.abs(v.durationSeconds - seconds) < 0.5) return;
  S().update("videoAssets", videoId, { durationSeconds: Math.round(seconds * 1000) / 1000 });
}

/** Opens the lesson's draft, copying the published version into a new one when there is no draft yet. */
export function openDraft(item: ContentItem): Result<VideoInteractionSet> {
  const db = S();
  const course = db.courses.find((c) => c.id === item.courseId);
  if (!course || !canManageCourseVideo(db, db.userId, course)) return { ok: false, error: "You can't edit this lesson's questions." };
  const draft = draftSetOf(db, item.id);
  if (draft) return { ok: true, value: draft };
  const asset = ensureVideoAsset(item);
  if (!asset.ok) return asset;
  const fresh = S();
  const published = publishedSetOf(fresh, item.id);
  const version = Math.max(0, ...fresh.videoInteractionSets.filter((s) => s.contentId === item.id).map((s) => s.version)) + 1;
  const at = nowIso();
  const set: VideoInteractionSet = { id: uid("vis"), schoolId: course.schoolId, courseId: course.id, contentId: item.id, videoId: asset.value.id, version, status: "draft", preventSkipping: published?.preventSkipping ?? true, completionPercent: published?.completionPercent ?? 90, basedOnSetId: published?.id, createdBy: fresh.userId ?? undefined, createdAt: at, updatedAt: at };
  const copies = published ? interactionsOf(fresh, published.id).map((i) => ({ ...i, id: uid("vit"), setId: set.id, options: i.options.map((o) => ({ ...o, id: uid("vio") })) })) : [];
  fresh.mutate((d) => ({ videoInteractionSets: [...d.videoInteractionSets, set], videoInteractions: [...d.videoInteractions, ...copies] }));
  return { ok: true, value: set };
}

/** Replaces the draft's interactions and settings in one write (cpback: PUT /interaction-sets/{set}). */
export function saveDraft(setId: ID, interactions: VideoInteraction[], settings: Pick<VideoInteractionSet, "preventSkipping" | "completionPercent">): Result<VideoInteractionSet> {
  const db = S();
  const set = db.videoInteractionSets.find((s) => s.id === setId);
  const course = set && db.courses.find((c) => c.id === set.courseId);
  if (!set || !course || !canManageCourseVideo(db, db.userId, course)) return { ok: false, error: "You can't edit this lesson's questions." };
  if (set.status !== "draft") return { ok: false, error: "Only a draft can be changed. Open the editor again to start a new version." };
  const duration = db.videoAssets.find((v) => v.id === set.videoId)?.durationSeconds ?? null;
  for (const [n, i] of sortInteractions(interactions).entries()) {
    const errs = interactionProblems(i, duration);
    if (errs.length) return { ok: false, error: `Question ${n + 1} ${errs[0]}.` };
  }
  if (!(settings.completionPercent >= 0 && settings.completionPercent <= 100)) return { ok: false, error: "The share of the video to watch must be between 0 and 100%." };
  const clean = renumber(interactions.map((i) => ({ ...i, setId, question: i.question.trim(), options: i.type === "short_answer" ? [] : i.options.map((o) => ({ ...o, text: o.text.trim(), correct: i.type === "poll" ? false : o.correct })), points: i.type === "poll" ? 0 : i.points })));
  const updated = { ...set, ...settings, updatedAt: nowIso() };
  db.mutate((d) => ({
    videoInteractionSets: d.videoInteractionSets.map((s) => (s.id === setId ? updated : s)),
    videoInteractions: [...d.videoInteractions.filter((i) => i.setId !== setId), ...clean],
  }));
  return { ok: true, value: updated };
}

/** Publishes the draft: students get these questions from their next visit; the previous version is archived with its results. */
export function publishDraft(setId: ID): Result<VideoInteractionSet> {
  const db = S();
  const set = db.videoInteractionSets.find((s) => s.id === setId);
  const course = set && db.courses.find((c) => c.id === set.courseId);
  if (!set || !course || !canManageCourseVideo(db, db.userId, course)) return { ok: false, error: "You can't publish this lesson's questions." };
  if (set.status !== "draft") return { ok: false, error: "This version is already published." };
  const list = interactionsOf(db, setId);
  if (list.length === 0) return { ok: false, error: "Add at least one question before publishing." };
  const duration = db.videoAssets.find((v) => v.id === set.videoId)?.durationSeconds ?? null;
  const bad = list.findIndex((i) => interactionProblems(i, duration).length > 0);
  if (bad >= 0) return { ok: false, error: `Question ${bad + 1} ${interactionProblems(list[bad]!, duration)[0]}.` };
  const at = nowIso();
  const published: VideoInteractionSet = { ...set, status: "published", publishedAt: at, publishedBy: db.userId ?? undefined, updatedAt: at };
  const item = db.contents.find((c) => c.id === set.contentId);
  db.mutate((d) => ({
    videoInteractionSets: d.videoInteractionSets.map((s) => (s.id === setId ? published : s.contentId === set.contentId && s.status === "published" ? { ...s, status: "archived" as const, updatedAt: at } : s)),
    // A student's place in the video carries over to the new version.
    videoProgress: [
      ...d.videoProgress,
      ...d.videoProgress
        .filter((p) => p.contentId === set.contentId && p.setId === set.basedOnSetId && !d.videoProgress.some((q) => q.setId === setId && q.studentId === p.studentId))
        .map((p): VideoProgress => ({ ...p, id: uid("vpg"), setId, encountered: [], skipped: [], status: "in_progress", completedAt: undefined, lastActivityAt: at })),
    ],
  }));
  db.audit({ schoolId: course.schoolId, category: "lms", action: `Interactive video published (version ${set.version})`, target: item?.title ?? "Video" });
  return { ok: true, value: published };
}

/** Throws the draft away; students keep the published version. */
export function discardDraft(setId: ID): Result<null> {
  const db = S();
  const set = db.videoInteractionSets.find((s) => s.id === setId);
  const course = set && db.courses.find((c) => c.id === set.courseId);
  if (!set || set.status !== "draft" || !course || !canManageCourseVideo(db, db.userId, course)) return { ok: false, error: "There is no draft to discard." };
  db.mutate((d) => ({ videoInteractionSets: d.videoInteractionSets.filter((s) => s.id !== setId), videoInteractions: d.videoInteractions.filter((i) => i.setId !== setId), videoAiSuggestions: d.videoAiSuggestions.filter((x) => x.setId !== setId) }));
  return { ok: true, value: null };
}

/** Stops the questions appearing (archives the published version). The video lesson stays. */
export function unpublishSet(setId: ID): Result<null> {
  const db = S();
  const set = db.videoInteractionSets.find((s) => s.id === setId);
  const course = set && db.courses.find((c) => c.id === set.courseId);
  if (!set || set.status !== "published" || !course || !canManageCourseVideo(db, db.userId, course)) return { ok: false, error: "These questions aren't published." };
  db.update("videoInteractionSets", setId, { status: "archived", updatedAt: nowIso() });
  return { ok: true, value: null };
}

// ---------------------------------------------------------------------------
// Suggestions (AI-ready; always reviewed by a teacher)
// ---------------------------------------------------------------------------

export async function requestSuggestions(setId: ID, existing: VideoInteraction[], count = 3): Promise<Result<VideoAiSuggestion[]>> {
  const db = S();
  const set = db.videoInteractionSets.find((s) => s.id === setId);
  const course = set && db.courses.find((c) => c.id === set.courseId);
  const video = set && db.videoAssets.find((v) => v.id === set.videoId);
  if (!set || !course || !video || !canManageCourseVideo(db, db.userId, course)) return { ok: false, error: "You can't add questions to this video." };
  if (!video.transcript?.trim()) return { ok: false, error: "This video has no transcript yet, so there is nothing to suggest questions from." };
  const generator = GENERATORS[0]!;
  const made = await generator.generate({ video, existing, count });
  const at = nowIso();
  const rows: VideoAiSuggestion[] = made.map((m) => ({ id: uid("vsg"), schoolId: set.schoolId, videoId: video.id, setId, generator: generator.id, status: "pending", suggestion: m.suggestion, rationale: m.rationale, requestedBy: db.userId ?? undefined, createdAt: at }));
  S().mutate((d) => ({ videoAiSuggestions: [...d.videoAiSuggestions.filter((x) => !(x.setId === setId && x.status === "pending")), ...rows] }));
  return { ok: true, value: rows };
}

/** The teacher decided: accepted ones were added to the draft they saved, dismissed ones are kept for the record. */
export function decideSuggestions(decisions: { id: ID; status: "accepted" | "dismissed"; acceptedAsId?: ID }[]) {
  if (!decisions.length) return;
  const at = nowIso();
  const decidedBy = S().userId ?? undefined;
  const by = new Map(decisions.map((d) => [d.id, d]));
  S().mutate((d) => ({ videoAiSuggestions: d.videoAiSuggestions.map((x) => (by.has(x.id) ? { ...x, status: by.get(x.id)!.status, acceptedAsId: by.get(x.id)!.acceptedAsId, decidedBy, decidedAt: at } : x)) }));
}

// ---------------------------------------------------------------------------
// Students: answers and progress
// ---------------------------------------------------------------------------

function event(db: DB, e: Omit<LearningEvent, "id" | "at">): LearningEvent {
  void db;
  return { ...e, id: uid("lev"), at: nowIso() };
}

/**
 * Records an answer (cpback: POST /video-interactions/{interaction}/attempts).
 * Safe to call twice with the same clientAttemptId: the second call returns the
 * first attempt instead of using up another one.
 */
export function submitAttempt(input: { interactionId: ID; studentId: ID; response: VideoInteractionResponse; clientAttemptId: string; videoSeconds?: number; startedAt?: string }): Result<VideoInteractionAttempt> {
  const db = S();
  const interaction = db.videoInteractions.find((i) => i.id === input.interactionId);
  const set = interaction && db.videoInteractionSets.find((s) => s.id === interaction.setId);
  const course = set && db.courses.find((c) => c.id === set.courseId);
  if (!interaction || !set || !course || set.status !== "published") return { ok: false, error: "This question is no longer available. Reload the lesson." };
  if (!studentMayAnswer(db, db.userId, input.studentId, course)) return { ok: false, error: "You can't answer questions in this course." };
  const mine = db.videoAttempts.filter((a) => a.interactionId === interaction.id && a.studentId === input.studentId);
  const again = mine.find((a) => a.clientAttemptId === input.clientAttemptId);
  if (again) return { ok: true, value: again };
  const blocked = canAttempt(interaction, interactionStatus(interaction, mine));
  if (blocked) return { ok: false, error: blocked };
  const problem = responseProblem(interaction, input.response);
  if (problem) return { ok: false, error: problem };
  const score = scoreResponse(interaction, input.response);
  const at = nowIso();
  const attempt: VideoInteractionAttempt = {
    id: uid("via"),
    schoolId: course.schoolId,
    setId: set.id,
    interactionId: interaction.id,
    studentId: input.studentId,
    attemptNumber: mine.length + 1,
    clientAttemptId: input.clientAttemptId,
    response: interaction.type === "short_answer" ? { text: input.response.text!.trim() } : { optionIds: [...input.response.optionIds!] },
    correct: score.correct,
    pointsEarned: score.pointsEarned,
    pointsPossible: interaction.type === "poll" ? 0 : interaction.points,
    review: score.review,
    videoSeconds: input.videoSeconds,
    responseMs: input.startedAt ? Math.max(0, Date.now() - new Date(input.startedAt).getTime()) : undefined,
    startedAt: input.startedAt,
    submittedAt: at,
  };
  const ev = event(db, { schoolId: course.schoolId, studentId: input.studentId, courseId: course.id, contentId: set.contentId, verb: "answered", objectType: "video_interaction", objectId: interaction.id, concept: interaction.concept, correct: score.correct, score: score.pointsEarned, maxScore: attempt.pointsPossible, attemptNumber: attempt.attemptNumber, responseMs: attempt.responseMs });
  db.mutate((d) => ({ videoAttempts: [...d.videoAttempts, attempt], learningEvents: [...d.learningEvents, ev] }));
  touchProgress(set, input.studentId, { encountered: interaction.id, unskip: interaction.id });
  return { ok: true, value: attempt };
}

/** An optional question the student chose to skip. */
export function skipInteraction(interactionId: ID, studentId: ID): Result<null> {
  const db = S();
  const interaction = db.videoInteractions.find((i) => i.id === interactionId);
  const set = interaction && db.videoInteractionSets.find((s) => s.id === interaction.setId);
  const course = set && db.courses.find((c) => c.id === set.courseId);
  if (!interaction || !set || !course || !studentMayAnswer(db, db.userId, studentId, course)) return { ok: false, error: "You can't change this lesson." };
  if (interaction.required) return { ok: false, error: "This question has to be answered before you go on." };
  if (db.videoAttempts.some((a) => a.interactionId === interactionId && a.studentId === studentId)) return { ok: true, value: null };
  touchProgress(set, studentId, { encountered: interactionId, skipped: interactionId });
  db.mutate((d) => ({ learningEvents: [...d.learningEvents, event(d, { schoolId: course.schoolId, studentId, courseId: course.id, contentId: set.contentId, verb: "skipped", objectType: "video_interaction", objectId: interactionId, concept: interaction.concept })] }));
  return { ok: true, value: null };
}

/** A question reached the screen. */
export function markEncountered(interactionId: ID, studentId: ID) {
  const db = S();
  const interaction = db.videoInteractions.find((i) => i.id === interactionId);
  const set = interaction && db.videoInteractionSets.find((s) => s.id === interaction.setId);
  const course = set && db.courses.find((c) => c.id === set.courseId);
  if (!set || !course || !studentMayAnswer(db, db.userId, studentId, course)) return;
  touchProgress(set, studentId, { encountered: interactionId });
}

/**
 * Saves where the student is (cpback: POST /videos/{video}/progress). The player
 * calls this every ~15 s of playback and on pause, seek, end and leaving the page.
 * Completing the lesson marks it complete in the course too.
 */
export function saveVideoProgress(setId: ID, studentId: ID, sample: { position: number; ranges: [number, number][]; watchSeconds: number }): VideoProgress | null {
  const db = S();
  const set = db.videoInteractionSets.find((s) => s.id === setId);
  const course = set && db.courses.find((c) => c.id === set.courseId);
  if (!set || !course || !studentMayAnswer(db, db.userId, studentId, course)) return null;
  return touchProgress(set, studentId, { sample });
}

function touchProgress(set: VideoInteractionSet, studentId: ID, change: { encountered?: ID; skipped?: ID; unskip?: ID; sample?: { position: number; ranges: [number, number][]; watchSeconds: number } }): VideoProgress {
  const db = S();
  const at = nowIso();
  const duration = db.videoAssets.find((v) => v.id === set.videoId)?.durationSeconds ?? 0;
  const prev = db.videoProgress.find((p) => p.setId === set.id && p.studentId === studentId);
  let p: VideoProgress = prev ?? { id: uid("vpg"), schoolId: set.schoolId, setId: set.id, contentId: set.contentId, studentId, startedAt: at, lastPosition: 0, furthestPosition: 0, watchSeconds: 0, watchedRanges: [], completionPercent: 0, encountered: [], skipped: [], status: "in_progress", lastActivityAt: at };
  if (change.sample) {
    const ranges = change.sample.ranges.reduce((acc, [s, e]) => addRange(acc, s, e), p.watchedRanges);
    const pos = Math.max(0, Math.min(duration || Infinity, change.sample.position));
    // Watch time only grows, by at most the wall-clock time since the last save (plus slack for fast playback).
    const since = (Date.now() - new Date(p.lastActivityAt).getTime()) / 1000;
    const delta = Math.max(0, Math.min(change.sample.watchSeconds, prev ? since * 2 + 5 : change.sample.watchSeconds));
    p = { ...p, lastPosition: pos, furthestPosition: Math.max(p.furthestPosition, pos, ...ranges.map((r) => r[1])), watchedRanges: ranges, completionPercent: watchedPercent(ranges, duration), watchSeconds: Math.round(p.watchSeconds + delta) };
  }
  if (change.encountered && !p.encountered.includes(change.encountered)) p = { ...p, encountered: [...p.encountered, change.encountered] };
  if (change.skipped && !p.skipped.includes(change.skipped)) p = { ...p, skipped: [...p.skipped, change.skipped] };
  if (change.unskip && p.skipped.includes(change.unskip)) p = { ...p, skipped: p.skipped.filter((x) => x !== change.unskip) };
  p = { ...p, lastActivityAt: at };
  const events: LearningEvent[] = [];
  if (!prev) events.push(event(db, { schoolId: set.schoolId, studentId, courseId: set.courseId, contentId: set.contentId, verb: "started", objectType: "video", objectId: set.videoId }));
  let completedNow = false;
  if (p.status !== "completed") {
    const summary = summarize(interactionsOf(db, set.id), db.videoAttempts.filter((a) => a.setId === set.id && a.studentId === studentId), p);
    if (isComplete(set, summary)) {
      p = { ...p, status: "completed", completedAt: at };
      completedNow = true;
      events.push(event(db, { schoolId: set.schoolId, studentId, courseId: set.courseId, contentId: set.contentId, verb: "completed", objectType: "video", objectId: set.videoId, score: summary.score, maxScore: summary.maxScore }));
    }
  }
  const saved = p;
  db.mutate((d) => ({ videoProgress: prev ? d.videoProgress.map((x) => (x.id === prev.id ? saved : x)) : [...d.videoProgress, saved], learningEvents: events.length ? [...d.learningEvents, ...events] : d.learningEvents }));
  if (completedNow) S().completeContent(studentId, set.contentId);
  return saved;
}

// ---------------------------------------------------------------------------
// Teachers: reviewing short answers
// ---------------------------------------------------------------------------

/** Marks a short answer (cpback: POST /video-attempts/{attempt}/review). */
export function reviewShortAnswer(attemptId: ID, points: number, feedback?: string): Result<VideoInteractionAttempt> {
  const db = S();
  const attempt = db.videoAttempts.find((a) => a.id === attemptId);
  const set = attempt && db.videoInteractionSets.find((s) => s.id === attempt.setId);
  const course = set && db.courses.find((c) => c.id === set.courseId);
  const interaction = attempt && db.videoInteractions.find((i) => i.id === attempt.interactionId);
  if (!attempt || !set || !course || !interaction || !canManageCourseVideo(db, db.userId, course)) return { ok: false, error: "You can't review this answer." };
  if (interaction.type !== "short_answer") return { ok: false, error: "Only short answers are reviewed by hand." };
  if (!(points >= 0 && points <= attempt.pointsPossible)) return { ok: false, error: `Give between 0 and ${attempt.pointsPossible} points.` };
  const reviewed: VideoInteractionAttempt = { ...attempt, pointsEarned: points, correct: points >= attempt.pointsPossible, review: "reviewed", reviewedBy: db.userId ?? undefined, reviewedAt: nowIso(), reviewFeedback: feedback?.trim() || undefined };
  db.mutate((d) => ({
    videoAttempts: d.videoAttempts.map((a) => (a.id === attemptId ? reviewed : a)),
    learningEvents: [...d.learningEvents, event(d, { schoolId: course.schoolId, studentId: attempt.studentId, courseId: course.id, contentId: set.contentId, verb: "reviewed", objectType: "video_interaction", objectId: interaction.id, concept: interaction.concept, correct: reviewed.correct, score: points, maxScore: attempt.pointsPossible, attemptNumber: attempt.attemptNumber })],
  }));
  const studentUser = db.students.find((s) => s.id === attempt.studentId)?.userId;
  if (studentUser) db.notify({ userId: studentUser, schoolId: course.schoolId, kind: "graded", title: "Your answer was reviewed", body: `${interaction.question.slice(0, 80)} — ${points}/${attempt.pointsPossible}`, href: `/learn/${course.id}/${set.contentId}` });
  return { ok: true, value: reviewed };
}

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import type { VideoInteraction, VideoInteractionAttempt, VideoInteractionType, LearningEvent } from "@/lib/types";
import {
  addRange,
  blankInteraction,
  canAttempt,
  changeType,
  conceptsToReview,
  crossed,
  fmtTime,
  interactionProblems,
  interactionStats,
  interactionStatus,
  isComplete,
  moveInteraction,
  parseTime,
  parseVideoUrl,
  responseProblem,
  scoreResponse,
  seekBlocker,
  sortInteractions,
  summarize,
  watchedPercent,
} from "@/lib/interactive-video/engine";
import { InteractionController, type PlayerEngine, type ProgressSample } from "@/lib/interactive-video/player";
import { transcriptGenerator, transcriptLines } from "@/lib/interactive-video/suggestions";

let n = 0;
const optionId = () => `o${++n}`;
function q(type: VideoInteractionType, timestamp: number, patch: Partial<VideoInteraction> = {}): VideoInteraction {
  const i = blankInteraction(type, { id: `i${++n}`, setId: "set", optionId }, timestamp);
  const filled = { ...i, question: "Question?", options: i.options.map((o, k) => ({ ...o, text: o.text || `Option ${k + 1}` })) };
  if (type === "multi_select") filled.options = filled.options.map((o, k) => ({ ...o, correct: k < 2 }));
  return { ...filled, ...patch };
}
const ids = (i: VideoInteraction, ...k: number[]) => ({ optionIds: k.map((x) => i.options[x]!.id) });
let a = 0;
function attempt(i: VideoInteraction, response: { optionIds?: string[]; text?: string }, studentId = "s1", number = 1): VideoInteractionAttempt {
  const s = scoreResponse(i, response);
  return { id: `a${++a}`, schoolId: "sch", setId: i.setId, interactionId: i.id, studentId, attemptNumber: number, clientAttemptId: `c${a}`, response, correct: s.correct, pointsEarned: s.pointsEarned, pointsPossible: i.points, review: s.review, submittedAt: new Date(2026, 0, 1, 0, 0, a).toISOString() };
}

describe("time", () => {
  test("formats and parses", () => {
    assert.equal(fmtTime(0), "0:00");
    assert.equal(fmtTime(155), "2:35");
    assert.equal(fmtTime(3725), "1:02:05");
    assert.equal(parseTime("2:35"), 155);
    assert.equal(parseTime("1:02:05"), 3725);
    assert.equal(parseTime("90"), 90);
    assert.equal(parseTime("2:75"), null);
    assert.equal(parseTime("abc"), null);
  });
});

describe("video sources", () => {
  test("recognises files, YouTube and Vimeo", () => {
    assert.deepEqual(parseVideoUrl("https://cdn.example.com/a.mp4"), { provider: "file" });
    assert.deepEqual(parseVideoUrl("https://www.youtube.com/watch?v=Dxcc6ycZ73M"), { provider: "youtube", providerRef: "Dxcc6ycZ73M" });
    assert.deepEqual(parseVideoUrl("https://youtu.be/Dxcc6ycZ73M"), { provider: "youtube", providerRef: "Dxcc6ycZ73M" });
    assert.deepEqual(parseVideoUrl("https://www.youtube-nocookie.com/embed/Dxcc6ycZ73M"), { provider: "youtube", providerRef: "Dxcc6ycZ73M" });
    assert.deepEqual(parseVideoUrl("https://vimeo.com/76979871"), { provider: "vimeo", providerRef: "76979871" });
    assert.equal(parseVideoUrl("https://example.com/page"), null);
  });
});

describe("validation", () => {
  test("a complete question has no problems", () => {
    assert.deepEqual(interactionProblems(q("mcq", 10), 60), []);
    assert.deepEqual(interactionProblems(q("true_false", 0), 60), []);
    assert.deepEqual(interactionProblems(q("poll", 60), 60), []);
    assert.deepEqual(interactionProblems(q("short_answer", 30), 60), []);
  });
  test("timestamp can't be after the end", () => {
    assert.match(interactionProblems(q("mcq", 61), 60)[0]!, /after the end/);
  });
  test("question can't be empty", () => {
    assert.ok(interactionProblems(q("mcq", 1, { question: "  " }), 60).includes("has no question"));
  });
  test("MCQ needs two options and exactly one correct answer", () => {
    const one = q("mcq", 1);
    assert.ok(interactionProblems({ ...one, options: one.options.slice(0, 1) }, 60).includes("needs at least two options"));
    assert.ok(interactionProblems({ ...one, options: one.options.map((o) => ({ ...o, correct: false })) }, 60).includes("needs exactly one correct option"));
  });
  test("multiple select needs a correct answer; polls can't have one", () => {
    const m = q("multi_select", 1);
    assert.ok(interactionProblems({ ...m, options: m.options.map((o) => ({ ...o, correct: false })) }, 60).includes("needs at least one correct option"));
    const p = q("poll", 1);
    assert.ok(interactionProblems({ ...p, options: p.options.map((o, k) => ({ ...o, correct: k === 0 })) }, 60).some((e) => e.includes("poll")));
  });
  test("points can't be negative and attempts must be positive", () => {
    assert.ok(interactionProblems(q("mcq", 1, { points: -1 }), 60).includes("can't have negative points"));
    assert.ok(interactionProblems(q("mcq", 1, { maxAttempts: 0 }), 60).includes("needs at least one attempt"));
  });
  test("changing type keeps the question and fixes options", () => {
    const m = q("mcq", 5, { question: "Keep me" });
    const p = changeType(m, "poll", optionId);
    assert.equal(p.question, "Keep me");
    assert.equal(p.points, 0);
    assert.ok(p.options.every((o) => !o.correct));
    const tf = changeType(m, "true_false", optionId);
    assert.deepEqual(tf.options.map((o) => o.text), ["True", "False"]);
  });
});

describe("scoring (server-side rules)", () => {
  test("multiple choice", () => {
    const i = q("mcq", 1, { points: 2 });
    assert.deepEqual(scoreResponse(i, ids(i, 0)), { correct: true, pointsEarned: 2, review: "auto" });
    assert.deepEqual(scoreResponse(i, ids(i, 1)), { correct: false, pointsEarned: 0, review: "auto" });
  });
  test("true / false, whichever option is correct", () => {
    const t = q("true_false", 1);
    assert.equal(scoreResponse(t, ids(t, 0)).correct, true);
    const f = { ...t, options: t.options.map((o, k) => ({ ...o, correct: k === 1 })) };
    assert.equal(scoreResponse(f, ids(f, 1)).correct, true);
    assert.equal(scoreResponse(f, ids(f, 0)).correct, false);
  });
  test("multiple select gives partial credit like quizzes, but only full marks is correct", () => {
    const i = q("multi_select", 1, { points: 2 });
    assert.deepEqual(scoreResponse(i, ids(i, 0, 1)), { correct: true, pointsEarned: 2, review: "auto" });
    assert.deepEqual(scoreResponse(i, ids(i, 0)), { correct: false, pointsEarned: 1, review: "auto" });
    assert.deepEqual(scoreResponse(i, ids(i, 0, 2)), { correct: false, pointsEarned: 0, review: "auto" });
  });
  test("polls aren't scored and short answers wait for review", () => {
    const p = q("poll", 1);
    assert.deepEqual(scoreResponse(p, ids(p, 1)), { correct: null, pointsEarned: null, review: "auto" });
    assert.deepEqual(scoreResponse(q("short_answer", 1), { text: "An answer" }), { correct: null, pointsEarned: null, review: "pending" });
  });
  test("ignores anything the browser claims about correctness", () => {
    const i = q("mcq", 1);
    const forged = { ...ids(i, 3), correct: true, pointsEarned: 99 } as never;
    assert.deepEqual(scoreResponse(i, forged), { correct: false, pointsEarned: 0, review: "auto" });
  });
  test("rejects answers that don't belong to the question", () => {
    const i = q("mcq", 1);
    assert.ok(responseProblem(i, { optionIds: ["nope"] }));
    assert.ok(responseProblem(i, ids(i, 0, 1)));
    assert.ok(responseProblem(i, ids(i, 0, 0)));
    assert.ok(responseProblem(i, {}));
    assert.ok(responseProblem(q("short_answer", 1), { text: "   " }));
    assert.equal(responseProblem(i, ids(i, 2)), null);
  });
});

describe("attempts", () => {
  test("retry until the limit, then the answer is final", () => {
    const i = q("mcq", 1, { maxAttempts: 2 });
    const a1 = attempt(i, ids(i, 1));
    assert.equal(interactionStatus(i, [a1]).state, "retry");
    assert.equal(canAttempt(i, interactionStatus(i, [a1])), null);
    const a2 = attempt(i, ids(i, 2), "s1", 2);
    const st = interactionStatus(i, [a1, a2]);
    assert.equal(st.state, "incorrect");
    assert.equal(st.attemptsLeft, 0);
    assert.ok(canAttempt(i, st));
  });
  test("no retry means one attempt", () => {
    const i = q("mcq", 1, { allowRetry: false });
    assert.equal(interactionStatus(i, [attempt(i, ids(i, 1))]).state, "incorrect");
  });
  test("a correct answer can't be answered again", () => {
    const i = q("mcq", 1);
    const st = interactionStatus(i, [attempt(i, ids(i, 0))]);
    assert.equal(st.state, "correct");
    assert.ok(canAttempt(i, st));
  });
  test("best attempt counts", () => {
    const i = q("multi_select", 1, { points: 2 });
    const st = interactionStatus(i, [attempt(i, ids(i, 0)), attempt(i, ids(i, 0, 1), "s1", 2)]);
    assert.equal(st.best?.pointsEarned, 2);
  });
  test("other students' attempts don't count", () => {
    const i = q("mcq", 1);
    assert.equal(interactionStatus(i, [attempt(i, ids(i, 0), "s2")].filter((x) => x.studentId === "s1")).state, "open");
  });
});

describe("playback rules", () => {
  const list = sortInteractions([q("poll", 0, { required: false }), q("mcq", 30), q("true_false", 31), q("mcq", 59.5)]);
  test("a question at 0:00 fires as playback starts", () => {
    assert.deepEqual(crossed(list, 0, 0.25).map((i) => i.timestamp), [0]);
  });
  test("questions close together queue in order", () => {
    assert.deepEqual(crossed(list, 29.9, 31.2).map((i) => i.timestamp), [30, 31]);
  });
  test("a question near the end fires", () => {
    assert.deepEqual(crossed(list, 59.4, 59.7).map((i) => i.timestamp), [59.5]);
  });
  test("seeking past an unanswered required question stops at it; back is fine", () => {
    const resolved = new Set<string>();
    const isResolved = (i: VideoInteraction) => resolved.has(i.id);
    assert.equal(seekBlocker(list, 50, isResolved, true)?.timestamp, 30);
    assert.equal(seekBlocker(list, 10, isResolved, true), null);
    resolved.add(list[1]!.id);
    assert.equal(seekBlocker(list, 50, isResolved, true)?.timestamp, 31);
    assert.equal(seekBlocker(list, 50, isResolved, false), null);
  });
  test("optional questions never block", () => {
    assert.equal(seekBlocker([q("poll", 5, { required: false })], 50, () => false, true), null);
  });
});

describe("watching", () => {
  test("ranges merge and skipping ahead doesn't count", () => {
    let r: [number, number][] = [];
    r = addRange(r, 0, 10);
    r = addRange(r, 10.2, 20);
    r = addRange(r, 50, 60);
    assert.deepEqual(r, [[0, 20], [50, 60]]);
    assert.equal(watchedPercent(r, 100), 30);
    assert.equal(watchedPercent([[0, 99.5]], 100), 100);
  });
});

describe("progress", () => {
  test("summary and completion", () => {
    const req = q("mcq", 10, { points: 2 });
    const opt = q("poll", 20, { required: false });
    const sa = q("short_answer", 30, { required: false });
    const attempts = [attempt(req, ids(req, 0)), attempt(sa, { text: "Because" })];
    const s = summarize([req, opt, sa], attempts, { encountered: [req.id, opt.id, sa.id], skipped: [opt.id], completionPercent: 95 });
    assert.equal(s.completed, 2);
    assert.equal(s.skipped, 1);
    assert.equal(s.correct, 1);
    assert.equal(s.pendingReview, 1);
    assert.equal(s.score, 2);
    assert.equal(s.maxScore, 4);
    assert.equal(s.scorePercent, 50);
    assert.equal(isComplete({ completionPercent: 90 }, s), true);
    assert.equal(isComplete({ completionPercent: 90 }, { ...s, requiredLeft: 1 }), false);
    assert.equal(isComplete({ completionPercent: 90 }, { ...s, watchedPercent: 50 }), false);
  });
});

describe("analytics", () => {
  test("percent correct, the most common wrong answer and who is struggling", () => {
    const i = q("mcq", 10, { maxAttempts: 3 });
    const rows = [
      attempt(i, ids(i, 0), "s1"),
      attempt(i, ids(i, 1), "s2"), attempt(i, ids(i, 0), "s2", 2),
      attempt(i, ids(i, 1), "s3"), attempt(i, ids(i, 2), "s3", 2),
      attempt(i, ids(i, 1), "s4"),
    ];
    const st = interactionStats(i, rows);
    assert.equal(st.answered, 4);
    assert.equal(st.correctPct, 50);
    assert.equal(st.firstTryPct, 25);
    assert.equal(st.commonWrong?.option.id, i.options[1]!.id);
    assert.equal(st.commonWrong?.pct, 75);
    assert.deepEqual(st.struggling.sort(), ["s3", "s4"]);
  });
  test("concepts answered wrong twice are flagged for review until answered right", () => {
    const e = (correct: boolean, k: number): LearningEvent => ({ id: `e${k}`, schoolId: "x", studentId: "s1", verb: "answered", objectType: "video_interaction", objectId: "i", concept: "Memory", correct, at: `2026-01-0${k}T00:00:00Z` });
    assert.equal(conceptsToReview([e(false, 1), e(false, 2)], "s1").length, 1);
    assert.equal(conceptsToReview([e(false, 1), e(false, 2), e(true, 3)], "s1").length, 0);
  });
});

describe("authoring order", () => {
  test("moving swaps play order", () => {
    const x = q("mcq", 10);
    const y = q("mcq", 20);
    const moved = sortInteractions(moveInteraction([x, y], y.id, -1));
    assert.equal(moved[0]!.id, y.id);
    assert.equal(moved[0]!.timestamp, 10);
  });
});

describe("suggestions", () => {
  test("transcript lines and suggestions keep clear of existing questions", async () => {
    const t = "[0:10] The internet is a network of networks around the world.\n[1:00] No single company or government owns the whole internet.";
    assert.deepEqual(transcriptLines(t, 120).map((l) => l.at), [10, 60]);
    const out = await transcriptGenerator.generate({ video: { title: "x", transcript: t, durationSeconds: 120 }, existing: [{ timestamp: 15, question: "" }], count: 3 });
    assert.equal(out.length, 1);
    assert.equal(out[0]!.suggestion.timestamp, 64);
  });
});

// ---------------------------------------------------------------------------
// The player controller, driven by a fake video
// ---------------------------------------------------------------------------

class FakeVideo implements PlayerEngine {
  t = 0;
  isPaused = true;
  log: string[] = [];
  readonly capabilities = { rates: [1], captions: false, volume: true };
  len = 60;
  play() { this.isPaused = false; this.log.push("play"); }
  pause() { this.isPaused = true; this.log.push("pause"); }
  seek(s: number) { this.t = s; this.log.push(`seek ${s}`); }
  currentTime() { return this.t; }
  duration() { return this.len; }
  paused() { return this.isPaused; }
  setRate() {}
  setVolume() {}
  setMuted() {}
  subscribe() { return () => {}; }
  destroy() {}
}

function rig(list: VideoInteraction[], opts: { start?: number; preventSkipping?: boolean } = {}) {
  const video = new FakeVideo();
  video.t = opts.start ?? 0;
  const resolved = new Set<string>();
  const shown: number[] = [];
  const blocked: number[] = [];
  const saves: ProgressSample[] = [];
  const c = new InteractionController(video, { interactions: list, preventSkipping: opts.preventSkipping ?? true, isResolved: (id) => resolved.has(id), onShow: (i) => shown.push(i.timestamp), onBlocked: (i) => blocked.push(i.timestamp), persist: (s) => saves.push(s), saveEverySeconds: 15 }, opts.start ?? 0);
  /** Plays in quarter-second ticks until `to`, or until a question pauses it. */
  const playTo = (to: number) => {
    video.play();
    while (video.t < to - 1e-9 && !video.isPaused) {
      video.t = Math.min(to, Math.round((video.t + 0.25) * 100) / 100);
      c.tick(video.t);
    }
  };
  return { video, c, resolved, shown, blocked, saves, playTo };
}

describe("player controller", () => {
  test("pauses at a question and resumes from the same place after answering", () => {
    const i = q("mcq", 10);
    const r = rig([i]);
    r.playTo(20);
    assert.deepEqual(r.shown, [10]);
    assert.equal(r.video.isPaused, true);
    assert.equal(r.video.t, 10);
    r.resolved.add(i.id);
    r.c.dismiss({ resume: true });
    assert.equal(r.video.isPaused, false);
    r.playTo(20);
    assert.deepEqual(r.shown, [10]);
    assert.equal(r.video.t, 20);
  });

  test("a question at 0:00 appears as soon as the video starts", () => {
    const r = rig([q("poll", 0, { required: false })]);
    r.playTo(5);
    assert.deepEqual(r.shown, [0]);
  });

  test("several questions close together appear one after another", () => {
    const a1 = q("true_false", 30);
    const a2 = q("poll", 30.5, { required: false });
    const r = rig([a1, a2]);
    r.playTo(40);
    assert.deepEqual(r.shown, [30]);
    r.resolved.add(a1.id);
    r.c.dismiss({ resume: true });
    r.playTo(40);
    assert.deepEqual(r.shown, [30, 30.5]);
  });

  test("two questions at the same moment show back to back without playing", () => {
    const a1 = q("mcq", 12);
    const a2 = q("mcq", 12, { order: 1 });
    const r = rig([a1, a2]);
    r.playTo(20);
    r.resolved.add(a1.id);
    r.c.dismiss({ resume: true });
    assert.deepEqual(r.shown, [12, 12]);
    assert.equal(r.video.isPaused, true);
  });

  test("a question at the very end appears when the video ends", () => {
    const r = rig([q("mcq", 60)]);
    r.playTo(60);
    r.c.ended();
    assert.deepEqual(r.shown, [60]);
  });

  test("seeking across an unanswered required question stops there", () => {
    const i = q("mcq", 20);
    const r = rig([i]);
    r.playTo(5);
    r.c.requestSeek(45);
    assert.deepEqual(r.blocked, [20]);
    assert.equal(r.video.t, 20);
    r.resolved.add(i.id);
    r.c.dismiss({ resume: false });
    assert.equal(r.c.requestSeek(45), null);
    assert.equal(r.video.t, 45);
    assert.equal(r.c.requestSeek(3), null);
    assert.equal(r.video.t, 3);
  });

  test("a seek made outside our controls (provider UI, keyboard) is caught too", () => {
    const r = rig([q("mcq", 20)]);
    r.playTo(5);
    r.video.t = 50;
    r.c.tick(50);
    assert.deepEqual(r.blocked, [20]);
    assert.equal(r.video.t, 20);
  });

  test("with skipping allowed, seeking ahead is free and the passed question doesn't pop up", () => {
    const r = rig([q("mcq", 20)], { preventSkipping: false });
    r.playTo(5);
    assert.equal(r.c.requestSeek(45), null);
    r.playTo(50);
    assert.deepEqual(r.shown, []);
  });

  test("playback behind an open question is stopped (clicks on an embedded player)", () => {
    const r = rig([q("mcq", 10)]);
    r.playTo(12);
    r.video.isPaused = false;
    r.video.t = 10.6;
    r.c.tick(10.6);
    assert.equal(r.video.isPaused, true);
    assert.equal(r.video.t, 10);
  });

  test("leaving and coming back resumes from the saved place; answered questions stay answered", () => {
    const i = q("mcq", 10);
    const first = rig([i]);
    first.playTo(20);
    first.resolved.add(i.id);
    first.c.dismiss({ resume: true });
    first.playTo(25);
    first.c.paused();
    const saved = first.saves.at(-1)!;
    assert.equal(saved.position, 25);
    // A new visit (page refresh): the controller starts where the student left off.
    const again = rig([i], { start: saved.position });
    again.resolved.add(i.id);
    again.playTo(30);
    assert.deepEqual(again.shown, []);
  });

  test("a skipped optional question is not shown again in the same visit", () => {
    const p = q("poll", 5, { required: false });
    const r = rig([p]);
    r.playTo(10);
    r.c.dismiss({ resume: true });
    r.c.requestSeek(0);
    r.playTo(10);
    assert.deepEqual(r.shown, [5]);
  });

  test("progress is saved in batches, not every second", () => {
    const r = rig([]);
    r.playTo(40);
    assert.equal(r.saves.length, 2);
    r.c.paused();
    const total = r.saves.reduce((n, s) => n + s.watchSeconds, 0);
    assert.equal(total, 40);
    const ranges = r.saves.flatMap((s) => s.ranges).reduce<[number, number][]>((acc, [s, e]) => addRange(acc, s, e), []);
    assert.deepEqual(ranges, [[0, 40]]);
  });

  test("a seek doesn't count the skipped part as watched", () => {
    const r = rig([], { preventSkipping: false });
    r.playTo(10);
    r.c.requestSeek(50);
    r.playTo(55);
    r.c.paused();
    const ranges = r.saves.flatMap((s) => s.ranges).reduce<[number, number][]>((acc, [s, e]) => addRange(acc, s, e), []);
    assert.deepEqual(ranges, [[0, 10], [50, 55]]);
  });
});

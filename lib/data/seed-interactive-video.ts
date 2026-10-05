import type { DB } from "@/lib/data/seed";
import type { ID, LearningEvent, VideoAsset, VideoInteraction, VideoInteractionAttempt, VideoInteractionSet, VideoProgress } from "@/lib/types";
import { hashString, rng } from "@/lib/helpers";
import { DEFAULT_MAX_ATTEMPTS, addRange, interactionStatus, isComplete, scoreResponse, summarize, watchedPercent } from "@/lib/interactive-video/engine";

/**
 * Demo interactive videos (spec section 26.3). The two ICT video lessons play
 * public YouTube videos with questions on top: each school has one asset per
 * video, reused by all its classes, and each lesson has its own published set.
 * Students in current courses have answers and progress, so the teacher's
 * Results tab has real numbers; John Mensah (the demo student) starts fresh.
 */

type Spec = Omit<VideoInteraction, "id" | "setId" | "order" | "options" | "source" | "allowRetry" | "maxAttempts" | "showFeedback" | "pauseVideo" | "resumeAfterSubmit" | "displayPosition"> & {
  options?: [string, boolean][];
  allowRetry?: boolean;
  maxAttempts?: number | null;
  resumeAfterSubmit?: boolean;
};

interface DemoVideo {
  lessonTitle: string;
  youtubeId: string;
  title: string;
  durationSeconds: number;
  transcript: string;
  questions: Spec[];
}

export const DEMO_VIDEOS: DemoVideo[] = [
  {
    lessonTitle: "ICT around us (video)",
    youtubeId: "ExxFxD4OSZ0",
    title: "What does what in your computer? Computer parts explained",
    durationSeconds: 468,
    transcript: [
      "[0:20] A computer is made of parts that each do one job, and they all connect to the motherboard.",
      "[1:00] The CPU, or processor, carries out the instructions of programs and is often called the brain of the computer.",
      "[2:10] RAM is the computer's short-term memory and it is cleared when the computer is switched off.",
      "[3:30] The graphics card turns data into the pictures you see on the monitor.",
      "[4:40] Hard disk drives and solid state drives store your files even when the power is off.",
      "[6:00] The power supply unit converts electricity from the wall socket into the power the parts need.",
    ].join("\n"),
    questions: [
      { type: "mcq", timestamp: 75, title: "Quick check", question: "Which part of the computer carries out the instructions of programs?", options: [["The CPU (processor)", true], ["The monitor", false], ["The power supply", false], ["The keyboard", false]], explanation: "The CPU processes instructions — that's why it's called the brain of the computer.", points: 1, required: true, concept: "Computer parts: CPU" },
      { type: "true_false", timestamp: 150, question: "RAM keeps its contents when the computer is switched off.", options: [["True", false], ["False", true]], explanation: "RAM is short-term memory: it is cleared when the power goes off. Storage drives keep your files.", points: 1, required: true, concept: "Memory vs storage" },
      // Right after the true/false: two questions close together.
      { type: "poll", timestamp: 152, title: "How are you doing?", question: "How confident are you naming the parts inside a computer?", options: [["Very confident", false], ["Somewhat confident", false], ["Not confident yet", false]], points: 0, required: false, allowRetry: false, resumeAfterSubmit: true },
      { type: "multi_select", timestamp: 300, question: "Which of these keep your files when the power is off? Select all that apply.", options: [["Hard disk drive", true], ["Solid state drive", true], ["RAM", false], ["USB flash drive", true]], explanation: "Hard disks, SSDs and flash drives are storage. RAM is cleared when the computer is switched off.", points: 2, required: true, concept: "Memory vs storage" },
      { type: "short_answer", timestamp: 420, title: "In your own words", question: "Explain what the power supply unit does.", modelAnswer: "It converts electricity from the wall socket (AC) into the lower-voltage power (DC) that the computer's parts need.", points: 2, required: false, allowRetry: false, concept: "Computer parts: power supply" },
    ],
  },
  {
    lessonTitle: "How the internet works (video)",
    youtubeId: "Dxcc6ycZ73M",
    title: "What is the Internet?",
    durationSeconds: 224,
    transcript: [
      "[0:15] The internet is a network of networks that connects billions of devices around the world.",
      "[0:50] No single person, company or government owns the internet.",
      "[1:30] Data can travel as electricity in copper wires, as light in fibre optic cables, or as radio waves through WiFi.",
      "[2:30] Devices on the internet follow shared rules called protocols so they can understand each other.",
    ].join("\n"),
    questions: [
      // A poll at 0:00 — the player shows it as soon as the video starts.
      { type: "poll", timestamp: 0, title: "Before we start", question: "How often do you use the internet?", options: [["Every day", false], ["A few times a week", false], ["Rarely", false]], points: 0, required: false, allowRetry: false, resumeAfterSubmit: true },
      { type: "mcq", timestamp: 45, question: "What is the internet?", options: [["A network of networks connecting devices worldwide", true], ["One very large computer", false], ["Another name for WiFi", false], ["An app on your phone", false]], explanation: "The internet links many separate networks together, all around the world.", points: 1, required: true, concept: "What the internet is" },
      { type: "true_false", timestamp: 95, question: "WiFi and cables are both ways data travels on the internet.", options: [["True", true], ["False", false]], explanation: "Data travels as electricity in copper, light in fibre, and radio waves over WiFi.", points: 1, required: true, concept: "How data travels" },
      { type: "multi_select", timestamp: 150, question: "Which of these can carry internet data? Select all that apply.", options: [["Fibre optic cable", true], ["Copper wire", true], ["Radio waves (WiFi)", true], ["A printed newspaper", false]], explanation: "Light, electricity and radio waves can all carry bits of data.", points: 2, required: true, concept: "How data travels" },
      // Close to the end of the video.
      { type: "short_answer", timestamp: 215, title: "In your own words", question: "Why do devices on the internet need to follow the same rules (protocols)?", modelAnswer: "So that devices made by different companies can understand each other's messages.", points: 2, required: false, allowRetry: false, concept: "Protocols" },
    ],
  },
];

const ANSWERS = ["So devices from different makers can understand each other.", "Because they all have to speak the same language to share data.", "So the messages arrive in the right order and make sense.", "It changes the electricity to the right kind for the computer parts.", "It gives power to the computer.", "I'm not sure."];

export function seedInteractiveVideo(db: DB, at: (days: number, hour?: number, minute?: number) => string) {
  const john = db.students.find((s) => s.firstName === "John" && s.lastName === "Mensah");
  const active = new Set(db.academicSessions.filter((s) => s.status === "active").map((s) => s.id));
  for (const demo of DEMO_VIDEOS) {
    for (const item of db.contents.filter((c) => c.type === "video" && c.title === demo.lessonTitle)) {
      const course = db.courses.find((c) => c.id === item.courseId);
      if (!course) continue;
      const assetId = `vid_${course.schoolId}_${demo.youtubeId}`;
      if (!db.videoAssets.some((v) => v.id === assetId)) {
        const asset: VideoAsset = { id: assetId, schoolId: course.schoolId, title: demo.title, provider: "youtube", providerRef: demo.youtubeId, url: `https://www.youtube.com/watch?v=${demo.youtubeId}`, durationSeconds: demo.durationSeconds, thumbnailUrl: `https://i.ytimg.com/vi/${demo.youtubeId}/hqdefault.jpg`, transcript: demo.transcript, createdAt: item.createdAt };
        db.videoAssets.push(asset);
      }
      item.videoId = assetId;
      item.url = `https://www.youtube.com/watch?v=${demo.youtubeId}`;
      item.durationMinutes = Math.round(demo.durationSeconds / 60);
      const teacherUser = db.teachers.find((t) => t.id === course.teacherId)?.userId;
      const set: VideoInteractionSet = { id: `vis_${item.id}`, schoolId: course.schoolId, courseId: course.id, contentId: item.id, videoId: assetId, version: 1, status: "published", preventSkipping: true, completionPercent: 90, createdBy: teacherUser, createdAt: item.createdAt, updatedAt: item.createdAt, publishedAt: item.createdAt, publishedBy: teacherUser };
      db.videoInteractionSets.push(set);
      const interactions: VideoInteraction[] = demo.questions.map((q, n) => ({
        ...q,
        id: `vit_${item.id}_${n}`,
        setId: set.id,
        order: 0,
        options: (q.options ?? []).map(([text, correct], k) => ({ id: `vio_${item.id}_${n}_${k}`, text, correct })),
        source: "teacher",
        allowRetry: q.allowRetry ?? true,
        maxAttempts: q.maxAttempts === undefined ? DEFAULT_MAX_ATTEMPTS : q.maxAttempts,
        showFeedback: true,
        pauseVideo: true,
        resumeAfterSubmit: q.resumeAfterSubmit ?? false,
        displayPosition: "center",
      }));
      db.videoInteractions.push(...interactions);

      if (!active.has(course.sessionId)) continue;
      const cohort = db.enrollments.filter((e) => e.subjectId === course.subjectId && e.classId === course.classId && e.sessionId === course.sessionId).map((e) => e.studentId);
      for (const studentId of cohort) {
        if (studentId === john?.id) continue;
        seedStudent(db, set, interactions, studentId, demo, at);
      }
    }
  }
}

function seedStudent(db: DB, set: VideoInteractionSet, interactions: VideoInteraction[], studentId: ID, demo: DemoVideo, at: (days: number, hour?: number, minute?: number) => string) {
  const r = rng(hashString(studentId + set.id));
  const skill = 0.35 + r.next() * 0.6;
  if (r.next() < 0.12) return; // hasn't opened it
  // How far they got: most finish, some stop part-way.
  const reach = r.next() < 0.75 ? demo.durationSeconds : Math.round(demo.durationSeconds * (0.2 + r.next() * 0.6));
  const day = -r.int(1, 20);
  const startedAt = at(day, r.int(8, 20), r.int(0, 59));
  const base = new Date(startedAt).getTime();
  const attempts: VideoInteractionAttempt[] = [];
  const encountered: ID[] = [];
  const skipped: ID[] = [];
  const events: LearningEvent[] = [{ id: `lev_${set.id}_${studentId}_s`, schoolId: set.schoolId, studentId, courseId: set.courseId, contentId: set.contentId, verb: "started", objectType: "video", objectId: set.videoId, at: startedAt }];
  for (const i of interactions) {
    if (i.timestamp > reach) break;
    encountered.push(i.id);
    if (!i.required && r.next() < 0.25) {
      skipped.push(i.id);
      continue;
    }
    const when = (k: number) => new Date(base + (i.timestamp + 20 + k * 25) * 1000).toISOString();
    const limit = i.allowRetry ? (i.maxAttempts ?? 3) : 1;
    for (let k = 0; k < limit; k++) {
      const response = pickResponse(i, skill, k, r);
      const score = scoreResponse(i, response);
      const a: VideoInteractionAttempt = { id: `via_${i.id}_${studentId}_${k}`, schoolId: set.schoolId, setId: set.id, interactionId: i.id, studentId, attemptNumber: k + 1, clientAttemptId: `seed-${i.id}-${studentId}-${k}`, response, correct: score.correct, pointsEarned: score.pointsEarned, pointsPossible: i.type === "poll" ? 0 : i.points, review: score.review, videoSeconds: i.timestamp, responseMs: r.int(4000, 40000), startedAt: when(k), submittedAt: when(k) };
      // Teachers have reviewed about half of the short answers.
      if (i.type === "short_answer" && r.next() < 0.5) {
        const pts = response.text === "I'm not sure." ? 0 : r.next() < 0.6 ? i.points : 1;
        Object.assign(a, { review: "reviewed", pointsEarned: pts, correct: pts >= i.points, reviewedBy: db.teachers.find((t) => t.id === db.courses.find((c) => c.id === set.courseId)?.teacherId)?.userId, reviewedAt: when(k + 40) });
      }
      attempts.push(a);
      events.push({ id: `lev_${a.id}`, schoolId: set.schoolId, studentId, courseId: set.courseId, contentId: set.contentId, verb: "answered", objectType: "video_interaction", objectId: i.id, concept: i.concept, correct: a.correct, score: a.pointsEarned, maxScore: a.pointsPossible, attemptNumber: a.attemptNumber, responseMs: a.responseMs, at: a.submittedAt });
      const st = interactionStatus(i, attempts);
      // Some students carry on after a wrong answer instead of retrying.
      if (st.state !== "retry" || r.next() < 0.3) break;
    }
  }
  const ranges = addRange([], 0, reach);
  const lastAt = new Date(base + (reach + 120) * 1000).toISOString();
  let progress: VideoProgress = { id: `vpg_${set.id}_${studentId}`, schoolId: set.schoolId, setId: set.id, contentId: set.contentId, studentId, startedAt, lastPosition: reach >= demo.durationSeconds ? demo.durationSeconds : reach, furthestPosition: reach, watchSeconds: Math.round(reach * (1 + r.next() * 0.4)), watchedRanges: ranges, completionPercent: watchedPercent(ranges, demo.durationSeconds), encountered, skipped, status: "in_progress", lastActivityAt: lastAt };
  const summary = summarize(interactions, attempts, progress);
  if (isComplete(set, summary)) {
    progress = { ...progress, status: "completed", completedAt: lastAt };
    events.push({ id: `lev_${set.id}_${studentId}_c`, schoolId: set.schoolId, studentId, courseId: set.courseId, contentId: set.contentId, verb: "completed", objectType: "video", objectId: set.videoId, score: summary.score, maxScore: summary.maxScore, at: lastAt });
  }
  db.videoAttempts.push(...attempts);
  db.videoProgress.push(progress);
  db.learningEvents.push(...events);
}

/** A plausible answer: stronger students are right more often, and second tries improve. */
function pickResponse(i: VideoInteraction, skill: number, attempt: number, r: ReturnType<typeof rng>) {
  if (i.type === "short_answer") return { text: ANSWERS[Math.min(ANSWERS.length - 1, Math.floor((1 - skill) * ANSWERS.length * r.next() * 1.6))]! };
  if (i.type === "poll") {
    const k = skill > 0.7 ? 0 : skill > 0.5 ? (r.next() < 0.5 ? 0 : 1) : r.int(1, i.options.length - 1);
    return { optionIds: [i.options[k]!.id] };
  }
  const right = r.next() < Math.min(0.95, skill + attempt * 0.25);
  const correct = i.options.filter((o) => o.correct);
  const wrong = i.options.filter((o) => !o.correct);
  if (i.type === "multi_select") {
    if (right) return { optionIds: correct.map((o) => o.id) };
    // A typical slip: one right option missed, or a wrong one added.
    const ids = r.next() < 0.5 ? correct.slice(1).map((o) => o.id) : [...correct.map((o) => o.id), wrong[0]!.id];
    return { optionIds: ids };
  }
  // The first wrong option is the common misconception; the others are picked less often.
  const miss = wrong.length > 1 && r.next() < 0.35 ? wrong[1 + Math.floor(r.next() * (wrong.length - 1))]! : wrong[0]!;
  return { optionIds: [(right ? correct[0]! : miss).id] };
}

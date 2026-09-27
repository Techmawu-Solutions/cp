"use client";

import { useStore } from "@/lib/store";
import { uid } from "@/lib/helpers";
import type { RuntimeSummary } from "@/lib/scorm/runtime";
import type { ContentItem, Course, ID, ScormAttempt } from "@/lib/types";

/**
 * Stores a learner's SCORM run-time data after every Commit/Terminate
 * (spec §26.2). A lesson counts as done in the course once every SCO in the
 * package is completed or passed.
 */
export function saveScormAttempt(item: ContentItem, input: { studentId: ID; userId: ID; schoolId: ID; scoId: string; cmi: Record<string, string>; summary: RuntimeSummary; finished: boolean }) {
  const st = useStore.getState();
  const now = new Date().toISOString();
  const existing = st.scormAttempts.find((a) => a.contentId === item.id && a.studentId === input.studentId && a.scoId === input.scoId);
  const done = input.summary.completion === "completed" || input.summary.success === "passed";
  const patch: Partial<ScormAttempt> = {
    cmi: input.cmi,
    completion: input.summary.completion,
    success: input.summary.success,
    scorePercent: input.summary.scorePercent ?? existing?.scorePercent,
    totalSeconds: input.summary.totalSeconds,
    updatedAt: now,
    sessions: (existing?.sessions ?? 0) + (input.finished ? 1 : 0),
    completedAt: existing?.completedAt ?? (done ? now : undefined),
  };
  if (existing) st.update("scormAttempts", existing.id, patch);
  else
    st.insert("scormAttempts", {
      id: uid("scorm"),
      contentId: item.id,
      courseId: item.courseId,
      schoolId: input.schoolId,
      studentId: input.studentId,
      userId: input.userId,
      scoId: input.scoId,
      version: item.scorm!.version,
      firstLaunchedAt: now,
      ...(patch as Omit<ScormAttempt, "id" | "contentId" | "courseId" | "schoolId" | "studentId" | "userId" | "scoId" | "version" | "firstLaunchedAt">),
    });

  const attempts = useStore.getState().scormAttempts.filter((a) => a.contentId === item.id && a.studentId === input.studentId);
  const allDone = item.scorm!.scos.every((sco) => attempts.some((a) => a.scoId === sco.id && (a.completion === "completed" || a.success === "passed")));
  if (allDone) st.completeContent(input.studentId, item.id);
  recordScormGrade(item, input.studentId, attempts);
}

/**
 * Copies the package score into the gradebook when the item counts towards
 * grades (spec §26.2). The student's best score is kept, like a best-attempt
 * quiz; a teacher can still override it in the gradebook.
 */
function recordScormGrade(item: ContentItem, studentId: ID, attempts: ScormAttempt[]) {
  const st = useStore.getState();
  const a = item.refId ? st.assessments.find((x) => x.id === item.refId && x.scormContentId === item.id) : undefined;
  if (!a) return;
  const { scorePercent } = packageResult(item, attempts);
  if (scorePercent == null) return;
  const score = Math.round((scorePercent / 100) * a.totalMarks * 10) / 10;
  const now = new Date().toISOString();
  const existing = st.submissions.find((x) => x.assessmentId === a.id && x.studentId === studentId);
  if (existing) {
    if (existing.score != null && existing.score >= score) return;
    st.update("submissions", existing.id, { score, status: "graded", gradedAt: now, feedback: `Scored in the SCORM package (${scorePercent}%).` });
  } else st.insert("submissions", { id: uid("smb"), assessmentId: a.id, studentId, submittedAt: now, answers: {}, score, status: "graded", gradedAt: now, feedback: `Scored in the SCORM package (${scorePercent}%).` });
}

/** Makes a SCORM item count towards grades: a linked grade item, out of 100 by default. */
export function linkScormToGradebook(item: ContentItem, course: Course) {
  const st = useStore.getState();
  if (item.refId && st.assessments.some((x) => x.id === item.refId)) return item.refId;
  const id = uid("asm");
  st.insert("assessments", {
    id,
    schoolId: course.schoolId,
    sessionId: course.sessionId,
    courseId: course.id,
    subjectId: course.subjectId,
    classId: course.classId,
    teacherId: course.teacherId,
    title: item.title,
    description: "Interactive SCORM package — the score is recorded automatically when students complete it.",
    type: "quiz",
    totalMarks: 100,
    dueDate: new Date(Date.now() + 14 * 86_400_000).toISOString(),
    status: item.published ? "published" : "draft",
    questions: [],
    scormContentId: item.id,
    createdAt: new Date().toISOString(),
  });
  st.update("contents", item.id, { refId: id });
  // Scores already earned before grading was switched on are carried over.
  for (const studentId of new Set(st.scormAttempts.filter((x) => x.contentId === item.id).map((x) => x.studentId)))
    recordScormGrade({ ...item, refId: id }, studentId, useStore.getState().scormAttempts.filter((x) => x.contentId === item.id && x.studentId === studentId));
  return id;
}

/** Stops a SCORM item counting towards grades (removes its grade item and recorded grades). */
export function unlinkScormFromGradebook(item: ContentItem) {
  const st = useStore.getState();
  const a = st.assessments.find((x) => x.id === item.refId && x.scormContentId === item.id);
  if (!a) return;
  st.removeWhere("submissions", (x) => x.assessmentId === a.id);
  st.remove("assessments", a.id);
  st.update("contents", item.id, { refId: undefined });
}

/** A learner's overall result for a package (all SCOs). */
export function packageResult(item: ContentItem, attempts: ScormAttempt[]) {
  const scos = item.scorm?.scos ?? [];
  const mine = scos.map((sco) => attempts.find((a) => a.scoId === sco.id));
  const started = mine.some(Boolean);
  const completed = scos.length > 0 && mine.every((a) => a && (a.completion === "completed" || a.success === "passed"));
  // Pass/fail comes from the lessons that report one (a plain content lesson only completes).
  const judged = mine.filter((a) => a && a.success !== "unknown");
  const failed = judged.some((a) => a!.success === "failed");
  const passed = completed && judged.length > 0 && judged.every((a) => a!.success === "passed");
  const scores = mine.map((a) => a?.scorePercent).filter((x): x is number => x != null);
  return {
    status: !started ? "Not started" : passed ? "Passed" : failed ? "Failed" : completed ? "Completed" : "In progress",
    scorePercent: scores.length ? Math.round((scores.reduce((t, x) => t + x, 0) / scores.length) * 10) / 10 : undefined,
    totalSeconds: mine.reduce((t, a) => t + (a?.totalSeconds ?? 0), 0),
    lastActivity: mine.map((a) => a?.updatedAt).filter(Boolean).sort().pop(),
    completedAt: completed ? mine.map((a) => a?.completedAt).filter(Boolean).sort().pop() : undefined,
  };
}

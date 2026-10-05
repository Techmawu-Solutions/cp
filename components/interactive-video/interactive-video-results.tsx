"use client";

import { useState } from "react";
import { AlertTriangle, BarChart3, Check, CheckCircle2, Clock, ListVideo, MessageSquareText, Pencil, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { AppSelect } from "@/components/common/app-select";
import { EmptyState } from "@/components/common/empty-state";
import { LinkButton } from "@/components/common/link-button";
import { StatusBadge } from "@/components/common/status-badge";
import { StudentName } from "@/components/common/student-name";
import { canManageCourseVideo, interactionsOf, reviewShortAnswer } from "@/lib/interactive-video/actions";
import { fmtTime, interactionLabel, interactionStats, isScored, setAnalytics, summarize, type InteractionStats } from "@/lib/interactive-video/engine";
import { fmtAgo } from "@/lib/helpers";
import { studentName, useCurrentUser } from "@/lib/session";
import { useStore } from "@/lib/store";
import type { ContentItem, ID, Student, VideoInteraction, VideoInteractionAttempt } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Below this share right, a question is flagged as difficult. */
const DIFFICULT = 60;

/**
 * Interactive video results for teachers (spec section 26.3): how the class
 * did on each question, the wrong answer most often picked, who is struggling,
 * short answers to review, and each student's progress.
 */
export function InteractiveVideoResults({ item, editHref }: { item: ContentItem; editHref: string }) {
  const sets = useStore((s) => s.videoInteractionSets).filter((s) => s.contentId === item.id && s.status !== "draft").sort((a, b) => b.version - a.version);
  const draft = useStore((s) => s.videoInteractionSets.find((x) => x.contentId === item.id && x.status === "draft"));
  const allInteractions = useStore((s) => s.videoInteractions);
  const allAttempts = useStore((s) => s.videoAttempts);
  const allProgress = useStore((s) => s.videoProgress);
  const course = useStore((s) => s.courses.find((c) => c.id === item.courseId));
  const enrollments = useStore((s) => s.enrollments);
  const students = useStore((s) => s.students);
  const me = useCurrentUser();
  const [version, setVersion] = useState<string | null>(null);
  const [open, setOpen] = useState<ID | null>(null);
  const canEdit = !!course && canManageCourseVideo(useStore.getState(), me?.user.id ?? null, course);

  if (!course) return null;
  const set = sets.find((s) => s.id === version) ?? sets.find((s) => s.status === "published") ?? sets[0];
  if (!set)
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListVideo className="size-4" /> Interactive questions
          </CardTitle>
          <CardDescription>{draft ? `A draft with questions is waiting to be published (version ${draft.version}).` : "Add questions at moments in this video. Students answer them as they watch, and you see the results here."}</CardDescription>
          {canEdit && (
            <CardAction>
              <LinkButton href={editHref} size="sm">
                <Pencil /> {draft ? "Continue editing" : "Add questions"}
              </LinkButton>
            </CardAction>
          )}
        </CardHeader>
      </Card>
    );

  const interactions = interactionsOf({ videoInteractions: allInteractions }, set.id);
  const roster = students.filter((st) => enrollments.some((e) => e.studentId === st.id && e.subjectId === course.subjectId && e.classId === course.classId && e.sessionId === course.sessionId));
  const ids = roster.map((s) => s.id);
  const attempts = allAttempts.filter((a) => a.setId === set.id);
  const progresses = allProgress.filter((p) => p.setId === set.id);
  const a = setAnalytics(interactions, attempts, progresses, ids);
  const toReview = attempts.filter((x) => x.review === "pending").length;
  const opened = interactions.find((i) => i.id === open);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="size-4" /> Interactive video results
        </CardTitle>
        <CardDescription>
          {interactions.length === 1 ? "1 question" : `${interactions.length} questions`} · version {set.version}
          {set.status === "archived" && " (no longer shown to students)"}
          {draft && ` · draft version ${draft.version} not published yet`}
        </CardDescription>
        <CardAction className="flex flex-wrap justify-end gap-2">
          {sets.length > 1 && <AppSelect size="sm" value={set.id} onChange={setVersion} options={sets.map((s) => ({ value: s.id, label: s.status === "published" ? `Version ${s.version} (current)` : `Version ${s.version}` }))} aria-label="Version" className="w-44" />}
          {canEdit && (
            <LinkButton href={editHref} size="sm" variant="outline">
              <Pencil /> Edit questions
            </LinkButton>
          )}
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Stat label="Students" value={a.students} icon={Users} />
          <Stat label="Started" value={a.started} icon={ListVideo} />
          <Stat label="Completed" value={a.completed} icon={CheckCircle2} />
          <Stat label="Average watched" value={a.avgWatchedPercent == null ? "—" : `${a.avgWatchedPercent}%`} icon={Clock} />
          <Stat label="Average score" value={a.avgScorePercent == null ? "—" : `${a.avgScorePercent}%`} icon={BarChart3} />
        </div>
        {toReview > 0 && (
          <p className="flex items-center gap-2 rounded-lg bg-blue-500/10 px-3 py-2 text-sm text-blue-900 dark:text-blue-200">
            <MessageSquareText className="size-4 shrink-0" /> {toReview === 1 ? "1 short answer is waiting for your review." : `${toReview} short answers are waiting for your review.`} Open the question to mark them.
          </p>
        )}

        <div>
          <p className="mb-2 text-sm font-medium">How the class did on each question</p>
          <ol className="divide-y rounded-lg border">
            {a.perInteraction.map((st, n) => {
              const i = interactions.find((x) => x.id === st.interactionId)!;
              const hard = st.correctPct != null && st.answered >= 3 && st.correctPct < DIFFICULT;
              return (
                <li key={i.id}>
                  <button type="button" onClick={() => setOpen(i.id)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/40">
                    <span className="w-8 shrink-0 text-sm font-semibold text-muted-foreground">Q{n + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium" data-no-translate>
                        {i.question}
                      </span>
                      <span className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                        {fmtTime(i.timestamp)} · {interactionLabel(i.type)} · {st.answered === 1 ? "1 answer" : `${st.answered} answers`}
                        {st.pendingReview > 0 && <span className="text-blue-700 dark:text-blue-300">{st.pendingReview} to review</span>}
                        {hard && (
                          <span className="inline-flex items-center gap-0.5 font-medium text-red-700 dark:text-red-300">
                            <AlertTriangle className="size-3" /> Difficult
                          </span>
                        )}
                      </span>
                    </span>
                    <span className="w-28 shrink-0 sm:w-40">
                      {st.correctPct == null ? (
                        <span className="block text-right text-xs text-muted-foreground">{i.type === "poll" ? "Poll" : "Not reviewed yet"}</span>
                      ) : (
                        <>
                          <span className="block text-right text-sm font-semibold tabular-nums">{st.correctPct}% correct</span>
                          <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                            <span className={cn("block h-full rounded-full", hard ? "bg-red-500" : st.correctPct < 80 ? "bg-amber-500" : "bg-emerald-500")} style={{ width: `${st.correctPct}%` }} />
                          </span>
                        </>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>

        <StudentProgress roster={roster} interactions={interactions} attempts={attempts} progresses={progresses} />
      </CardContent>

      <Dialog open={!!opened} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          {opened && <QuestionDetail i={opened} n={interactions.indexOf(opened) + 1} stats={interactionStats(opened, attempts.filter((x) => ids.includes(x.studentId)))} attempts={attempts.filter((x) => x.interactionId === opened.id)} students={roster} canReview={canEdit} />}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon: typeof Users }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5" /> {label}
      </p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function QuestionDetail({ i, n, stats, attempts, students, canReview }: { i: VideoInteraction; n: number; stats: InteractionStats; attempts: VideoInteractionAttempt[]; students: Student[]; canReview: boolean }) {
  const byId = new Map(students.map((s) => [s.id, s]));
  const struggling = stats.struggling.map((id) => byId.get(id)).filter((s): s is Student => !!s);
  const answers = [...attempts].sort((a, b) => (a.review === "pending" ? -1 : 0) - (b.review === "pending" ? -1 : 0) || b.submittedAt.localeCompare(a.submittedAt));
  return (
    <>
      <DialogHeader>
        <DialogTitle>
          Question {n} · {fmtTime(i.timestamp)}
        </DialogTitle>
        <DialogDescription data-no-translate>{i.question}</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 text-sm">
        {stats.correctPct != null && (
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Correct" value={`${stats.correctPct}%`} icon={Check} />
            <Stat label="Incorrect" value={`${100 - stats.correctPct}%`} icon={AlertTriangle} />
            <Stat label="Right first time" value={stats.firstTryPct == null ? "—" : `${stats.firstTryPct}%`} icon={CheckCircle2} />
          </div>
        )}
        {i.options.length > 0 && (
          <div>
            <p className="mb-2 font-medium">{i.type === "poll" ? "How the class answered" : "First answers"}</p>
            <ul className="space-y-2">
              {stats.options.map(({ option, count, pct }) => (
                <li key={option.id}>
                  <p className="flex items-center gap-2">
                    {option.correct && <Check className="size-4 text-emerald-600" aria-label="Correct answer" />}
                    <span className="min-w-0 flex-1" data-no-translate>
                      {option.text}
                    </span>
                    {option.correct && <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Correct answer</span>}
                    <span className="w-16 text-right tabular-nums">
                      {pct}% <span className="text-xs text-muted-foreground">({count})</span>
                    </span>
                  </p>
                  <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                    <span className={cn("block h-full rounded-full", option.correct ? "bg-emerald-500" : i.type === "poll" ? "bg-blue-500" : "bg-red-400")} style={{ width: `${pct}%` }} />
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {stats.commonWrong && (
          <p className="rounded-lg bg-amber-500/12 px-3 py-2">
            Most selected wrong answer: <strong data-no-translate>“{stats.commonWrong.option.text}”</strong> — {stats.commonWrong.pct}%
          </p>
        )}
        {isScored(i.type) && (
          <div>
            <p className="mb-1 font-medium">Students struggling: {struggling.length}</p>
            {struggling.length > 0 ? (
              <p className="text-muted-foreground">
                <span data-no-translate>{struggling.map(studentName).join(", ")}</span>
              </p>
            ) : (
              <p className="text-muted-foreground">Nobody is stuck on this question.</p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">Wrong more than once, or still wrong after their last try.</p>
          </div>
        )}
        {i.type === "short_answer" && (
          <div className="space-y-2">
            <p className="font-medium">Answers</p>
            {i.modelAnswer && (
              <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs">
                <span className="font-medium">What you&apos;re looking for:</span> <span data-no-translate>{i.modelAnswer}</span>
              </p>
            )}
            {answers.length === 0 && <EmptyState title="No answers yet" className="py-6" />}
            {answers.map((x) => (
              <ReviewRow key={x.id} attempt={x} student={byId.get(x.studentId)} canReview={canReview} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function ReviewRow({ attempt, student, canReview }: { attempt: VideoInteractionAttempt; student?: Student; canReview: boolean }) {
  const [points, setPoints] = useState(String(attempt.pointsEarned ?? attempt.pointsPossible));
  const [feedback, setFeedback] = useState(attempt.reviewFeedback ?? "");
  const [editing, setEditing] = useState(attempt.review === "pending");
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-start gap-2">
        <StudentName student={student} className="min-w-0 flex-1" />
        {attempt.review === "pending" ? <StatusBadge tone="amber">To review</StatusBadge> : <StatusBadge tone={attempt.correct ? "green" : "gray"}>{`${attempt.pointsEarned}/${attempt.pointsPossible}`}</StatusBadge>}
      </div>
      <p className="mt-2 whitespace-pre-wrap" data-no-translate>
        {attempt.response.text}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{fmtAgo(attempt.submittedAt)}</p>
      {canReview &&
        (editing ? (
          <form
            className="mt-2 flex flex-wrap items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const r = reviewShortAnswer(attempt.id, Number(points), feedback);
              if (!r.ok) return void toast.error(r.error);
              toast.success("Reviewed — the student has been told");
              setEditing(false);
            }}
          >
            <label className="text-xs">
              <span className="mb-1 block text-muted-foreground">Points (out of {attempt.pointsPossible})</span>
              <Input type="number" min={0} max={attempt.pointsPossible} step={0.5} value={points} onChange={(e) => setPoints(e.target.value)} className="h-8 w-24" />
            </label>
            <label className="min-w-48 flex-1 text-xs">
              <span className="mb-1 block text-muted-foreground">Feedback for the student</span>
              <Textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={1} className="min-h-8" />
            </label>
            <Button size="sm" type="submit">
              <Check /> Save
            </Button>
          </form>
        ) : (
          <Button size="xs" variant="ghost" className="mt-1" onClick={() => setEditing(true)}>
            <Pencil /> Change
          </Button>
        ))}
    </div>
  );
}

function StudentProgress({ roster, interactions, attempts, progresses }: { roster: Student[]; interactions: VideoInteraction[]; attempts: VideoInteractionAttempt[]; progresses: ReturnType<typeof useStore.getState>["videoProgress"] }) {
  const [showAll, setShowAll] = useState(false);
  const rows = roster
    .map((s) => {
      const p = progresses.find((x) => x.studentId === s.id) ?? null;
      return { s, p, sum: summarize(interactions, attempts.filter((a) => a.studentId === s.id), p) };
    })
    .sort((a, b) => (b.p?.lastActivityAt ?? "").localeCompare(a.p?.lastActivityAt ?? "") || studentName(a.s).localeCompare(studentName(b.s)));
  const shown = showAll ? rows : rows.slice(0, 10);
  const status = (p: (typeof rows)[number]["p"]) => (!p ? <StatusBadge tone="gray">Not started</StatusBadge> : p.status === "completed" ? <StatusBadge tone="green">Completed</StatusBadge> : <StatusBadge tone="blue">In progress</StatusBadge>);
  return (
    <div>
      <p className="mb-2 text-sm font-medium">Students</p>
      <ul className="divide-y rounded-lg border sm:hidden">
        {shown.map(({ s, p, sum }) => (
          <li key={s.id} className="space-y-1 px-3 py-2.5 text-sm">
            <div className="flex items-start gap-2">
              <StudentName student={s} className="min-w-0 flex-1" />
              {status(p)}
            </div>
            <p className="text-xs text-muted-foreground">
              Watched {Math.round(p?.completionPercent ?? 0)}% · {sum.completed}/{sum.total} answered · {sum.correct} correct
              {sum.scorePercent != null && p && ` · ${Math.round(sum.scorePercent)}%`}
            </p>
          </li>
        ))}
      </ul>
      <Table className="hidden sm:table">
        <TableHeader>
          <TableRow>
            <TableHead>Student</TableHead>
            <TableHead className="text-right">Watched</TableHead>
            <TableHead className="text-right">Answered</TableHead>
            <TableHead className="text-right">Correct</TableHead>
            <TableHead className="text-right">Score</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last activity</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {shown.map(({ s, p, sum }) => (
            <TableRow key={s.id}>
              <TableCell>
                <StudentName student={s} />
              </TableCell>
              <TableCell className="text-right tabular-nums">{p ? `${Math.round(p.completionPercent)}%` : "—"}</TableCell>
              <TableCell className="text-right tabular-nums">
                {sum.completed}/{sum.total}
              </TableCell>
              <TableCell className="text-right tabular-nums">{p ? sum.correct : "—"}</TableCell>
              <TableCell className="text-right tabular-nums">{p && sum.scorePercent != null ? `${Math.round(sum.scorePercent)}%` : "—"}</TableCell>
              <TableCell>{status(p)}</TableCell>
              <TableCell className="text-muted-foreground">{p ? fmtAgo(p.lastActivityAt) : "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {rows.length > 10 && (
        <Button variant="ghost" size="sm" className="mt-2" onClick={() => setShowAll((v) => !v)}>
          {showAll ? "Show fewer" : `Show all ${rows.length} students`}
        </Button>
      )}
    </div>
  );
}

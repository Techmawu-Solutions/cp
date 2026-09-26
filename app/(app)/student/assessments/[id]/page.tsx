"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlarmClock, CheckCircle2, FileUp, Send, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { StatusBadge } from "@/components/common/status-badge";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { GradePill } from "@/components/assessment/gradebook";
import { DragWordsInput, MatchingInput, OrderingInput } from "@/components/assessment/drag-inputs";
import { answerText, correctText, isAnswered, markQuestion, parseList, parseMap, questionLabel, shuffled, wordBank } from "@/lib/questions";
import { Checkbox } from "@/components/ui/checkbox";
import { MathText } from "@/components/common/math-text";
import { ZoomableImage } from "@/components/common/zoomable-image";
import { useStudentData } from "@/lib/student";
import { submitAssessment } from "@/lib/actions";
import { fmtAgo, fmtDateTime } from "@/lib/helpers";
import type { Assessment, Question } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Assignment / Quiz taking (spec §64 screens 38–39). */
export default function TakeAssessmentPage() {
  const { id } = useParams<{ id: string }>();
  const s = useStudentData();
  const a = s.assessments.find((x) => x.id === id);
  if (!a) return <EmptyState title="Not available" description="This assessment isn't assigned to you." className="mt-8" />;
  return <Take key={a.id} a={a} />;
}

function Take({ a }: { a: Assessment }) {
  const s = useStudentData();
  const router = useRouter();
  const sub = s.submissionFor(a);
  const state = s.stateOf(a);
  const timed = a.type === "quiz" && !!a.durationMinutes;
  const [started, setStarted] = useState(!timed);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const submitted = useRef(false);
  const canSubmit = (state === "todo" || state === "overdue") && a.status === "published";
  const hasQuestions = a.questions.length > 0;
  // Per-student order: the same student always sees the same order (seeded by student and assessment).
  const seed = `${a.id}:${s.student?.id ?? ""}`;
  const questions = a.shuffleQuestions ? shuffled(a.questions, seed) : a.questions;
  const optionOrderOf = (q: Question) => {
    const idx = (q.options ?? []).map((_, i) => i);
    return a.shuffleOptions && (q.type === "mcq" || q.type === "multi_select") ? shuffled(idx, `${seed}:${q.id}`) : idx;
  };
  const needsFile = a.questions.some((q) => q.type === "file") || (!hasQuestions && a.type !== "quiz");

  const submit = (auto = false) => {
    if (submitted.current || !s.student) return;
    submitted.current = true;
    const result = submitAssessment(a, s.student.id, answers, { fileName: file?.name, text: text.trim() || undefined });
    toast.success(auto ? "Time's up — your answers were submitted" : "Submitted", { description: result.score != null ? `You scored ${result.score}/${a.totalMarks}.` : "Your teacher will grade it soon." });
  };

  const start = () => {
    setStarted(true);
    if (timed) {
      const t = Date.now();
      setNow(t);
      setDeadline(t + a.durationMinutes! * 60_000);
    }
  };
  useEffect(() => {
    if (!deadline) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [deadline]);
  const remaining = deadline ? Math.max(0, deadline - now) : 0;
  // Submits whatever the student has answered when the timer reaches zero.
  const onTimeUp = useEffectEvent(() => submit(true));
  useEffect(() => {
    if (deadline && remaining === 0 && canSubmit) onTimeUp();
  }, [deadline, remaining, canSubmit]);

  const answered = a.questions.filter((q) => (q.type === "file" ? !!file : isAnswered(q, answers[q.id]))).length;
  const header = (
    <PageHeader
      breadcrumbs={[{ label: a.type === "quiz" ? "Quizzes" : "Assignments", href: a.type === "quiz" ? "/student/quizzes" : "/student/assignments" }, { label: a.title }]}
      title={a.title}
      description={
        <span className="flex flex-wrap items-center gap-2">
          {s.d.byId.subject.get(a.subjectId)?.name} · {a.totalMarks} marks{a.durationMinutes ? ` · ${a.durationMinutes} min` : ""} · Due {fmtDateTime(a.dueDate)} ({fmtAgo(a.dueDate)})
        </span>
      }
    />
  );

  // ---- after submission: result view
  if (sub) {
    const pct = sub.score != null ? (sub.score / a.totalMarks) * 100 : null;
    return (
      <>
        {header}
        <div className="mx-auto max-w-3xl space-y-4">
          <Card>
            <CardContent className="flex flex-wrap items-center gap-4">
              {pct != null ? <CheckCircle2 className="size-8 text-emerald-600" /> : <Send className="size-8 text-primary" />}
              <div className="flex-1">
                <p className="font-semibold">{pct != null ? "Graded" : "Submitted — waiting for your teacher to grade"}</p>
                <p className="text-sm text-muted-foreground">Submitted {fmtDateTime(sub.submittedAt)}{sub.fileName ? ` · ${sub.fileName}` : ""}</p>
              </div>
              {pct != null && (
                <div className="text-right">
                  <p className="text-3xl font-semibold tabular-nums">
                    {sub.score}/{a.totalMarks}
                  </p>
                  <GradePill percent={pct} />
                </div>
              )}
            </CardContent>
            {sub.feedback && (
              <CardContent className="border-t pt-3">
                <p className="text-xs text-muted-foreground">Teacher feedback</p>
                <p className="text-sm">{sub.feedback}</p>
              </CardContent>
            )}
          </Card>
          {Object.keys(sub.answers).length > 0 &&
            questions.map((q, i) => {
              const given = sub.answers[q.id];
              const earned = markQuestion(q, given);
              const right = earned != null && earned >= q.marks;
              const correct = correctText(q);
              return (
                <Card key={q.id} size="sm">
                  <CardContent className="space-y-1 text-sm">
                    <p className="flex items-start gap-2 font-medium">
                      <span className="text-muted-foreground">{i + 1}.</span> <MathText className="flex-1" text={q.type === "drag_words" ? q.prompt.replace(/_{3,}/g, "____") : q.prompt} />
                      {earned != null && (
                        <span className={cn("flex shrink-0 items-center gap-1 text-xs tabular-nums", right ? "text-emerald-700 dark:text-emerald-400" : earned > 0 ? "text-amber-700 dark:text-amber-400" : "text-red-700 dark:text-red-400")}>
                          {right ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />} {earned}/{q.marks}
                        </span>
                      )}
                    </p>
                    {q.image && <ZoomableImage src={q.image} alt={q.imageAlt} className="my-1 block w-fit max-w-xs" />}
                    <p className="text-muted-foreground">
                      Your answer: <MathText className="text-foreground" text={answerText(q, given) || "—"} />
                    </p>
                    {earned != null && !right && sub.score != null && correct && (
                      <p className="text-muted-foreground">
                        Correct: <MathText className="text-emerald-700 dark:text-emerald-400" text={correct} />
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          <Button variant="outline" onClick={() => router.push(a.type === "quiz" ? "/student/quizzes" : "/student/assignments")}>
            Back
          </Button>
        </div>
      </>
    );
  }

  if (!canSubmit)
    return (
      <>
        {header}
        <EmptyState title={state === "missed" ? "Submissions are closed" : "This assessment isn't open"} description="Talk to your teacher if you think this is a mistake." />
      </>
    );

  // ---- quiz start screen
  if (!started)
    return (
      <>
        {header}
        <Card className="mx-auto max-w-lg text-center">
          <CardHeader>
            <CardTitle>Ready to start?</CardTitle>
            <CardDescription>{a.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="rounded-lg bg-muted p-3">
                <p className="text-xl font-semibold">{a.questions.length}</p>questions
              </div>
              <div className="rounded-lg bg-muted p-3">
                <p className="text-xl font-semibold">{a.durationMinutes}</p>minutes
              </div>
              <div className="rounded-lg bg-muted p-3">
                <p className="text-xl font-semibold">{a.totalMarks}</p>marks
              </div>
            </div>
            <p className="text-xs text-muted-foreground">The timer starts when you begin and your answers are submitted automatically when time runs out.</p>
            <Button size="lg" className="w-full" onClick={start}>
              <AlarmClock /> Start quiz
            </Button>
          </CardContent>
        </Card>
      </>
    );

  // ---- answering
  const mm = Math.floor(remaining / 60_000);
  const ss = Math.floor((remaining % 60_000) / 1000);
  return (
    <>
      {header}
      <div className="mx-auto max-w-3xl space-y-4">
        {timed && (
          <div className={cn("sticky top-16 z-20 flex items-center gap-3 rounded-xl border bg-card/95 px-4 py-2 shadow-sm backdrop-blur", remaining < 60_000 && "border-red-500/50")}>
            <AlarmClock className={cn("size-4", remaining < 60_000 && "text-red-600")} />
            <span className={cn("font-mono text-lg font-semibold tabular-nums", remaining < 60_000 && "text-red-600")}>
              {String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}
            </span>
            <Progress value={(answered / Math.max(1, a.questions.length)) * 100} className="flex-1" />
            <span className="text-xs text-muted-foreground">
              {answered}/{a.questions.length} answered
            </span>
          </div>
        )}
        {a.description && (
          <Card>
            <CardContent className="text-sm whitespace-pre-wrap">{a.description}</CardContent>
          </Card>
        )}
        {questions.map((q, i) => (
          <QuestionInput key={q.id} q={q} index={i} value={answers[q.id] ?? ""} onChange={(v) => setAnswers((x) => ({ ...x, [q.id]: v }))} onFile={setFile} file={file} optionOrder={optionOrderOf(q)} />
        ))}
        {!hasQuestions && (
          <Card>
            <CardHeader>
              <CardTitle>Your submission</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder="Type your answer here (optional if you upload a file)" />
              <FilePicker file={file} onFile={setFile} />
            </CardContent>
          </Card>
        )}
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">{state === "overdue" && <StatusBadge status="late">Late submission</StatusBadge>}</p>
          <Button
            size="lg"
            onClick={() => {
              if (!hasQuestions && !text.trim() && !file) return toast.error("Write an answer or upload a file");
              if (needsFile && hasQuestions && !file) return toast.error("Upload the required file");
              setConfirm(true);
            }}
          >
            <Send /> Submit
          </Button>
        </div>
      </div>
      <ConfirmDialog open={confirm} onOpenChange={setConfirm} title="Submit your work?" description={hasQuestions && answered < a.questions.length ? `You've answered ${answered} of ${a.questions.length} questions. You can't change your answers after submitting.` : "You can't change your answers after submitting."} confirmLabel="Submit" onConfirm={() => submit()} />
    </>
  );
}

function FilePicker({ file, onFile }: { file: File | null; onFile: (f: File | null) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed p-4 text-sm hover:bg-muted/50">
      <FileUp className="size-5 text-primary" />
      <span className="flex-1">{file ? `${file.name} (${(file.size / 1024).toFixed(0)} KB)` : "Upload a file — PDF, Word or image"}</span>
      <Input type="file" className="hidden" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
      <span className="text-xs text-primary">{file ? "Change" : "Browse"}</span>
    </label>
  );
}

/** Options are shown in `optionOrder` (indices into q.options); answers always store the original index. */
function QuestionInput({ q, index, value, onChange, onFile, file, optionOrder }: { q: Question; index: number; value: string; onChange: (v: string) => void; onFile: (f: File | null) => void; file: File | null; optionOrder: number[] }) {
  const picked = new Set(q.type === "multi_select" ? parseList<number>(value) : []);
  const pictures = (q.optionImages ?? []).some(Boolean);
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-start gap-2 text-base">
          <span className="text-muted-foreground">{index + 1}.</span> <MathText className="flex-1 font-normal" text={q.type === "drag_words" ? "Drag the words into the blanks." : q.prompt} />
        </CardTitle>
        <CardDescription>
          {questionLabel(q.type)} · {q.marks} marks{q.type === "multi_select" ? " · select all that apply" : ""}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {q.image && <ZoomableImage src={q.image} alt={q.imageAlt} className="mb-4 block w-fit" />}
        {q.type === "mcq" && (
          <RadioGroup value={value} onValueChange={(v) => onChange(String(v))} className={pictures ? "grid grid-cols-2 gap-2" : "gap-2"}>
            {optionOrder.map((i, pos) => (
              <label key={i} className={cn("flex cursor-pointer gap-3 rounded-lg border px-3 py-2.5 text-sm", pictures ? "flex-col" : "items-center", value === String(i) && "border-primary bg-accent/50 ring-1 ring-primary")}>
                {q.optionImages?.[i] && <ZoomableImage src={q.optionImages[i]!} alt={q.options![i] || `Option ${String.fromCharCode(65 + pos)}`} cornerOnly />}
                <span className="flex items-center gap-3">
                  <RadioGroupItem value={String(i)} /> <span className="font-medium text-muted-foreground">{String.fromCharCode(65 + pos)}.</span> <MathText text={q.options![i]!} />
                </span>
              </label>
            ))}
          </RadioGroup>
        )}
        {q.type === "multi_select" && (
          <div className={pictures ? "grid grid-cols-2 gap-2" : "grid gap-2"}>
            {optionOrder.map((i, pos) => (
              <label key={i} className={cn("flex cursor-pointer gap-3 rounded-lg border px-3 py-2.5 text-sm", pictures ? "flex-col" : "items-center", picked.has(i) && "border-primary bg-accent/50 ring-1 ring-primary")}>
                {q.optionImages?.[i] && <ZoomableImage src={q.optionImages[i]!} alt={q.options![i] || `Option ${String.fromCharCode(65 + pos)}`} cornerOnly />}
                <span className="flex items-center gap-3">
                  <Checkbox checked={picked.has(i)} onCheckedChange={() => onChange(JSON.stringify(picked.has(i) ? [...picked].filter((x) => x !== i) : [...picked, i].sort((x, y) => x - y)))} />
                  <span className="font-medium text-muted-foreground">{String.fromCharCode(65 + pos)}.</span> <MathText text={q.options![i]!} />
                </span>
              </label>
            ))}
          </div>
        )}
        {q.type === "true_false" && (
          <RadioGroup value={value} onValueChange={(v) => onChange(String(v))} className="grid grid-cols-2 gap-2">
            {["true", "false"].map((v) => (
              <label key={v} className={cn("flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm", value === v && "border-primary bg-accent/50")}>
                <RadioGroupItem value={v} /> {v === "true" ? "True" : "False"}
              </label>
            ))}
          </RadioGroup>
        )}
        {(q.type === "short_answer" || q.type === "fill_blank") && <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="Your answer" />}
        {q.type === "numeric" && <Input value={value} inputMode="decimal" onChange={(e) => onChange(e.target.value)} placeholder="Enter a number" className="max-w-48" />}
        {(q.type === "long_answer" || q.type === "essay") && <Textarea rows={q.type === "essay" ? 10 : 5} value={value} onChange={(e) => onChange(e.target.value)} placeholder="Your answer" />}
        {q.type === "matching" && <MatchingInput id={q.id} pairs={q.pairs ?? []} value={parseMap(value)} onChange={(m) => onChange(JSON.stringify(m))} />}
        {q.type === "ordering" && <OrderingInput id={q.id} items={q.options ?? []} value={parseList<number>(value)} onChange={(o) => onChange(JSON.stringify(o))} />}
        {q.type === "drag_words" && <DragWordsInput prompt={q.prompt} bank={wordBank(q)} value={parseList<string | null>(value)} onChange={(w) => onChange(JSON.stringify(w))} />}
        {q.type === "file" && <FilePicker file={file} onFile={onFile} />}
      </CardContent>
    </Card>
  );
}

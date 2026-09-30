"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Check, Lightbulb, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { StateBadge } from "@/components/open/bits";
import { courseOfActivity } from "@/lib/data/courses";
import { credentialById, skillName } from "@/lib/data/graph";
import { isCorrect, itemById } from "@/lib/data/items";
import { completeActivity, finishMasteryCheck, recordAnswer } from "@/lib/learning";
import { useOpen } from "@/lib/store";
import type { Activity, Item } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * One question with the hint ladder (FR-AI-2): nudge → strategy → worked step.
 * The answer and explanation appear only after an attempt.
 */
export function ItemQuestion({ item, allowHints = true, onDone, onContinue, doneLabel = "Next" }: { item: Item; allowHints?: boolean; onDone: (correct: boolean, hintsUsed: number) => void; onContinue: () => void; doneLabel?: string }) {
  const [answer, setAnswer] = useState("");
  const [hints, setHints] = useState(0);
  const [result, setResult] = useState<boolean | null>(null);
  const check = () => {
    const ok = isCorrect(item, answer);
    setResult(ok);
    onDone(ok, hints);
  };
  return (
    <div>
      <p className="text-lg font-medium whitespace-pre-line">{item.stem}</p>
      {item.type === "mcq" ? (
        <div className="mt-3 grid gap-2" role="radiogroup" aria-label="Answer options">
          {item.options!.map((o, i) => {
            const picked = answer === String(i);
            const right = result !== null && String(i) === item.answer;
            return (
              <button
                key={i}
                type="button"
                role="radio"
                aria-checked={picked}
                disabled={result !== null}
                onClick={() => setAnswer(String(i))}
                className={cn("flex items-center gap-2 rounded-xl border bg-card p-3 text-left font-mono text-sm", picked && result === null && "border-primary ring-2 ring-primary/20", right && "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30", picked && result === false && "border-destructive bg-destructive/5")}
              >
                <span className="grid size-6 shrink-0 place-items-center rounded-full border text-xs">{String.fromCharCode(65 + i)}</span>
                {o}
              </button>
            );
          })}
        </div>
      ) : (
        <Input className="mt-3 w-44 bg-card" inputMode="decimal" value={answer} disabled={result !== null} onChange={(e) => setAnswer(e.target.value)} onKeyDown={(e) => e.key === "Enter" && answer && check()} aria-label="Your answer" />
      )}

      {allowHints && hints > 0 && (
        <ol className="mt-3 space-y-1.5">
          {item.hints.slice(0, hints).map((h, i) => (
            <li key={i} className="flex gap-2 rounded-lg bg-amber-50 p-2 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
              <Lightbulb className="mt-0.5 size-4 shrink-0" />
              <span>
                <span className="font-medium">{["Nudge", "Strategy", "Worked step"][i]}:</span> {h}
              </span>
            </li>
          ))}
        </ol>
      )}

      {result !== null && (
        <div className={cn("mt-3 rounded-xl p-3 text-sm", result ? "bg-emerald-50 text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100" : "bg-muted")}>
          <p className="flex items-center gap-1.5 font-medium">
            {result ? <Check className="size-4" /> : <X className="size-4" />}
            {result ? "Correct" : `Not quite — the answer is ${item.type === "mcq" ? item.options![Number(item.answer)] : item.answer}`}
          </p>
          <p className="mt-1">{item.explanation}</p>
          {!result && <p className="mt-1 text-xs opacity-80">We&apos;ll bring this back in your review so it sticks.</p>}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {result === null ? (
          <>
            <Button disabled={answer === ""} onClick={check}>
              Check
            </Button>
            {allowHints && hints < 3 && (
              <Button variant="outline" onClick={() => setHints((h) => h + 1)}>
                <Lightbulb /> {hints === 0 ? "Hint" : "Another hint"}
              </Button>
            )}
          </>
        ) : (
          <Button onClick={onContinue}>
            {doneLabel} <ArrowRight />
          </Button>
        )}
      </div>
    </div>
  );
}

/** A practice set: one item at a time, hints allowed, every answer is evidence. */
export function PracticeSet({ activity, record }: { activity: Activity; record: boolean }) {
  const items = (activity.itemIds ?? []).map((id) => itemById.get(id)).filter((x): x is Item => !!x);
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const mastery = useOpen((s) => s.mastery);
  const item = items[i];
  if (finished)
    return (
      <div className="rounded-2xl border bg-card p-6 text-center">
        <p className="font-heading text-2xl font-semibold">
          {score} of {items.length} correct
        </p>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {activity.skills.map((sk) => (
            <span key={sk} className="inline-flex items-center gap-2 text-sm">
              {skillName(sk)} <StateBadge state={mastery[sk]?.state ?? "not_started"} />
            </span>
          ))}
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{record ? "Your answers updated your skill map and review schedule." : "Sign in to save your progress."}</p>
        <Button variant="outline" className="mt-4" onClick={() => (setI(0), setScore(0), setFinished(false))}>
          <RotateCcw /> Practise again
        </Button>
      </div>
    );
  if (!item) return null;
  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="mb-4 flex items-center gap-3 text-xs text-muted-foreground">
        <span>
          Question {i + 1} of {items.length}
        </span>
        <Progress value={(i / items.length) * 100} className="flex-1" />
      </div>
      <ItemQuestion
        key={item.id}
        item={item}
        onDone={(ok, hints) => {
          if (ok) setScore((s) => s + 1);
          if (record) recordAnswer(item, ok, "practice", hints);
        }}
        onContinue={() => {
          if (i + 1 >= items.length) {
            setFinished(true);
            if (record) completeActivity(activity);
          } else setI(i + 1);
        }}
        doneLabel={i + 1 >= items.length ? "Finish" : "Next question"}
      />
    </div>
  );
}

/** The mastery check: no hints, 70% to pass; passing issues the certificate (FR-CR-4). */
export function MasteryCheck({ activity, record }: { activity: Activity; record: boolean }) {
  const course = courseOfActivity(activity.id)!;
  const items = (activity.itemIds ?? []).map((id) => itemById.get(id)).filter((x): x is Item => !!x);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ pct: number; passed: boolean; issued: string[] } | null>(null);
  const best = useOpen((s) => s.checks[course.slug]?.pct);
  const creds = useOpen((s) => s.credentials);

  if (result) {
    const cert = creds.find((c) => c.defId === course.credential);
    return (
      <div className="rounded-2xl border bg-card p-6 text-center">
        <p className="font-heading text-4xl font-semibold">{result.pct}%</p>
        <p className="mt-1">{result.passed ? "Passed — the skills in this course are now Verified." : "Not yet. Review the lessons for the questions you missed and try again."}</p>
        {cert && (
          <Link href={`/verify/${cert.code}`} className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-primary-foreground">
            <BadgeCheck className="size-4" /> View your certificate
          </Link>
        )}
        {!result.passed && (
          <Button className="mt-4" variant="outline" onClick={() => (setAnswers({}), setResult(null))}>
            <RotateCcw /> Try again
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border bg-accent/40 p-4 text-sm">
        <p className="font-medium">Mastery check · {items.length} questions · no hints · 70% to pass</p>
        <p className="text-muted-foreground">Passing verifies the course skills and issues your certificate{course.credential ? ` (${credentialById.get(course.credential)?.name})` : ""}. {best != null && `Your best so far: ${best}%.`}</p>
      </div>
      {items.map((it, n) => (
        <fieldset key={it.id} className="rounded-2xl border bg-card p-4">
          <legend className="px-1 text-xs text-muted-foreground">
            {n + 1}. {skillName(it.skill)}
          </legend>
          <p className="font-medium whitespace-pre-line">{it.stem}</p>
          {it.type === "mcq" ? (
            <div className="mt-2 grid gap-1.5">
              {it.options!.map((o, i) => (
                <label key={i} className={cn("flex cursor-pointer items-center gap-2 rounded-lg border p-2 font-mono text-sm", answers[it.id] === String(i) && "border-primary bg-accent/50")}>
                  <input type="radio" name={it.id} checked={answers[it.id] === String(i)} onChange={() => setAnswers((a) => ({ ...a, [it.id]: String(i) }))} />
                  {o}
                </label>
              ))}
            </div>
          ) : (
            <Input className="mt-2 w-40" inputMode="decimal" value={answers[it.id] ?? ""} onChange={(e) => setAnswers((a) => ({ ...a, [it.id]: e.target.value }))} aria-label={`Answer ${n + 1}`} />
          )}
        </fieldset>
      ))}
      <Button
        size="lg"
        disabled={Object.keys(answers).length < items.length}
        onClick={() => {
          const graded = items.map((it) => ({ itemId: it.id, correct: isCorrect(it, answers[it.id] ?? "") }));
          if (!record) {
            const pct = Math.round((graded.filter((g) => g.correct).length / items.length) * 100);
            setResult({ pct, passed: pct >= 70, issued: [] });
            return;
          }
          const r = finishMasteryCheck(course, graded);
          setResult({ pct: r.pct, passed: r.passed, issued: r.issued.map((c) => c.code) });
          for (const c of r.issued) toast.success(`Credential issued: ${credentialById.get(c.defId)?.name}`);
        }}
      >
        Submit ({Object.keys(answers).length}/{items.length} answered)
      </Button>
    </div>
  );
}

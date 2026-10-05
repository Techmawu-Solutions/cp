"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, CircleCheck, CircleX, Info, Loader2, Play, RotateCcw, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { MathText } from "@/components/common/math-text";
import { DEFAULT_TITLE, attemptLimit, interactionLabel } from "@/lib/interactive-video/engine";
import type { InteractionStatus } from "@/lib/interactive-video/engine";
import type { VideoInteraction, VideoInteractionAttempt, VideoInteractionResponse } from "@/lib/types";
import { cn } from "@/lib/utils";

export type SubmitResult = { ok: true; attempt: VideoInteractionAttempt; status: InteractionStatus } | { ok: false; error: string; retryable?: boolean };

/**
 * The question shown over the video (spec section 26.3). Answers go to the
 * platform, which decides whether they are right; this card only shows the
 * result. A failed save keeps the answer and its id, so trying again can't
 * record it twice.
 */
export function InteractionCard({
  interaction: i,
  status,
  index,
  total,
  onSubmit,
  onContinue,
  onSkip,
  preview,
}: {
  interaction: VideoInteraction;
  status: InteractionStatus;
  index: number;
  total: number;
  onSubmit: (response: VideoInteractionResponse, clientAttemptId: string) => Promise<SubmitResult>;
  onContinue: () => void;
  onSkip?: () => void;
  preview?: boolean;
}) {
  const [picked, setPicked] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<"answer" | "sending" | "feedback">(status.resolved && !(status.state === "retry") ? "feedback" : "answer");
  const [result, setResult] = useState<{ attempt: VideoInteractionAttempt; status: InteractionStatus } | null>(status.resolved && status.best ? { attempt: status.attempts[status.attempts.length - 1]!, status } : null);
  const [error, setError] = useState<string | null>(null);
  const clientId = useRef<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);

  // Focus moves into the card when it opens, so keyboard and screen-reader users land on the question.
  useEffect(() => heading.current?.focus(), [i.id]);
  useEffect(() => {
    if (phase === "feedback") feedbackRef.current?.focus();
  }, [phase]);

  const answered = i.type === "short_answer" ? text.trim().length > 0 : picked.length > 0;
  const submit = async () => {
    if (!answered || phase === "sending") return;
    clientId.current ??= typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    setPhase("sending");
    setError(null);
    const r = await onSubmit(i.type === "short_answer" ? { text } : { optionIds: picked }, clientId.current);
    if (!r.ok) {
      setError(r.error);
      setPhase("answer");
      // Only a lost connection keeps the same id; a refused answer starts afresh next time.
      if (!r.retryable) clientId.current = null;
      return;
    }
    clientId.current = null;
    setResult(r);
    setPhase("feedback");
  };
  const retry = () => {
    setPicked([]);
    setText("");
    setResult(null);
    setPhase("answer");
    setTimeout(() => heading.current?.focus());
  };

  const st = result?.status;
  const correctText = i.options.filter((o) => o.correct).map((o) => o.text).join(", ");
  const limit = attemptLimit(i);
  const attemptsLabel = Number.isFinite(limit) && limit > 1 ? `Attempt ${Math.min(status.attempts.length + 1, limit)} of ${limit}` : null;

  return (
    <div role="dialog" aria-modal={i.pauseVideo} aria-labelledby={`ivq-${i.id}`} className="w-full overflow-hidden rounded-xl border bg-card text-card-foreground shadow-xl" onKeyDown={(e) => e.stopPropagation()}>
      <div className="flex items-center gap-2 border-b bg-muted/40 px-4 py-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{interactionLabel(i.type)}</span>
        <span>·</span>
        <span>
          Question {index + 1} of {total}
        </span>
        {i.required ? <span className="ml-auto rounded bg-primary/10 px-1.5 py-0.5 font-medium text-primary">Required</span> : <span className="ml-auto">Optional</span>}
      </div>
      <div className="max-h-[60vh] space-y-3 overflow-y-auto p-4 sm:max-h-none">
        <h2 ref={heading} id={`ivq-${i.id}`} tabIndex={-1} className="text-base font-semibold outline-none" data-no-translate={i.title ? true : undefined}>
          {i.title || DEFAULT_TITLE}
        </h2>
        <p className="text-sm font-medium" data-no-translate>
          <MathText text={i.question} />
        </p>
        {i.description && (
          <p className="text-xs text-muted-foreground" data-no-translate>
            {i.description}
          </p>
        )}

        {phase !== "feedback" && (
          <fieldset disabled={phase === "sending"} className="space-y-2">
            <legend className="sr-only">Your answer</legend>
            {(i.type === "mcq" || i.type === "true_false" || i.type === "poll") && (
              <RadioGroup value={picked[0] ?? ""} onValueChange={(v) => setPicked([String(v)])} className={cn("gap-2", i.type === "true_false" && "grid-cols-2")}>
                {i.options.map((o, k) => (
                  <label key={o.id} className={cn("flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-colors hover:bg-muted/50 has-data-checked:border-primary has-data-checked:bg-primary/5")}>
                    <RadioGroupItem value={o.id} className="mt-0.5" />
                    {i.type !== "true_false" && <span className="font-medium text-muted-foreground">{String.fromCharCode(65 + k)}.</span>}
                    <span data-no-translate={i.type === "true_false" ? undefined : true}>
                      <MathText text={o.text} />
                    </span>
                  </label>
                ))}
              </RadioGroup>
            )}
            {i.type === "multi_select" && (
              <div className="grid gap-2">
                <p className="text-xs text-muted-foreground">Select all that apply.</p>
                {i.options.map((o, k) => (
                  <label key={o.id} className="flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-colors hover:bg-muted/50 has-data-checked:border-primary has-data-checked:bg-primary/5">
                    <Checkbox checked={picked.includes(o.id)} onCheckedChange={(on) => setPicked((p) => (on ? [...p, o.id] : p.filter((x) => x !== o.id)))} className="mt-0.5" />
                    <span className="font-medium text-muted-foreground">{String.fromCharCode(65 + k)}.</span>
                    <span data-no-translate>
                      <MathText text={o.text} />
                    </span>
                  </label>
                ))}
              </div>
            )}
            {i.type === "short_answer" && <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={2000} aria-label="Your answer" placeholder="Type your answer…" />}
          </fieldset>
        )}

        {error && (
          <p role="alert" className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" /> {error}
          </p>
        )}

        {phase === "feedback" && result && st && (
          <div ref={feedbackRef} tabIndex={-1} aria-live="polite" className="space-y-2 outline-none">
            <Feedback i={i} attempt={result.attempt} status={st} correctText={correctText} />
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t px-4 py-3">
        {phase !== "feedback" ? (
          <>
            {attemptsLabel && <span className="text-xs text-muted-foreground">{attemptsLabel}</span>}
            <div className="flex-1" />
            {!i.required && onSkip && phase === "answer" && (
              <Button variant="ghost" onClick={onSkip}>
                <SkipForward /> Skip
              </Button>
            )}
            {status.state === "retry" && phase === "answer" && (
              <Button variant="ghost" onClick={onContinue}>
                Continue without retrying
              </Button>
            )}
            <Button onClick={submit} disabled={!answered || phase === "sending"}>
              {phase === "sending" ? <Loader2 className="animate-spin" /> : <Check />} {error ? "Try sending again" : i.type === "true_false" ? "Submit" : "Submit answer"}
            </Button>
          </>
        ) : (
          <>
            {preview && <span className="text-xs text-muted-foreground">Preview — nothing is recorded</span>}
            <div className="flex-1" />
            {st?.state === "retry" ? (
              <>
                <Button variant="ghost" onClick={onContinue}>
                  Continue without retrying
                </Button>
                <Button onClick={retry} autoFocus>
                  <RotateCcw /> Try again
                </Button>
              </>
            ) : (
              <Button onClick={onContinue} autoFocus>
                <Play /> Continue video
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Feedback({ i, attempt, status, correctText }: { i: VideoInteraction; attempt: VideoInteractionAttempt; status: InteractionStatus; correctText: string }) {
  if (i.type === "poll")
    return (
      <Banner tone="info" icon={Info} title="Thanks — your answer is recorded.">
        Your teacher sees how the class answered.
      </Banner>
    );
  if (i.type === "short_answer")
    return attempt.review === "reviewed" ? (
      <Banner tone={attempt.correct ? "good" : "info"} icon={attempt.correct ? CircleCheck : Info} title={`Reviewed: ${attempt.pointsEarned}/${attempt.pointsPossible} points`}>
        {attempt.reviewFeedback && <span data-no-translate>{attempt.reviewFeedback}</span>}
      </Banner>
    ) : (
      <Banner tone="info" icon={Info} title="Answer sent">
        Your teacher will review it.
      </Banner>
    );
  if (!i.showFeedback)
    return (
      <Banner tone="info" icon={Info} title="Answer recorded">
        Your teacher will go over the answers.
      </Banner>
    );
  if (attempt.correct)
    return (
      <Banner tone="good" icon={CircleCheck} title="Correct!">
        {i.explanation && <span data-no-translate>{i.explanation}</span>}
      </Banner>
    );
  const partial = (attempt.pointsEarned ?? 0) > 0;
  return status.state === "retry" ? (
    <Banner tone="bad" icon={CircleX} title={partial ? "Partly right." : "Not quite."}>
      Review the explanation and try again.
      {i.explanation && (
        <span className="mt-1 block" data-no-translate>
          {i.explanation}
        </span>
      )}
      <span className="mt-1 block text-xs">
        {status.attemptsLeft === Infinity ? "You can try as many times as you need." : status.attemptsLeft === 1 ? "1 attempt left." : `${status.attemptsLeft} attempts left.`}
      </span>
    </Banner>
  ) : (
    <Banner tone="bad" icon={CircleX} title={partial ? "Partly right." : "Not quite."}>
      The correct answer is <strong data-no-translate>{correctText}</strong>.
      {i.explanation && (
        <span className="mt-1 block" data-no-translate>
          {i.explanation}
        </span>
      )}
    </Banner>
  );
}

function Banner({ tone, icon: Icon, title, children }: { tone: "good" | "bad" | "info"; icon: typeof Info; title: string; children?: React.ReactNode }) {
  return (
    <div className={cn("flex items-start gap-2.5 rounded-lg px-3 py-2.5 text-sm", tone === "good" && "bg-emerald-500/12 text-emerald-900 dark:text-emerald-200", tone === "bad" && "bg-red-500/10 text-red-900 dark:text-red-200", tone === "info" && "bg-blue-500/10 text-blue-900 dark:text-blue-200")}>
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
      <div>
        <p className="font-semibold">{title}</p>
        {children && <div className="mt-0.5">{children}</div>}
      </div>
    </div>
  );
}

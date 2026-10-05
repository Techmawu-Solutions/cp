"use client";

import { useState } from "react";
import { AlertTriangle, Clock, Copy, Plus, Sparkles, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { AppSelect } from "@/components/common/app-select";
import { Field } from "@/components/forms/field";
import { INTERACTION_TYPES, changeType, fmtTime, interactionProblems, parseTime } from "@/lib/interactive-video/engine";
import { uid } from "@/lib/helpers";
import type { VideoInteraction } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Edits one interaction in the editor's draft. Problems show as you type; saving refuses until there are none. */
export function InteractionForm({
  value: i,
  number,
  duration,
  currentTime,
  onChange,
  onDuplicate,
  onDelete,
  onClose,
  disabled,
}: {
  value: VideoInteraction;
  number: number;
  duration: number;
  currentTime: number;
  onChange: (next: VideoInteraction) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onClose: () => void;
  disabled?: boolean;
}) {
  const [timeText, setTimeText] = useState(fmtTime(i.timestamp));
  const [shownTime, setShownTime] = useState(i.timestamp);
  // The time can change from outside (a marker dragged on the timeline): show the new value.
  if (shownTime !== i.timestamp) {
    setShownTime(i.timestamp);
    setTimeText(fmtTime(i.timestamp));
  }
  const set = (patch: Partial<VideoInteraction>) => onChange({ ...i, ...patch });
  const problems = interactionProblems(i, duration || null);
  const choice = i.type !== "short_answer";
  const fixed = i.type === "true_false";
  const single = i.type === "mcq" || i.type === "true_false";
  const id = (k: string) => `ivf-${i.id}-${k}`;

  return (
    <fieldset disabled={disabled} className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-base font-semibold">Question {number}</h2>
        {i.source === "ai" && (
          <span className="inline-flex items-center gap-1 rounded bg-violet-500/12 px-1.5 py-0.5 text-xs font-medium text-violet-700 dark:text-violet-300">
            <Sparkles className="size-3" /> Suggested — check it before publishing
          </span>
        )}
        <div className="flex-1" />
        <Button type="button" size="icon-sm" variant="ghost" onClick={onDuplicate} aria-label="Duplicate question" title="Duplicate">
          <Copy />
        </Button>
        <Button type="button" size="icon-sm" variant="ghost" onClick={onDelete} aria-label="Delete question" title="Delete" className="text-destructive hover:text-destructive">
          <Trash2 />
        </Button>
        <Button type="button" size="icon-sm" variant="ghost" onClick={onClose} aria-label="Close" title="Close">
          <X />
        </Button>
      </div>

      {problems.length > 0 && (
        <div role="status" className="flex items-start gap-2 rounded-lg bg-amber-500/12 px-3 py-2 text-sm text-amber-900 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>
            This question {problems.join(", ")}.
          </span>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Type" htmlFor={id("type")}>
          <AppSelect id={id("type")} value={i.type} onChange={(v) => onChange(changeType(i, v as VideoInteraction["type"], () => uid("vio")))} options={INTERACTION_TYPES.map((t) => ({ value: t.value, label: t.label }))} />
        </Field>
        <Field label="Time in the video" htmlFor={id("time")} hint={duration ? `0:00 to ${fmtTime(duration)}` : "m:ss"}>
          <div className="flex gap-1.5">
            <Input
              id={id("time")}
              value={timeText}
              inputMode="numeric"
              onChange={(e) => {
                setTimeText(e.target.value);
                const t = parseTime(e.target.value);
                if (t != null) set({ timestamp: t });
              }}
              onBlur={() => setTimeText(fmtTime(i.timestamp))}
              aria-invalid={parseTime(timeText) == null}
            />
            <Button type="button" variant="outline" onClick={() => set({ timestamp: Math.round(currentTime * 10) / 10 })} title="Use the video's current time">
              <Clock /> Now
            </Button>
          </div>
        </Field>
      </div>

      <Field label="Heading" htmlFor={id("title")} hint="Shown above the question. Leave empty for “Quick check”.">
        <Input id={id("title")} value={i.title ?? ""} onChange={(e) => set({ title: e.target.value || undefined })} placeholder="Quick check" />
      </Field>
      <Field label="Question" htmlFor={id("q")} required>
        <Textarea id={id("q")} value={i.question} onChange={(e) => set({ question: e.target.value })} rows={2} />
      </Field>
      <Field label="Extra instructions" htmlFor={id("d")}>
        <Input id={id("d")} value={i.description ?? ""} onChange={(e) => set({ description: e.target.value || undefined })} placeholder="Optional" />
      </Field>

      {choice && (
        <div className="space-y-2">
          <p className="text-sm font-medium">
            Options
            {i.type !== "poll" && <span className="ml-1 font-normal text-muted-foreground">{single ? "— tick the correct answer" : "— tick every correct answer"}</span>}
          </p>
          {i.options.map((o, k) => (
            <div key={o.id} className="flex items-center gap-2">
              {i.type !== "poll" && (
                <Checkbox
                  checked={o.correct}
                  onCheckedChange={(on) => set({ options: i.options.map((x) => (x.id === o.id ? { ...x, correct: !!on } : single ? { ...x, correct: false } : x)) })}
                  aria-label={`Option ${String.fromCharCode(65 + k)} is correct`}
                />
              )}
              <span className="w-4 text-xs font-medium text-muted-foreground">{String.fromCharCode(65 + k)}</span>
              <Input value={o.text} readOnly={fixed} onChange={(e) => set({ options: i.options.map((x) => (x.id === o.id ? { ...x, text: e.target.value } : x)) })} aria-label={`Option ${String.fromCharCode(65 + k)}`} className={cn(fixed && "bg-muted/40")} />
              {!fixed && (
                <Button type="button" size="icon-sm" variant="ghost" disabled={i.options.length <= 2} onClick={() => set({ options: i.options.filter((x) => x.id !== o.id) })} aria-label={`Remove option ${String.fromCharCode(65 + k)}`}>
                  <X />
                </Button>
              )}
            </div>
          ))}
          {!fixed && i.options.length < 8 && (
            <Button type="button" size="sm" variant="ghost" onClick={() => set({ options: [...i.options, { id: uid("vio"), text: "", correct: false }] })}>
              <Plus /> Add option
            </Button>
          )}
        </div>
      )}

      {i.type === "short_answer" && (
        <Field label="What you're looking for" htmlFor={id("model")} hint="Only you see this, when reviewing answers.">
          <Textarea id={id("model")} value={i.modelAnswer ?? ""} onChange={(e) => set({ modelAnswer: e.target.value || undefined })} rows={2} />
        </Field>
      )}
      {i.type !== "poll" && (
        <Field label="Explanation" htmlFor={id("exp")} hint="Shown with the feedback after answering.">
          <Textarea id={id("exp")} value={i.explanation ?? ""} onChange={(e) => set({ explanation: e.target.value || undefined })} rows={2} />
        </Field>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {i.type !== "poll" && (
          <Field label="Points" htmlFor={id("pts")}>
            <Input id={id("pts")} type="number" min={0} step={0.5} value={i.points} onChange={(e) => set({ points: e.target.value === "" ? 0 : Number(e.target.value) })} />
          </Field>
        )}
        <Field label="Concept or outcome checked" htmlFor={id("concept")} hint="Students who keep missing it are flagged for review.">
          <Input id={id("concept")} value={i.concept ?? ""} onChange={(e) => set({ concept: e.target.value || undefined })} placeholder="e.g. Memory vs storage" />
        </Field>
        <Field label="Where it appears" htmlFor={id("pos")}>
          <AppSelect
            id={id("pos")}
            value={i.displayPosition}
            onChange={(v) => set({ displayPosition: v as VideoInteraction["displayPosition"] })}
            options={[
              { value: "center", label: "Middle of the video" },
              { value: "bottom", label: "Bottom of the video" },
              { value: "side", label: "Right-hand side" },
            ]}
          />
        </Field>
        {i.type !== "poll" && i.type !== "short_answer" && i.allowRetry && (
          <Field label="Attempts allowed" htmlFor={id("max")}>
            <AppSelect id={id("max")} value={i.maxAttempts == null ? "0" : String(i.maxAttempts)} onChange={(v) => set({ maxAttempts: v === "0" ? null : Number(v) })} options={[...[2, 3, 4, 5].map((n) => ({ value: String(n), label: `${n} attempts` })), { value: "0", label: "Unlimited" }]} />
          </Field>
        )}
      </div>

      <div className="divide-y rounded-lg border">
        <Toggle label="Required" hint="Students must answer before they can go past this point." checked={i.required} onChange={(v) => set({ required: v })} />
        {i.type !== "poll" && i.type !== "short_answer" && <Toggle label="Allow another try" hint="After a wrong answer, students can try again." checked={i.allowRetry} onChange={(v) => set({ allowRetry: v, maxAttempts: v ? (i.maxAttempts ?? 3) : i.maxAttempts })} />}
        {i.type !== "poll" && i.type !== "short_answer" && <Toggle label="Show feedback" hint="Right or wrong, the explanation, and the correct answer once no tries are left." checked={i.showFeedback} onChange={(v) => set({ showFeedback: v })} />}
        <Toggle label="Pause the video" hint="Off: the question appears beside the playing video." checked={i.pauseVideo} onChange={(v) => set({ pauseVideo: v })} />
        <Toggle label="Carry on playing after answering" hint="No Continue button: the video resumes by itself." checked={i.resumeAfterSubmit} onChange={(v) => set({ resumeAfterSubmit: v })} />
      </div>
    </fieldset>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 px-3 py-2.5">
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-muted-foreground">{hint}</span>
      </span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

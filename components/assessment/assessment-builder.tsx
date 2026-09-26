"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AppSelect } from "@/components/common/app-select";
import { Field } from "@/components/forms/field";
import { ASSESSMENT_TYPES } from "@/components/assessment/assessments-table";
import { uid } from "@/lib/helpers";
import type { Assessment, Course, Question, QuestionType } from "@/lib/types";
import { cn } from "@/lib/utils";

export const QUESTION_TYPES: { value: QuestionType; label: string; auto: boolean }[] = [
  { value: "mcq", label: "Multiple Choice", auto: true },
  { value: "true_false", label: "True / False", auto: true },
  { value: "short_answer", label: "Short Answer", auto: false },
  { value: "long_answer", label: "Long Answer", auto: false },
  { value: "essay", label: "Essay", auto: false },
  { value: "matching", label: "Matching", auto: true },
  { value: "fill_blank", label: "Fill in the Blank", auto: true },
  { value: "file", label: "File Submission", auto: false },
];

function blank(type: QuestionType): Question {
  const base = { id: uid("q"), type, prompt: "", marks: type === "essay" || type === "file" ? 10 : 2 };
  if (type === "mcq") return { ...base, options: ["", "", "", ""], answer: "0" };
  if (type === "true_false") return { ...base, answer: "true" };
  if (type === "matching") return { ...base, pairs: [{ left: "", right: "" }, { left: "", right: "" }, { left: "", right: "" }] };
  return base;
}

export interface BuilderValues {
  courseId: string;
  title: string;
  description: string;
  type: Assessment["type"];
  totalMarks: number;
  durationMinutes?: number;
  dueDate: string;
  questions: Question[];
}

function toLocal(iso: string) {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Assessment Builder (spec §36) with the question editor (spec §37). */
export function AssessmentBuilder({ courses, initial, sessionLabel, onSave, onCancel, lockedCourse }: { courses: Course[]; initial: BuilderValues; sessionLabel: string; onSave: (v: BuilderValues, publish: boolean) => void; onCancel: () => void; lockedCourse?: boolean }) {
  const [v, setV] = useState<BuilderValues>(initial);
  const [due, setDue] = useState(toLocal(initial.dueDate));
  const [autoTotal, setAutoTotal] = useState(initial.questions.length > 0);
  const [errors, setErrors] = useState<string[]>([]);
  const set = <K extends keyof BuilderValues>(k: K, val: BuilderValues[K]) => setV((s) => ({ ...s, [k]: val }));
  const qTotal = v.questions.reduce((a, q) => a + (Number(q.marks) || 0), 0);
  const total = autoTotal && v.questions.length ? qTotal : v.totalMarks;
  const updateQ = (id: string, patch: Partial<Question>) => set("questions", v.questions.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  const moveQ = (i: number, dir: -1 | 1) => {
    const qs = [...v.questions];
    [qs[i], qs[i + dir]] = [qs[i + dir]!, qs[i]!];
    set("questions", qs);
  };

  const validate = () => {
    const errs: string[] = [];
    if (!v.courseId) errs.push("Choose the subject and class.");
    if (v.title.trim().length < 3) errs.push("Enter a title.");
    if (!total || total <= 0) errs.push("Total marks must be more than zero.");
    if (Number.isNaN(Date.parse(due))) errs.push("Set a due date.");
    v.questions.forEach((q, i) => {
      if (!q.prompt.trim()) errs.push(`Question ${i + 1} has no text.`);
      if (q.type === "mcq" && (q.options ?? []).filter((o) => o.trim()).length < 2) errs.push(`Question ${i + 1} needs at least two options.`);
      if (q.type === "fill_blank" && !q.answer?.trim()) errs.push(`Question ${i + 1} needs the correct answer.`);
      if (q.type === "matching" && (q.pairs ?? []).some((p) => !p.left.trim() || !p.right.trim())) errs.push(`Question ${i + 1} has incomplete pairs.`);
    });
    setErrors(errs);
    return errs.length === 0;
  };

  const submit = (publish: boolean) => {
    if (!validate()) return toast.error("Some details need attention");
    onSave({ ...v, title: v.title.trim(), totalMarks: total, dueDate: new Date(due).toISOString(), questions: v.questions.map((q) => (q.type === "mcq" ? { ...q, options: q.options?.filter((o) => o.trim()) } : q)) }, publish);
  };

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_340px]">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Title" htmlFor="a-title" required className="sm:col-span-2">
              <Input id="a-title" value={v.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Quiz 3 — Networking" />
            </Field>
            <Field label="Description / instructions" htmlFor="a-desc" className="sm:col-span-2">
              <Textarea id="a-desc" rows={3} value={v.description} onChange={(e) => set("description", e.target.value)} />
            </Field>
            <Field label="Subject & class" required>
              <AppSelect value={v.courseId} onChange={(x) => set("courseId", x)} options={courses.map((c) => ({ value: c.id, label: c.title }))} disabled={lockedCourse} placeholder="Select" />
            </Field>
            <Field label="Academic session">
              <Input value={sessionLabel} disabled />
            </Field>
            <div className="space-y-2 sm:col-span-2">
              <p className="text-sm font-medium">Assessment type</p>
              <RadioGroup value={v.type} onValueChange={(x) => set("type", x as Assessment["type"])} className="flex flex-wrap gap-2">
                {ASSESSMENT_TYPES.map((t) => (
                  <label key={t.value} className={cn("flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm", v.type === t.value && "border-primary bg-accent/50")}>
                    <RadioGroupItem value={t.value} /> {t.label}
                  </label>
                ))}
              </RadioGroup>
            </div>
            <Field label="Total marks" htmlFor="a-total" hint={autoTotal && v.questions.length ? "Calculated from question marks" : undefined} required>
              <div className="flex gap-2">
                <Input id="a-total" type="number" min={1} value={total} disabled={autoTotal && v.questions.length > 0} onChange={(e) => set("totalMarks", Number(e.target.value))} />
                {v.questions.length > 0 && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setAutoTotal((a) => !a)}>
                    {autoTotal ? "Override" : "Auto"}
                  </Button>
                )}
              </div>
            </Field>
            <Field label="Duration (minutes)" htmlFor="a-dur" hint="Leave empty for no time limit">
              <Input id="a-dur" type="number" min={1} value={v.durationMinutes ?? ""} onChange={(e) => set("durationMinutes", e.target.value ? Number(e.target.value) : undefined)} />
            </Field>
            <Field label="Due date" htmlFor="a-due" required>
              <Input id="a-due" type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Questions ({v.questions.length})</CardTitle>
            <CardDescription>Objective questions are marked automatically. Written answers and files are graded by you.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {v.questions.length === 0 && <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No questions — students will submit a written answer or file against the instructions above.</p>}
            {v.questions.map((q, i) => (
              <QuestionEditor key={q.id} index={i} q={q} onChange={(p) => updateQ(q.id, p)} onRemove={() => set("questions", v.questions.filter((x) => x.id !== q.id))} onMove={(dir) => moveQ(i, dir)} first={i === 0} last={i === v.questions.length - 1} />
            ))}
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="outline" />}>
                <Plus /> Add question
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-52">
                {QUESTION_TYPES.map((t) => (
                  <DropdownMenuItem key={t.value} onClick={() => (set("questions", [...v.questions, blank(t.value)]), setAutoTotal(true))}>
                    {t.label}
                    {t.auto && <span className="ml-auto text-[10px] text-muted-foreground">auto</span>}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4 xl:sticky xl:top-20 xl:self-start">
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="flex justify-between">
              <span className="text-muted-foreground">Type</span> {ASSESSMENT_TYPES.find((t) => t.value === v.type)?.label}
            </p>
            <p className="flex justify-between">
              <span className="text-muted-foreground">Questions</span> {v.questions.length}
            </p>
            <p className="flex justify-between">
              <span className="text-muted-foreground">Auto-marked</span> {v.questions.filter((q) => QUESTION_TYPES.find((t) => t.value === q.type)?.auto).length}
            </p>
            <p className="flex justify-between">
              <span className="text-muted-foreground">Total marks</span> <span className="font-semibold">{total || "—"}</span>
            </p>
            {errors.length > 0 && (
              <ul className="mt-3 list-disc space-y-0.5 rounded-lg bg-destructive/10 p-3 pl-6 text-xs text-destructive">
                {errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            )}
            <div className="grid gap-2 pt-3">
              <Button onClick={() => submit(true)}>Publish to students</Button>
              <Button variant="outline" onClick={() => submit(false)}>
                Save as draft
              </Button>
              <Button variant="ghost" onClick={onCancel}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/** QuestionEditor (spec §57). */
function QuestionEditor({ q, index, onChange, onRemove, onMove, first, last }: { q: Question; index: number; onChange: (p: Partial<Question>) => void; onRemove: () => void; onMove: (d: -1 | 1) => void; first: boolean; last: boolean }) {
  const label = QUESTION_TYPES.find((t) => t.value === q.type)?.label;
  return (
    <div className="rounded-xl border p-3 sm:p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex size-6 items-center justify-center rounded-full bg-muted text-xs font-semibold">{index + 1}</span>
        <span className="text-sm font-medium">{label}</span>
        <div className="ml-auto flex items-center gap-1">
          <Input type="number" min={0} value={q.marks} onChange={(e) => onChange({ marks: Number(e.target.value) })} className="h-7 w-16" aria-label="Marks" />
          <span className="text-xs text-muted-foreground">marks</span>
          <Button size="icon-xs" variant="ghost" disabled={first} onClick={() => onMove(-1)} aria-label="Move up">
            <ArrowUp />
          </Button>
          <Button size="icon-xs" variant="ghost" disabled={last} onClick={() => onMove(1)} aria-label="Move down">
            <ArrowDown />
          </Button>
          <Button size="icon-xs" variant="ghost" className="text-destructive" onClick={onRemove} aria-label="Remove question">
            <Trash2 />
          </Button>
        </div>
      </div>
      <Textarea rows={2} value={q.prompt} onChange={(e) => onChange({ prompt: e.target.value })} placeholder={q.type === "fill_blank" ? "Use ______ to mark the blank" : "Question text"} />

      {q.type === "mcq" && (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-muted-foreground">Select the correct option</p>
          <RadioGroup value={q.answer ?? "0"} onValueChange={(a) => onChange({ answer: String(a) })} className="gap-2">
            {(q.options ?? []).map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <RadioGroupItem value={String(i)} aria-label={`Option ${i + 1} is correct`} />
                <Input value={opt} onChange={(e) => onChange({ options: q.options!.map((o, j) => (j === i ? e.target.value : o)) })} placeholder={`Option ${String.fromCharCode(65 + i)}`} className="h-8" />
                <Button size="icon-xs" variant="ghost" disabled={(q.options?.length ?? 0) <= 2} onClick={() => onChange({ options: q.options!.filter((_, j) => j !== i), answer: String(Math.min(Number(q.answer ?? 0), q.options!.length - 2)) })} aria-label="Remove option">
                  <X />
                </Button>
              </div>
            ))}
          </RadioGroup>
          {(q.options?.length ?? 0) < 6 && (
            <Button size="xs" variant="ghost" onClick={() => onChange({ options: [...(q.options ?? []), ""] })}>
              <Plus /> Add option
            </Button>
          )}
        </div>
      )}
      {q.type === "true_false" && (
        <RadioGroup value={q.answer ?? "true"} onValueChange={(a) => onChange({ answer: String(a) })} className="mt-3 flex gap-4">
          <label className="flex items-center gap-2 text-sm">
            <RadioGroupItem value="true" /> True
          </label>
          <label className="flex items-center gap-2 text-sm">
            <RadioGroupItem value="false" /> False
          </label>
        </RadioGroup>
      )}
      {q.type === "fill_blank" && <Input className="mt-3 h-8" value={q.answer ?? ""} onChange={(e) => onChange({ answer: e.target.value })} placeholder="Correct answer (not case-sensitive)" />}
      {q.type === "short_answer" && <Input className="mt-3 h-8" value={q.answer ?? ""} onChange={(e) => onChange({ answer: e.target.value })} placeholder="Model answer for the marker (optional)" />}
      {q.type === "matching" && (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-muted-foreground">Pairs — students match each left item to the right one</p>
          {(q.pairs ?? []).map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input className="h-8" value={p.left} onChange={(e) => onChange({ pairs: q.pairs!.map((x, j) => (j === i ? { ...x, left: e.target.value } : x)) })} placeholder="Term" />
              <span className="text-muted-foreground">→</span>
              <Input className="h-8" value={p.right} onChange={(e) => onChange({ pairs: q.pairs!.map((x, j) => (j === i ? { ...x, right: e.target.value } : x)) })} placeholder="Match" />
              <Button size="icon-xs" variant="ghost" disabled={(q.pairs?.length ?? 0) <= 2} onClick={() => onChange({ pairs: q.pairs!.filter((_, j) => j !== i) })} aria-label="Remove pair">
                <X />
              </Button>
            </div>
          ))}
          <Button size="xs" variant="ghost" onClick={() => onChange({ pairs: [...(q.pairs ?? []), { left: "", right: "" }] })}>
            <Plus /> Add pair
          </Button>
        </div>
      )}
      {(q.type === "long_answer" || q.type === "essay") && <p className="mt-2 text-xs text-muted-foreground">Students write a {q.type === "essay" ? "full essay" : "long answer"}; you mark it manually.</p>}
      {q.type === "file" && <p className="mt-2 text-xs text-muted-foreground">Students upload a file (PDF, Word, image).</p>}
    </div>
  );
}

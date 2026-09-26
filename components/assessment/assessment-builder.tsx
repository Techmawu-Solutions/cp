"use client";

import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, FileUp, ImagePlus, Loader2, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { AppSelect } from "@/components/common/app-select";
import { Field } from "@/components/forms/field";
import { QuestionImportDialog } from "@/components/assessment/question-import-dialog";
import { ASSESSMENT_TYPES } from "@/components/assessment/assessments-table";
import { uid } from "@/lib/helpers";
import type { Assessment, Course, Question } from "@/lib/types";
import { QUESTION_TYPES, blankQuestion, correctText, countBlanks, isAutoMarked, questionLabel, questionProblems } from "@/lib/questions";
import { MathText, hasMath } from "@/components/common/math-text";
import { MathToolbar } from "@/components/assessment/math-toolbar";
import { ZoomableImage } from "@/components/common/zoomable-image";
import { IMAGE_ACCEPT, imageToDataUrl, isImageFile } from "@/lib/images";
import { cn } from "@/lib/utils";

export interface BuilderValues {
  courseId: string;
  title: string;
  description: string;
  type: Assessment["type"];
  totalMarks: number;
  durationMinutes?: number;
  dueDate: string;
  questions: Question[];
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
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
  const [importOpen, setImportOpen] = useState(false);
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
    v.questions.forEach((q, i) => questionProblems(q).forEach((p) => errs.push(`Question ${i + 1} ${p}.`)));
    setErrors(errs);
    return errs.length === 0;
  };

  const submit = (publish: boolean) => {
    if (!validate()) return toast.error("Some details need attention");
    onSave({ ...v, title: v.title.trim(), totalMarks: total, dueDate: new Date(due).toISOString(), questions: v.questions.map(tidy) }, publish);
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
            <div className="space-y-3 rounded-lg border p-3 sm:col-span-2">
              <label className="flex items-center justify-between gap-4">
                <span>
                  <span className="block text-sm font-medium">Shuffle questions</span>
                  <span className="text-xs text-muted-foreground">Each student gets the questions in a different order, which makes copying harder.</span>
                </span>
                <Switch checked={!!v.shuffleQuestions} onCheckedChange={(on) => set("shuffleQuestions", on)} />
              </label>
              <label className="flex items-center justify-between gap-4">
                <span>
                  <span className="block text-sm font-medium">Shuffle answer options</span>
                  <span className="text-xs text-muted-foreground">Multiple choice and multiple select options appear in a different order for each student. Matching, ordering and drag-word items are always shuffled.</span>
                </span>
                <Switch checked={!!v.shuffleOptions} onCheckedChange={(on) => set("shuffleOptions", on)} />
              </label>
            </div>
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
            <div className="flex flex-wrap gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button variant="outline" />}>
                  <Plus /> Add question
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64">
                  {(["Choice", "Drag & drop", "Typed", "Written"] as const).map((g, gi) => (
                    <DropdownMenuGroup key={g}>
                      {gi > 0 && <DropdownMenuSeparator />}
                      <DropdownMenuLabel>{g}</DropdownMenuLabel>
                      {QUESTION_TYPES.filter((t) => t.group === g).map((t) => (
                        <DropdownMenuItem key={t.value} onClick={() => (set("questions", [...v.questions, blankQuestion(t.value, uid("q"))]), setAutoTotal(true))}>
                          <span className="flex-1">
                            <span className="block">{t.label}</span>
                            <span className="block text-[11px] text-muted-foreground">{t.hint}</span>
                          </span>
                          {t.auto && <span className="text-[10px] text-muted-foreground">auto</span>}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuGroup>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="outline" onClick={() => setImportOpen(true)}>
                <FileUp /> Import questions
              </Button>
            </div>
            <QuestionImportDialog open={importOpen} onOpenChange={setImportOpen} onImport={(qs) => (set("questions", [...v.questions, ...qs]), setAutoTotal(true))} />
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
              <span className="text-muted-foreground">Auto-marked</span> {v.questions.filter((q) => isAutoMarked(q.type)).length}
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
  const label = questionLabel(q.type);
  // The maths toolbar inserts into whichever text field of this question was focused last.
  const prompt = useRef<HTMLTextAreaElement>(null);
  const lastField = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const texts = [q.prompt, q.answer, ...(q.options ?? []), ...(q.answers ?? []), ...(q.distractors ?? []), ...(q.pairs ?? []).flatMap((p) => [p.left, p.right])];
  const showPreview = texts.some((t) => hasMath(t)) || !!q.image || (q.optionImages ?? []).some(Boolean);
  return (
    <div
      className="rounded-xl border p-3 sm:p-4"
      onFocusCapture={(e) => {
        const t = e.target;
        if ((t instanceof HTMLTextAreaElement || (t instanceof HTMLInputElement && t.type === "text")) && t.getAttribute("aria-label") !== "Marks") lastField.current = t;
      }}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="flex size-6 items-center justify-center rounded-full bg-muted text-xs font-semibold">{index + 1}</span>
        <span className="text-sm font-medium">{label}</span>
        {q.type !== "file" && <MathToolbar target={() => lastField.current ?? prompt.current} />}
        {!q.image && <PicturePicker label="Add a picture to the question" text="Picture" onPick={(image) => onChange({ image })} />}
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
      <Textarea ref={prompt} rows={2} value={q.prompt} onChange={(e) => onChange({ prompt: e.target.value })} placeholder={q.type === "fill_blank" || q.type === "drag_words" ? "Use ______ (three or more underscores) to mark each blank" : "Question text"} />
      {q.image && (
        <div className="mt-2 flex flex-wrap items-start gap-3 rounded-lg border bg-muted/30 p-2">
          <ZoomableImage src={q.image} alt={q.imageAlt} className="max-w-[16rem]" />
          <div className="min-w-48 flex-1 space-y-2">
            <Input className="h-8" value={q.imageAlt ?? ""} onChange={(e) => onChange({ imageAlt: e.target.value })} placeholder="Describe the picture (read aloud to blind students)" aria-label="Picture description" />
            <div className="flex flex-wrap gap-1">
              <PicturePicker label="Replace picture" text="Replace" onPick={(image) => onChange({ image })} />
              <Button type="button" variant="ghost" size="xs" className="text-destructive" onClick={() => onChange({ image: undefined, imageAlt: undefined })}>
                <Trash2 /> Remove picture
              </Button>
            </div>
          </div>
        </div>
      )}

      {q.type === "mcq" && (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-muted-foreground">Select the correct option</p>
          <RadioGroup value={q.answer ?? "0"} onValueChange={(a) => onChange({ answer: String(a) })} className="gap-2">
            {(q.options ?? []).map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <RadioGroupItem value={String(i)} aria-label={`Option ${i + 1} is correct`} />
                <Input value={opt} onChange={(e) => onChange({ options: q.options!.map((o, j) => (j === i ? e.target.value : o)) })} placeholder={`Option ${String.fromCharCode(65 + i)}${q.optionImages?.[i] ? " (optional with a picture)" : ""}`} className="h-8" />
                <OptionPicture q={q} i={i} onChange={onChange} />
                <Button
                  size="icon-xs"
                  variant="ghost"
                  disabled={(q.options?.length ?? 0) <= 2}
                  onClick={() => {
                    const a = Number(q.answer ?? 0);
                    onChange({ options: q.options!.filter((_, j) => j !== i), optionImages: q.optionImages?.filter((_, j) => j !== i), answer: String(i < a ? a - 1 : i === a ? 0 : a) });
                  }}
                  aria-label="Remove option"
                >
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
      {q.type === "fill_blank" && <Input className="mt-3 h-8" value={q.answer ?? ""} onChange={(e) => onChange({ answer: e.target.value })} placeholder="Correct answer — separate alternatives with | (not case-sensitive)" />}
      {q.type === "multi_select" && <MultiSelectEditor q={q} onChange={onChange} />}
      {q.type === "numeric" && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Field label="Correct answer" htmlFor={`${q.id}-num`}>
            <Input id={`${q.id}-num`} className="h-8" inputMode="decimal" value={q.answer ?? ""} onChange={(e) => onChange({ answer: e.target.value.trim() })} placeholder="e.g. 3.14" />
          </Field>
          <Field label="Accept ±" htmlFor={`${q.id}-tol`} hint="0 = exact">
            <Input id={`${q.id}-tol`} className="h-8" type="number" min={0} step="any" value={q.tolerance ?? 0} onChange={(e) => onChange({ tolerance: Math.max(0, Number(e.target.value) || 0) })} />
          </Field>
        </div>
      )}
      {q.type === "ordering" && <OrderingEditor q={q} onChange={onChange} />}
      {q.type === "drag_words" && <DragWordsEditor q={q} onChange={onChange} />}
      {q.type === "short_answer" && <Input className="mt-3 h-8" value={q.answer ?? ""} onChange={(e) => onChange({ answer: e.target.value })} placeholder="Model answer for the marker (optional)" />}
      {q.type === "matching" && (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-muted-foreground">Pairs — students drag each match onto its term (shown shuffled)</p>
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
      {showPreview && <MathPreview q={q} />}
    </div>
  );
}

/** How the question's maths will look to students. */
function MathPreview({ q }: { q: Question }) {
  const list = q.type === "mcq" || q.type === "multi_select" || q.type === "ordering" ? (q.options ?? []).map((o, i) => ({ o, i })).filter(({ o, i }) => o.trim() || q.optionImages?.[i]) : [];
  return (
    <div className="mt-3 rounded-lg border border-dashed bg-muted/30 p-3 text-sm">
      <p className="mb-1.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Student preview</p>
      <MathText text={q.type === "drag_words" ? q.prompt.replace(/_{3,}/g, "____") : q.prompt || ""} />
      {q.image && <ZoomableImage src={q.image} alt={q.imageAlt} className="mt-2 block max-w-xs" />}
      {list.length > 0 && (
        <ul className="mt-2 space-y-1">
          {list.map(({ o, i }, n) => (
            <li key={i} className="flex items-center gap-2 rounded-md border bg-card px-2 py-1">
              <span className="text-muted-foreground">{q.type === "ordering" ? `${n + 1}.` : `${String.fromCharCode(65 + n)}.`}</span>
              {q.optionImages?.[i] && <ZoomableImage src={q.optionImages[i]!} className="max-w-24 [&_img]:max-h-16" />}
              <MathText text={o} />
            </li>
          ))}
        </ul>
      )}
      {q.type === "matching" && (
        <ul className="mt-2 space-y-1">
          {(q.pairs ?? []).map((p, i) => (
            <li key={i}>
              <MathText text={p.left} /> <span className="text-muted-foreground">→</span> <MathText text={p.right} />
            </li>
          ))}
        </ul>
      )}
      {(q.type === "drag_words" || q.type === "fill_blank" || q.type === "numeric") && correctText(q) && (
        <p className="mt-2 text-muted-foreground">
          Answer: <MathText className="text-foreground" text={correctText(q)!} />
        </p>
      )}
    </div>
  );
}

/** Drops empty options before saving and keeps answers pointing at the right options. */
function tidy(q: Question): Question {
  if (q.type === "mcq" || q.type === "multi_select") {
    // Keep options that have text or a picture, with their pictures and answers re-indexed.
    const keep = (q.options ?? []).map((o, i) => ({ o, i, img: q.optionImages?.[i] ?? null })).filter(({ o, img }) => o.trim() || img);
    const optionImages = keep.some((k) => k.img) ? keep.map((k) => k.img) : undefined;
    const base = { ...q, options: keep.map((k) => k.o.trim()), optionImages };
    return q.type === "mcq" ? { ...base, answer: String(Math.max(0, keep.findIndex((k) => String(k.i) === q.answer))) } : { ...base, answers: keep.flatMap((k, n) => ((q.answers ?? []).includes(String(k.i)) ? [String(n)] : [])) };
  }
  if (q.type === "drag_words") return { ...q, answers: (q.answers ?? []).slice(0, countBlanks(q.prompt)).map((w) => w.trim()), distractors: (q.distractors ?? []).map((w) => w.trim()).filter(Boolean) };
  return q;
}

function MultiSelectEditor({ q, onChange }: { q: Question; onChange: (p: Partial<Question>) => void }) {
  const correct = new Set(q.answers ?? []);
  const toggle = (i: number) => onChange({ answers: correct.has(String(i)) ? [...correct].filter((x) => x !== String(i)) : [...correct, String(i)] });
  const remove = (i: number) =>
    onChange({
      options: q.options!.filter((_, j) => j !== i),
      optionImages: q.optionImages?.filter((_, j) => j !== i),
      answers: [...correct].filter((x) => x !== String(i)).map((x) => String(Number(x) > i ? Number(x) - 1 : Number(x))),
    });
  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs text-muted-foreground">Tick every correct option. Students get partial credit, minus marks for wrong ticks.</p>
      {(q.options ?? []).map((opt, i) => (
        <div key={i} className="flex items-center gap-2">
          <Checkbox checked={correct.has(String(i))} onCheckedChange={() => toggle(i)} aria-label={`Option ${i + 1} is correct`} />
          <Input value={opt} onChange={(e) => onChange({ options: q.options!.map((o, j) => (j === i ? e.target.value : o)) })} placeholder={`Option ${String.fromCharCode(65 + i)}${q.optionImages?.[i] ? " (optional with a picture)" : ""}`} className="h-8" />
          <OptionPicture q={q} i={i} onChange={onChange} />
          <Button size="icon-xs" variant="ghost" disabled={(q.options?.length ?? 0) <= 2} onClick={() => remove(i)} aria-label="Remove option">
            <X />
          </Button>
        </div>
      ))}
      {(q.options?.length ?? 0) < 8 && (
        <Button size="xs" variant="ghost" onClick={() => onChange({ options: [...(q.options ?? []), ""] })}>
          <Plus /> Add option
        </Button>
      )}
    </div>
  );
}

function OrderingEditor({ q, onChange }: { q: Question; onChange: (p: Partial<Question>) => void }) {
  const items = q.options ?? [];
  const move = (i: number, dir: -1 | 1) => {
    const next = [...items];
    [next[i], next[i + dir]] = [next[i + dir]!, next[i]!];
    onChange({ options: next });
  };
  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs text-muted-foreground">Enter the items in the correct order — students see them shuffled and drag them into place.</p>
      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">{i + 1}</span>
          <Input className="h-8" value={it} onChange={(e) => onChange({ options: items.map((o, j) => (j === i ? e.target.value : o)) })} placeholder={`Step ${i + 1}`} />
          <Button size="icon-xs" variant="ghost" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">
            <ArrowUp />
          </Button>
          <Button size="icon-xs" variant="ghost" disabled={i === items.length - 1} onClick={() => move(i, 1)} aria-label="Move down">
            <ArrowDown />
          </Button>
          <Button size="icon-xs" variant="ghost" disabled={items.length <= 2} onClick={() => onChange({ options: items.filter((_, j) => j !== i) })} aria-label="Remove item">
            <X />
          </Button>
        </div>
      ))}
      {items.length < 10 && (
        <Button size="xs" variant="ghost" onClick={() => onChange({ options: [...items, ""] })}>
          <Plus /> Add item
        </Button>
      )}
    </div>
  );
}

function DragWordsEditor({ q, onChange }: { q: Question; onChange: (p: Partial<Question>) => void }) {
  const n = countBlanks(q.prompt);
  const words = q.answers ?? [];
  return (
    <div className="mt-3 space-y-2">
      {n === 0 ? (
        <p className="rounded-lg bg-muted p-2 text-xs text-muted-foreground">Type the sentence above and mark each gap with ______. Example: “Water boils at ______ degrees and freezes at ______ degrees.”</p>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {Array.from({ length: n }, (_, i) => (
            <Input key={i} className="h-8" value={words[i] ?? ""} onChange={(e) => onChange({ answers: Array.from({ length: n }, (_, j) => (j === i ? e.target.value : (words[j] ?? ""))) })} placeholder={`Word for blank ${i + 1}`} aria-label={`Word for blank ${i + 1}`} />
          ))}
        </div>
      )}
      <Field label="Extra wrong words (optional)" htmlFor={`${q.id}-distractors`} hint="Comma-separated; mixed into the word bank">
        <Input id={`${q.id}-distractors`} className="h-8" defaultValue={(q.distractors ?? []).join(", ")} onChange={(e) => onChange({ distractors: e.target.value.split(",").map((w) => w.trim()).filter(Boolean) })} placeholder="e.g. 50, 0" />
      </Field>
    </div>
  );
}

/** Button that uploads a picture, shrunk to `maxDim` pixels, and hands back its data URL. */
function PicturePicker({ label, text, onPick, maxDim = 1200 }: { label: string; text?: string; onPick: (dataUrl: string) => void; maxDim?: number }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <input
        ref={input}
        type="file"
        accept={IMAGE_ACCEPT}
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          if (!isImageFile(f)) return toast.error("Use a PNG, JPG, WebP, GIF or SVG image");
          if (f.size > 8 * 1024 * 1024) return toast.error("Pictures must be 8 MB or smaller");
          setBusy(true);
          try {
            onPick(await imageToDataUrl(f, maxDim));
          } catch {
            toast.error("Couldn't read that picture");
          } finally {
            setBusy(false);
          }
        }}
      />
      <Button type="button" variant="ghost" size={text ? "xs" : "icon-xs"} onClick={() => input.current?.click()} disabled={busy} aria-label={label} title={label}>
        {busy ? <Loader2 className="animate-spin" /> : <ImagePlus />}
        {text}
      </Button>
    </>
  );
}

/** Picture for one answer option: add button, or thumbnail with remove. */
function OptionPicture({ q, i, onChange }: { q: Question; i: number; onChange: (p: Partial<Question>) => void }) {
  const src = q.optionImages?.[i];
  const set = (img: string | null) => onChange({ optionImages: (q.options ?? []).map((_, j) => (j === i ? img : (q.optionImages?.[j] ?? null))) });
  if (!src) return <PicturePicker label={`Add a picture to option ${String.fromCharCode(65 + i)}`} onPick={set} maxDim={700} />;
  return (
    <span className="relative shrink-0">
      <ZoomableImage src={src} className="max-w-16 [&_img]:max-h-10 [&>span]:hidden" />
      <button type="button" onClick={() => set(null)} className="absolute -top-1.5 -right-1.5 rounded-full border bg-background p-0.5 text-muted-foreground shadow-sm hover:text-destructive" aria-label={`Remove picture from option ${String.fromCharCode(65 + i)}`}>
        <X className="size-3" />
      </button>
    </span>
  );
}

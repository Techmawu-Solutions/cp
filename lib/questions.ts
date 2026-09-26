import type { Question, QuestionType } from "@/lib/types";

/**
 * Question types (spec §37): how each is answered, marked and shown.
 *
 * Student answers are stored as strings, one per question:
 * - mcq: option index · true_false: "true" | "false" · fill_blank, short/long/essay: text · numeric: a number
 * - multi_select, ordering: JSON array of option indices (ordering in the student's order)
 * - matching: JSON { left: right } · drag_words: JSON array with the word placed in each blank
 */
export const QUESTION_TYPES: { value: QuestionType; label: string; auto: boolean; group: "Choice" | "Drag & drop" | "Typed" | "Written"; hint: string }[] = [
  { value: "mcq", label: "Multiple Choice", auto: true, group: "Choice", hint: "One correct option" },
  { value: "multi_select", label: "Multiple Select", auto: true, group: "Choice", hint: "Several correct options" },
  { value: "true_false", label: "True / False", auto: true, group: "Choice", hint: "True or false" },
  { value: "matching", label: "Matching", auto: true, group: "Drag & drop", hint: "Drag each match to its term" },
  { value: "ordering", label: "Ordering", auto: true, group: "Drag & drop", hint: "Drag items into the right order" },
  { value: "drag_words", label: "Drag Words into Blanks", auto: true, group: "Drag & drop", hint: "Drag words into gaps in a sentence" },
  { value: "fill_blank", label: "Fill in the Blank", auto: true, group: "Typed", hint: "Type the missing word" },
  { value: "numeric", label: "Numeric Answer", auto: true, group: "Typed", hint: "A number, with optional tolerance" },
  { value: "short_answer", label: "Short Answer", auto: false, group: "Written", hint: "A few words, marked by you" },
  { value: "long_answer", label: "Long Answer", auto: false, group: "Written", hint: "A paragraph, marked by you" },
  { value: "essay", label: "Essay", auto: false, group: "Written", hint: "A full essay, marked by you" },
  { value: "file", label: "File Submission", auto: false, group: "Written", hint: "Upload a document, marked by you" },
];

export const questionLabel = (type: QuestionType) => QUESTION_TYPES.find((t) => t.value === type)?.label ?? type;
export const isAutoMarked = (type: QuestionType) => !!QUESTION_TYPES.find((t) => t.value === type)?.auto;

/** Blanks are written as three or more underscores. */
const BLANK = /_{3,}/g;
export const splitBlanks = (prompt: string) => prompt.split(BLANK);
export const countBlanks = (prompt: string) => (prompt.match(BLANK) ?? []).length;

function parseJson<T>(raw: string | undefined): T | null {
  try {
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/** A JSON array answer, or [] when missing or malformed. */
export function parseList<T>(raw: string | undefined): T[] {
  const v = parseJson<unknown>(raw);
  return Array.isArray(v) ? (v as T[]) : [];
}

/** A JSON object answer, or {} when missing or malformed. */
export function parseMap(raw: string | undefined): Record<string, string> {
  const v = parseJson<unknown>(raw);
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, string>) : {};
}

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

/** Deterministic shuffle so a student sees the same order on every render. */
export function shuffled<T>(items: T[], seed: string): T[] {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
    const j = h % (i + 1);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  // Never show an ordering question already solved.
  if (out.length > 1 && out.every((x, i) => x === items[i])) out.push(out.shift()!);
  return out;
}

/** Word bank for drag_words: the correct words plus distractors, shuffled. */
export const wordBank = (q: Question) => shuffled([...(q.answers ?? []), ...(q.distractors ?? [])], q.id);

/** Marks earned for one answer, or null when a teacher has to mark it. */
export function markQuestion(q: Question, raw: string | undefined): number | null {
  if (!isAutoMarked(q.type)) return null;
  const given = raw ?? "";
  const frac = (() => {
    switch (q.type) {
      case "mcq":
      case "true_false":
        return q.answer != null && norm(given) === norm(q.answer) ? 1 : 0;
      case "fill_blank":
        return (q.answer ?? "").split("|").some((a) => a.trim() && norm(a) === norm(given)) ? 1 : 0;
      case "numeric": {
        const n = Number(given.replace(/,/g, ""));
        return given.trim() !== "" && !Number.isNaN(n) && Math.abs(n - Number(q.answer)) <= (q.tolerance ?? 0) + 1e-9 ? 1 : 0;
      }
      case "multi_select": {
        const correct = new Set(q.answers ?? []);
        const chosen = parseList<number>(given).map(String);
        if (correct.size === 0) return 0;
        const right = chosen.filter((c) => correct.has(c)).length;
        const wrong = chosen.length - right;
        return Math.max(0, (right - wrong) / correct.size);
      }
      case "ordering": {
        const order = parseList<number>(given);
        const n = q.options?.length ?? 0;
        return n ? order.filter((idx, pos) => idx === pos).length / n : 0;
      }
      case "matching": {
        const pairs = q.pairs ?? [];
        const m = parseMap(given);
        return pairs.length ? pairs.filter((p) => m[p.left] === p.right).length / pairs.length : 0;
      }
      case "drag_words": {
        const want = q.answers ?? [];
        const placed = parseList<string | null>(given);
        return want.length ? want.filter((w, i) => placed[i] != null && norm(placed[i]!) === norm(w)).length / want.length : 0;
      }
      default:
        return 0;
    }
  })();
  return Math.round(q.marks * frac * 10) / 10;
}

/** True/false when auto-marked (partial credit counts as not fully right), null otherwise. */
export function isFullyCorrect(q: Question, raw: string | undefined): boolean | null {
  const m = markQuestion(q, raw);
  return m == null ? null : m >= q.marks;
}

/** Whether the student gave any answer. */
export function isAnswered(q: Question, raw: string | undefined): boolean {
  if (!raw || !raw.trim()) return false;
  if (q.type === "multi_select") return parseList<number>(raw).length > 0;
  if (q.type === "matching") return Object.values(parseMap(raw)).some(Boolean);
  if (q.type === "drag_words") return parseList<string | null>(raw).some((w) => w != null);
  return true;
}

/** The student's answer as readable text. */
export function answerText(q: Question, raw: string | undefined): string {
  if (!raw) return "";
  switch (q.type) {
    case "mcq":
      return q.options?.[Number(raw)] ?? "";
    case "true_false":
      return raw === "true" ? "True" : raw === "false" ? "False" : raw;
    case "multi_select":
      return parseList<number>(raw).map((i) => q.options?.[i]).filter(Boolean).join(", ");
    case "ordering":
      return parseList<number>(raw).map((i, n) => `${n + 1}. ${q.options?.[i] ?? ""}`).join("  ");
    case "matching":
      return Object.entries(parseMap(raw))
        .filter(([, r]) => r)
        .map(([l, r]) => `${l} → ${r}`)
        .join(" · ");
    case "drag_words":
      return fillBlanks(q.prompt, parseList<string | null>(raw));
    default:
      return raw;
  }
}

/** The correct answer as readable text, for auto-marked types. */
export function correctText(q: Question): string | null {
  switch (q.type) {
    case "mcq":
      return q.options?.[Number(q.answer)] ?? null;
    case "true_false":
      return q.answer === "true" ? "True" : "False";
    case "fill_blank":
      return (q.answer ?? "").split("|").map((a) => a.trim()).filter(Boolean).join(" or ");
    case "numeric":
      return q.tolerance ? `${q.answer} (± ${q.tolerance})` : (q.answer ?? null);
    case "multi_select":
      return (q.answers ?? []).map((i) => q.options?.[Number(i)]).filter(Boolean).join(", ");
    case "ordering":
      return (q.options ?? []).map((o, n) => `${n + 1}. ${o}`).join("  ");
    case "matching":
      return (q.pairs ?? []).map((p) => `${p.left} → ${p.right}`).join(" · ");
    case "drag_words":
      return fillBlanks(q.prompt, q.answers ?? []);
    default:
      return null;
  }
}

function fillBlanks(prompt: string, words: (string | null)[]) {
  return splitBlanks(prompt).reduce((out, part, i) => out + (i > 0 ? `[${words[i - 1] ?? "—"}]` : "") + part, "");
}

/** Problems that stop a question being saved; empty when it's complete. */
export function questionProblems(q: Question): string[] {
  const errs: string[] = [];
  if (!q.prompt.trim()) errs.push("has no text");
  const filled = (q.options ?? []).filter((o) => o.trim());
  if (q.type === "mcq" && filled.length < 2) errs.push("needs at least two options");
  if (q.type === "multi_select") {
    if (filled.length < 2) errs.push("needs at least two options");
    if (!(q.answers ?? []).some((i) => q.options?.[Number(i)]?.trim())) errs.push("needs at least one correct option");
  }
  if (q.type === "fill_blank" && !q.answer?.trim()) errs.push("needs the correct answer");
  if (q.type === "numeric" && (q.answer == null || q.answer.trim() === "" || Number.isNaN(Number(q.answer)))) errs.push("needs a numeric answer");
  if (q.type === "matching" && ((q.pairs ?? []).length < 2 || (q.pairs ?? []).some((p) => !p.left.trim() || !p.right.trim()))) errs.push("needs at least two complete pairs");
  if (q.type === "ordering" && (filled.length < 2 || filled.length !== (q.options ?? []).length)) errs.push("needs at least two items, none empty");
  if (q.type === "drag_words") {
    const n = countBlanks(q.prompt);
    if (n === 0) errs.push("needs at least one blank (______) in the text");
    else if ((q.answers ?? []).length < n || (q.answers ?? []).slice(0, n).some((w) => !w.trim())) errs.push("needs a word for every blank");
  }
  return errs;
}

/** A new, empty question of the given type. */
export function blankQuestion(type: QuestionType, id: string): Question {
  const base: Question = { id, type, prompt: "", marks: type === "essay" || type === "file" ? 10 : 2 };
  switch (type) {
    case "mcq":
      return { ...base, options: ["", "", "", ""], answer: "0" };
    case "multi_select":
      return { ...base, options: ["", "", "", ""], answers: [] };
    case "true_false":
      return { ...base, answer: "true" };
    case "numeric":
      return { ...base, answer: "", tolerance: 0 };
    case "matching":
      return { ...base, pairs: [{ left: "", right: "" }, { left: "", right: "" }, { left: "", right: "" }] };
    case "ordering":
      return { ...base, options: ["", "", ""] };
    case "drag_words":
      return { ...base, answers: [], distractors: [] };
    default:
      return base;
  }
}

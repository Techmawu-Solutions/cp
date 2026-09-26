import { QUESTION_TYPES, countBlanks, questionProblems } from "@/lib/questions";
import type { Question, QuestionType } from "@/lib/types";

/**
 * Question import (CSV or Excel), one question per row. Columns:
 * - type: mcq, multi_select, true_false, fill_blank, numeric, matching, ordering, drag_words,
 *   short_answer, long_answer, essay or file (the builder's labels work too)
 * - question: the text; fill_blank and drag_words mark gaps with ______
 * - marks: defaults to 2 (10 for essay and file)
 * - options, separated by |: the choices (mcq, multi_select), the items in their correct order
 *   (ordering), "term=match" pairs (matching) or extra wrong words (drag_words)
 * - answer: an option letter, number or text (mcq); letters like "A,C" (multi_select);
 *   true/false; text with | between accepted alternatives (fill_blank); a number (numeric);
 *   the word for each blank, separated by | (drag_words); a model answer (short_answer)
 * - tolerance: the accepted ± difference (numeric)
 */
export const QUESTION_IMPORT_COLUMNS = ["type", "question", "marks", "options", "answer", "tolerance"];

export const QUESTION_TEMPLATE_ROWS: string[][] = [
  ["mcq", "Which of the following is system software?", "2", "Microsoft Word|Windows 11|Google Chrome|Excel", "B", ""],
  ["multi_select", "Which of these are input devices?", "2", "Keyboard|Monitor|Scanner|Printer", "A,C", ""],
  ["true_false", "Antivirus software is a utility program.", "1", "", "true", ""],
  ["fill_blank", "The brain of the computer is the ______.", "2", "", "CPU|processor", ""],
  ["numeric", "How many bits are in 4 bytes?", "1", "", "32", "0"],
  ["matching", "Match each component to what it does.", "3", "CPU=Carries out instructions|RAM=Holds data in use|Hard disk=Stores files permanently", "", ""],
  ["ordering", "Put the information processing cycle in order.", "2", "Input|Processing|Storage|Output", "", ""],
  ["drag_words", "A ______ is 8 bits and 1024 bytes make a ______.", "2", "nibble|megabyte", "byte|kilobyte", ""],
  ["short_answer", "Name one example of presentation software.", "2", "", "PowerPoint", ""],
  ["essay", "Explain how computers are used in Ghanaian schools.", "10", "", "", ""],
];

const TYPE_ALIASES: Record<string, QuestionType> = {
  multiple_choice: "mcq",
  single_choice: "mcq",
  choice: "mcq",
  multiple_select: "multi_select",
  multiple_response: "multi_select",
  checkbox: "multi_select",
  truefalse: "true_false",
  tf: "true_false",
  fill_in_the_blank: "fill_blank",
  fill_in_blank: "fill_blank",
  number: "numeric",
  numeric_answer: "numeric",
  match: "matching",
  sequence: "ordering",
  order: "ordering",
  drag_words_into_blanks: "drag_words",
  drag_and_drop: "drag_words",
  short: "short_answer",
  long: "long_answer",
  file_submission: "file",
  upload: "file",
};

const key = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

export function parseQuestionType(raw: string): QuestionType | null {
  const k = key(raw);
  if (QUESTION_TYPES.some((t) => t.value === k)) return k as QuestionType;
  const byLabel = QUESTION_TYPES.find((t) => key(t.label) === k);
  return byLabel?.value ?? TYPE_ALIASES[k] ?? null;
}

const list = (s: string | undefined) => (s ?? "").split("|").map((x) => x.trim()).filter(Boolean);

/** "B", "2" or the option's own text → option index, or -1. */
function optionIndex(token: string, options: string[]): number {
  const t = token.trim();
  if (/^[a-z]$/i.test(t)) return t.toUpperCase().charCodeAt(0) - 65;
  if (/^\d+$/.test(t)) return Number(t) - 1;
  return options.findIndex((o) => o.toLowerCase() === t.toLowerCase());
}

export interface ImportedQuestion {
  row: number;
  question: Question | null;
  errors: string[];
}

/** Turns spreadsheet rows into questions, reporting problems per row. */
export function rowsToQuestions(rows: Record<string, string>[], makeId: () => string): ImportedQuestion[] {
  return rows.map((r, i) => {
    const errors: string[] = [];
    const type = parseQuestionType(r.type ?? "");
    if (!type) return { row: i + 2, question: null, errors: [`Unknown type “${r.type ?? ""}”`] };
    const prompt = (r.question ?? r.prompt ?? "").trim();
    const marksRaw = (r.marks ?? "").trim();
    const marks = marksRaw === "" ? (type === "essay" || type === "file" ? 10 : 2) : Number(marksRaw);
    if (Number.isNaN(marks) || marks <= 0) errors.push("Marks must be a positive number");
    const options = list(r.options);
    const answer = (r.answer ?? "").trim();
    const q: Question = { id: makeId(), type, prompt, marks: Number.isNaN(marks) ? 0 : marks };

    switch (type) {
      case "mcq": {
        q.options = options;
        const idx = optionIndex(answer, options);
        if (idx < 0 || idx >= options.length) errors.push("Answer must be an option letter (A, B…), number or text");
        q.answer = String(Math.max(0, idx));
        break;
      }
      case "multi_select": {
        q.options = options;
        const idxs = answer.split(/[,|;]/).map((t) => t.trim()).filter(Boolean).map((t) => optionIndex(t, options));
        if (idxs.length === 0 || idxs.some((x) => x < 0 || x >= options.length)) errors.push("Answer must list the correct options, e.g. “A,C”");
        q.answers = [...new Set(idxs.filter((x) => x >= 0 && x < options.length))].map(String);
        break;
      }
      case "true_false": {
        const a = answer.toLowerCase();
        if (!["true", "false", "t", "f", "yes", "no"].includes(a)) errors.push("Answer must be true or false");
        q.answer = ["true", "t", "yes"].includes(a) ? "true" : "false";
        break;
      }
      case "fill_blank":
      case "short_answer":
        q.answer = answer;
        break;
      case "numeric":
        q.answer = answer.replace(/,/g, "");
        q.tolerance = Math.abs(Number(r.tolerance || 0)) || 0;
        break;
      case "matching":
        q.pairs = options.map((o) => {
          const [left, ...right] = o.split("=");
          return { left: (left ?? "").trim(), right: right.join("=").trim() };
        });
        if (q.pairs.some((p) => !p.right)) errors.push("Matching options must be “term=match” pairs separated by |");
        break;
      case "ordering":
        q.options = options;
        break;
      case "drag_words":
        q.answers = list(answer);
        q.distractors = options;
        if (q.answers.length !== countBlanks(prompt)) errors.push(`The question has ${countBlanks(prompt)} blank(s) but the answer lists ${q.answers.length} word(s)`);
        break;
    }
    for (const p of questionProblems(q)) {
      const msg = p[0]!.toUpperCase() + p.slice(1);
      if (!errors.includes(msg)) errors.push(msg);
    }
    return { row: i + 2, question: q, errors };
  });
}

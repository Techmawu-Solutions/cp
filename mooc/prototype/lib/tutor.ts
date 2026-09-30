import { activitiesOf, courseOfActivity, findActivity } from "@/lib/data/courses";
import { itemsForSkill } from "@/lib/data/items";
import type { Activity, TutorMessage } from "@/lib/types";

/**
 * The in-context tutor (spec section 12.3, FR-AI-1..8), simulated. The rules are the
 * real ones: answers come from the learner's own course materials with a
 * citation to the exact lesson; anything else is labelled; when nothing in the
 * course supports an answer it says so instead of inventing one; worrying
 * messages are escalated to a person. In production a grounded LLM does the
 * wording — the gateway still verifies every citation (spec section 12.3).
 */

export type TutorAction = "explain" | "example" | "quiz" | "simpler";

const STOP = new Set("a an and are as at be but by can do does for from how i in is it its me my of on or so that the this to was what when where which who why will with you your".split(" "));
const words = (t: string) => t.toLowerCase().replace(/[^a-z0-9$²\s]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w));
const plain = (md: string) => md.replace(/```[\s\S]*?```/g, "").replace(/[#*`|]/g, "").replace(/\n{2,}/g, "\n").trim();

const SAFEGUARDING = /\b(hurt myself|kill myself|suicide|abuse|abused|being bullied|someone touched|unsafe at home)\b/i;

interface Chunk {
  activity: Activity;
  text: string;
}

/** Paragraph-sized chunks of the course's readings and transcripts — the RAG index, in miniature. */
function chunksFor(activityId: string): Chunk[] {
  const course = courseOfActivity(activityId);
  if (!course) return [];
  const out: Chunk[] = [];
  for (const a of activitiesOf(course)) {
    if (a.body) for (const para of plain(a.body).split("\n").filter((p) => p.trim().length > 30)) out.push({ activity: a, text: para.trim() });
    if (a.transcript) out.push({ activity: a, text: a.transcript.map((l) => l.text).join(" ") });
  }
  return out;
}

function lessonReading(activityId: string): Activity | undefined {
  const course = courseOfActivity(activityId);
  if (!course) return undefined;
  const found = findActivity(course, activityId);
  return found?.lesson.activities.find((a) => a.kind === "reading");
}

const cite = (a: Activity) => ({ activityId: a.id, title: a.title });

export function tutorReply(activityId: string, input: { action?: TutorAction; question?: string }, history: TutorMessage[], teen: boolean): { reply: TutorMessage; escalate?: string } {
  const reading = lessonReading(activityId);
  const course = courseOfActivity(activityId);
  const current = course ? findActivity(course, activityId)?.activity : undefined;

  if (input.question && SAFEGUARDING.test(input.question)) {
    return {
      reply: {
        role: "tutor",
        label: "hint",
        text: teen
          ? "Thank you for telling me. This sounds important, and a person should help — not an AI. I've let a trained mentor know, and they'll contact you through the platform. If you're in danger right now, please talk to a trusted adult or call 116 (Ghana child helpline)."
          : "This sounds important, and a person should help — not an AI. I've asked a mentor to reach out to you. If you're in immediate danger, please contact local emergency services.",
      },
      escalate: input.question,
    };
  }

  if (input.action === "example") {
    const used = history.filter((m) => m.label === "ai_explanation").length;
    const ex = (current?.examples ?? reading?.examples ?? [])[used];
    if (ex && reading)
      return { reply: { role: "tutor", label: "ai_explanation", text: ex, citation: cite(reading) } };
    return { reply: { role: "tutor", label: "cant_find", text: "I've shared all the examples your instructor approved for this lesson. Try the practice questions, or ask me something specific." } };
  }

  if (input.action === "quiz") {
    const skill = current?.skills[0];
    const item = skill ? itemsForSkill(skill)[history.filter((m) => m.text.startsWith("Try this")).length % Math.max(1, itemsForSkill(skill).length)] : undefined;
    if (item)
      return { reply: { role: "tutor", label: "hint", text: `Try this (practice only — it doesn't count): ${item.stem}${item.options ? "\n" + item.options.map((o, i) => `${String.fromCharCode(65 + i)}. ${o}`).join("\n") : ""}\n\nNeed a nudge? ${item.hints[0]}`, citation: reading ? cite(reading) : undefined } };
    return { reply: { role: "tutor", label: "cant_find", text: "There's no practice for this lesson yet." } };
  }

  if (input.action === "explain" || input.action === "simpler") {
    if (reading?.body) {
      const paras = plain(reading.body).split("\n").filter((p) => p.trim().length > 30);
      const text = input.action === "simpler" ? `In short: ${paras[0]?.split(/(?<=\.)\s/)[0] ?? paras[0]}` : paras.slice(0, 2).join("\n\n");
      return { reply: { role: "tutor", label: "course_content", text, citation: cite(reading) } };
    }
  }

  // Free question: retrieve the best-matching chunk from this course only.
  const q = words(input.question ?? "");
  const ranked = chunksFor(activityId)
    .map((c) => ({ c, score: q.filter((w) => words(c.text).includes(w)).length + (c.activity.id.startsWith(activityId.split(".").slice(0, 2).join(".")) ? 0.5 : 0) }))
    .sort((a, b) => b.score - a.score);
  const best = ranked[0];
  if (best && best.score >= 1.5) {
    return { reply: { role: "tutor", label: "course_content", text: `From your course: ${best.c.text}`, citation: cite(best.c.activity) } };
  }
  return {
    reply: {
      role: "tutor",
      label: "cant_find",
      text: "I can't find this in your course materials, so I won't guess. You can rephrase, or ask a mentor — a person — who can help.",
    },
  };
}

import { COURSES, activitiesOf } from "@/lib/data/courses";
import { CAREERS, SKILLS } from "@/lib/data/graph";
import type { Career, Course, Skill } from "@/lib/types";

/**
 * Discovery (spec section 6.2, brief section 18, section 35): understands a goal in the learner's own
 * words, searches across courses, lessons, transcripts and skills, and turns
 * "two weeks to learn Python for data analysis" into a path suggestion.
 * Production uses hybrid keyword + vector search in OpenSearch; this is a
 * keyword stand-in with the same outputs.
 */

const CAREER_WORDS: Record<string, string[]> = {
  "data-analyst": ["data", "analyst", "analysis", "analytics", "excel", "spreadsheet", "spreadsheets", "sql", "statistics", "dashboard", "dashboards", "insights"],
  "software-developer": ["developer", "programmer", "programming", "coding", "code", "python", "software", "app", "apps", "engineer"],
};

const words = (t: string) => t.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);

export interface GoalMatch {
  careers: Career[];
  skills: Skill[];
  courses: Course[];
  weeks?: number;
  minutes?: number;
}

const NUMBER_WORDS: Record<string, number> = { a: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, eight: 8, ten: 10, twelve: 12 };

/** Reads a free-text goal (FR-DS-1). */
export function understandGoal(text: string): GoalMatch {
  const w = words(text);
  const careers = CAREERS.filter((c) => (CAREER_WORDS[c.id] ?? []).some((k) => w.includes(k)) || w.join(" ").includes(c.name.toLowerCase()));
  const skills = SKILLS.filter((s) => words(`${s.name} ${s.domain}`).some((k) => k.length > 3 && w.includes(k)));
  const courses = COURSES.filter((c) => words(`${c.title} ${c.topic} ${c.subtitle}`).some((k) => k.length > 3 && w.includes(k)));
  const m = /(\d+|a|one|two|three|four|five|six|eight|ten|twelve)\s+(week|month|day)s?/i.exec(text);
  let weeks: number | undefined;
  if (m) {
    const n = Number(m[1]) || NUMBER_WORDS[m[1]!.toLowerCase()] || 1;
    weeks = m[2]!.toLowerCase().startsWith("month") ? n * 4 : m[2]!.toLowerCase().startsWith("day") ? Math.max(1, Math.round(n / 7)) : n;
  }
  const mins = /(\d+)\s*(min|minute)/i.exec(text);
  return { careers, skills, courses, weeks, minutes: mins ? Number(mins[1]) : undefined };
}

export interface SearchHit {
  kind: "course" | "lesson" | "skill" | "career";
  title: string;
  subtitle: string;
  href: string;
  score: number;
}

/** Search across courses, lessons (incl. transcripts), skills and careers (FR-DS-3). */
export function search(query: string): SearchHit[] {
  const q = words(query).filter((w) => w.length > 2);
  if (!q.length) return [];
  const hits: SearchHit[] = [];
  const score = (text: string) => q.filter((w) => text.toLowerCase().includes(w)).length;
  for (const c of COURSES) {
    const s = score(`${c.title} ${c.subtitle} ${c.topic} ${c.provider}`) * 2;
    if (s) hits.push({ kind: "course", title: c.title, subtitle: `${c.provider} · ${c.hours} h · ${c.level}`, href: `/courses/${c.slug}`, score: s });
    for (const a of activitiesOf(c)) {
      if (a.kind !== "video" && a.kind !== "reading") continue;
      const text = `${a.title} ${a.body ?? ""} ${(a.transcript ?? []).map((l) => l.text).join(" ")}`;
      const sa = score(text);
      if (sa >= Math.min(2, q.length)) hits.push({ kind: "lesson", title: a.title, subtitle: `${c.title}${a.transcript ? " · in the video transcript" : ""}`, href: `/learn/${c.slug}/${a.id}`, score: sa });
    }
  }
  for (const s of SKILLS) {
    const sc = score(`${s.name} ${s.description} ${s.domain}`) * 1.5;
    if (sc) hits.push({ kind: "skill", title: s.name, subtitle: s.domain, href: `/skills#${s.id}`, score: sc });
  }
  for (const c of CAREERS) {
    const sc = score(`${c.name} ${c.description} ${(CAREER_WORDS[c.id] ?? []).join(" ")}`) * 2;
    if (sc) hits.push({ kind: "career", title: c.name, subtitle: c.tagline, href: `/careers/${c.id}`, score: sc });
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, 20);
}

/** "Teach me something interesting" (curiosity mode). */
export function curiosityPick(seed: number) {
  const lessons = COURSES.filter((c) => c.authored).flatMap((c) => activitiesOf(c).filter((a) => a.kind === "video").map((a) => ({ course: c, activity: a })));
  return lessons[seed % lessons.length]!;
}

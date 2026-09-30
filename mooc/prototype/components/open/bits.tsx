import Link from "next/link";
import { Clock, Download, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { STATE_LABEL, STATE_MEANING } from "@/lib/mastery";
import type { Course, SkillState } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useTranslated } from "@/lib/i18n/use-translated";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-heading text-lg font-semibold tracking-tight", className)}>
      <span aria-hidden className="grid size-7 place-items-center rounded-lg bg-primary text-primary-foreground">
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
          <path d="M4 18c3-8 13-8 16 0" />
          <circle cx="12" cy="7" r="2.6" />
        </svg>
      </span>
      <span data-no-translate>
        ClassProject <span className="text-primary">Open</span>
      </span>
    </span>
  );
}

/** Colour per mastery state — used consistently across the skill map, badges and meters. */
export const STATE_STYLE: Record<SkillState, { dot: string; badge: string; bar: string }> = {
  not_started: { dot: "bg-muted-foreground/30", badge: "border-border text-muted-foreground", bar: "bg-muted" },
  exposed: { dot: "bg-slate-400", badge: "border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-600 dark:bg-slate-800/40 dark:text-slate-200", bar: "bg-slate-400" },
  understood: { dot: "bg-sky-500", badge: "border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-700 dark:bg-sky-900/30 dark:text-sky-200", bar: "bg-sky-500" },
  applied: { dot: "bg-amber-500", badge: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200", bar: "bg-amber-500" },
  verified: { dot: "bg-emerald-600", badge: "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200", bar: "bg-emerald-600" },
};

export function StateBadge({ state, className }: { state: SkillState; className?: string }) {
  return (
    <span title={STATE_MEANING[state]} className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap", STATE_STYLE[state].badge, className)}>
      <span className={cn("size-1.5 rounded-full", STATE_STYLE[state].dot)} />
      {STATE_LABEL[state]}
    </span>
  );
}

/** The four-step mastery ladder with the current state highlighted. */
export function StateLadder({ state }: { state: SkillState }) {
  const steps: SkillState[] = ["exposed", "understood", "applied", "verified"];
  const idx = steps.indexOf(state);
  return (
    <div className="flex gap-1" aria-label={`Mastery: ${STATE_LABEL[state]}`}>
      {steps.map((s, i) => (
        <span key={s} title={`${STATE_LABEL[s]} — ${STATE_MEANING[s]}`} className={cn("h-1.5 flex-1 rounded-full", i <= idx ? STATE_STYLE[steps[Math.max(0, idx)]!].bar : "bg-muted")} />
      ))}
    </div>
  );
}

/** "Why this?" — every recommendation explains itself (spec P2, FR-DS-4). */
export function Reason({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("flex items-start gap-1.5 text-sm text-primary", className)}>
      <Sparkles className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      <span>
        <span className="sr-only">Why this: </span>
        {children}
      </span>
    </span>
  );
}

/**
 * Course cover (FR-TR-3): the instructor's image, or a generated SVG cover of a
 * few hundred bytes. In data saver only generated covers load. Decorative next
 * to the course title (alt=""), so screen readers don't hear it twice.
 */
export function CourseThumb({ course, dataSaver, className }: { course: Course; dataSaver?: boolean; className?: string }) {
  const src = course.thumbnail && !dataSaver ? course.thumbnail.url : `/thumbnails/${course.slug}.svg`;
  // eslint-disable-next-line @next/next/no-img-element -- tiny SVG, no optimisation needed
  return <img src={src} alt="" width={640} height={360} loading="lazy" decoding="async" className={cn("aspect-video w-full rounded-xl object-cover", className)} />;
}

export function CourseCard({ course, reason, compact }: { course: Course; reason?: string; compact?: boolean }) {
  return (
    <Link href={`/courses/${course.slug}`} className="group flex h-full flex-col gap-2 rounded-2xl border bg-card p-3 transition-colors hover:border-primary/40">
      <CourseThumb course={course} className="mb-1" />
      <span className="px-1 text-xs text-muted-foreground">{course.provider}</span>
      <span className="px-1 font-heading text-lg leading-snug font-semibold group-hover:underline">{course.title}</span>
      {!compact && <span className="line-clamp-2 px-1 text-sm text-muted-foreground">{course.subtitle}</span>}
      {reason && <Reason className="px-1 text-xs">{reason}</Reason>}
      <span className="mt-auto flex flex-wrap gap-1.5 px-1 pt-1">
        <Badge variant={course.free ? "secondary" : "outline"}>{course.free ? "Free" : `GH₵${course.priceGhs}`}</Badge>
        <Badge variant="outline">
          <Clock /> {course.hours} h
        </Badge>
        <Badge variant="outline" className="capitalize">
          {course.level}
        </Badge>
        {course.offline && (
          <Badge variant="outline">
            <Download /> {course.sizeMb} MB
          </Badge>
        )}
      </span>
    </Link>
  );
}

export function PageTitle({ title, description, children }: { title: string; description?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-3xl font-semibold">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-muted-foreground">{description}</p>}
      </div>
      {children}
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed p-8 text-center">
      <p className="font-medium">{title}</p>
      {children && <div className="mt-2 text-sm text-muted-foreground">{children}</div>}
    </div>
  );
}

// ------------------------------------------------------------------ light Markdown

function inline(text: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const t = m[0];
    if (t.startsWith("**")) out.push(<strong key={k++}>{t.slice(2, -2)}</strong>);
    else if (t.startsWith("`")) out.push(<code key={k++}>{t.slice(1, -1)}</code>);
    else out.push(<em key={k++}>{t.slice(1, -1)}</em>);
    last = m.index + t.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** Renders the light Markdown used in lesson readings: headings, lists, tables, code, bold. */
export function Markdown({ source: english, className }: { source: string; className?: string }) {
  // Lessons are translated whole (lib/i18n): split into headings and bold runs they would no longer match.
  const source = useTranslated(english);
  const blocks: React.ReactNode[] = [];
  const lines = source.split("\n");
  let i = 0;
  let k = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    if (line.startsWith("```")) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i]!.startsWith("```")) code.push(lines[i++]!);
      i++;
      blocks.push(<pre key={k++}>{code.join("\n")}</pre>);
    } else if (line.startsWith("## ")) {
      blocks.push(<h2 key={k++}>{inline(line.slice(3))}</h2>);
      i++;
    } else if (line.startsWith("### ")) {
      blocks.push(<h3 key={k++}>{inline(line.slice(4))}</h3>);
      i++;
    } else if (line.startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i]!.startsWith("|")) {
        if (!/^\|[\s|:-]+\|$/.test(lines[i]!)) rows.push(lines[i]!.split("|").slice(1, -1).map((c) => c.trim()));
        i++;
      }
      blocks.push(
        <div key={k++} className="my-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>{rows[0]?.map((c, j) => <th key={j} className="border-b px-2 py-1.5 text-left font-semibold">{inline(c)}</th>)}</tr>
            </thead>
            <tbody>
              {rows.slice(1).map((r, ri) => (
                <tr key={ri}>{r.map((c, j) => <td key={j} className="border-b px-2 py-1.5">{inline(c)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
    } else if (/^(- |\d+\. )/.test(line)) {
      const ordered = /^\d+\. /.test(line);
      const items: string[] = [];
      while (i < lines.length && /^(- |\d+\. )/.test(lines[i]!)) items.push(lines[i++]!.replace(/^(- |\d+\. )/, ""));
      const L = ordered ? "ol" : "ul";
      blocks.push(<L key={k++}>{items.map((t, j) => <li key={j}>{inline(t)}</li>)}</L>);
    } else if (line.trim() === "") {
      i++;
    } else {
      const para: string[] = [];
      while (i < lines.length && lines[i]!.trim() !== "" && !/^(#|\||- |\d+\. |```)/.test(lines[i]!)) para.push(lines[i++]!);
      blocks.push(<p key={k++}>{inline(para.join(" "))}</p>);
    }
  }
  return (
    <div className={cn("prose-open", className)} data-no-translate={source !== english ? "" : undefined}>
      {blocks}
    </div>
  );
}

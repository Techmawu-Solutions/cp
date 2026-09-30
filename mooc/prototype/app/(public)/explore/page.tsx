"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Clock, Compass, Lightbulb, Route, Search, Sparkles, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Empty, PageTitle, Reason, StateBadge } from "@/components/open/bits";
import { COURSES, activitiesOf } from "@/lib/data/courses";
import { CAREERS, SKILLS } from "@/lib/data/graph";
import { curiosityPick, search, understandGoal } from "@/lib/discover";
import { atLeast } from "@/lib/mastery";
import { useOpen } from "@/lib/store";
import { cn } from "@/lib/utils";

const MODES = [
  { id: "search", label: "Search", icon: Search },
  { id: "goal", label: "Goal", icon: Target },
  { id: "skill", label: "Skill", icon: Sparkles },
  { id: "career", label: "Career", icon: Route },
  { id: "time", label: "Time", icon: Clock },
  { id: "diagnostic", label: "What next?", icon: Compass },
  { id: "curiosity", label: "Curiosity", icon: Lightbulb },
] as const;

type Mode = (typeof MODES)[number]["id"];

export default function ExplorePage() {
  return (
    <Suspense>
      <Explore />
    </Suspense>
  );
}

/** Discovery modes (spec section 6.2, brief section 18): search is only one of seven ways in. */
function Explore() {
  const params = useSearchParams();
  const router = useRouter();
  const mode = (params.get("mode") as Mode) ?? "search";
  const setMode = (m: Mode) => router.replace(`/explore?mode=${m}`);
  return (
    <>
      <PageTitle title="Explore" description="Find what's next by goal, skill, career, the time you have — or just curiosity." />
      <div className="mb-6 flex flex-wrap gap-1.5" role="tablist" aria-label="Discovery mode">
        {MODES.map((m) => (
          <button key={m.id} role="tab" aria-selected={mode === m.id} type="button" onClick={() => setMode(m.id)} className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm", mode === m.id ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted")}>
            <m.icon className="size-4" /> {m.label}
          </button>
        ))}
      </div>
      {mode === "search" && <SearchMode />}
      {mode === "goal" && <GoalMode />}
      {mode === "skill" && <SkillMode />}
      {mode === "career" && <CareerMode />}
      {mode === "time" && <TimeMode />}
      {mode === "diagnostic" && <DiagnosticMode />}
      {mode === "curiosity" && <CuriosityMode />}
    </>
  );
}

function SearchMode() {
  const [q, setQ] = useState("");
  const hits = search(q);
  const goal = understandGoal(q);
  return (
    <div className="space-y-4">
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Try “I have two weeks to learn Python for data analysis” or “median”" className="h-11 bg-card" aria-label="Search" />
      {q.trim() && goal.weeks && (goal.careers.length > 0 || goal.courses.length > 0) && (
        <div className="rounded-2xl border border-primary/30 bg-accent/40 p-4">
          <p className="font-medium">A path for that, in {goal.weeks} week{goal.weeks > 1 ? "s" : ""}</p>
          <p className="text-sm text-muted-foreground">
            {goal.courses.slice(0, 3).map((c) => c.title).join(" → ") || goal.careers[0]?.name} · about {Math.ceil(goal.courses.slice(0, 3).reduce((m, c) => m + c.hours, 0) / goal.weeks) || 4} h a week
          </p>
          <Link href={`/start?goal=${encodeURIComponent(q)}`} className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline">
            Build this path with a quick check <ArrowRight className="size-3.5" />
          </Link>
        </div>
      )}
      {q.trim() && hits.length === 0 && <Empty title="Nothing found">Try fewer words, or use the Goal mode.</Empty>}
      {hits.length > 0 && (
        <ul className="divide-y rounded-2xl border bg-card">
          {hits.map((h, i) => (
            <li key={i}>
              <Link href={h.href} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50">
                <span className="w-16 shrink-0 text-xs text-muted-foreground uppercase">{h.kind}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{h.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">{h.subtitle}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function GoalMode() {
  const router = useRouter();
  const [q, setQ] = useState("");
  return (
    <form className="max-w-xl space-y-3" onSubmit={(e) => (e.preventDefault(), q.trim() && router.push(`/start?goal=${encodeURIComponent(q.trim())}`))}>
      <p className="font-heading text-2xl font-semibold">What do you want to achieve?</p>
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. Get a job working with data" className="h-11 bg-card" />
      <Button type="submit">
        Build my path <ArrowRight />
      </Button>
    </form>
  );
}

function SkillMode() {
  const mastery = useOpen((s) => s.mastery);
  const domains = [...new Set(SKILLS.map((s) => s.domain))];
  return (
    <div className="space-y-6">
      {domains.map((d) => (
        <section key={d}>
          <h2 className="mb-2 text-lg font-semibold">{d}</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {SKILLS.filter((s) => s.domain === d).map((s) => {
              const course = COURSES.find((c) => c.authored && c.skills.includes(s.id)) ?? COURSES.find((c) => c.skills.includes(s.id));
              return (
                <Link key={s.id} href={course ? `/courses/${course.slug}` : "/explore"} className="rounded-xl border bg-card p-3 hover:border-primary/40">
                  <span className="flex items-start justify-between gap-2">
                    <span className="font-medium">{s.name}</span>
                    <StateBadge state={mastery[s.id]?.state ?? "not_started"} />
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">{course ? `Learn it in ${course.title}` : s.description}</span>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function CareerMode() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {CAREERS.map((c) => (
        <Link key={c.id} href={`/careers/${c.id}`} className="rounded-2xl border bg-card p-5 hover:border-primary/40">
          <p className="font-heading text-2xl font-semibold">{c.name}</p>
          <p className="text-muted-foreground">{c.tagline}</p>
          <p className="mt-2 text-sm">{c.description}</p>
        </Link>
      ))}
    </div>
  );
}

function TimeMode() {
  const s = useOpen();
  const [mins, setMins] = useState(20);
  // Short, unfinished activities from enrolled courses first, then from flagship courses.
  const pool = [...COURSES.filter((c) => s.enrollments[c.slug]), ...COURSES.filter((c) => c.authored && !s.enrollments[c.slug])].flatMap((c) => activitiesOf(c).filter((a) => a.kind !== "mastery_check" && !s.progress[a.id]?.done).map((a) => ({ c, a })));
  const picks: typeof pool = [];
  let used = 0;
  for (const p of pool) {
    if (used + p.a.minutes > mins) continue;
    picks.push(p);
    used += p.a.minutes;
    if (picks.length >= 6) break;
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-heading text-2xl font-semibold">I have</span>
        {[5, 10, 20, 45].map((m) => (
          <button key={m} type="button" onClick={() => setMins(m)} className={cn("rounded-full border px-3 py-1", mins === m ? "border-primary bg-primary text-primary-foreground" : "bg-card")}>
            {m} min
          </button>
        ))}
      </div>
      <Reason>Fits {used} of your {mins} minutes, continuing what you&apos;ve started.</Reason>
      <ul className="divide-y rounded-2xl border bg-card">
        {picks.map(({ c, a }) => (
          <li key={a.id}>
            <Link href={`/learn/${c.slug}/${a.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50">
              <span className="w-14 text-sm text-muted-foreground tabular-nums">{a.minutes} min</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{a.title}</span>
                <span className="text-xs text-muted-foreground">{c.title}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DiagnosticMode() {
  const s = useOpen();
  const goal = s.goals.find((g) => g.id === s.activeGoal);
  const skills = goal?.skills ?? [];
  const gaps = skills.filter((sk) => !atLeast(s.mastery[sk]?.state ?? "not_started", "understood"));
  const ready = skills.filter((sk) => s.mastery[sk]?.state === "understood");
  if (!goal) return <Empty title="Set a goal first">What to learn next depends on where you&apos;re heading.</Empty>;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <section className="rounded-2xl border bg-card p-4">
        <h2 className="font-semibold">Gaps to close next</h2>
        {gaps.length === 0 && <p className="text-sm text-muted-foreground">No gaps left for this goal.</p>}
        {gaps.slice(0, 5).map((sk) => {
          const course = COURSES.find((c) => c.skills.includes(sk));
          return (
            <Link key={sk} href={`/skills#${sk}`} className="mt-2 block text-sm">
              <span className="font-medium">{SKILLS.find((x) => x.id === sk)?.name}</span>
              <Reason className="text-xs">
                Needed for {goal.label}
                {course ? ` — taught in ${course.title}` : ""}
              </Reason>
            </Link>
          );
        })}
      </section>
      <section className="rounded-2xl border bg-card p-4">
        <h2 className="font-semibold">Ready to prove</h2>
        {ready.length === 0 && <p className="text-sm text-muted-foreground">Once you understand a skill, a mastery check or project verifies it.</p>}
        {ready.map((sk) => (
          <p key={sk} className="mt-2 text-sm">
            {SKILLS.find((x) => x.id === sk)?.name} →{" "}
            <Link href={`/skills#${sk}`} className="text-primary hover:underline">
              verify it
            </Link>
          </p>
        ))}
      </section>
    </div>
  );
}

function CuriosityMode() {
  const [seed, setSeed] = useState(() => new Date().getDate());
  const pick = curiosityPick(seed);
  return (
    <div className="max-w-xl rounded-2xl border bg-card p-6">
      <p className="text-sm text-muted-foreground">Something interesting · {pick.activity.minutes} min</p>
      <p className="mt-1 font-heading text-2xl font-semibold">{pick.activity.title.replace(/^Watch: /, "")}</p>
      <p className="text-sm text-muted-foreground">From {pick.course.title}</p>
      <p className="mt-3 text-sm">{pick.activity.transcript?.[0]?.text}</p>
      <div className="mt-4 flex gap-2">
        <Link href={`/learn/${pick.course.slug}/${pick.activity.id}`} className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground">
          Watch <ArrowRight className="size-4" />
        </Link>
        <Button variant="outline" onClick={() => setSeed((n) => n + 7)}>
          Something else
        </Button>
      </div>
    </div>
  );
}

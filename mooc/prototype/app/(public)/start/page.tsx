"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Check, CircleHelp, Info, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Reason, StateBadge } from "@/components/open/bits";
import { courseBySlug } from "@/lib/data/courses";
import { careerById, skillName } from "@/lib/data/graph";
import { isCorrect } from "@/lib/data/items";
import { understandGoal } from "@/lib/discover";
import { careerSkills, createGoal, diagnosticItems, type DiagnosticResult } from "@/lib/learning";
import { setOpen, useOpen, type Profile } from "@/lib/store";
import type { Goal } from "@/lib/types";
import { cn } from "@/lib/utils";

interface GoalOption {
  id: string;
  kind: Goal["kind"];
  label: string;
  careerId?: string;
  skills: string[];
  hint: string;
  words: string[];
}

const OPTIONS: GoalOption[] = [
  { id: "career:data-analyst", kind: "career", label: "Become a data analyst", careerId: "data-analyst", skills: careerSkills("data-analyst"), hint: "Spreadsheets, statistics, SQL, storytelling + a portfolio project", words: ["data", "analyst", "excel", "spreadsheet", "sql", "analysis"] },
  { id: "career:software-developer", kind: "career", label: "Start a path to software development", careerId: "software-developer", skills: careerSkills("software-developer"), hint: "Python foundations, how the internet works, AI basics + a project", words: ["developer", "code", "coding", "program", "software", "python"] },
  { id: "exam:quadratics", kind: "exam", label: "Pass WASSCE Elective Maths — quadratics", skills: ["quad-graphs", "quad-square", "quad-formula", "quad-word"], hint: "Graphs, completing the square, the formula and word problems", words: ["wassce", "maths", "math", "quadratic", "elective", "exam"] },
  { id: "skill:statistics", kind: "skill", label: "Understand statistics", skills: ["stats-averages", "stats-spread", "stats-critical", "data-story"], hint: "Averages, spread, and numbers that mislead", words: ["statistics", "stats", "average", "numbers"] },
  { id: "skill:sql", kind: "skill", label: "Learn SQL", skills: ["sql-select", "sql-filter", "sql-aggregate", "sql-joins"], hint: "Query real databases", words: ["sql", "database", "query"] },
  { id: "skill:python", kind: "skill", label: "Learn Python", skills: ["py-variables", "py-decisions", "py-loops", "py-functions"], hint: "Your first programs", words: ["python", "code", "coding", "programming"] },
];

export default function Start() {
  return (
    <Suspense>
      <Onboarding />
    </Suspense>
  );
}

type Step = "goal" | "about" | "diagnostic" | "result";

function Onboarding() {
  const router = useRouter();
  const initial = useSearchParams().get("goal") ?? "";
  const profile = useOpen((s) => s.profile);
  const [text, setText] = useState(initial);
  const [option, setOption] = useState<GoalOption | null>(null);
  const [step, setStep] = useState<Step>("goal");
  const [weeks, setWeeks] = useState(16);

  const understood = useMemo(() => understandGoal(text), [text]);
  const ranked = useMemo(() => {
    const w = text.toLowerCase();
    return [...OPTIONS].sort((a, b) => score(b) - score(a));
    function score(o: GoalOption) {
      return o.words.filter((k) => w.includes(k)).length * 2 + (o.careerId && understood.careers.some((c) => c.id === o.careerId) ? 3 : 0);
    }
  }, [text, understood]);
  const best = text.trim() ? ranked[0] : null;

  return (
    <div className="mx-auto max-w-2xl">
      <ol className="mb-8 flex gap-2 text-xs" aria-label="Steps">
        {(["goal", "about", "diagnostic", "result"] as Step[]).map((s, i) => (
          <li key={s} className={cn("flex-1 rounded-full py-1 text-center", step === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
            {i + 1}. {s === "goal" ? "Your goal" : s === "about" ? "About you" : s === "diagnostic" ? "Quick check" : "Your path"}
          </li>
        ))}
      </ol>

      {step === "goal" && (
        <section>
          <h1 className="text-3xl font-semibold">What do you want to achieve?</h1>
          <Input className="mt-4 h-12 bg-card text-base" value={text} onChange={(e) => setText(e.target.value)} placeholder="In your own words" aria-label="Your goal" />
          {understood.weeks && (
            <p className="mt-2 text-sm text-muted-foreground">
              <Info className="mr-1 inline size-3.5" />I noticed a time frame: about {understood.weeks} week{understood.weeks > 1 ? "s" : ""}. We&apos;ll plan around it.
            </p>
          )}
          <p className="mt-6 mb-2 text-sm font-medium">{best ? "Did you mean one of these?" : "Or choose a goal"}</p>
          <div className="grid gap-2">
            {ranked.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => {
                  setOption(o);
                  if (understood.weeks) setWeeks(Math.max(2, understood.weeks));
                  setStep(profile ? "diagnostic" : "about");
                }}
                className={cn("flex items-center gap-3 rounded-2xl border bg-card p-4 text-left hover:border-primary/40", o === best && "border-primary/50 ring-2 ring-primary/15")}
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{o.label}</span>
                  <span className="text-sm text-muted-foreground">{o.hint}</span>
                </span>
                {o === best && <span className="rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground">Best match</span>}
                <ArrowRight className="size-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </section>
      )}

      {step === "about" && option && <About goal={option} weeks={weeks} setWeeks={setWeeks} onDone={() => setStep("diagnostic")} />}
      {step === "diagnostic" && option && <Diagnostic goal={option} onDone={(r) => (setResults(r), setStep("result"))} />}
      {step === "result" && option && (
        <Result
          goal={option}
          results={results}
          weeks={weeks}
          onCreate={() => {
            createGoal({ kind: option.kind, label: option.label, careerId: option.careerId, skills: option.skills, weeks }, results);
            router.push("/home");
          }}
        />
      )}
    </div>
  );
}

// results kept outside the component tree state for simplicity between steps
let results: DiagnosticResult[] = [];
const setResults = (r: DiagnosticResult[]) => (results = r);

function About({ goal, weeks, setWeeks, onDone }: { goal: GoalOption; weeks: number; setWeeks: (n: number) => void; onDone: () => void }) {
  const [name, setName] = useState("");
  const [year, setYear] = useState("");
  const [hours, setHours] = useState(4);
  const [connectivity, setConnectivity] = useState<Profile["connectivity"]>("moderate");
  const [guardian, setGuardian] = useState("");
  const age = year ? new Date().getFullYear() - Number(year) : null;
  const teen = age !== null && age >= 13 && age < 18;
  const under13 = age !== null && age < 13;
  const valid = name.trim().length > 1 && /^\d{4}$/.test(year) && !under13 && (!teen || guardian.trim().length > 5);

  return (
    <section>
      <h1 className="text-3xl font-semibold">A little about you</h1>
      <p className="mt-1 text-muted-foreground">So we can plan “{goal.label}” around your life — not the other way round.</p>
      <div className="mt-6 grid gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="nm">Your name</Label>
          <Input id="nm" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="yr">Year of birth</Label>
          <Input id="yr" inputMode="numeric" maxLength={4} value={year} onChange={(e) => setYear(e.target.value.replace(/\D/g, ""))} className="w-32" />
          {under13 && <p className="text-sm text-destructive">Learners under 13 join through their school. Ask your teacher about ClassProject.</p>}
        </div>
        {teen && (
          <div className="grid gap-1.5 rounded-2xl border border-sky-300 bg-sky-50 p-4 dark:border-sky-800 dark:bg-sky-950/30">
            <Label htmlFor="gd" className="flex items-center gap-1.5">
              <ShieldCheck className="size-4" /> Guardian&apos;s phone or email
            </Label>
            <Input id="gd" value={guardian} onChange={(e) => setGuardian(e.target.value)} placeholder="024 000 0000 or parent@example.com" className="bg-card" />
            <p className="text-xs text-muted-foreground">Because you&apos;re under 18, we&apos;ll ask them to approve your account. You can start learning straight away; community, live classes and a public portfolio unlock once they approve. Your account stays private.</p>
          </div>
        )}
        <div className="grid gap-1.5">
          <Label>Hours per week you can realistically give: {hours}</Label>
          <input type="range" min={1} max={12} value={hours} onChange={(e) => setHours(Number(e.target.value))} className="accent-primary" aria-label="Hours per week" />
        </div>
        <div className="grid gap-1.5">
          <Label>By when?</Label>
          <div className="flex flex-wrap gap-2">
            {[4, 8, 16, 24, 40].map((w) => (
              <button key={w} type="button" onClick={() => setWeeks(w)} className={cn("rounded-full border px-3 py-1 text-sm", weeks === w ? "border-primary bg-primary text-primary-foreground" : "bg-card")}>
                {w < 8 ? `${w} weeks` : `${Math.round(w / 4.3)} months`}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label>Your internet, most days</Label>
          <div className="flex flex-wrap gap-2">
            {(["slow", "moderate", "fast"] as const).map((c) => (
              <button key={c} type="button" onClick={() => setConnectivity(c)} className={cn("rounded-full border px-3 py-1 text-sm capitalize", connectivity === c ? "border-primary bg-primary text-primary-foreground" : "bg-card")}>
                {c === "slow" ? "Slow or expensive data" : c}
              </button>
            ))}
          </div>
          {connectivity === "slow" && <p className="text-xs text-muted-foreground">We&apos;ll turn on data saver and suggest downloading lessons on Wi-Fi.</p>}
        </div>
      </div>
      <Button
        className="mt-6"
        disabled={!valid}
        onClick={() => {
          const handle = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
          setOpen({
            persona: "new",
            profile: {
              name: name.trim(),
              handle,
              role: "learner",
              ageBand: teen ? "teen" : "adult",
              guardian: teen ? "pending" : "not_needed",
              country: "GH",
              hoursPerWeek: hours,
              preferredDays: ["mon", "wed", "sat"],
              connectivity,
              dataSaver: connectivity === "slow",
              aiTutor: true,
              aiPractice: true,
              personalisation: true,
              portfolioPublic: false,
              notifications: "daily",
            },
          });
          onDone();
        }}
      >
        Continue <ArrowRight />
      </Button>
    </section>
  );
}

function Diagnostic({ goal, onDone }: { goal: GoalOption; onDone: (r: DiagnosticResult[]) => void }) {
  const items = useMemo(() => diagnosticItems(goal.skills), [goal]);
  const [i, setI] = useState(0);
  const [answer, setAnswer] = useState("");
  const [out, setOut] = useState<DiagnosticResult[]>([]);
  const item = items[i];
  const record = (known: boolean | null) => {
    const r: DiagnosticResult = { skill: item!.skill, status: known ? "known" : "gap" };
    const next = [...out, r];
    setOut(next);
    setAnswer("");
    if (i + 1 >= items.length) {
      const tested = new Set(next.map((x) => x.skill));
      onDone([...next, ...goal.skills.filter((s) => !tested.has(s)).map((s) => ({ skill: s, status: "gap" as const }))]);
    } else setI(i + 1);
  };
  if (!item) return null;
  return (
    <section>
      <p className="text-sm text-muted-foreground">
        Quick check · question {i + 1} of {items.length} · no hints, no grades — it only decides what you can skip.
      </p>
      <Progress value={(i / items.length) * 100} className="mt-2" />
      <h2 className="mt-6 text-sm font-medium text-muted-foreground">{skillName(item.skill)}</h2>
      <p className="mt-1 text-xl font-medium whitespace-pre-line">{item.stem}</p>
      {item.type === "mcq" ? (
        <div className="mt-4 grid gap-2">
          {item.options!.map((o, oi) => (
            <button key={oi} type="button" onClick={() => setAnswer(String(oi))} className={cn("rounded-xl border bg-card p-3 text-left", answer === String(oi) && "border-primary ring-2 ring-primary/20")}>
              {o}
            </button>
          ))}
        </div>
      ) : (
        <Input className="mt-4 w-40 bg-card" inputMode="decimal" value={answer} onChange={(e) => setAnswer(e.target.value)} aria-label="Your answer" />
      )}
      <div className="mt-6 flex gap-2">
        <Button disabled={answer === ""} onClick={() => record(isCorrect(item, answer))}>
          Next <ArrowRight />
        </Button>
        <Button variant="ghost" onClick={() => record(null)}>
          <CircleHelp /> I don&apos;t know this yet
        </Button>
      </div>
    </section>
  );
}

function Result({ goal, results, weeks, onCreate }: { goal: GoalOption; results: DiagnosticResult[]; weeks: number; onCreate: () => void }) {
  const known = results.filter((r) => r.status === "known");
  const career = goal.careerId ? careerById.get(goal.careerId) : undefined;
  const courses = career?.courses ?? [];
  return (
    <section>
      <h1 className="text-3xl font-semibold">Here&apos;s what you already know</h1>
      <p className="mt-1 text-muted-foreground">
        {known.length} of {results.length} skills look familiar — we&apos;ll skip those and you can verify them with a mastery check instead of sitting through lessons.
      </p>
      <ul className="mt-6 divide-y rounded-2xl border bg-card">
        {results.map((r) => (
          <li key={r.skill} className="flex items-center gap-3 p-3">
            {r.status === "known" ? <Check className="size-4 text-emerald-600" /> : <X className="size-4 text-muted-foreground" />}
            <span className="flex-1">{skillName(r.skill)}</span>
            {r.status === "known" ? <StateBadge state="understood" /> : <span className="text-xs text-muted-foreground">To learn</span>}
          </li>
        ))}
      </ul>
      {courses.length > 0 && (
        <div className="mt-6 rounded-2xl border bg-card p-4">
          <p className="font-semibold">Your {career?.name} path</p>
          <ol className="mt-2 space-y-1 text-sm">
            {courses.map((slug, i) => {
              const c = courseBySlug.get(slug);
              const allKnown = c && c.skills.length > 0 && c.skills.every((sk) => known.some((k) => k.skill === sk));
              return (
                <li key={slug} className="flex gap-2">
                  <span className="text-muted-foreground tabular-nums">{i + 1}.</span>
                  <span className={cn(allKnown && "text-muted-foreground line-through")}>{c?.title}</span>
                  {allKnown && <span className="text-xs text-emerald-700">skip — verify instead</span>}
                </li>
              );
            })}
            <li className="flex gap-2">
              <span className="text-muted-foreground">{courses.length + 1}.</span> Portfolio project: {career?.projects.length ? "real data, peer + instructor review" : ""}
            </li>
            <li className="flex gap-2">
              <span className="text-muted-foreground">{courses.length + 2}.</span> Credential with evidence
            </li>
          </ol>
        </div>
      )}
      <Reason className="mt-4">Planned for about {weeks} weeks at your pace. Fall behind and the plan adapts — it tells you exactly what changed.</Reason>
      <Button className="mt-6" size="lg" onClick={onCreate}>
        Create my path <ArrowRight />
      </Button>
    </section>
  );
}

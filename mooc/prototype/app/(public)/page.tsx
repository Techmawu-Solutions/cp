"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, BadgeCheck, Clock, Compass, Feather, Lightbulb, Route, Search, Smartphone, Sparkles, Target, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CourseCard, Reason } from "@/components/open/bits";
import { LinkButton } from "@/components/open/shell";
import { COURSES } from "@/lib/data/courses";
import { CAREERS } from "@/lib/data/graph";
import { useOpen } from "@/lib/store";

const CHIPS = ["Become a data analyst", "Learn to code in Python", "Pass WASSCE Elective Maths", "Understand statistics", "I have 20 minutes today", "Teach me something interesting"];

const MODES = [
  { mode: "goal", icon: Target, title: "Goal", text: "“What do you want to achieve?”" },
  { mode: "skill", icon: Sparkles, title: "Skill", text: "“What do you want to learn?”" },
  { mode: "career", icon: Route, title: "Career", text: "“What role do you want?”" },
  { mode: "time", icon: Clock, title: "Time", text: "“I have 20 minutes today.”" },
  { mode: "diagnostic", icon: Compass, title: "Diagnostic", text: "“Show me what to learn next.”" },
  { mode: "curiosity", icon: Lightbulb, title: "Curiosity", text: "“Teach me something interesting.”" },
];

/** Landing: the goal prompt comes first, not a catalogue wall (spec section 20.2). */
export default function Landing() {
  const router = useRouter();
  const [goal, setGoal] = useState("");
  const signedIn = useOpen((s) => !!s.profile);
  const go = (text: string) => {
    if (/20 minutes/i.test(text)) return router.push("/explore?mode=time");
    if (/interesting/i.test(text)) return router.push("/explore?mode=curiosity");
    router.push(`/start?goal=${encodeURIComponent(text)}`);
  };

  return (
    <div className="space-y-20">
      <section className="mx-auto max-w-3xl pt-6 text-center">
        <p className="mb-4 text-sm font-medium tracking-wide text-primary uppercase">Learn what you need · prove what you can do</p>
        <h1 className="text-4xl leading-tight font-semibold sm:text-6xl">What do you want to achieve?</h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">Tell us in your own words. We&apos;ll find out what you already know, build your path, and help you earn evidence that you can do it.</p>
        <form
          className="mx-auto mt-8 flex max-w-xl gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (goal.trim()) go(goal.trim());
          }}
        >
          <Input value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="e.g. I want to become a data analyst in 6 months" className="h-12 rounded-xl bg-card text-base" aria-label="Your goal" />
          <Button type="submit" className="h-12 rounded-xl px-5">
            Start <ArrowRight />
          </Button>
        </form>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {CHIPS.map((c) => (
            <button key={c} type="button" onClick={() => go(c)} className="rounded-full border bg-card px-3 py-1.5 text-sm hover:border-primary/40 hover:bg-accent">
              {c}
            </button>
          ))}
        </div>
        {signedIn && (
          <p className="mt-6 text-sm">
            <Link href="/home" className="text-primary hover:underline">
              Continue where you left off →
            </Link>
          </p>
        )}
      </section>

      <section>
        <h2 className="text-center text-2xl font-semibold">Not another video library</h2>
        <p className="mx-auto mt-2 max-w-2xl text-center text-muted-foreground">Every skill moves through four states — and only real evidence moves it forward.</p>
        <ol className="mx-auto mt-8 grid max-w-4xl gap-3 sm:grid-cols-4">
          {[
            ["Exposed", "I watched it", "bg-slate-400"],
            ["Understood", "I can answer questions about it", "bg-sky-500"],
            ["Applied", "I used it in a real task", "bg-amber-500"],
            ["Verified", "Assessed and proven", "bg-emerald-600"],
          ].map(([t, d, c], i) => (
            <li key={t} className="rounded-2xl border bg-card p-4">
              <span className={`mb-3 block h-1.5 w-full rounded-full ${c}`} />
              <p className="text-xs text-muted-foreground">Step {i + 1}</p>
              <p className="font-heading text-lg font-semibold">{t}</p>
              <p className="text-sm text-muted-foreground">“{d}”</p>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className="text-2xl font-semibold">Six ways to find what&apos;s next</h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MODES.map((m) => (
            <Link key={m.mode} href={m.mode === "goal" ? "/start" : `/explore?mode=${m.mode}`} className="group flex items-start gap-3 rounded-2xl border bg-card p-4 hover:border-primary/40">
              <m.icon className="mt-0.5 size-5 text-primary" />
              <span>
                <span className="block font-semibold group-hover:underline">{m.title}</span>
                <span className="text-sm text-muted-foreground">{m.text}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-2xl font-semibold">Career paths, with honest evidence</h2>
          <Link href="/explore?mode=career" className="text-sm text-primary hover:underline">
            All careers
          </Link>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {CAREERS.map((c) => (
            <Link key={c.id} href={`/careers/${c.id}`} className="group rounded-2xl border bg-card p-5 hover:border-primary/40">
              <p className="font-heading text-2xl font-semibold group-hover:underline">{c.name}</p>
              <p className="text-muted-foreground">{c.tagline}</p>
              <p className="mt-3 text-sm">{c.courses.length} courses · {c.projects.length} portfolio project · evidence-backed credential</p>
              <Reason className="mt-2 text-xs">We don&apos;t promise jobs. We show evidence that you&apos;re ready.</Reason>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold">Popular right now</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {COURSES.filter((c) => c.authored).slice(0, 4).map((c) => (
            <CourseCard key={c.slug} course={c} />
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        {[
          { icon: Smartphone, t: "Built for any phone", d: "Works on an inexpensive Android on 3G. Download lessons and learn offline." },
          { icon: Feather, t: "Data saver", d: "Audio-only video with slides, text first. See the size before you download." },
          { icon: Wallet, t: "Pay how you pay", d: "Mobile money and local prices. Most courses are free." },
          { icon: BadgeCheck, t: "Credentials with evidence", d: "Never for watching alone. Anyone can verify them in one click." },
        ].map((f) => (
          <div key={f.t} className="rounded-2xl border bg-card p-4">
            <f.icon className="size-5 text-primary" />
            <p className="mt-2 font-semibold">{f.t}</p>
            <p className="text-sm text-muted-foreground">{f.d}</p>
          </div>
        ))}
      </section>

      <section className="rounded-3xl bg-primary p-8 text-primary-foreground">
        <div className="flex flex-wrap items-center gap-6">
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-semibold">Coming from ClassProject?</h2>
            <p className="mt-1 opacity-90">Find free courses matched to your school subjects — safe for students, with no school data shared.</p>
          </div>
          <LinkButton href="/partners/classproject" variant="secondary" size="lg">
            For ClassProject students <ArrowRight />
          </LinkButton>
        </div>
      </section>

      <section className="text-center">
        <LinkButton href="/explore" variant="outline">
          <Search /> Browse everything
        </LinkButton>
      </section>
    </div>
  );
}

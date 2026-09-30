"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Flag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageTitle, STATE_STYLE, StateBadge, StateLadder } from "@/components/open/bits";
import { COURSES, activitiesOf } from "@/lib/data/courses";
import { COMPETENCIES, skillById } from "@/lib/data/graph";
import { EVIDENCE, STATE_LABEL, STATE_MEANING } from "@/lib/mastery";
import { useOpen } from "@/lib/store";
import type { SkillState } from "@/lib/types";
import { cn } from "@/lib/utils";

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

/** The learner's competency graph (spec section 15.4): state, evidence and what moves it forward. */
export default function SkillsPage() {
  const s = useOpen();
  const goal = s.goals.find((g) => g.id === s.activeGoal);
  const [all, setAll] = useState(false);
  const relevant = new Set([...(goal?.skills ?? []), ...Object.keys(s.mastery)]);
  const groups = COMPETENCIES.map((c) => ({ c, skills: c.skills.filter((sk) => all || relevant.has(sk)) })).filter((g) => g.skills.length);
  const counts = (["exposed", "understood", "applied", "verified"] as SkillState[]).map((st) => ({ st, n: Object.values(s.mastery).filter((m) => m.state === st).length }));

  return (
    <>
      <PageTitle title="Your skills" description="Not course completion — what you can actually do, and the evidence behind it.">
        <Button variant="outline" size="sm" onClick={() => setAll((a) => !a)}>
          {all ? "Only my skills" : "Show every skill"}
        </Button>
      </PageTitle>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {counts.map(({ st, n }) => (
          <div key={st} className="rounded-2xl border bg-card p-4">
            <span className={cn("mb-2 block h-1.5 rounded-full", STATE_STYLE[st].bar)} />
            <p className="font-heading text-3xl font-semibold">{n}</p>
            <p className="text-sm font-medium">{STATE_LABEL[st]}</p>
            <p className="text-xs text-muted-foreground">“{STATE_MEANING[st]}”</p>
          </div>
        ))}
      </div>

      <div className="space-y-8">
        {groups.map(({ c, skills }) => (
          <section key={c.id}>
            <h2 className="mb-3 text-xl font-semibold">{c.name}</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {skills.map((sk) => {
                const skill = skillById.get(sk)!;
                const m = s.mastery[sk];
                const st = m?.state ?? "not_started";
                // What moves it forward: the next unfinished activity that teaches it.
                const teach = COURSES.flatMap((co) => activitiesOf(co).filter((a) => a.skills.includes(sk)).map((a) => ({ co, a })));
                const nextStep = st === "understood" || st === "applied" ? teach.find((t) => t.a.kind === "mastery_check") ?? teach.find((t) => !s.progress[t.a.id]?.done) : teach.find((t) => !s.progress[t.a.id]?.done && t.a.kind !== "mastery_check");
                return (
                  <article key={sk} id={sk} className="scroll-mt-24 rounded-2xl border bg-card p-4 target:ring-2 target:ring-primary/40">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold">{skill.name}</p>
                        <p className="text-sm text-muted-foreground">{skill.description}</p>
                      </div>
                      <StateBadge state={st} />
                    </div>
                    <div className="mt-3">
                      <StateLadder state={st} />
                    </div>
                    {m && m.evidence.length > 0 ? (
                      <details className="mt-3">
                        <summary className="cursor-pointer text-xs text-muted-foreground">
                          Why “{STATE_LABEL[st]}”? · {m.evidence.length} piece{m.evidence.length > 1 ? "s" : ""} of evidence · estimate {Math.round(m.p * 100)}%
                        </summary>
                        <ul className="mt-2 space-y-1 text-xs">
                          {m.evidence.slice(0, 6).map((e) => (
                            <li key={e.id} className="flex gap-2">
                              <span className="w-12 shrink-0 text-muted-foreground">{fmtDate(e.at)}</span>
                              <span className="flex-1">
                                {e.label} <span className="text-muted-foreground">· {EVIDENCE[e.source].label}, counts ×{e.weight}</span>
                              </span>
                              <span className={e.outcome >= 0.5 ? "text-emerald-700" : "text-muted-foreground"}>{e.source === "exposure" ? "seen" : e.outcome >= 0.5 ? "✓" : "✗"}</span>
                            </li>
                          ))}
                        </ul>
                        <Button variant="ghost" size="xs" className="mt-2" onClick={() => toast("Thanks — a reviewer will check this evidence (e.g. a shared device) and fix your skill map if needed.")}>
                          <Flag /> Dispute evidence
                        </Button>
                      </details>
                    ) : (
                      <p className="mt-3 text-xs text-muted-foreground">No evidence yet.</p>
                    )}
                    {nextStep && st !== "verified" && (
                      <Link href={`/learn/${nextStep.co.slug}/${nextStep.a.id}`} className="mt-3 flex items-center gap-1 text-sm text-primary hover:underline">
                        Next: {nextStep.a.kind === "mastery_check" ? `verify it in the ${nextStep.co.title} mastery check` : nextStep.a.title} <ArrowRight className="size-3.5" />
                      </Link>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}

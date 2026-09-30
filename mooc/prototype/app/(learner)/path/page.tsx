"use client";

import Link from "next/link";
import { BadgeCheck, Check, FolderKanban, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Empty, PageTitle, Reason } from "@/components/open/bits";
import { LinkButton } from "@/components/open/shell";
import { activitiesOf, courseBySlug } from "@/lib/data/courses";
import { credentialById, projectById, skillName } from "@/lib/data/graph";
import { courseProgress, criterionMet, planStatus } from "@/lib/learning";
import { setOpen, useOpen } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useNow } from "@/lib/use-now";

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const fmtDate = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

/** The personal path and the planner (spec section 6.4, FR-LP-1..5). */
export default function PathPage() {
  const s = useOpen();
  const now = useNow(60_000);
  const goal = s.goals.find((g) => g.id === s.activeGoal);
  if (!goal)
    return (
      <Empty title="No path yet">
        <LinkButton href="/start" className="mt-3">
          Set a goal
        </LinkButton>
      </Empty>
    );
  const plan = planStatus(s);
  const p = s.profile!;

  // Next two weeks of study sessions, filled with the next unfinished activities.
  const perSession = Math.round((p.hoursPerWeek * 60) / Math.max(1, p.preferredDays.length));
  const queue = s.path
    .filter((st) => st.kind === "course")
    .flatMap((st) => {
      const c = courseBySlug.get(st.ref);
      return c ? activitiesOf(c).filter((a) => !s.progress[a.id]?.done).map((a) => ({ c, a })) : [];
    });
  const sessions: { date: Date; items: string[] }[] = [];
  let qi = 0;
  for (let d = 0; d < 14 && sessions.length < 6; d++) {
    const date = new Date(now + d * 864e5);
    const key = DAYS[(date.getDay() + 6) % 7]!;
    if (!p.preferredDays.includes(key)) continue;
    let mins = 0;
    const items: string[] = [];
    while (qi < queue.length && mins + queue[qi]!.a.minutes <= perSession + 3) {
      items.push(queue[qi]!.a.title);
      mins += queue[qi]!.a.minutes;
      qi++;
    }
    sessions.push({ date, items });
  }

  return (
    <>
      <PageTitle title="My path" description={<>Goal: <span className="font-medium text-foreground">{goal.label}</span></>}>
        <LinkButton href="/start" variant="outline" size="sm">
          Change goal
        </LinkButton>
      </PageTitle>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <ol className="relative space-y-3 border-l-2 border-dashed pl-6">
          {s.path.map((st, i) => {
            if (st.kind === "course") {
              const c = courseBySlug.get(st.ref);
              if (!c) return null;
              const pr = courseProgress(c, s);
              const done = pr.pct === 100 || (s.checks[c.slug]?.pct ?? 0) >= 70;
              return (
                <li key={i} className="relative rounded-2xl border bg-card p-4">
                  <span className={cn("absolute top-5 -left-[33px] grid size-4 place-items-center rounded-full border-2 bg-background", done && "border-emerald-600 bg-emerald-600")}>{done && <Check className="size-3 text-white" />}</span>
                  <p className="text-xs text-muted-foreground">
                    <GraduationCap className="mr-1 inline size-3.5" />
                    Course {i + 1}
                  </p>
                  <Link href={`/courses/${c.slug}`} className="font-heading text-lg font-semibold hover:underline">
                    {c.title}
                  </Link>
                  <Reason className="mt-1 text-xs">{st.reason}</Reason>
                  {st.skipped && st.skipped.length > 0 && <p className="mt-1 text-xs text-emerald-700">Skipping what you already know: {st.skipped.map(skillName).join(", ")}</p>}
                  <div className="mt-3 flex items-center gap-2">
                    <Progress value={pr.pct} className="flex-1" />
                    <span className="text-xs text-muted-foreground tabular-nums">{pr.pct}%</span>
                  </div>
                </li>
              );
            }
            if (st.kind === "project") {
              const pj = projectById.get(st.ref);
              const sub = s.submissions[st.ref];
              return (
                <li key={i} className="relative rounded-2xl border bg-card p-4">
                  <span className={cn("absolute top-5 -left-[33px] size-4 rounded-full border-2 bg-background", sub?.status === "passed" && "border-emerald-600 bg-emerald-600")} />
                  <p className="text-xs text-muted-foreground">
                    <FolderKanban className="mr-1 inline size-3.5" />
                    Portfolio project
                  </p>
                  <Link href={`/projects/${st.ref}`} className="font-heading text-lg font-semibold hover:underline">
                    {pj?.title}
                  </Link>
                  <Reason className="mt-1 text-xs">{st.reason}</Reason>
                  <p className="mt-1 text-xs text-muted-foreground">{sub?.status === "passed" ? "Passed" : sub?.status === "in_review" ? "In review" : "Not submitted yet"}</p>
                </li>
              );
            }
            const def = credentialById.get(st.ref);
            const met = def?.criteria.filter((c) => criterionMet(c, s)).length ?? 0;
            return (
              <li key={i} className="relative rounded-2xl border border-primary/30 bg-accent/40 p-4">
                <span className="absolute top-5 -left-[33px] size-4 rounded-full border-2 border-primary bg-background" />
                <p className="text-xs text-muted-foreground">
                  <BadgeCheck className="mr-1 inline size-3.5" />
                  Credential
                </p>
                <Link href="/credentials" className="font-heading text-lg font-semibold hover:underline">
                  {def?.name}
                </Link>
                <p className="mt-1 text-xs">
                  {met} of {def?.criteria.length} requirements met
                </p>
              </li>
            );
          })}
        </ol>

        <aside className="space-y-4">
          <section className="space-y-4 rounded-2xl border bg-card p-4">
            <h2 className="text-lg font-semibold">Planner</h2>
            <div className="grid gap-1.5">
              <Label>Hours a week: {p.hoursPerWeek}</Label>
              <input type="range" min={1} max={15} value={p.hoursPerWeek} onChange={(e) => setOpen((st) => ({ profile: { ...st.profile!, hoursPerWeek: Number(e.target.value) } }))} className="accent-primary" aria-label="Hours a week" />
            </div>
            <div className="grid gap-1.5">
              <Label>Days that suit you</Label>
              <div className="flex flex-wrap gap-1">
                {DAYS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={p.preferredDays.includes(d)}
                    onClick={() => setOpen((st) => ({ profile: { ...st.profile!, preferredDays: st.profile!.preferredDays.includes(d) ? st.profile!.preferredDays.filter((x) => x !== d) : [...st.profile!.preferredDays, d] } }))}
                    className={cn("rounded-md border px-2 py-1 text-xs capitalize", p.preferredDays.includes(d) ? "border-primary bg-primary text-primary-foreground" : "bg-card")}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="dl">Target date</Label>
              <Input id="dl" type="date" value={s.planDeadline?.slice(0, 10) ?? ""} onChange={(e) => e.target.value && (setOpen({ planDeadline: new Date(e.target.value).toISOString() }), toast.success("Plan updated"))} />
            </div>
            <div className="rounded-xl bg-muted/60 p-3 text-sm">
              <p>
                Projected finish: <span className="font-medium">{fmtDate(plan.projected)}</span>
              </p>
              <p className="text-muted-foreground">{Math.round(plan.remainingMin / 60)} h of learning left. We assume you&apos;ll manage about 70% of planned time — life happens.</p>
              {plan.behind && <p className="mt-1 text-amber-700 dark:text-amber-400">To finish by your target, plan about {plan.neededHours} h a week — or move the date.</p>}
            </div>
          </section>
          <section className="rounded-2xl border bg-card p-4">
            <h2 className="mb-2 text-lg font-semibold">Next two weeks</h2>
            {sessions.length === 0 && <p className="text-sm text-muted-foreground">Pick at least one day.</p>}
            <ul className="space-y-2 text-sm">
              {sessions.map((se) => (
                <li key={se.date.toISOString()} className="rounded-lg border p-2">
                  <p className="font-medium">
                    {se.date.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" })} · {perSession} min
                  </p>
                  <p className="text-xs text-muted-foreground">{se.items.length ? se.items.join(" · ") : "Review and project work"}</p>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">Add to your calendar (ICS) in production.</p>
          </section>
        </aside>
      </div>
    </>
  );
}

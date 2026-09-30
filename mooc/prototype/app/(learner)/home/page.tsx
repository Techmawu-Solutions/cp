"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, BadgeCheck, CalendarClock, Clock, FolderKanban, Repeat, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CourseCard, Reason, StateBadge, StateLadder } from "@/components/open/bits";
import { LinkButton } from "@/components/open/shell";
import { COURSES } from "@/lib/data/courses";
import { credentialById, projectById, skillName } from "@/lib/data/graph";
import { courseProgress, dueReview, nextBestActivity, planStatus } from "@/lib/learning";
import { atLeast } from "@/lib/mastery";
import { setOpen, useOpen } from "@/lib/store";

const fmtDate = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

/** Today (spec section 20.2): one next best activity, review due, plan — everything explains why. */
export default function Today() {
  const s = useOpen();
  const router = useRouter();
  const instructor = s.profile?.role === "instructor";
  useEffect(() => {
    if (instructor) router.replace("/studio");
  }, [instructor, router]);
  if (instructor) return null;

  const goal = s.goals.find((g) => g.id === s.activeGoal);
  const next = nextBestActivity(s);
  const due = dueReview(s);
  const plan = planStatus(s);
  const goalSkills = goal?.skills ?? [];
  const project = s.path.find((st) => st.kind === "project");
  const sub = project ? s.submissions[project.ref] : undefined;
  const hour = new Date().getHours();

  // Recommendations: courses teaching the goal's gap skills that aren't in progress; always with a reason.
  const gaps = goalSkills.filter((sk) => !atLeast(s.mastery[sk]?.state ?? "not_started", "understood"));
  const recs = COURSES.filter((c) => !s.enrollments[c.slug] && !s.dismissed.includes(c.slug))
    .map((c) => {
      const hit = c.skills.find((sk) => gaps.includes(sk));
      const partner = s.profile?.fromPartner?.subject && c.subjects.includes(s.profile.fromPartner.subject);
      const reason = hit ? `Closes a gap for your goal: ${skillName(hit)}` : partner ? "Matches the subject you came from ClassProject for" : null;
      return reason ? { c, reason } : null;
    })
    .filter((x): x is { c: (typeof COURSES)[number]; reason: string } => !!x)
    .slice(0, 3);

  if (!goal && !next)
    return (
      <div className="mx-auto max-w-xl text-center">
        <h1 className="text-3xl font-semibold">Welcome, {s.profile?.name.split(" ")[0]}</h1>
        <p className="mt-2 text-muted-foreground">Set a goal and we&apos;ll build your path.</p>
        <LinkButton href="/start" className="mt-6" size="lg">
          What do you want to achieve? <ArrowRight />
        </LinkButton>
      </div>
    );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">{hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"}, {s.profile?.name.split(" ")[0]}</p>
        <h1 className="text-3xl font-semibold">Today</h1>
        {goal && (
          <p className="mt-1 text-muted-foreground">
            Working towards: <span className="font-medium text-foreground">{goal.label}</span>
          </p>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardDescription>Your next best step</CardDescription>
            {next ? (
              <>
                <CardTitle className="font-heading text-2xl">{next.activity.title}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {next.course.title} · about {next.activity.minutes} min
                </p>
              </>
            ) : (
              <CardTitle className="font-heading text-2xl">Your courses are done — time for the project</CardTitle>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {next && <Reason>{next.reason}</Reason>}
            <div className="flex flex-wrap gap-2">
              {next ? (
                <LinkButton href={`/learn/${next.course.slug}/${next.activity.id}`} size="lg">
                  Start <ArrowRight />
                </LinkButton>
              ) : project ? (
                <LinkButton href={`/projects/${project.ref}`} size="lg">
                  Open the project <ArrowRight />
                </LinkButton>
              ) : null}
              {due.length > 0 && (
                <LinkButton href="/review" variant="outline" size="lg">
                  <Repeat /> Review first ({due.length}) · ~{Math.max(2, due.length)} min
                </LinkButton>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="size-4" /> Your plan
            </CardTitle>
            <CardDescription>{s.profile?.hoursPerWeek} h a week · {Math.round(plan.doneMin / 60)} of {Math.round(plan.totalMin / 60)} h done</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Progress value={plan.totalMin ? (plan.doneMin / plan.totalMin) * 100 : 0} />
            <p>
              Projected finish: <span className="font-medium">{fmtDate(plan.projected)}</span>
              {plan.deadline && <span className="text-muted-foreground"> · target {fmtDate(plan.deadline)}</span>}
            </p>
            {plan.behind ? (
              <div className="rounded-lg bg-amber-50 p-2.5 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                <p>You&apos;re a little behind. No stress — pick what works:</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Button size="xs" variant="outline" onClick={() => (setOpen((st) => ({ profile: { ...st.profile!, hoursPerWeek: plan.neededHours } })), toast.success(`Plan updated: ${plan.neededHours} h a week keeps your date`))}>
                    Study {plan.neededHours} h/week
                  </Button>
                  <Button size="xs" variant="outline" onClick={() => (setOpen({ planDeadline: plan.projected.toISOString() }), toast.success(`Target moved to ${fmtDate(plan.projected)}`))}>
                    Move target to {fmtDate(plan.projected)}
                  </Button>
                </div>
              </div>
            ) : (
              plan.deadline && <p className="text-emerald-700 dark:text-emerald-400">On track for your target.</p>
            )}
            <Link href="/path" className="inline-block text-primary hover:underline">
              See the whole path
            </Link>
          </CardContent>
        </Card>
      </div>

      {goalSkills.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Skills for your goal</CardTitle>
            <CardDescription>What you know, what you need — and whether you can show it.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {goalSkills.slice(0, 8).map((sk) => {
              const st = s.mastery[sk]?.state ?? "not_started";
              return (
                <Link key={sk} href={`/skills#${sk}`} className="rounded-xl border p-3 hover:bg-muted/40">
                  <p className="truncate text-sm font-medium">{skillName(sk)}</p>
                  <div className="mt-2">
                    <StateLadder state={st} />
                  </div>
                  <div className="mt-2">
                    <StateBadge state={st} />
                  </div>
                </Link>
              );
            })}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="size-4" /> In progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.keys(s.enrollments).length === 0 && <p className="text-sm text-muted-foreground">Nothing yet.</p>}
            {Object.keys(s.enrollments).map((slug) => {
              const c = COURSES.find((x) => x.slug === slug);
              if (!c) return null;
              const p = courseProgress(c, s);
              return (
                <Link key={slug} href={`/courses/${slug}`} className="block">
                  <p className="truncate text-sm font-medium">{c.title}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <Progress value={p.pct} className="flex-1" />
                    <span className="text-xs text-muted-foreground tabular-nums">{p.pct}%</span>
                  </div>
                </Link>
              );
            })}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FolderKanban className="size-4" /> Project
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {project ? (
              <>
                <p className="font-medium">{projectById.get(project.ref)?.title}</p>
                <p className="text-muted-foreground">{sub?.status === "passed" ? "Passed — in your portfolio" : sub?.status === "in_review" ? "In peer review" : `${sub?.milestonesDone ?? 0} of ${projectById.get(project.ref)?.milestones.length} milestones`}</p>
                <Link href={`/projects/${project.ref}`} className="mt-2 inline-block text-primary hover:underline">
                  Open project
                </Link>
              </>
            ) : (
              <p className="text-muted-foreground">Your path has no project yet.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BadgeCheck className="size-4" /> Credentials
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {s.credentials.length === 0 && <p className="text-muted-foreground">None yet — they come from assessments and projects, never from watching.</p>}
            {s.credentials.map((c) => (
              <Link key={c.code} href={`/verify/${c.code}`} className="block truncate text-primary hover:underline">
                {credentialById.get(c.defId)?.name}
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      {recs.length > 0 && s.profile?.personalisation && (
        <section>
          <h2 className="mb-3 text-xl font-semibold">Recommended for you</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recs.map(({ c, reason }) => (
              <div key={c.slug} className="relative">
                <CourseCard course={c} reason={reason} />
                <Button variant="ghost" size="icon-xs" className="absolute top-2 right-2" aria-label={`Not interested in ${c.title}`} onClick={() => (setOpen((st) => ({ dismissed: [...st.dismissed, c.slug] })), toast("Got it — we'll recommend less like this"))}>
                  <X />
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

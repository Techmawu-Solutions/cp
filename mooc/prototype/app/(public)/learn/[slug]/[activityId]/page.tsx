"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ArrowRight, BookOpen, Check, ClipboardCheck, FolderKanban, PenLine, PlayCircle, Target } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Markdown, StateBadge, StateLadder } from "@/components/open/bits";
import { LinkButton } from "@/components/open/shell";
import { MasteryCheck, PracticeSet } from "@/components/open/player/practice";
import { SimVideo } from "@/components/open/player/sim-video";
import { Tutor } from "@/components/open/player/tutor";
import { activitiesOf, courseBySlug, findActivity } from "@/lib/data/courses";
import { skillName } from "@/lib/data/graph";
import { completeActivity } from "@/lib/learning";
import { STATE_MEANING } from "@/lib/mastery";
import { useOpen } from "@/lib/store";
import type { ActivityKind } from "@/lib/types";
import { cn } from "@/lib/utils";

const ICON: Record<ActivityKind, typeof PlayCircle> = { video: PlayCircle, reading: BookOpen, practice: PenLine, project: FolderKanban, mastery_check: ClipboardCheck };
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/** The learn player (spec section 20.2): activity + "where this fits" rail + in-context tutor. */
export default function LearnPage() {
  const { slug, activityId } = useParams<{ slug: string; activityId: string }>();
  const course = courseBySlug.get(slug);
  const found = course ? findActivity(course, decodeURIComponent(activityId)) : null;
  const s = useOpen();
  const signedIn = !!s.profile;

  if (!course || !found)
    return (
      <p>
        Lesson not found. <Link href="/explore" className="text-primary hover:underline">Explore courses</Link>
      </p>
    );

  const { module, lesson, activity } = found;
  const all = activitiesOf(course);
  const idx = all.findIndex((a) => a.id === activity.id);
  const prev = all[idx - 1];
  const next = all[idx + 1];
  const objectives = course.objectives.filter((o) => activity.objectives.includes(o.id));
  const notes = s.notes.filter((n) => n.activityId === activity.id);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="min-w-0 space-y-5">
        <nav className="text-sm text-muted-foreground" aria-label="Breadcrumb">
          <Link href={`/courses/${course.slug}`} className="hover:underline">
            {course.title}
          </Link>{" "}
          › {module.title} › {lesson.title}
        </nav>
        <h1 className="text-2xl font-semibold">{activity.title}</h1>
        {!signedIn && (
          <div className="rounded-xl border border-primary/30 bg-accent/50 p-3 text-sm">
            You&apos;re previewing. <Link href="/start" className="font-medium text-primary hover:underline">Create a free account</Link> to save progress, practise with hints and earn credentials.
          </div>
        )}
        {!course.authored && <p className="rounded-lg bg-muted p-2 text-xs text-muted-foreground">Sample course: this prototype has the outline only. Try a flagship course for full lessons.</p>}

        {activity.kind === "video" && <SimVideo key={activity.id} activity={activity} record={signedIn} />}
        {activity.kind === "reading" && (
          <article className="rounded-2xl border bg-card p-5 sm:p-8">
            <Markdown source={activity.body ?? ""} />
            {signedIn && (
              <Button className="mt-6" variant={s.progress[activity.id]?.done ? "outline" : "default"} onClick={() => (completeActivity(activity), toast.success("Marked as read"))}>
                <Check /> {s.progress[activity.id]?.done ? "Read" : "Mark as read"}
              </Button>
            )}
          </article>
        )}
        {activity.kind === "practice" && <PracticeSet key={activity.id} activity={activity} record={signedIn} />}
        {activity.kind === "mastery_check" && <MasteryCheck key={activity.id} activity={activity} record={signedIn} />}

        <div className="flex justify-between gap-2 border-t pt-4">
          {prev ? (
            <LinkButton href={`/learn/${course.slug}/${prev.id}`} variant="ghost">
              <ArrowLeft /> <span className="max-w-48 truncate">{prev.title}</span>
            </LinkButton>
          ) : (
            <span />
          )}
          {next && (
            <LinkButton href={`/learn/${course.slug}/${next.id}`} variant="outline">
              <span className="max-w-48 truncate">{next.title}</span> <ArrowRight />
            </LinkButton>
          )}
        </div>
      </div>

      <aside className="space-y-4">
        <section className="rounded-2xl border bg-card p-4">
          <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            <Target className="size-3.5" /> Where this fits
          </p>
          {objectives.map((o) => (
            <p key={o.id} className="mt-2 text-sm">
              <span className="font-medium">Objective:</span> {o.text}
            </p>
          ))}
          {lesson.concepts.length > 0 && <p className="mt-2 text-xs text-muted-foreground">Concepts: {lesson.concepts.join(" · ")}</p>}
          {activity.skills.map((sk) => {
            const st = s.mastery[sk]?.state ?? "not_started";
            return (
              <div key={sk} className="mt-3 space-y-1.5">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <Link href={`/skills#${sk}`} className="font-medium hover:underline">
                    {skillName(sk)}
                  </Link>
                  <StateBadge state={st} />
                </div>
                <StateLadder state={st} />
                <p className="text-xs text-muted-foreground">
                  {STATE_MEANING[st]}.{" "}
                  {activity.kind === "video" || activity.kind === "reading" ? "Watching and reading only count as “Exposed” — practice shows understanding." : ""}
                </p>
              </div>
            );
          })}
        </section>

        <section className="rounded-2xl border bg-card p-4">
          <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">This lesson</p>
          <ol className="space-y-1">
            {lesson.activities.map((a) => {
              const I = ICON[a.kind];
              const done = s.progress[a.id]?.done;
              return (
                <li key={a.id}>
                  <Link href={`/learn/${course.slug}/${a.id}`} className={cn("flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted", a.id === activity.id && "bg-accent font-medium")}>
                    {done ? <Check className="size-4 text-emerald-600" /> : <I className="size-4 text-muted-foreground" />}
                    <span className="flex-1 truncate">{a.title}</span>
                    <span className="text-xs text-muted-foreground">{a.minutes}m</span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>

        <section className="rounded-2xl border bg-card p-4">
          <Tabs defaultValue="tutor">
            <TabsList className="w-full">
              <TabsTrigger value="tutor">Tutor</TabsTrigger>
              <TabsTrigger value="notes">Notes ({notes.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="tutor" className="pt-3">
              <Tutor activityId={activity.id} />
            </TabsContent>
            <TabsContent value="notes" className="space-y-2 pt-3 text-sm">
              {notes.length === 0 && <p className="text-muted-foreground">{activity.kind === "video" ? "Use “Note at …” under the video to save time-stamped notes." : "No notes on this activity."}</p>}
              {notes.map((n) => (
                <p key={n.id} className="rounded-lg bg-muted/60 p-2">
                  {n.at != null && <span className="mr-1 text-xs text-primary tabular-nums">{fmt(n.at)}</span>}
                  {n.text}
                </p>
              ))}
            </TabsContent>
          </Tabs>
        </section>
      </aside>
    </div>
  );
}

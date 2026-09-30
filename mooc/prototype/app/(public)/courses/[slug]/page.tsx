"use client";

import { Suspense, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Accessibility, ArrowRight, BadgeCheck, BookOpen, Captions, Check, ClipboardCheck, Clock, Download, FolderKanban, GraduationCap, Languages, PenLine, PlayCircle, RefreshCw, School, Target, Users } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CourseThumb, Reason, StateBadge } from "@/components/open/bits";
import { LinkButton } from "@/components/open/shell";
import { activitiesOf, courseBySlug } from "@/lib/data/courses";
import { credentialById, skillName } from "@/lib/data/graph";
import { courseProgress, criterionLabel, enrol } from "@/lib/learning";
import { SUBJECT_NAMES } from "@/lib/partner";
import { setOpen, useOpen } from "@/lib/store";
import type { ActivityKind } from "@/lib/types";

const ICON: Record<ActivityKind, typeof PlayCircle> = { video: PlayCircle, reading: BookOpen, practice: PenLine, project: FolderKanban, mastery_check: ClipboardCheck };

export default function CoursePage() {
  return (
    <Suspense>
      <Body />
    </Suspense>
  );
}

function Body() {
  const { slug } = useParams<{ slug: string }>();
  const params = useSearchParams();
  const router = useRouter();
  const course = courseBySlug.get(slug);
  const s = useOpen();
  const ref = params.get("ref");
  const subject = params.get("subject") ?? undefined;
  const level = params.get("level") ?? undefined;
  const logged = useRef(false);

  // Anonymous partner referral (spec section 25.2): subject and level only.
  useEffect(() => {
    if (ref === "classproject" && course && !logged.current) {
      logged.current = true;
      setOpen((st) => ({ referrals: [...st.referrals, { subject, level, course: course.slug, at: new Date().toISOString() }] }), false);
    }
  }, [ref, course, subject, level]);

  if (!course)
    return (
      <p>
        Course not found. <Link href="/explore" className="text-primary hover:underline">Explore courses</Link>
      </p>
    );

  const signedIn = !!s.profile;
  const enrolled = !!s.enrollments[course.slug];
  const progress = courseProgress(course, s);
  const first = activitiesOf(course)[0]!;
  const check = activitiesOf(course).find((a) => a.kind === "mastery_check");
  const cred = course.credential ? credentialById.get(course.credential) : undefined;
  const teenBlocked = s.profile?.ageBand === "teen" && course.minAge > 16;

  return (
    <div className="space-y-8">
      {ref === "classproject" && (
        <div className="rounded-2xl border border-primary/30 bg-accent/60 p-4">
          <p className="font-medium">
            <School className="mr-1.5 inline size-4" />
            Recommended by ClassProject{subject ? ` for ${SUBJECT_NAMES[subject] ?? subject}` : ""}{level ? ` · ${level.replace(/(\D+)(\d)/, "$1 $2")}` : ""}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{s.profile ? "" : "You can preview lessons without an account. "}ClassProject shared only the subject and level — not your name, school or grades. Learning here doesn&apos;t count towards school grades.</p>
        </div>
      )}

      <header className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          <p className="text-sm text-muted-foreground">
            {course.provider} · taught by {course.instructor}
          </p>
          <h1 className="mt-1 text-4xl font-semibold">{course.title}</h1>
          <p className="mt-2 text-lg text-muted-foreground">{course.subtitle}</p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            <Badge variant={course.free ? "secondary" : "outline"}>{course.free ? "Free" : `GH₵${course.priceGhs} · or with a subscription`}</Badge>
            <Badge variant="outline" className="capitalize">
              <GraduationCap /> {course.level}
            </Badge>
            <Badge variant="outline">
              <Clock /> {course.hours} h over ~{course.weeks} weeks
            </Badge>
            {course.exam && <Badge variant="outline">{course.exam} aligned</Badge>}
          </div>
          {course.skills.length > 0 && (
            <div className="mt-5">
              <p className="mb-2 text-sm font-medium">Skills you&apos;ll build</p>
              <div className="flex flex-wrap gap-2">
                {course.skills.map((sk) => (
                  <span key={sk} className="inline-flex items-center gap-2 rounded-full border bg-card py-1 pr-1 pl-3 text-sm">
                    {skillName(sk)} <StateBadge state={s.mastery[sk]?.state ?? "not_started"} />
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3 rounded-2xl border bg-card p-4">
          <CourseThumb course={course} dataSaver={s.profile?.dataSaver} />
          {enrolled ? (
            <>
              <p className="text-sm">
                {progress.done} of {progress.total} activities · skills understood: {progress.masteryPct}%
              </p>
              <LinkButton href={`/learn/${course.slug}/${progress.next?.id ?? first.id}`} className="w-full" size="lg">
                {progress.done ? "Continue" : "Start"} <ArrowRight />
              </LinkButton>
            </>
          ) : teenBlocked ? (
            <p className="text-sm text-muted-foreground">This course is for learners 16 and over.</p>
          ) : (
            <Button
              className="w-full"
              size="lg"
              onClick={() => {
                if (!signedIn) return router.push(`/learn/${course.slug}/${first.id}`);
                enrol(course.slug, ref === "classproject" ? "partner_referral" : "self");
                toast.success(`Enrolled in ${course.title}`);
                router.push(`/learn/${course.slug}/${first.id}`);
              }}
            >
              {signedIn ? (course.free ? "Enrol free" : `Enrol · GH₵${course.priceGhs}`) : "Preview the first lesson"} <ArrowRight />
            </Button>
          )}
          {!signedIn && (
            <LinkButton href={`/start?goal=${encodeURIComponent(course.title)}`} variant="outline" className="w-full">
              Create a free account
            </LinkButton>
          )}
          {signedIn && check && !enrolled && (
            <LinkButton href={`/learn/${course.slug}/${check.id}`} variant="ghost" className="w-full">
              Already know this? Test out
            </LinkButton>
          )}
          {signedIn && course.offline && (
            <Button
              variant="outline"
              className="w-full"
              disabled={s.downloads[course.slug] === "saved"}
              onClick={() => (setOpen((st) => ({ downloads: { ...st.downloads, [course.slug]: "saved" } }), false), toast.success(`Saved for offline (${course.sizeMb} MB)`))}
            >
              <Download /> {s.downloads[course.slug] === "saved" ? "Saved for offline" : `Download for offline · ${course.sizeMb} MB`}
            </Button>
          )}
          {!course.free && <p className="text-xs text-muted-foreground">Pay with mobile money (MTN, Telecel, AirtelTigo) or card. Scholarships available.</p>}
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" aria-label="What you're signing up for">
        <Fact icon={Target} title="Learning objectives">
          <ul className="space-y-1">
            {course.objectives.map((o) => (
              <li key={o.id} className="flex gap-1.5">
                <Check className="mt-0.5 size-3.5 shrink-0 text-primary" />
                <span>
                  {o.text} <span className="text-xs text-muted-foreground">({o.bloom})</span>
                </span>
              </li>
            ))}
          </ul>
        </Fact>
        <Fact icon={ClipboardCheck} title="How you're assessed">
          <ul className="list-disc space-y-1 pl-4">
            {course.assessment.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">Prerequisites: {course.prerequisites}</p>
        </Fact>
        <Fact icon={BadgeCheck} title="Credential">
          {cred ? (
            <>
              <p className="font-medium">{cred.name}</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs">
                {cred.criteria.map((c, i) => (
                  <li key={i}>{criterionLabel(c)}</li>
                ))}
              </ul>
              <p className="mt-1 text-xs text-muted-foreground">Never issued for watching alone.</p>
            </>
          ) : (
            <p>No credential for this course yet.</p>
          )}
        </Fact>
        <Fact icon={Accessibility} title="Accessibility">
          <ul className="space-y-0.5">
            <li>
              <Captions className="mr-1 inline size-3.5" />
              Captions {course.accessibility.captions ? "✓" : "—"} · transcripts {course.accessibility.transcripts ? "✓" : "—"}
            </li>
            <li>Audio-only mode {course.accessibility.audioOnly ? "✓" : "—"}</li>
            <li>Screen-reader tested {course.accessibility.screenReaderTested ? "✓ (Sep 2026)" : "— not yet"}</li>
          </ul>
        </Fact>
        <Fact icon={Languages} title="Languages & offline">
          <p>{course.languages.join(", ")}</p>
          <p className="mt-1">{course.offline ? `Downloadable · ${course.sizeMb} MB total` : "Online only"}</p>
        </Fact>
        <Fact icon={RefreshCw} title="Up to date?">
          <p>
            Version {course.version} · updated {new Date(course.lastUpdated).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
          </p>
          <p className="mt-1 flex items-center gap-1.5">
            <Users className="size-3.5" /> {course.learners.toLocaleString()} learners · {course.masteryRate}% reach mastery
          </p>
          <p className="mt-1 text-xs text-muted-foreground">We show mastery, not star ratings.</p>
        </Fact>
      </section>

      <section>
        <h2 className="text-2xl font-semibold">Syllabus</h2>
        <div className="mt-4 space-y-4">
          {course.modules.map((m, mi) => (
            <div key={m.id} className="rounded-2xl border bg-card">
              <p className="border-b px-4 py-3 font-semibold">
                {mi + 1}. {m.title}
              </p>
              <ul className="divide-y">
                {m.lessons.map((l) => (
                  <li key={l.id} className="px-4 py-3">
                    <p className="text-sm font-medium">{l.title}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {l.activities.map((a) => {
                        const I = ICON[a.kind];
                        const done = s.progress[a.id]?.done;
                        return (
                          <Link key={a.id} href={`/learn/${course.slug}/${a.id}`} className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs hover:bg-muted">
                            {done ? <Check className="size-3 text-emerald-600" /> : <I className="size-3" />}
                            {a.kind === "mastery_check" ? "Mastery check" : a.kind[0]!.toUpperCase() + a.kind.slice(1)} · {a.minutes}m
                          </Link>
                        );
                      })}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        {course.subjects.length > 0 && <Reason className="mt-4 text-xs">Aligned to the Ghana SHS curriculum: {course.subjects.map((c) => SUBJECT_NAMES[c] ?? c).join(", ")}.</Reason>}
      </section>
    </div>
  );
}

function Fact({ icon: I, title, children }: { icon: typeof Target; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-card p-4 text-sm">
      <p className="mb-2 flex items-center gap-1.5 font-semibold">
        <I className="size-4 text-primary" /> {title}
      </p>
      {children}
    </div>
  );
}

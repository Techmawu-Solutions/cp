"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowRight, BadgeCheck, FolderKanban } from "lucide-react";
import { CourseCard, Reason, StateBadge } from "@/components/open/bits";
import { LinkButton } from "@/components/open/shell";
import { courseBySlug } from "@/lib/data/courses";
import { COMPETENCIES, careerById, credentialById, projectById, skillName } from "@/lib/data/graph";
import { useOpen } from "@/lib/store";

/** Career page (spec section 28 of the brief): competencies, gaps, portfolio requirements — evidence of readiness, not a job promise. */
export default function CareerPage() {
  const { id } = useParams<{ id: string }>();
  const career = careerById.get(id);
  const mastery = useOpen((s) => s.mastery);
  if (!career) return <p>Career not found.</p>;
  const comps = COMPETENCIES.filter((c) => career.competencies.includes(c.id));
  return (
    <div className="space-y-10">
      <header>
        <p className="text-sm text-muted-foreground">Career path</p>
        <h1 className="text-4xl font-semibold">{career.name}</h1>
        <p className="mt-2 max-w-2xl text-lg text-muted-foreground">{career.description}</p>
        <LinkButton href={`/start?goal=${encodeURIComponent(`Become a ${career.name.toLowerCase()}`)}`} size="lg" className="mt-5">
          Check what I already know <ArrowRight />
        </LinkButton>
        <Reason className="mt-3 text-xs">We don&apos;t promise jobs. We show evidence of readiness: verified skills, a reviewed project and a credential employers can check.</Reason>
      </header>

      <section>
        <h2 className="mb-3 text-2xl font-semibold">Competencies you&apos;ll need</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {comps.map((c) => (
            <div key={c.id} className="rounded-2xl border bg-card p-4">
              <p className="font-semibold">{c.name}</p>
              <ul className="mt-2 space-y-1.5">
                {c.skills.map((sk) => (
                  <li key={sk} className="flex items-center justify-between gap-2 text-sm">
                    {skillName(sk)} <StateBadge state={mastery[sk]?.state ?? "not_started"} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-2xl font-semibold">The path</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {career.courses.map((slug) => {
            const c = courseBySlug.get(slug);
            return c ? <CourseCard key={slug} course={c} compact /> : null;
          })}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {career.projects.map((p) => (
          <div key={p} className="rounded-2xl border bg-card p-5">
            <FolderKanban className="size-5 text-primary" />
            <p className="mt-2 text-xs text-muted-foreground uppercase">Portfolio project</p>
            <p className="font-heading text-xl font-semibold">{projectById.get(p)?.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{projectById.get(p)?.brief}</p>
          </div>
        ))}
        <div className="rounded-2xl border bg-card p-5">
          <BadgeCheck className="size-5 text-emerald-600" />
          <p className="mt-2 text-xs text-muted-foreground uppercase">Credential</p>
          <p className="font-heading text-xl font-semibold">{credentialById.get(career.credential)?.name}</p>
          <p className="mt-1 text-sm text-muted-foreground">{credentialById.get(career.credential)?.description}</p>
          <Link href="/verify/SAMP-LE26-OPEN" className="mt-2 inline-block text-sm text-primary hover:underline">
            See a sample verification
          </Link>
        </div>
      </section>

      <section className="rounded-2xl border bg-card p-5">
        <p className="font-semibold">Roles this prepares you for</p>
        <p className="mt-1 text-sm text-muted-foreground">{career.roles.join(" · ")}</p>
      </section>
    </div>
  );
}

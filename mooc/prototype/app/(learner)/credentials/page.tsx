"use client";

import Link from "next/link";
import { BadgeCheck, Check, Circle } from "lucide-react";
import { PageTitle } from "@/components/open/bits";
import { CREDENTIALS } from "@/lib/data/graph";
import { criterionLabel, criterionMet } from "@/lib/learning";
import { useOpen } from "@/lib/store";

/** Earned credentials and progress towards the others (spec section 6.14). */
export default function CredentialsPage() {
  const s = useOpen();
  const earned = new Set(s.credentials.map((c) => c.defId));
  const relevant = CREDENTIALS.filter((d) => !earned.has(d.id) && d.criteria.some((c) => c.kind === "project" ? s.path.some((p) => p.ref === c.projectId) : c.kind === "mastery_check" ? !!s.enrollments[c.courseSlug] : !!s.mastery[c.skill]));
  return (
    <>
      <PageTitle title="Credentials" description="Every credential rests on evidence — assessments and reviewed projects, never watching alone." />
      <div className="grid gap-4 md:grid-cols-2">
        {s.credentials.map((c) => {
          const def = CREDENTIALS.find((d) => d.id === c.defId);
          return (
            <Link key={c.code} href={`/verify/${c.code}`} className="rounded-2xl border bg-card p-5 hover:border-primary/40">
              <BadgeCheck className="size-6 text-emerald-600" />
              <p className="mt-2 font-heading text-xl font-semibold">{def?.name}</p>
              <p className="text-sm text-muted-foreground">{def?.issuer}</p>
              <p className="mt-2 font-mono text-xs">
                {c.code} · {new Date(c.issuedAt).toLocaleDateString("en-GB")}
              </p>
            </Link>
          );
        })}
        {s.credentials.length === 0 && <p className="text-muted-foreground">None yet.</p>}
      </div>
      {relevant.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-xl font-semibold">Working towards</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {relevant.map((d) => (
              <div key={d.id} className="rounded-2xl border bg-card p-5">
                <p className="font-heading text-lg font-semibold">{d.name}</p>
                <ul className="mt-2 space-y-1 text-sm">
                  {d.criteria.map((c, i) => {
                    const met = criterionMet(c, s);
                    return (
                      <li key={i} className="flex items-center gap-2">
                        {met ? <Check className="size-4 text-emerald-600" /> : <Circle className="size-4 text-muted-foreground" />}
                        <span className={met ? "" : "text-muted-foreground"}>{criterionLabel(c)}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

"use client";

import Link from "next/link";
import { BadgeCheck, FolderKanban } from "lucide-react";
import { StateBadge } from "@/components/open/bits";
import { credentialById, projectById, skillName } from "@/lib/data/graph";
import type { OpenState } from "@/lib/store";

/** The portfolio: verified projects, credentials and skills (spec section 6.13). */
export function PortfolioView({ s }: { s: OpenState }) {
  const projects = Object.values(s.submissions).filter((x) => x.status === "passed");
  const skills = Object.entries(s.mastery).filter(([, m]) => m.state === "applied" || m.state === "verified");
  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 text-xl font-semibold">Projects</h2>
        {projects.length === 0 && <p className="text-sm text-muted-foreground">No reviewed projects yet.</p>}
        <div className="grid gap-4 md:grid-cols-2">
          {projects.map((p) => {
            const pj = projectById.get(p.projectId)!;
            return (
              <article key={p.projectId} className="rounded-2xl border bg-card p-5">
                <FolderKanban className="size-5 text-primary" />
                <p className="mt-2 font-heading text-lg font-semibold">{pj.title}</p>
                <p className="mt-1 line-clamp-4 text-sm text-muted-foreground">{p.summary}</p>
                <p className="mt-2 text-xs">
                  <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-emerald-900">Verified by ClassProject Open</span> · {p.finalPct}% · peer + instructor reviewed
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {pj.rubric.map((c) => (
                    <span key={c.id} className="rounded-full border px-2 py-0.5 text-xs">
                      {skillName(c.skill)}
                    </span>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </section>
      <section>
        <h2 className="mb-3 text-xl font-semibold">Credentials</h2>
        {s.credentials.length === 0 && <p className="text-sm text-muted-foreground">None yet.</p>}
        <div className="grid gap-3 md:grid-cols-2">
          {s.credentials.map((c) => (
            <Link key={c.code} href={`/verify/${c.code}`} className="flex items-center gap-3 rounded-2xl border bg-card p-4 hover:border-primary/40">
              <BadgeCheck className="size-6 shrink-0 text-emerald-600" />
              <span>
                <span className="block font-medium">{credentialById.get(c.defId)?.name}</span>
                <span className="text-xs text-muted-foreground">Verify: {c.code}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>
      <section>
        <h2 className="mb-3 text-xl font-semibold">Skills with evidence</h2>
        {skills.length === 0 && <p className="text-sm text-muted-foreground">Skills appear here once applied or verified.</p>}
        <div className="flex flex-wrap gap-2">
          {skills.map(([sk, m]) => (
            <span key={sk} className="inline-flex items-center gap-2 rounded-full border bg-card py-1 pr-1 pl-3 text-sm">
              {skillName(sk)} <StateBadge state={m.state} />
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertTriangle, BadgeCheck, Bot, Check, FileText, Scale, UserCheck, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageTitle, Reason } from "@/components/open/bits";
import { credentialById, projectById, skillName } from "@/lib/data/graph";
import { instructorAssess, peerConsensus, submitProject } from "@/lib/learning";
import { setOpen, useOpen } from "@/lib/store";
import { cn } from "@/lib/utils";

/** Project workspace (spec sections 6.11–6.12): brief, milestones, submission, calibrated peer review, instructor decision, appeal. */
export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const project = projectById.get(id);
  const s = useOpen();
  const sub = s.submissions[id];
  const [summary, setSummary] = useState(sub?.summary ?? "");
  const [link, setLink] = useState(sub?.link ?? "");
  if (!project) return <p>Project not found.</p>;
  const consensus = peerConsensus(id, s);
  const milestonesDone = sub?.milestonesDone ?? 0;
  const setMilestones = (n: number) => setOpen((st) => ({ submissions: { ...st.submissions, [id]: { ...(st.submissions[id] ?? { projectId: id, revision: 0, summary: "", link: "", submittedAt: new Date().toISOString(), status: "draft", reviews: [] }), milestonesDone: n } } }));

  return (
    <>
      <PageTitle title={project.title} description="A real problem, real data, reviewed by peers and an instructor — then it goes in your portfolio.">
        {sub?.status && (
          <span className={cn("rounded-full px-3 py-1 text-sm", sub.status === "passed" ? "bg-emerald-100 text-emerald-900" : sub.status === "in_review" ? "bg-sky-100 text-sky-900" : sub.status === "revision_requested" ? "bg-amber-100 text-amber-900" : "bg-muted")}>
            {{ draft: "Draft", in_review: "In review", passed: "Passed", revision_requested: "Revision requested" }[sub.status]}
          </span>
        )}
      </PageTitle>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <section className="rounded-2xl border bg-card p-5">
            <h2 className="text-lg font-semibold">The brief</h2>
            <p className="mt-2">{project.brief}</p>
            <h3 className="mt-4 font-semibold">Requirements</h3>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
              {project.requirements.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            <h3 className="mt-4 font-semibold">Resources</h3>
            <ul className="mt-1 space-y-1 text-sm">
              {project.resources.map((r) => (
                <li key={r} className="flex items-center gap-2">
                  <FileText className="size-4 text-muted-foreground" /> {r}
                </li>
              ))}
            </ul>
          </section>

          {(!sub || sub.status === "draft" || sub.status === "revision_requested") && (
            <section className="space-y-3 rounded-2xl border bg-card p-5">
              <h2 className="text-lg font-semibold">{sub?.status === "revision_requested" ? `Revision ${sub.revision + 1}` : "Submit your work"}</h2>
              <div className="grid gap-1.5">
                <Label htmlFor="sm">Summary of your findings and recommendation</Label>
                <Textarea id="sm" rows={6} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Lead with your finding and recommendation, then the evidence." />
                <p className="text-xs text-muted-foreground">{summary.trim().split(/\s+/).filter(Boolean).length} words</p>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="ln">Link to your work (sheet, repository, notebook)</Label>
                <Input id="ln" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://" />
              </div>
              <Button
                disabled={summary.trim().split(/\s+/).length < 20 || milestonesDone < project.milestones.length}
                onClick={() => {
                  submitProject(id, summary, link);
                  toast.success("Submitted — three anonymous peers have reviewed it");
                }}
              >
                Submit for review
              </Button>
              {milestonesDone < project.milestones.length && <p className="text-xs text-muted-foreground">Tick off every milestone first.</p>}
            </section>
          )}

          {sub && sub.reviews.length > 0 && consensus && (
            <section className="space-y-4 rounded-2xl border bg-card p-5">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <Users className="size-5" /> Peer review
              </h2>
              <p className="text-sm text-muted-foreground">Three anonymous reviewers who first passed a calibration exercise. Each counts by how accurately they graded the calibration samples — no single peer decides your result.</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="py-2 pr-2 font-medium">Criterion</th>
                      {sub.reviews.map((r) => (
                        <th key={r.reviewer} className="px-2 py-2 font-medium">
                          {r.reviewer}
                          <span className="block text-xs font-normal text-muted-foreground">weight {r.calibration.toFixed(2)}</span>
                        </th>
                      ))}
                      <th className="px-2 py-2 font-medium">Weighted</th>
                      {sub.instructorScores && <th className="px-2 py-2 font-medium">Instructor</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {project.rubric.map((c) => (
                      <tr key={c.id} className="border-b">
                        <td className="py-2 pr-2">
                          {c.title}
                          <span className="block text-xs text-muted-foreground">{skillName(c.skill)}</span>
                        </td>
                        {sub.reviews.map((r) => (
                          <td key={r.reviewer} className="px-2 tabular-nums">
                            {r.scores[c.id]}/{c.max}
                          </td>
                        ))}
                        <td className="px-2 font-medium tabular-nums">{consensus.perCriterion[c.id]!.toFixed(1)}</td>
                        {sub.instructorScores && <td className="px-2 font-medium tabular-nums">{sub.instructorScores[c.id]}/{c.max}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-sm">
                Peer result: <span className="font-medium">{consensus.pct}%</span> · reviewer agreement {Math.round(consensus.agreement * 100)}%
                {consensus.needsModeration && (
                  <span className="ml-2 inline-flex items-center gap-1 text-amber-700">
                    <AlertTriangle className="size-3.5" /> Low agreement — sent to the instructor to moderate
                  </span>
                )}
              </p>
              <ul className="space-y-1 text-sm">
                {sub.reviews.map((r) => (
                  <li key={r.reviewer}>
                    <span className="text-muted-foreground">{r.reviewer}:</span> “{r.comment}”
                  </li>
                ))}
              </ul>
              {sub.aiFeedback && (
                <p className="flex gap-2 rounded-lg bg-sky-50 p-3 text-sm text-sky-900 dark:bg-sky-950/30 dark:text-sky-100">
                  <Bot className="mt-0.5 size-4 shrink-0" /> {sub.aiFeedback}
                </p>
              )}
              {sub.status === "in_review" && (
                <Button
                  onClick={() => {
                    const r = instructorAssess(id);
                    if (!r) return;
                    toast[r.passed ? "success" : "info"](r.passed ? `Instructor assessed: ${r.finalPct}% — passed` : `Instructor assessed: ${r.finalPct}% — revision requested`);
                    for (const c of r.issued) toast.success(`Credential issued: ${credentialById.get(c.defId)?.name}`);
                  }}
                >
                  <UserCheck /> Simulate the instructor&apos;s assessment
                </Button>
              )}
              {sub.finalPct != null && (
                <div className={cn("rounded-xl p-4", sub.status === "passed" ? "bg-emerald-50 dark:bg-emerald-950/30" : "bg-amber-50 dark:bg-amber-950/30")}>
                  <p className="font-medium">
                    Final (instructor-decided): {sub.finalPct}% — {sub.status === "passed" ? "Passed" : "Revision requested"}
                  </p>
                  <p className="text-sm text-muted-foreground">{sub.status === "passed" ? "The rubric skills are now Applied or Verified, and the project is in your portfolio." : "Use the feedback, revise and resubmit."}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {sub.status === "passed" && (
                      <Link href="/portfolio" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                        <BadgeCheck className="size-4" /> See it in your portfolio
                      </Link>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => toast("Appeal sent. A second instructor will review within 5 working days. You can appeal once per submission.")}>
                      <Scale /> Appeal the result
                    </Button>
                  </div>
                </div>
              )}
            </section>
          )}
        </div>

        <aside className="space-y-4">
          <section className="rounded-2xl border bg-card p-4">
            <h2 className="mb-2 font-semibold">Milestones</h2>
            <ol className="space-y-1.5">
              {project.milestones.map((m, i) => (
                <li key={m}>
                  <button type="button" disabled={sub?.status === "in_review" || sub?.status === "passed"} onClick={() => setMilestones(i < milestonesDone ? i : i + 1)} className="flex w-full items-center gap-2 rounded-lg p-1.5 text-left text-sm hover:bg-muted disabled:hover:bg-transparent">
                    <span className={cn("grid size-5 place-items-center rounded-full border", i < milestonesDone && "border-emerald-600 bg-emerald-600 text-white")}>{i < milestonesDone && <Check className="size-3" />}</span>
                    {m}
                  </button>
                </li>
              ))}
            </ol>
          </section>
          <section className="rounded-2xl border bg-card p-4">
            <h2 className="mb-2 font-semibold">Rubric</h2>
            <ul className="space-y-2 text-sm">
              {project.rubric.map((c) => (
                <li key={c.id}>
                  <p className="font-medium">
                    {c.title} <span className="font-normal text-muted-foreground">· {c.max} pts</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{c.levels.join(" → ")}</p>
                </li>
              ))}
            </ul>
            <Reason className="mt-3 text-xs">Each criterion is evidence for a skill: peers can move it to Applied; the instructor&apos;s score can verify it.</Reason>
          </section>
        </aside>
      </div>
    </>
  );
}

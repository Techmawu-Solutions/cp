"use client";

import { useState } from "react";
import { AlertTriangle, Bot, Check, CircleAlert, Pencil, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PageTitle } from "@/components/open/bits";
import { COURSES, activitiesOf, courseBySlug } from "@/lib/data/courses";
import { ITEMS } from "@/lib/data/items";
import { setOpen, uid, useOpen } from "@/lib/store";
import { cn } from "@/lib/utils";

/**
 * Instructor studio (spec section 6.17, section 6.22): the publish-blocking coverage check
 * (activity → objective → skill → assessment), AI drafts that need human
 * approval, and quality flags raised by psychometrics, AI and learners.
 */
export default function StudioPage() {
  const s = useOpen();
  const [slug, setSlug] = useState("statistics-in-everyday-life");
  const [editing, setEditing] = useState<string | null>(null);
  const [text, setText] = useState("");
  const course = courseBySlug.get(slug)!;
  const acts = activitiesOf(course);
  const objectiveGaps = course.objectives.filter((o) => !acts.some((a) => a.objectives.includes(o.id)) || !o.skills.some((sk) => ITEMS.some((i) => i.skill === sk)));
  const unmapped = acts.filter((a) => a.objectives.length === 0);
  const noSkill = course.objectives.filter((o) => o.skills.length === 0);
  const blocked = objectiveGaps.length + unmapped.length + noSkill.length > 0;
  const drafts = s.drafts.filter((d) => d.courseSlug === slug);
  const flags = s.flags.filter((f) => f.courseSlug === slug);

  return (
    <>
      <PageTitle title="Instructor studio" description="Build courses where every activity serves an objective — and AI drafts, but people decide.">
        <select value={slug} onChange={(e) => setSlug(e.target.value)} className="h-9 rounded-lg border bg-card px-2 text-sm" aria-label="Course">
          {COURSES.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.title}
            </option>
          ))}
        </select>
      </PageTitle>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border bg-card p-5">
          <h2 className="text-lg font-semibold">Coverage check</h2>
          <p className="text-sm text-muted-foreground">Every activity → an objective → a skill → assessment items. Publishing is blocked until this passes (FR-CA-3).</p>
          <div className={cn("mt-4 rounded-xl p-3 text-sm", blocked ? "bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:text-amber-100" : "bg-emerald-50 text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100")}>
            {blocked ? (
              <>
                <p className="flex items-center gap-1.5 font-medium">
                  <CircleAlert className="size-4" /> Can&apos;t publish yet
                </p>
                <ul className="mt-1 list-disc pl-5">
                  {noSkill.map((o) => (
                    <li key={o.id}>Objective “{o.text}” isn&apos;t mapped to a skill</li>
                  ))}
                  {objectiveGaps
                    .filter((o) => o.skills.length > 0)
                    .map((o) => (
                      <li key={o.id}>Objective “{o.text}” has no assessment items</li>
                    ))}
                  {unmapped.map((a) => (
                    <li key={a.id}>Activity “{a.title}” serves no objective</li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="flex items-center gap-1.5 font-medium">
                <Check className="size-4" /> Ready to publish — {course.objectives.length} objectives, {acts.length} activities, all covered
              </p>
            )}
          </div>
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-1.5 font-medium">Objective</th>
                <th className="py-1.5 font-medium">Activities</th>
                <th className="py-1.5 font-medium">Items</th>
              </tr>
            </thead>
            <tbody>
              {course.objectives.map((o) => (
                <tr key={o.id} className="border-b align-top">
                  <td className="py-1.5 pr-2">{o.text}</td>
                  <td className="py-1.5 tabular-nums">{acts.filter((a) => a.objectives.includes(o.id)).length}</td>
                  <td className="py-1.5 tabular-nums">{ITEMS.filter((i) => o.skills.includes(i.skill)).length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="space-y-4 rounded-2xl border bg-card p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">AI drafts awaiting review</h2>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const lesson = acts.find((a) => a.kind === "reading");
                setOpen((st) => ({ drafts: [{ id: uid("draft"), courseSlug: slug, kind: "practice_question", title: `Practice: from “${lesson?.title.replace(/^Read: /, "") ?? course.title}”`, content: `Which statement best matches the lesson?\nA. …  B. …  C. …  D. …\n(Drafted from “${lesson?.title ?? course.title}”. Check accuracy and wording before approving.)`, status: "draft", createdAt: new Date().toISOString() }, ...st.drafts] }));
                toast("Draft created — it won't reach learners until you approve it");
              }}
            >
              <Sparkles /> Draft practice question
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">AI-generated content is never published without human review (brief section 20). Approved items record who approved them.</p>
          {drafts.length === 0 && <p className="text-sm text-muted-foreground">No drafts for this course.</p>}
          {drafts.map((d) => (
            <article key={d.id} className={cn("rounded-xl border p-3", d.status !== "draft" && "opacity-60")}>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Bot className="size-3.5" /> AI draft · {d.kind.replace("_", " ")} {d.status !== "draft" && `· ${d.status}`}
              </p>
              <p className="font-medium">{d.title}</p>
              {editing === d.id ? (
                <Textarea className="mt-2" rows={5} value={text} onChange={(e) => setText(e.target.value)} />
              ) : (
                <p className="mt-1 text-sm whitespace-pre-line">{d.content}</p>
              )}
              {d.status === "draft" && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {editing === d.id ? (
                    <Button size="xs" onClick={() => (setOpen((st) => ({ drafts: st.drafts.map((x) => (x.id === d.id ? { ...x, content: text, status: "approved" } : x)) })), setEditing(null), toast.success("Edited and approved — published with your name as approver"))}>
                      <Check /> Save & approve
                    </Button>
                  ) : (
                    <>
                      <Button size="xs" onClick={() => (setOpen((st) => ({ drafts: st.drafts.map((x) => (x.id === d.id ? { ...x, status: "approved" } : x)) })), toast.success("Approved"))}>
                        <Check /> Approve
                      </Button>
                      <Button size="xs" variant="outline" onClick={() => (setEditing(d.id), setText(d.content))}>
                        <Pencil /> Edit
                      </Button>
                    </>
                  )}
                  <Button size="xs" variant="ghost" onClick={() => setOpen((st) => ({ drafts: st.drafts.map((x) => (x.id === d.id ? { ...x, status: "rejected" } : x)) }))}>
                    <X /> Reject
                  </Button>
                </div>
              )}
            </article>
          ))}
        </section>

        <section className="rounded-2xl border bg-card p-5 lg:col-span-2">
          <h2 className="text-lg font-semibold">Quality flags</h2>
          <p className="text-sm text-muted-foreground">Raised by item statistics, AI monitoring and learners. They go to you — the platform never silently changes your content (FR-QA-3).</p>
          {flags.length === 0 && <p className="mt-3 text-sm text-muted-foreground">No flags for this course.</p>}
          <ul className="mt-3 divide-y">
            {flags.map((f) => (
              <li key={f.id} className={cn("flex flex-wrap items-start gap-3 py-3", f.status !== "open" && "opacity-60")}>
                <AlertTriangle className="mt-0.5 size-4 text-amber-600" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{f.target}</p>
                  <p className="text-sm text-muted-foreground">{f.detail}</p>
                  <p className="text-xs text-muted-foreground">
                    {f.kind.replace("_", " ")} · from {f.source.replace("_", " ")} {f.status !== "open" && `· ${f.status}`}
                  </p>
                </div>
                {f.status === "open" && (
                  <div className="flex gap-1.5">
                    <Button size="xs" variant="outline" onClick={() => (setOpen((st) => ({ flags: st.flags.map((x) => (x.id === f.id ? { ...x, status: "fixed" } : x)) })), toast.success("Marked fixed — the course version will bump on publish"))}>
                      Mark fixed
                    </Button>
                    <Button size="xs" variant="ghost" onClick={() => setOpen((st) => ({ flags: st.flags.map((x) => (x.id === f.id ? { ...x, status: "dismissed" } : x)) }))}>
                      Dismiss
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}

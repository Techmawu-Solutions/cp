"use client";

import { useState } from "react";
import { Eye, EyeOff, Plus, ShieldCheck, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { AppSelect } from "@/components/common/app-select";
import { MoocCourseTile, MoocPreviewDialog, useMoocRecommendations } from "@/components/student/mooc-recommendations";
import { CATALOGUE_SUBJECTS } from "@/lib/data/catalogue";
import { MOOC_NAME, catalogueSubjectName, type MoocRecommendation } from "@/lib/mooc";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

/**
 * Explore beyond class (spec section 49.2): every ClassProject Open course matched to
 * the student's subjects and interests, with the reason for each.
 */
export default function StudentExplorePage() {
  const m = useMoocRecommendations();
  const [filter, setFilter] = useState<string>("all");
  const [open, setOpen] = useState<MoocRecommendation | null>(null);
  const [adding, setAdding] = useState("");

  const save = (patch: { moocInterests?: string[]; moocHidden?: string[] }) => m.student && useStore.getState().update("students", m.student.id, patch);
  const toggleHidden = (code: string) => {
    const hidden = m.hidden.includes(code) ? m.hidden.filter((c) => c !== code) : [...m.hidden, code];
    save({ moocHidden: hidden });
  };
  const addInterest = (code: string) => {
    if (!code || m.interests.includes(code)) return;
    save({ moocInterests: [...m.interests, code] });
    setAdding("");
    toast.success(`Added ${catalogueSubjectName(code)} to your interests`);
  };
  const removeInterest = (code: string) => save({ moocInterests: m.interests.filter((c) => c !== code) });

  const chips = [...m.subjects.filter((s) => !m.hidden.includes(s.code)).map((s) => ({ code: s.code, name: s.name })), ...m.interests.map((c) => ({ code: c, name: catalogueSubjectName(c) }))];
  const shown = filter === "all" ? m.recs : m.recs.filter((r) => r.subject === filter);
  const canAdd = CATALOGUE_SUBJECTS.filter((c) => c.active && !m.subjects.some((s) => s.code === c.code) && !m.interests.includes(c.code));

  if (!m.enabled)
    return (
      <>
        <PageHeader title="Explore Beyond Class" breadcrumbs={[{ label: "Explore" }]} />
        <EmptyState title="Not available" description={`Recommendations from ${MOOC_NAME} are switched off for now.`} />
      </>
    );

  return (
    <>
      <PageHeader title="Explore Beyond Class" description={`Free courses on ${MOOC_NAME}, matched to your subjects and interests.`} breadcrumbs={[{ label: "Explore" }]} />
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by subject">
            {[{ code: "all", name: "All" }, ...chips].map((c) => (
              <button
                key={c.code}
                type="button"
                onClick={() => setFilter(c.code)}
                aria-pressed={filter === c.code}
                className={cn("rounded-full border px-3 py-1 text-sm transition-colors", filter === c.code ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}
              >
                {c.name}
              </button>
            ))}
          </div>
          {shown.length === 0 ? (
            <EmptyState title="Nothing here yet" description="No courses match this subject at your level yet. New courses are added regularly — or add another interest." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {shown.map((r) => (
                <MoocCourseTile key={r.course.id} rec={r} onOpen={() => setOpen(r)} />
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="size-4 text-primary" /> Your subjects
              </CardTitle>
              <CardDescription>Recommendations come from these. Hide any you don&apos;t want suggestions for.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {m.subjects.length === 0 && <p className="text-sm text-muted-foreground">You aren&apos;t registered for any subjects yet.</p>}
              {m.subjects.map((s) => {
                const hidden = m.hidden.includes(s.code);
                return (
                  <div key={s.code} className="flex items-center gap-2 text-sm">
                    <span className={cn("flex-1 truncate", hidden && "text-muted-foreground line-through")}>{s.name}</span>
                    <Button variant="ghost" size="icon-sm" aria-label={hidden ? `Show ${s.name} recommendations` : `Hide ${s.name} recommendations`} onClick={() => toggleHidden(s.code)}>
                      {hidden ? <EyeOff /> : <Eye />}
                    </Button>
                  </div>
                );
              })}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>More interests</CardTitle>
              <CardDescription>Curious about a subject you don&apos;t take? Add it.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {m.interests.length === 0 && <p className="text-sm text-muted-foreground">None yet.</p>}
                {m.interests.map((c) => (
                  <span key={c} className="inline-flex items-center gap-1 rounded-full border bg-muted/50 py-0.5 pr-1 pl-2.5 text-sm">
                    {catalogueSubjectName(c)}
                    <button type="button" aria-label={`Remove ${catalogueSubjectName(c)}`} className="rounded-full p-0.5 hover:bg-muted" onClick={() => removeInterest(c)}>
                      <X className="size-3.5" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <AppSelect aria-label="Add an interest" className="flex-1" value={adding} onChange={setAdding} placeholder="Choose a subject…" options={canAdd.map((c) => ({ value: c.code, label: c.name }))} />
                <Button variant="outline" size="icon" aria-label="Add interest" disabled={!adding} onClick={() => addInterest(adding)}>
                  <Plus />
                </Button>
              </div>
            </CardContent>
          </Card>
          <p className="flex items-start gap-1.5 px-1 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
            {MOOC_NAME} is a separate platform. To find these courses it only receives your subjects and level ({m.level?.replace(/^(\D+)(\d)$/, "$1 $2") ?? "not set"}) — never your name, school or grades.
          </p>
        </div>
      </div>
      <MoocPreviewDialog rec={open} level={m.level} onClose={() => setOpen(null)} />
    </>
  );
}

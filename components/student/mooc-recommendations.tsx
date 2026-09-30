"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, BookOpen, Clock, Download, GraduationCap, ShieldCheck, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/common/link-button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useStudentData } from "@/lib/student";
import { useStore } from "@/lib/store";
import { MOOC_NAME, catalogueSubjectName, levelCode, moocCourseUrl, recommendMooc, subjectCode, type MoocRecommendation } from "@/lib/mooc";

/**
 * The student's ClassProject Open recommendations (spec §49.2): their own
 * subjects (minus hidden ones) plus extra interests, at their class level.
 */
export function useMoocRecommendations() {
  const s = useStudentData();
  const enabled = useStore((st) => st.settings.moocRecommendations !== false);
  const { d, student, courses, classId } = s;
  return useMemo(() => {
    const cls = d.byId.class.get(classId ?? "");
    const level = levelCode(cls?.level) ?? levelCode(cls?.name);
    const subjects = [...new Map(courses.map((c) => d.byId.subject.get(c.subjectId)).filter((x) => !!x).map((x) => [subjectCode(x!), x!.name])).entries()].map(([code, name]) => ({ code, name }));
    const interests = student?.moocInterests ?? [];
    const hidden = student?.moocHidden ?? [];
    const recs = recommendMooc({ subjects: subjects.map((x) => x.code), interests, hidden, level, limit: 24 });
    return { enabled: enabled && !!student, student, level, subjects, interests, hidden, recs };
  }, [d, student, courses, classId, enabled]);
}

/** One recommended course, with the reason it was recommended. */
export function MoocCourseTile({ rec, onOpen }: { rec: MoocRecommendation; onOpen: () => void }) {
  const c = rec.course;
  return (
    <button type="button" onClick={onOpen} className="group flex h-full flex-col gap-2 rounded-xl border p-3 text-left transition-colors hover:border-primary/40 hover:bg-muted/40">
      <span className="text-xs text-muted-foreground">{c.provider}</span>
      <span className="font-semibold leading-snug group-hover:underline">{c.title}</span>
      <span className="flex items-start gap-1.5 text-xs text-primary">
        <Sparkles className="mt-0.5 size-3.5 shrink-0" /> {rec.reason.text}
      </span>
      <span className="mt-auto flex flex-wrap gap-1.5 pt-1">
        {c.free && <Badge variant="secondary">Free</Badge>}
        <Badge variant="outline">
          <Clock /> {c.hours} h
        </Badge>
        {c.offline && (
          <Badge variant="outline">
            <Download /> Offline · {c.sizeMb} MB
          </Badge>
        )}
        {c.exam && <Badge variant="outline">{c.exam}</Badge>}
      </span>
    </button>
  );
}

/** Preview before leaving for ClassProject Open. Only the subject and level travel in the link. */
export function MoocPreviewDialog({ rec, level, onClose }: { rec: MoocRecommendation | null; level: string | null; onClose: () => void }) {
  const c = rec?.course;
  return (
    <Dialog open={!!rec} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        {rec && c && (
          <>
            <DialogHeader>
              <DialogTitle>{c.title}</DialogTitle>
              <DialogDescription>
                {c.provider} · on {MOOC_NAME}
              </DialogDescription>
            </DialogHeader>
            <p className="flex items-start gap-1.5 rounded-lg bg-primary/5 p-2.5 text-sm text-primary">
              <Sparkles className="mt-0.5 size-4 shrink-0" /> {rec.reason.text}
            </p>
            <p className="text-sm">{c.summary}</p>
            <div>
              <p className="mb-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">What you&apos;ll learn</p>
              <ol className="space-y-1 text-sm">
                {c.outline.map((o, i) => (
                  <li key={o} className="flex gap-2">
                    <span className="w-4 shrink-0 text-muted-foreground tabular-nums">{i + 1}.</span> {o}
                  </li>
                ))}
              </ol>
            </div>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <Fact icon={<GraduationCap className="size-4" />} label="Level" value={c.level[0]!.toUpperCase() + c.level.slice(1)} />
              <Fact icon={<Clock className="size-4" />} label="Time" value={`About ${c.hours} hours`} />
              <Fact icon={<BookOpen className="size-4" />} label="Cost" value={c.free ? "Free" : "Paid"} />
              <Fact icon={<Download className="size-4" />} label="Offline" value={c.offline ? `Yes · ${c.sizeMb} MB` : "Online only"} />
            </dl>
            <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
              {MOOC_NAME} is a separate learning platform. Only the subject{rec.subject ? ` (${catalogueSubjectName(rec.subject)})` : ""} and your level are shared — not your name, school or grades. Work there doesn&apos;t count towards your school grades.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              <LinkButton href={moocCourseUrl(rec, level)} target="_blank" rel="noreferrer">
                Open on {MOOC_NAME} <ArrowUpRight />
              </LinkButton>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Fact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border p-2">
      <span className="text-muted-foreground">{icon}</span>
      <span>
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="font-medium">{value}</dd>
      </span>
    </div>
  );
}

/** Dashboard card: the top three recommendations. */
export function MoocRecommendationsCard({ className }: { className?: string }) {
  const m = useMoocRecommendations();
  const [open, setOpen] = useState<MoocRecommendation | null>(null);
  if (!m.enabled || m.recs.length === 0) return null;
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" /> Go further with {MOOC_NAME}
        </CardTitle>
        <CardDescription>Free courses matched to your subjects</CardDescription>
        <CardAction>
          <Link href="/student/explore" className="text-xs text-primary hover:underline">
            Explore all
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-3">
        {m.recs.slice(0, 3).map((r) => (
          <MoocCourseTile key={r.course.id} rec={r} onOpen={() => setOpen(r)} />
        ))}
      </CardContent>
      <MoocPreviewDialog rec={open} level={m.level} onClose={() => setOpen(null)} />
    </Card>
  );
}

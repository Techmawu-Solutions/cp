"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowRight, CheckCircle2, ChevronDown, Circle, ExternalLink, Megaphone, Radio } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/common/empty-state";
import { LinkButton } from "@/components/common/link-button";
import { RichText } from "@/components/common/rich-text";
import { StatusBadge } from "@/components/common/status-badge";
import { UrlTabs } from "@/components/common/url-tabs";
import { RecordingsGrid } from "@/components/classroom/live-tables";
import { PerformanceBreakdown } from "@/components/assessment/gradebook";
import { StudentWorkList } from "@/components/assessment/student-work-list";
import { CONTENT_META } from "@/components/course/content-meta";
import { useLearnCourse, type LearnCourse } from "@/components/learn/use-learn-course";
import { fmtAgo, fmtBytes, fmtDay, fmtTime, sectionPrefix, sectionTerm } from "@/lib/helpers";
import { cn } from "@/lib/utils";

/** Course home in the learning area: sections with their content, Moodle-style, plus the course's work and grades. */
export default function LearnCoursePage() {
  const { courseId } = useParams<{ courseId: string }>();
  const c = useLearnCourse(courseId);
  if (!c) return null;
  const term = sectionTerm(c.course);
  const upcoming = c.liveSessions[0];

  return (
    <>
      <div className="mb-5 overflow-hidden rounded-2xl border bg-card">
        <div className="h-2" style={{ background: c.subject?.color }} />
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold tracking-tight">{c.subject?.name}</h1>
            <p className="text-sm text-muted-foreground">
              {c.cls?.name} · {c.sections.length} {c.sections.length === 1 ? term.lower : `${term.lower}s`} · {c.items.length} items
            </p>
            {!c.preview && (
              <div className="mt-3 flex max-w-sm items-center gap-3">
                <Progress value={c.progress.percent} className="flex-1" />
                <span className="text-sm font-medium tabular-nums">
                  {c.progress.done}/{c.progress.total} · {c.progress.percent.toFixed(0)}%
                </span>
              </div>
            )}
          </div>
          {c.progress.next && (
            <LinkButton href={`/learn/${c.course.id}/${c.progress.next.id}`} size="lg" className="max-w-full">
              <span className="truncate">{c.progress.done === 0 || c.preview ? "Start" : "Continue"}: {c.progress.next.title}</span> <ArrowRight />
            </LinkButton>
          )}
        </div>
      </div>

      {upcoming && (
        <Card className={cn("mb-5", upcoming.status === "live" ? "border-red-500/40 bg-red-500/5" : "border-primary/30 bg-primary/5")}>
          <CardContent className="flex flex-wrap items-center gap-3">
            <Radio className={cn("size-5", upcoming.status === "live" ? "text-red-600" : "text-primary")} />
            <div className="min-w-0 flex-1">
              <p className="font-medium">{upcoming.title}</p>
              <p className="text-sm text-muted-foreground">
                {fmtDay(upcoming.scheduledAt)} — {fmtTime(upcoming.scheduledAt)}
              </p>
            </div>
            {upcoming.status === "live" && <StatusBadge status="live">Live now</StatusBadge>}
            <LinkButton href={`/classroom/${upcoming.id}/lobby`}>{upcoming.status === "live" ? "Join class" : "Open lobby"}</LinkButton>
          </CardContent>
        </Card>
      )}

      <Suspense>
        <UrlTabs
          tabs={[
            { value: "course", label: "Course" },
            { value: "work", label: `Assessments (${c.assessments.length})` },
            { value: "recordings", label: `Recordings (${c.recordings.length})` },
            ...(c.preview ? [] : [{ value: "grades", label: "Grades" }]),
            { value: "announcements", label: `Announcements (${c.announcements.length})` },
          ]}
        >
          {(tab) =>
            tab === "work" ? (
              <StudentWorkList assessments={c.assessments} />
            ) : tab === "recordings" ? (
              <RecordingsGrid rows={c.recordings} />
            ) : tab === "grades" ? (
              <Card className="max-w-lg">
                <CardHeader>
                  <CardTitle>My performance</CardTitle>
                </CardHeader>
                <CardContent>{c.student && <PerformanceBreakdown studentId={c.student.id} course={c.course} data={c.d} />}</CardContent>
              </Card>
            ) : tab === "announcements" ? (
              <div className="space-y-3">
                {c.announcements.length === 0 && <EmptyState icon={Megaphone} title="No announcements" />}
                {c.announcements.map((a) => (
                  <Card key={a.id}>
                    <CardContent>
                      <p className="font-medium">{a.title}</p>
                      <p className="mt-1 text-sm whitespace-pre-wrap text-muted-foreground">{a.body}</p>
                      <p className="mt-2 text-xs text-muted-foreground">{fmtAgo(a.createdAt)}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Sections c={c} />
            )
          }
        </UrlTabs>
      </Suspense>
      <p className="mt-8 flex flex-wrap items-center justify-center gap-1 text-center text-xs text-muted-foreground">
        Questions? Ask in the
        <Link href={`/forums/${c.course.id}`} className="inline-flex items-center gap-0.5 text-primary hover:underline">
          class forum <ExternalLink className="size-3" />
        </Link>
      </p>
    </>
  );
}

function Sections({ c }: { c: LearnCourse }) {
  const term = sectionTerm(c.course);
  const [closed, setClosed] = useState<Record<string, boolean>>({});
  if (c.sections.length === 0) return <EmptyState title="No content yet" description={`Your teacher hasn't shown any ${term.lower}s yet. Check back soon.`} />;
  return (
    <div className="space-y-4">
      {c.sections.map((m, mi) => {
        const list = c.itemsBySection.get(m.id) ?? [];
        const done = list.filter((i) => c.done.has(i.id)).length;
        const open = !closed[m.id];
        return (
          <section key={m.id} id={`section-${m.id}`} className="overflow-hidden rounded-xl border bg-card">
            <button type="button" onClick={() => setClosed((x) => ({ ...x, [m.id]: open }))} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/40" aria-expanded={open}>
              <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", !open && "-rotate-90")} />
              <span className="min-w-0 flex-1">
                {sectionPrefix(term, mi, m.title) && <span className="block text-xs font-medium tracking-wide text-muted-foreground uppercase">{sectionPrefix(term, mi, m.title)}</span>}
                <span className="block text-lg font-semibold">{m.title}</span>
              </span>
              {!c.preview && list.length > 0 && (
                <span className={cn("flex shrink-0 items-center gap-1.5 text-xs font-medium tabular-nums", done === list.length ? "text-emerald-600" : "text-muted-foreground")}>
                  {done === list.length && <CheckCircle2 className="size-4" />}
                  {done}/{list.length}
                </span>
              )}
            </button>
            {open && (
              <>
                {m.description && (
                  <div className="border-t px-4 pt-3 pb-1 text-sm sm:px-11">
                    <RichText text={m.description} />
                  </div>
                )}
                <ul className="divide-y border-t">
                  {list.length === 0 && <li className="px-4 py-4 text-sm text-muted-foreground sm:px-11">Nothing here yet.</li>}
                  {list.map((it) => {
                    const M = CONTENT_META[it.type];
                    const isDone = c.done.has(it.id);
                    return (
                      <li key={it.id}>
                        <Link href={`/learn/${c.course.id}/${it.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 sm:px-11">
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                            <M.icon className={cn("size-4", M.color)} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium">{it.title}</span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {M.label}
                              {it.durationMinutes ? ` · ${it.durationMinutes} min` : ""}
                              {it.fileSize ? ` · ${fmtBytes(it.fileSize)}` : ""}
                              {it.description ? ` · ${it.description}` : ""}
                            </span>
                          </span>
                          {!c.preview && (isDone ? <CheckCircle2 className="size-5 shrink-0 text-emerald-600" aria-label="Completed" /> : <Circle className="size-5 shrink-0 text-muted-foreground/40" aria-label="Not completed" />)}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </section>
        );
      })}
    </div>
  );
}

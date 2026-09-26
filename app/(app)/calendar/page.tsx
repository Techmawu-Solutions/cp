"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfMonth, startOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { useSchoolData } from "@/lib/queries";
import { useCurrentUser, useMyStudent, useMyTeacher } from "@/lib/session";
import { fmtTime } from "@/lib/helpers";
import { cn } from "@/lib/utils";

type Kind = "live" | "assessment" | "session" | "event" | "holiday" | "exam";
interface CalEvent {
  id: string;
  date: Date;
  title: string;
  kind: Kind;
  href?: string;
  time?: string;
}

const KIND: Record<Kind, { label: string; cls: string; dot: string }> = {
  live: { label: "Live class", cls: "bg-red-500/12 text-red-700 dark:text-red-300", dot: "bg-red-500" },
  assessment: { label: "Deadline", cls: "bg-violet-500/12 text-violet-700 dark:text-violet-300", dot: "bg-violet-500" },
  session: { label: "Session dates", cls: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500" },
  event: { label: "School event", cls: "bg-blue-500/12 text-blue-700 dark:text-blue-300", dot: "bg-blue-500" },
  holiday: { label: "Holiday", cls: "bg-amber-500/15 text-amber-800 dark:text-amber-300", dot: "bg-amber-500" },
  exam: { label: "Examinations", cls: "bg-pink-500/12 text-pink-700 dark:text-pink-300", dot: "bg-pink-500" },
};

/** Calendar (spec §42): live classes, deadlines, session dates and school events, scoped to the user. */
export default function CalendarPage() {
  const d = useSchoolData();
  const me = useCurrentUser();
  const teacher = useMyTeacher();
  const student = useMyStudent();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState(() => new Date());

  const events = useMemo<CalEvent[]>(() => {
    // Teachers see their own courses; students see what they're registered for; admins see everything.
    const courseIds = new Set(
      me?.portal === "teacher"
        ? d.courses.filter((c) => c.teacherId === teacher?.id).map((c) => c.id)
        : me?.portal === "student"
          ? d.courses.filter((c) => d.enrollments.some((e) => e.studentId === student?.id && e.classId === c.classId && e.subjectId === c.subjectId)).map((c) => c.id)
          : d.courses.map((c) => c.id),
    );
    const base = me?.portal === "student" ? "/student" : me?.portal === "teacher" ? "/teacher" : "/school";
    const out: CalEvent[] = [];
    d.liveSessions.filter((l) => courseIds.has(l.courseId) && l.status !== "cancelled").forEach((l) => out.push({ id: l.id, date: new Date(l.scheduledAt), time: fmtTime(l.scheduledAt), title: `${d.byId.subject.get(l.subjectId)?.name} ${d.byId.class.get(l.classId)?.name}: ${l.title}`, kind: "live", href: l.recordingId ? `/recordings/${l.recordingId}` : `/classroom/${l.id}/lobby` }));
    d.assessments.filter((a) => courseIds.has(a.courseId) && a.status !== "draft").forEach((a) => out.push({ id: a.id, date: new Date(a.dueDate), title: `${a.title} due (${d.byId.subject.get(a.subjectId)?.code} ${d.byId.class.get(a.classId)?.name})`, kind: "assessment", href: `${base}/assessments/${a.id}` }));
    d.session.sessions.forEach((s) => {
      const y = d.session.years.find((x) => x.id === s.academicYearId)?.name;
      out.push({ id: `${s.id}-s`, date: new Date(s.startDate), title: `${y} ${s.name} begins`, kind: "session" });
      out.push({ id: `${s.id}-e`, date: new Date(s.endDate), title: `${y} ${s.name} ends`, kind: "session" });
    });
    d.events.forEach((e) => out.push({ id: e.id, date: new Date(e.date), title: e.title, kind: e.kind }));
    return out.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [d, me, teacher, student]);

  if (!d.schoolId) return <EmptyState title="The calendar belongs to a school" description="Open a school workspace to see its calendar." className="mt-10" />;
  const days = eachDayOfInterval({ start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }), end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }) });
  const on = (day: Date) => events.filter((e) => isSameDay(e.date, day));
  const today = new Date();

  return (
    <>
      <PageHeader title="Calendar" description="Live classes, deadlines, session dates and school events." />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_340px]">
        <Card className="gap-0 p-0">
          <div className="flex items-center gap-2 border-b p-3">
            <Button variant="ghost" size="icon-sm" onClick={() => setMonth(addMonths(month, -1))} aria-label="Previous month">
              <ChevronLeft />
            </Button>
            <h2 className="min-w-40 text-center font-semibold">{format(month, "MMMM yyyy")}</h2>
            <Button variant="ghost" size="icon-sm" onClick={() => setMonth(addMonths(month, 1))} aria-label="Next month">
              <ChevronRight />
            </Button>
            <Button variant="outline" size="sm" className="ml-auto" onClick={() => (setMonth(startOfMonth(today)), setSelected(today))}>
              Today
            </Button>
          </div>
          <div className="grid grid-cols-7 border-b text-center text-xs font-medium text-muted-foreground">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((x) => (
              <div key={x} className="py-2">
                {x}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((day) => {
              const evs = on(day);
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelected(day)}
                  className={cn("min-h-16 border-r border-b p-1 text-left align-top transition-colors hover:bg-muted/50 sm:min-h-24 sm:p-1.5 [&:nth-child(7n)]:border-r-0", !isSameMonth(day, month) && "bg-muted/30 text-muted-foreground", isSameDay(day, selected) && "bg-accent")}
                >
                  <span className={cn("inline-flex size-6 items-center justify-center rounded-full text-xs", isSameDay(day, today) && "bg-primary font-semibold text-primary-foreground")}>{format(day, "d")}</span>
                  <div className="mt-0.5 hidden space-y-0.5 sm:block">
                    {evs.slice(0, 3).map((e) => (
                      <div key={e.id} className={cn("truncate rounded px-1 text-[10px] leading-4", KIND[e.kind].cls)}>
                        {e.time && `${e.time} `}
                        {e.title}
                      </div>
                    ))}
                    {evs.length > 3 && <div className="px-1 text-[10px] text-muted-foreground">+{evs.length - 3} more</div>}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-0.5 sm:hidden">
                    {evs.slice(0, 4).map((e) => (
                      <span key={e.id} className={cn("size-1.5 rounded-full", KIND[e.kind].dot)} />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{format(selected, "EEEE d MMMM")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {on(selected).length === 0 && <p className="text-sm text-muted-foreground">Nothing scheduled.</p>}
              {on(selected).map((e) => {
                const body = (
                  <div className="flex gap-2 rounded-lg border p-2.5">
                    <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", KIND[e.kind].dot)} />
                    <div className="min-w-0">
                      <p className="text-sm">{e.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {KIND[e.kind].label}
                        {e.time && ` · ${e.time}`}
                      </p>
                    </div>
                  </div>
                );
                return e.href ? (
                  <Link key={e.id} href={e.href} className="block hover:opacity-80">
                    {body}
                  </Link>
                ) : (
                  <div key={e.id}>{body}</div>
                );
              })}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="grid grid-cols-2 gap-2 text-xs">
              {Object.values(KIND).map((k) => (
                <span key={k.label} className="flex items-center gap-2">
                  <span className={cn("size-2 rounded-full", k.dot)} /> {k.label}
                </span>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

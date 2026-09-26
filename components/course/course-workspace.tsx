"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarPlus, CircleHelp, ClipboardCheck, Megaphone, MessagesSquare, NotebookPen, PlayCircle, Plus, Radio, Users, Video } from "lucide-react";
import { toast } from "sonner";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/common/page-header";
import { UrlTabs } from "@/components/common/url-tabs";
import { EmptyState } from "@/components/common/empty-state";
import { StatusBadge } from "@/components/common/status-badge";
import { LinkButton } from "@/components/common/link-button";
import { Field } from "@/components/forms/field";
import { AccessDenied } from "@/components/layout/app-shell";
import { ModuleList } from "@/components/course/module-list";
import { Gradebook, GradePill } from "@/components/assessment/gradebook";
import { AssessmentsTable } from "@/components/assessment/assessments-table";
import { LiveSessionsTable, RecordingsGrid } from "@/components/classroom/live-tables";
import { ScheduleLiveDialog } from "@/components/classroom/schedule-live-dialog";
import { UsageChart } from "@/components/dashboard/charts";
import { SessionBanner, useSessionEditable } from "@/components/academic/session-banner";
import { useSchoolData, gradebook } from "@/lib/queries";
import { PORTAL_HOME, studentName, teacherName, useCurrentUser, useMyTeacher } from "@/lib/session";
import { useStore } from "@/lib/store";
import { notifyCourseStudents } from "@/lib/actions";
import { fmtAgo, fmtDay, fmtTime, uid, avg } from "@/lib/helpers";
import { useNow } from "@/lib/use-now";

/**
 * Course Workspace (spec §29) for teachers (edit) and school staff (view /
 * edit by permission): Overview · Content · Assessments · Grades · Live Classes · Analytics.
 */
export function CourseWorkspace({ courseId, base }: { courseId: string; base: "/teacher" | "/school" }) {
  const d = useSchoolData();
  const me = useCurrentUser();
  const myTeacher = useMyTeacher();
  const router = useRouter();
  const editableSession = useSessionEditable();
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [announceOpen, setAnnounceOpen] = useState(false);
  const course = d.byId.course.get(courseId);

  if (!course) return <EmptyState title="Course not found in this session" description="Courses belong to one academic session. Switch session from the header or go back." action={<Button onClick={() => router.push(`${base}/${base === "/teacher" ? "content" : "courses"}`)}>Back</Button>} className="mt-8" />;
  if (me?.portal === "teacher" && course.teacherId !== myTeacher?.id) return <AccessDenied home={PORTAL_HOME.teacher} message="You can only open courses you teach." />;

  const canEdit = editableSession && (me?.portal === "teacher" ? true : !!me?.can("content.update"));
  const subject = d.byId.subject.get(course.subjectId);
  const cls = d.byId.class.get(course.classId);
  const roster = d.enrollments.filter((e) => e.classId === course.classId && e.subjectId === course.subjectId);
  const assessments = d.assessments.filter((a) => a.courseId === course.id);
  const lives = d.liveSessions.filter((l) => l.courseId === course.id);
  const recordings = d.recordings.filter((r) => r.courseId === course.id);

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: base === "/teacher" ? "My Subjects" : "Courses", href: base === "/teacher" ? "/teacher/subjects" : "/school/courses" }, { label: course.title }]}
        title={
          <span className="flex items-center gap-3">
            <span className="size-3 rounded-full" style={{ background: subject?.color }} />
            {subject?.name} — {cls?.name}
          </span>
        }
        description={
          <span className="flex flex-wrap items-center gap-x-3">
            <span className="flex items-center gap-1">
              <Users className="size-3.5" /> {roster.length} Students
            </span>
            <span>{teacherName(d.byId.teacher.get(course.teacherId))}</span>
            <span>{d.session.label}</span>
          </span>
        }
        actions={
          <>
            <LinkButton href={`/forums/${course.id}`} variant="outline">
              <MessagesSquare /> Forum
            </LinkButton>
            {canEdit && (
              <Button variant="outline" onClick={() => setAnnounceOpen(true)}>
                <Megaphone /> Announce
              </Button>
            )}
            {canEdit && (
              <Button onClick={() => setScheduleOpen(true)}>
                <CalendarPlus /> Schedule live class
              </Button>
            )}
          </>
        }
      />
      <SessionBanner />
      <Suspense>
        <UrlTabs
          tabs={[
            { value: "overview", label: "Overview" },
            { value: "content", label: "Content" },
            { value: "assessments", label: `Assessments (${assessments.length})` },
            { value: "grades", label: "Grades" },
            { value: "live", label: `Live Classes (${lives.length})` },
            { value: "analytics", label: "Analytics" },
          ]}
        >
          {(tab) =>
            tab === "overview" ? (
              <Overview courseId={course.id} base={base} canEdit={canEdit} onSchedule={() => setScheduleOpen(true)} />
            ) : tab === "content" ? (
              <ModuleList course={course} mode={canEdit ? "edit" : "view"} itemHref={(it) => `${base}/courses/${course.id}/items/${it.id}`} />
            ) : tab === "assessments" ? (
              <div className="space-y-3">
                {canEdit && (
                  <div className="flex flex-wrap justify-end gap-2">
                    <LinkButton variant="outline" href={`/teacher/assessments/new?course=${course.id}&type=assignment`}>
                      <NotebookPen /> New assignment
                    </LinkButton>
                    <LinkButton variant="outline" href={`/teacher/assessments/new?course=${course.id}&type=quiz`}>
                      <CircleHelp /> New quiz
                    </LinkButton>
                    <LinkButton href={`/teacher/assessments/new?course=${course.id}&type=test`}>
                      <Plus /> New assessment
                    </LinkButton>
                  </div>
                )}
                <AssessmentsTable rows={assessments} onRowClick={(a) => router.push(`${base}/assessments/${a.id}`)} />
              </div>
            ) : tab === "grades" ? (
              <Gradebook course={course} data={d} editable={canEdit && (me?.portal === "teacher" || !!me?.can("assessments.grade"))} />
            ) : tab === "live" ? (
              <div className="space-y-4">
                {canEdit && (
                  <div className="flex justify-end">
                    <Button onClick={() => setScheduleOpen(true)}>
                      <CalendarPlus /> Schedule live class
                    </Button>
                  </div>
                )}
                <LiveSessionsTable rows={lives} joinable />
                <h3 className="pt-2 font-medium">Recordings</h3>
                <RecordingsGrid rows={recordings} />
              </div>
            ) : (
              <CourseAnalytics courseId={course.id} />
            )
          }
        </UrlTabs>
      </Suspense>
      <ScheduleLiveDialog open={scheduleOpen} onOpenChange={setScheduleOpen} courses={[course]} defaultCourseId={course.id} />
      <AnnounceDialog open={announceOpen} onOpenChange={setAnnounceOpen} courseId={course.id} />
    </>
  );
}

function Overview({ courseId, base, canEdit, onSchedule }: { courseId: string; base: string; canEdit: boolean; onSchedule: () => void }) {
  const d = useSchoolData();
  const now = useNow();
  const course = d.byId.course.get(courseId)!;
  const upcoming = d.liveSessions.filter((l) => l.courseId === courseId && (l.status === "scheduled" || l.status === "live")).sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  const toGrade = d.submissions.filter((s) => (s.status === "submitted" || s.status === "late") && d.byId.assessment.get(s.assessmentId)?.courseId === courseId);
  const items = d.contents.filter((c) => c.courseId === courseId);
  const announcements = d.announcements.filter((a) => a.courseId === courseId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const gb = gradebook(course, d);
  const percents = gb.rows.map((r) => r.percent).filter((p): p is number => p != null);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="size-4" /> Upcoming live classes
          </CardTitle>
          <CardAction>{canEdit && <Button size="sm" variant="outline" onClick={onSchedule}>Schedule</Button>}</CardAction>
        </CardHeader>
        <CardContent className="space-y-2">
          {upcoming.length === 0 && <p className="text-sm text-muted-foreground">Nothing scheduled.</p>}
          {upcoming.map((l) => {
            const startable = l.status === "live" || Date.parse(l.scheduledAt) - now < 30 * 60_000;
            return (
              <div key={l.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
                <div className="w-24">
                  <p className="text-sm font-semibold tabular-nums">{fmtTime(l.scheduledAt)}</p>
                  <p className="text-xs text-muted-foreground">{fmtDay(l.scheduledAt)}</p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{l.title}</p>
                  <p className="text-xs text-muted-foreground">{l.durationMinutes} min</p>
                </div>
                {l.status === "live" && <StatusBadge status="live">Live now</StatusBadge>}
                {canEdit || l.status === "live" ? (
                  <LinkButton size="sm" href={`/classroom/${l.id}/lobby`} variant={startable ? "default" : "outline"}>
                    <Radio /> {l.status === "live" ? "Join" : startable ? "Start class" : "Open lobby"}
                  </LinkButton>
                ) : null}
              </div>
            );
          })}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>At a glance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Stat label="Content items" value={`${items.filter((i) => i.published).length} published / ${items.length}`} />
          <Stat label="Assessments" value={d.assessments.filter((a) => a.courseId === courseId).length} />
          <Stat label="Class average" value={percents.length ? `${avg(percents).toFixed(1)}%` : "—"} />
          <Stat label="Awaiting grading" value={toGrade.length} />
          <Stat label="Recordings" value={d.recordings.filter((r) => r.courseId === courseId).length} />
        </CardContent>
      </Card>
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="size-4" /> Submissions to grade
          </CardTitle>
        </CardHeader>
        <CardContent>
          {toGrade.length === 0 ? (
            <p className="text-sm text-muted-foreground">You&apos;re all caught up.</p>
          ) : (
            <ul className="divide-y">
              {toGrade.slice(0, 6).map((s) => {
                const a = d.byId.assessment.get(s.assessmentId)!;
                return (
                  <li key={s.id} className="flex items-center gap-3 py-2 text-sm">
                    <span className="flex-1">
                      <span className="font-medium">{studentName(d.byId.student.get(s.studentId))}</span> <span className="text-muted-foreground">submitted {a.title}</span>
                    </span>
                    <span className="text-xs text-muted-foreground">{fmtAgo(s.submittedAt)}</span>
                    <LinkButton size="xs" variant="outline" href={`${base}/assessments/${a.id}`}>
                      Grade
                    </LinkButton>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="size-4" /> Announcements
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {announcements.length === 0 && <p className="text-sm text-muted-foreground">No announcements yet.</p>}
          {announcements.slice(0, 3).map((a) => (
            <div key={a.id}>
              <p className="text-sm font-medium">{a.title}</p>
              <p className="line-clamp-2 text-xs text-muted-foreground">{a.body}</p>
              <p className="text-[11px] text-muted-foreground">{fmtAgo(a.createdAt)}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

/** Course-level analytics: completion, engagement and performance (spec §39, §48). */
function CourseAnalytics({ courseId }: { courseId: string }) {
  const d = useSchoolData();
  const progress = useStore((s) => s.progress);
  const users = useStore((s) => s.users);
  const course = d.byId.course.get(courseId)!;
  const items = d.contents.filter((c) => c.courseId === courseId && c.published);
  const roster = d.placements.filter((p) => p.classId === course.classId).map((p) => d.byId.student.get(p.studentId)!).filter(Boolean);
  const gb = gradebook(course, d);
  const live = d.attendance.filter((a) => a.kind === "live" && d.liveSessions.some((l) => l.id === a.liveSessionId && l.courseId === courseId));

  const perStudent = useMemo(
    () =>
      roster.map((s) => {
        const done = progress.filter((p) => p.studentId === s.id && items.some((i) => i.id === p.contentId)).length;
        const la = live.filter((a) => a.studentId === s.id);
        return {
          s,
          completion: items.length ? (done / items.length) * 100 : 0,
          liveRate: la.length ? (la.filter((a) => a.status !== "absent").length / la.length) * 100 : null,
          score: gb.rows.find((r) => r.student.id === s.id)?.percent ?? null,
          lastActive: users.find((u) => u.id === s.userId)?.lastActive,
        };
      }),
    [roster, progress, items, live, gb, users],
  );
  const itemCompletion = items.map((i) => ({ label: i.title.length > 22 ? i.title.slice(0, 21) + "…" : i.title, completed: roster.length ? Math.round((progress.filter((p) => p.contentId === i.id).length / roster.length) * 100) : 0 }));
  const atRisk = perStudent.filter((p) => (p.score != null && p.score < 50) || p.completion < 25);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card size="sm" className="px-4">
          <p className="text-xs text-muted-foreground">Avg. content completion</p>
          <p className="text-2xl font-semibold tabular-nums">{avg(perStudent.map((p) => p.completion)).toFixed(0)}%</p>
        </Card>
        <Card size="sm" className="px-4">
          <p className="text-xs text-muted-foreground">Live class attendance</p>
          <p className="text-2xl font-semibold tabular-nums">{live.length ? ((live.filter((a) => a.status !== "absent").length / live.length) * 100).toFixed(0) : "—"}%</p>
        </Card>
        <Card size="sm" className="px-4">
          <p className="text-xs text-muted-foreground">Class average</p>
          <p className="text-2xl font-semibold tabular-nums">{avg(perStudent.map((p) => p.score).filter((x): x is number => x != null)).toFixed(1)}%</p>
        </Card>
        <Card size="sm" className="px-4">
          <p className="text-xs text-muted-foreground">Students at risk</p>
          <p className="text-2xl font-semibold text-red-600 tabular-nums dark:text-red-400">{atRisk.length}</p>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Completion by content item</CardTitle>
          <CardDescription>Share of the class that has completed each published item</CardDescription>
        </CardHeader>
        <CardContent>{itemCompletion.length ? <UsageChart data={itemCompletion} series={[{ key: "completed", label: "Completed %" }]} layout="vertical" height={Math.max(200, itemCompletion.length * 30)} percent /> : <p className="text-sm text-muted-foreground">No published content.</p>}</CardContent>
      </Card>
      <Card className="gap-0 p-0">
        <CardHeader className="border-b py-3">
          <CardTitle>Student engagement</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground uppercase">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Student</th>
                <th className="px-4 py-2 text-left font-medium">Content completion</th>
                <th className="px-4 py-2 text-right font-medium">Live attendance</th>
                <th className="px-4 py-2 text-right font-medium">Score</th>
                <th className="px-4 py-2 text-right font-medium">Last active</th>
              </tr>
            </thead>
            <tbody>
              {[...perStudent].sort((a, b) => a.completion - b.completion).map((p) => (
                <tr key={p.s.id} className="border-t">
                  <td className="px-4 py-2 font-medium">{studentName(p.s)}</td>
                  <td className="px-4 py-2">
                    <div className="flex min-w-36 items-center gap-2">
                      <Progress value={p.completion} className="flex-1" />
                      <span className="w-9 text-right text-xs tabular-nums">{p.completion.toFixed(0)}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">{p.liveRate == null ? "—" : `${p.liveRate.toFixed(0)}%`}</td>
                  <td className="px-4 py-2 text-right">{p.score == null ? "—" : <GradePill percent={p.score} />}</td>
                  <td className="px-4 py-2 text-right text-xs text-muted-foreground">{p.lastActive ? fmtAgo(p.lastActive) : "Never"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <div className="flex justify-end">
        <Link href="/teacher/analytics" className="flex items-center gap-1 text-sm text-primary hover:underline">
          <PlayCircle className="size-4" /> All teaching analytics
        </Link>
      </div>
    </div>
  );
}

function AnnounceDialog({ open, onOpenChange, courseId }: { open: boolean; onOpenChange: (o: boolean) => void; courseId: string }) {
  const d = useSchoolData();
  const me = useCurrentUser();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const course = d.byId.course.get(courseId)!;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Announcement to {course.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="Title" htmlFor="an-t">
            <Input id="an-t" value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label="Message" htmlFor="an-b">
            <Textarea id="an-b" rows={4} value={body} onChange={(e) => setBody(e.target.value)} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={title.trim().length < 3 || body.trim().length < 3}
            onClick={() => {
              useStore.getState().insert("announcements", { id: uid("ann"), schoolId: course.schoolId, sessionId: course.sessionId, courseId, authorId: me!.user.id, title: title.trim(), body: body.trim(), createdAt: new Date().toISOString() });
              notifyCourseStudents(course, { kind: "announcement", title: title.trim(), body: body.trim(), href: `/student/courses/${course.id}` });
              toast.success("Announcement sent to students");
              setTitle("");
              setBody("");
              onOpenChange(false);
            }}
          >
            Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

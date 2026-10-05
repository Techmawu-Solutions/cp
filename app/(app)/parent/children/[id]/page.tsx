"use client";

import { useParams } from "next/navigation";
import { BookOpen, CheckCircle2, ClipboardCheck, PlayCircle, Send } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { StatusBadge } from "@/components/common/status-badge";
import { UserAvatar } from "@/components/common/user-avatar";
import { LinkButton } from "@/components/common/link-button";
import { GradePill } from "@/components/assessment/gradebook";
import { ATTENDANCE_LABEL, ATTENDANCE_TONE, WORK_LABEL, WORK_TONE, WardFigures, useWards } from "@/components/parent/ward-views";
import { fmtAgo, fmtDate, fmtDay, fmtTime } from "@/lib/helpers";
import { studentName, teacherName } from "@/lib/session";

/**
 * One child in detail for their parent (spec section 22.3). Read-only: parents see
 * what the student and teachers see, but can't change work, grades or attendance.
 */
export default function ParentChildPage() {
  const { id } = useParams<{ id: string }>();
  const ward = useWards().find((w) => w.student.id === id);
  if (!ward) return <EmptyState title="Child not found" description="Only children your school has linked to your account appear here." action={<LinkButton href="/parent/children">My children</LinkButton>} className="mt-10" />;
  const r = ward.report;
  if (!r) return <EmptyState title="Parent access is off" description={`${ward.school.name} doesn't offer parent access at the moment.`} action={<LinkButton href="/parent/dashboard">Back to dashboard</LinkButton>} className="mt-10" />;
  const name = studentName(ward.student);
  const activityIcon = { lesson: BookOpen, submission: Send, live: PlayCircle };

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "My Children", href: "/parent/children" }, { label: name }]}
        title={
          <span className="flex items-center gap-3">
            <UserAvatar name={name} size="lg" className="shrink-0" />
            <span className="min-w-0">
              {name}
              <span className="mt-1 block text-sm font-normal text-muted-foreground">
                {r.cls?.name ?? "Not in a class"} · {ward.school.name} · {r.sessionLabel}
              </span>
            </span>
          </span>
        }
      />
      <div className="space-y-4">
        <WardFigures r={r} />
        <Tabs defaultValue="subjects">
          {/* Wraps onto a second row on phones rather than hiding tabs off-screen. */}
          <TabsList variant="line" className="h-auto! w-full flex-wrap justify-start gap-y-1 sm:w-fit">
            <TabsTrigger value="subjects">Subjects ({r.subjects.length})</TabsTrigger>
            <TabsTrigger value="grades">Grades ({r.graded.length})</TabsTrigger>
            <TabsTrigger value="work">Work ({r.work.length})</TabsTrigger>
            <TabsTrigger value="live">Live classes ({r.attendance.length})</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="subjects">
            <Card>
              <CardContent className="divide-y">
                {r.subjects.length === 0 && <EmptyState title="Not registered for any subjects yet" className="border-0" />}
                {r.subjects.map((s) => (
                  <div key={s.course.id} className="grid grid-cols-1 gap-2 py-3 sm:grid-cols-[1fr_200px] sm:items-center">
                    <div>
                      <p className="font-medium">{s.subject?.name}</p>
                      <p className="text-xs text-muted-foreground">Teacher: {teacherName(s.teacher)}</p>
                    </div>
                    <div>
                      <p className="mb-1 flex justify-between text-xs text-muted-foreground">
                        <span>
                          {s.completed} of {s.total} items
                        </span>
                        <span className="tabular-nums">{Math.round(s.percent)}%</span>
                      </p>
                      <Progress value={s.percent} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="grades">
            <Card>
              <CardContent>
                {r.graded.length === 0 ? (
                  <EmptyState icon={ClipboardCheck} title="No grades yet" description="Scores appear here once teachers have marked the work." className="border-0" />
                ) : (
                  <>
                    {/* Phones: one row per grade; the table needs more width than a phone has. */}
                    <ul className="divide-y sm:hidden">
                      {r.graded.map((g) => (
                        <li key={g.assessment.id} className="flex items-start gap-3 py-3">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium">{g.assessment.title}</p>
                            <p className="text-xs text-muted-foreground">{g.subject?.name}</p>
                            {g.submission?.feedback && <p className="mt-1 text-xs text-muted-foreground">“{g.submission.feedback}”</p>}
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-1">
                            <span className="text-sm font-medium tabular-nums">
                              {g.submission?.score}/{g.assessment.totalMarks}
                            </span>
                            <GradePill percent={g.percent!} />
                          </div>
                        </li>
                      ))}
                    </ul>
                  <Table className="hidden sm:table">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Assessment</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead className="text-right">Score</TableHead>
                        <TableHead>Grade</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {r.graded.map((g) => (
                        <TableRow key={g.assessment.id}>
                          <TableCell>
                            <p className="font-medium">{g.assessment.title}</p>
                            {g.submission?.feedback && <p className="text-xs text-muted-foreground">“{g.submission.feedback}”</p>}
                          </TableCell>
                          <TableCell>{g.subject?.name}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {g.submission?.score}/{g.assessment.totalMarks}
                          </TableCell>
                          <TableCell>
                            <GradePill percent={g.percent!} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="work">
            <Card>
              <CardHeader>
                <CardTitle>Assignments, quizzes and tests</CardTitle>
                <CardDescription>Everything set this session, newest due date first.</CardDescription>
              </CardHeader>
              <CardContent className="divide-y">
                {r.work.length === 0 && <EmptyState title="No work set yet" className="border-0" />}
                {r.work.map((x) => (
                  <div key={x.assessment.id} className="flex flex-wrap items-center gap-2 py-2.5 text-sm">
                    <StatusBadge tone={WORK_TONE[x.state]}>{WORK_LABEL[x.state]}</StatusBadge>
                    <span className="min-w-0 flex-1 font-medium">{x.assessment.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {x.subject?.name} · due {fmtDate(x.assessment.dueDate)}
                      {x.submission && ` · handed in ${fmtAgo(x.submission.submittedAt)}`}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="live">
            <Card>
              <CardHeader>
                <CardTitle>Live class attendance</CardTitle>
                <CardDescription>Classes held this session. &quot;Left early&quot; means your child spent less than three quarters of the class in the room.</CardDescription>
              </CardHeader>
              <CardContent>
                {r.upcomingLive.length > 0 && (
                  <div className="mb-4 rounded-lg border bg-accent/40 p-3 text-sm">
                    <p className="mb-1 font-medium">Coming up</p>
                    {r.upcomingLive.slice(0, 3).map((l) => (
                      <p key={l.id} className="text-muted-foreground">
                        {fmtDay(l.scheduledAt)} {fmtTime(l.scheduledAt)} · {l.title}
                      </p>
                    ))}
                  </div>
                )}
                {r.attendance.length === 0 ? (
                  <EmptyState icon={PlayCircle} title="No live classes held yet" className="border-0" />
                ) : (
                  <>
                    <ul className="divide-y sm:hidden">
                      {r.attendance.map((a) => (
                        <li key={a.live.id} className="flex items-start gap-3 py-3">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium">{a.live.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {a.subject?.name} · {fmtDate(a.live.scheduledAt)}
                              {a.status !== "absent" && ` · ${Math.round(a.minutes)} min`}
                            </p>
                          </div>
                          <StatusBadge tone={ATTENDANCE_TONE[a.status]} className="shrink-0">
                            {ATTENDANCE_LABEL[a.status]}
                          </StatusBadge>
                        </li>
                      ))}
                    </ul>
                  <Table className="hidden sm:table">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Class</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Attendance</TableHead>
                        <TableHead className="text-right">Minutes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {r.attendance.map((a) => (
                        <TableRow key={a.live.id}>
                          <TableCell>
                            <p className="font-medium">{a.live.title}</p>
                            <p className="text-xs text-muted-foreground">{a.subject?.name}</p>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">{fmtDate(a.live.scheduledAt)}</TableCell>
                          <TableCell>
                            <StatusBadge tone={ATTENDANCE_TONE[a.status]}>{ATTENDANCE_LABEL[a.status]}</StatusBadge>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{a.status === "absent" ? "—" : Math.round(a.minutes)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle>Recent activity</CardTitle>
                <CardDescription>Lessons completed, work handed in and live classes joined.</CardDescription>
              </CardHeader>
              <CardContent>
                {r.activity.length === 0 && <EmptyState icon={CheckCircle2} title="No activity yet this session" className="border-0" />}
                <ol className="space-y-3">
                  {r.activity.map((a, i) => {
                    const Icon = activityIcon[a.kind];
                    return (
                      <li key={i} className="flex items-start gap-3 text-sm">
                        <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                        <span className="min-w-0 flex-1">
                          <span className="font-medium">{a.title}</span>
                          <span className="block text-xs text-muted-foreground">
                            {a.kind === "lesson" ? "Completed" : a.kind === "submission" ? "Handed in" : "Joined live class"} · {a.subject?.name} · {fmtAgo(a.at)}
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

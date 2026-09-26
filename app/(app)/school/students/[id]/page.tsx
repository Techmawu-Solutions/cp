"use client";

import { SignInNames } from "@/components/common/sign-in-names";
import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { KeyRound, Pencil, Phone, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { StatusBadge } from "@/components/common/status-badge";
import { UserAvatar } from "@/components/common/user-avatar";
import { StudentForm } from "@/components/forms/people-forms";
import { RequirePermission } from "@/components/layout/app-shell";
import { useSchoolData, studentPerformance, gradeLetter } from "@/lib/queries";
import { studentName, teacherName, useCurrentUser } from "@/lib/session";
import { useStore } from "@/lib/store";
import { fmtAgo, fmtDate, fmtDateTime } from "@/lib/helpers";
import { isLive } from "@/lib/publishing";
import { StudentLiveSummary } from "@/components/classroom/live-reports";

export default function StudentDetailPage() {
  return (
    <RequirePermission perm="students.view">
      <StudentDetail />
    </RequirePermission>
  );
}

function StudentDetail() {
  const { id } = useParams<{ id: string }>();
  const d = useSchoolData();
  const me = useCurrentUser();
  const router = useRouter();
  const db = useStore();
  const [editOpen, setEditOpen] = useState(false);
  const student = d.byId.student.get(id);
  const user = db.users.find((u) => u.id === student?.userId);

  const courses = useMemo(() => {
    if (!student) return [];
    const enrolled = d.enrollments.filter((e) => e.studentId === student.id);
    return enrolled
      .map((e) => d.courses.find((c) => c.classId === e.classId && c.subjectId === e.subjectId))
      .filter((c): c is NonNullable<typeof c> => !!c)
      .map((course) => {
        const assessments = d.assessments.filter((a) => a.courseId === course.id);
        const perf = studentPerformance(student.id, assessments, d.submissions);
        const items = d.contents.filter((c) => c.courseId === course.id && isLive(c));
        const done = db.progress.filter((p) => p.studentId === student.id && items.some((i) => i.id === p.contentId)).length;
        return { course, perf, progress: items.length ? (done / items.length) * 100 : 0 };
      });
  }, [student, d, db.progress]);

  if (!student) return <EmptyState title="Student not found" description="Students are only visible within their own school." action={<Button onClick={() => router.push("/school/students")}>Back to students</Button>} />;
  const cls = d.byId.class.get(d.classOf.get(student.id) ?? "");
  const attendance = d.attendance.filter((a) => a.studentId === student.id);
  const phys = attendance.filter((a) => a.kind === "physical");
  const live = attendance.filter((a) => a.kind === "live");
  const rate = (xs: typeof attendance) => (xs.length ? (xs.filter((a) => a.status === "present" || a.status === "late").length / xs.length) * 100 : 0);
  const overall = courses.filter((c) => c.perf.overall != null);
  const avgOverall = overall.length ? overall.reduce((a, c) => a + c.perf.overall!, 0) / overall.length : null;
  const subs = d.submissions.filter((s) => s.studentId === student.id).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Students", href: "/school/students" }, { label: studentName(student) }]}
        title={
          <span className="flex items-center gap-3">
            <UserAvatar name={studentName(student)} color={user?.avatarColor} size="lg" />
            <span>
              {studentName(student)}
              <span className="mt-1 flex flex-wrap items-center gap-2 text-sm font-normal text-muted-foreground">
                <code>{student.studentNumber}</code>{student.schoolUsername && <code>· {student.schoolUsername}</code>} · {cls?.name ?? "Not in a class"} · <StatusBadge status={student.status} />
              </span>
            </span>
          </span>
        }
        actions={
          <>
            {me?.can("users.update") && (
              <Button variant="outline" onClick={() => (useStore.getState().setPassword(student.userId, "password"), toast.success("Password reset link sent", { description: `Prototype: password set to "password"` }))}>
                <KeyRound /> Reset password
              </Button>
            )}
            {me?.can("students.update") && (
              <Button variant="outline" onClick={() => setEditOpen(true)}>
                <Pencil /> Edit
              </Button>
            )}
          </>
        }
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row label="Gender" value={student.gender === "M" ? "Male" : "Female"} />
              <Row label="Date of birth" value={fmtDate(student.dateOfBirth)} />
              <Row label="Email" value={user?.email ?? "—"} />
              <Row label="Last active" value={user?.lastActive ? fmtAgo(user.lastActive) : "Never signed in"} />
              <div className="border-t pt-3">
                <p className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <UserRound className="size-3.5" /> Guardian
                </p>
                <p className="font-medium">{student.guardianName}</p>
                <p className="flex items-center gap-1.5 text-muted-foreground">
                  <Phone className="size-3.5" /> {student.guardianPhone}
                </p>
              </div>
            </CardContent>
          </Card>
          <SignInNames userId={student.userId} />
          <Card>
            <CardHeader>
              <CardTitle>This session</CardTitle>
              <CardDescription>{d.session.label}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Meter label="Overall score" value={avgOverall} suffix={avgOverall != null ? ` · ${gradeLetter(avgOverall).letter}` : ""} />
              <Meter label="School attendance" value={phys.length ? rate(phys) : null} />
              <Meter label="Live class attendance" value={live.length ? rate(live) : null} />
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="subjects">
          <TabsList variant="line">
            <TabsTrigger value="subjects">Subjects ({courses.length})</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
          </TabsList>
          <TabsContent value="subjects">
            <Card>
              <CardContent className="divide-y">
                {courses.length === 0 && <EmptyState title="Not registered for any subjects" className="border-0" />}
                {courses.map(({ course, perf, progress }) => (
                  <div key={course.id} className="grid grid-cols-1 gap-2 py-3 sm:grid-cols-[1fr_140px_120px] sm:items-center">
                    <div>
                      <p className="font-medium">{d.byId.subject.get(course.subjectId)?.name}</p>
                      <p className="text-xs text-muted-foreground">{teacherName(d.byId.teacher.get(course.teacherId))}</p>
                    </div>
                    <div>
                      <p className="mb-1 text-xs text-muted-foreground">Content progress</p>
                      <Progress value={progress} />
                    </div>
                    <div className="text-right">
                      {perf.overall != null ? (
                        <>
                          <p className="text-lg font-semibold tabular-nums">{perf.overall.toFixed(0)}%</p>
                          <p className="text-xs text-muted-foreground">{gradeLetter(perf.overall).letter} · {gradeLetter(perf.overall).remark}</p>
                        </>
                      ) : (
                        <p className="text-xs text-muted-foreground">No grades yet</p>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="activity">
            <Card>
              <CardContent className="divide-y">
                {subs.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No submissions yet.</p>}
                {subs.slice(0, 30).map((s) => {
                  const a = d.byId.assessment.get(s.assessmentId);
                  return (
                    <div key={s.id} className="flex items-center gap-3 py-2.5 text-sm">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{a?.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {d.byId.course.get(a?.courseId ?? "")?.title} · submitted {fmtDateTime(s.submittedAt)}
                        </p>
                      </div>
                      {s.score != null ? <span className="font-semibold tabular-nums">{s.score}/{a?.totalMarks}</span> : <StatusBadge status={s.status} />}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="attendance">
            <StudentLiveSummary studentId={student.id} title="Live class attendance" />
            <Card>
              <CardContent className="divide-y">
                {attendance.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No attendance records.</p>}
                {[...attendance].sort((a, b) => b.date.localeCompare(a.date)).map((a) => (
                  <div key={a.id} className="flex items-center gap-3 py-2 text-sm">
                    <span className="w-28 shrink-0 tabular-nums">{fmtDate(a.date)}</span>
                    <span className="flex-1 text-muted-foreground">{a.kind === "live" ? `Live: ${d.liveSessions.find((l) => l.id === a.liveSessionId)?.title}` : "School day"}{a.durationMinutes ? ` · ${a.durationMinutes} min` : ""}</span>
                    <StatusBadge status={a.status} />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit student</DialogTitle>
          </DialogHeader>
          <StudentForm
            initial={{ ...student, email: user?.email }}
            classes={d.classes}
            showClass={false}
            takenNumbers={d.allStudents.filter((s) => s.id !== student.id).map((s) => s.studentNumber)}
            onCancel={() => setEditOpen(false)}
            onSubmit={(v) => {
              const st = useStore.getState();
              const { email, classId, ...rest } = v;
              void classId;
              st.update("students", student.id, rest);
              st.update("users", student.userId, { name: `${v.firstName} ${v.lastName}`, ...(email ? { email } : {}) });
              st.audit({ schoolId: d.schoolId, action: "Student updated", target: `${v.firstName} ${v.lastName}`, category: "user" });
              toast.success("Student updated");
              setEditOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate text-right">{value}</span>
    </div>
  );
}

function Meter({ label, value, suffix = "" }: { label: string; value: number | null; suffix?: string }) {
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-sm">
        <span>{label}</span>
        <span className="font-semibold tabular-nums">{value == null ? "—" : `${value.toFixed(0)}%${suffix}`}</span>
      </div>
      <Progress value={value ?? 0} />
    </div>
  );
}

"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { BookOpen, ClipboardCheck, Clock, FileText, Pencil, Video, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { StatusBadge } from "@/components/common/status-badge";
import { UserAvatar } from "@/components/common/user-avatar";
import { StatCard } from "@/components/dashboard/stat-card";
import { TeacherForm } from "@/components/forms/people-forms";
import { RequirePermission } from "@/components/layout/app-shell";
import { useSchoolData } from "@/lib/queries";
import { useCurrentUser } from "@/lib/session";
import { useStore } from "@/lib/store";
import { openConversation } from "@/lib/communication";
import { fmtAgo, sum } from "@/lib/helpers";

export default function TeacherDetailPage() {
  return (
    <RequirePermission perm="teachers.view">
      <TeacherDetail />
    </RequirePermission>
  );
}

/** Teacher profile with activity analytics (spec §49). */
function TeacherDetail() {
  const { id } = useParams<{ id: string }>();
  const d = useSchoolData();
  const me = useCurrentUser();
  const db = useStore();
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const teacher = d.byId.teacher.get(id);
  if (!teacher) return <EmptyState title="Teacher not found" action={<Button onClick={() => router.push("/school/teachers")}>Back to teachers</Button>} />;
  const user = db.users.find((u) => u.id === teacher.userId);
  const courses = d.courses.filter((c) => c.teacherId === teacher.id);
  const live = d.liveSessions.filter((l) => l.teacherId === teacher.id);
  const ended = live.filter((l) => l.status === "ended");
  const hours = sum(ended, (l) => (l.endedAt && l.startedAt ? (Date.parse(l.endedAt) - Date.parse(l.startedAt)) / 3_600_000 : 0));
  const content = d.contents.filter((c) => courses.some((k) => k.id === c.courseId));
  const assessments = d.assessments.filter((a) => a.teacherId === teacher.id);
  const graded = d.submissions.filter((s) => s.score != null && assessments.some((a) => a.id === s.assessmentId)).length;
  const students = new Set(d.enrollments.filter((e) => courses.some((c) => c.classId === e.classId && c.subjectId === e.subjectId)).map((e) => e.studentId)).size;

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Teachers", href: "/school/teachers" }, { label: `${teacher.title} ${teacher.lastName}` }]}
        title={
          <span className="flex items-center gap-3">
            <UserAvatar name={`${teacher.firstName} ${teacher.lastName}`} color={user?.avatarColor} size="lg" />
            <span>
              {teacher.title} {teacher.firstName} {teacher.lastName}
              <span className="mt-1 flex flex-wrap items-center gap-2 text-sm font-normal text-muted-foreground">
                <code>{teacher.staffNumber}</code> · {teacher.specialization} · <StatusBadge status={teacher.status} />
              </span>
            </span>
          </span>
        }
        actions={
          <>
            {user && me && user.id !== me.user.id && (
              <Button variant="outline" onClick={() => router.push(`/messages?c=${openConversation(me.user, user)}`)}>
                <MessageSquare /> Message
              </Button>
            )}
            {me?.can("teachers.update") && (
              <Button variant="outline" onClick={() => setEditOpen(true)}>
                <Pencil /> Edit
              </Button>
            )}
          </>
        }
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Classes conducted" value={ended.length} icon={Video} tone="rose" />
        <StatCard label="Live teaching hours" value={hours.toFixed(1)} icon={Clock} tone="amber" />
        <StatCard label="Content created" value={content.length} icon={FileText} tone="blue" />
        <StatCard label="Assessments created" value={assessments.length} icon={ClipboardCheck} tone="violet" />
        <StatCard label="Grades entered" value={graded} icon={BookOpen} tone="green" />
        <StatCard label="Last login" value={<span className="text-base">{user?.lastActive ? fmtAgo(user.lastActive) : "Never"}</span>} tone="teal" />
      </div>
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Teaching load — {d.session.label}</CardTitle>
          <CardDescription>{students} students across {courses.length} courses</CardDescription>
        </CardHeader>
        <CardContent>
          {courses.length === 0 ? (
            <EmptyState title="No subjects assigned" description="Assign this teacher to subjects from the Subjects page." className="border-0" />
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {courses.map((c) => (
                <div key={c.id} className="rounded-lg border p-3">
                  <p className="font-medium">{c.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {d.enrollments.filter((e) => e.classId === c.classId && e.subjectId === c.subjectId).length} students · {d.contents.filter((x) => x.courseId === c.id).length} items · {d.assessments.filter((a) => a.courseId === c.id).length} assessments
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit teacher</DialogTitle>
          </DialogHeader>
          <TeacherForm
            initial={{ ...teacher, email: user?.email }}
            takenEmails={db.users.filter((u) => u.id !== teacher.userId).map((u) => u.email.toLowerCase())}
            onCancel={() => setEditOpen(false)}
            onSubmit={(v) => {
              const st = useStore.getState();
              const { email, ...rest } = v;
              st.update("teachers", teacher.id, rest);
              st.update("users", teacher.userId, { name: `${v.title} ${v.firstName} ${v.lastName}`, email, phone: v.phone });
              st.audit({ schoolId: d.schoolId, action: "Teacher updated", target: `${v.title} ${v.lastName}`, category: "user" });
              toast.success("Teacher updated");
              setEditOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

"use client";

import { useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Download, MessagesSquare } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { LinkButton } from "@/components/common/link-button";
import { VideoPlayer } from "@/components/media/video-player";
import { useStore } from "@/lib/store";
import { useCurrentUser } from "@/lib/session";
import { fmtDateLong, fmtDuration, fmtTime } from "@/lib/helpers";

/** Recording player (spec §34) — picture-in-picture supported. */
export default function RecordingPage() {
  const { id } = useParams<{ id: string }>();
  const db = useStore();
  const me = useCurrentUser();
  const router = useRouter();
  const counted = useRef(false);
  const rec = db.recordings.find((r) => r.id === id);

  // Access: same school (students only if registered for that class × subject), or the Super Admin.
  const student = db.students.find((s) => s.userId === me?.user.id && s.schoolId === rec?.schoolId);
  const teachesThere = db.teachers.some((t) => t.userId === me?.user.id && t.schoolId === rec?.schoolId);
  const allowed =
    !!rec &&
    !!me &&
    (me.portal === "super-admin" ||
      (me.portal === "student" ? db.enrollments.some((e) => e.studentId === student?.id && e.classId === rec.classId && e.subjectId === rec.subjectId) : teachesThere || me.user.schoolId === rec.schoolId));

  useEffect(() => {
    if (rec && allowed && !counted.current) {
      counted.current = true;
      useStore.getState().update("recordings", rec.id, { views: rec.views + 1 });
    }
  }, [rec, allowed]);

  if (!rec || !allowed) return <EmptyState title="Recording not available" description="It may belong to a class you're not part of." action={<Button onClick={() => router.back()}>Go back</Button>} className="mt-10" />;
  if (rec.status !== "ready") return <EmptyState title="Recording is still processing" description="It will appear here automatically when it's ready." className="mt-10" />;

  const school = db.schools.find((s) => s.id === rec.schoolId);
  const session = db.academicSessions.find((s) => s.id === rec.sessionId);
  const year = db.academicYears.find((y) => y.id === session?.academicYearId);
  const cls = db.classes.find((c) => c.id === rec.classId);
  const subject = db.subjects.find((s) => s.id === rec.subjectId);
  const teacher = db.teachers.find((t) => t.id === rec.teacherId);
  const live = db.liveSessions.find((l) => l.id === rec.liveSessionId);
  // Students watch on the platform only unless the school allows recording downloads.
  const canDownload = me?.portal !== "student" || !!school?.contentProtection?.recordingDownloads;
  const coursePath = me?.portal === "student" ? `/learn/${rec.courseId}` : me?.portal === "teacher" ? `/teacher/courses/${rec.courseId}` : null;

  return (
    <>
      <PageHeader
        breadcrumbs={coursePath ? [{ label: `${subject?.name} — ${cls?.name}`, href: coursePath }, { label: "Recording" }] : [{ label: "Recordings" }]}
        title={rec.title}
        description={`${subject?.name} — ${cls?.name} · ${fmtDateLong(rec.date)} · Duration: ${fmtDuration(rec.durationSeconds)}`}
        actions={
          <>
            <LinkButton variant="outline" href={`/forums/${rec.courseId}`}>
              <MessagesSquare /> Discuss in forum
            </LinkButton>
            {canDownload && (
              <Button variant="outline" onClick={() => toast.message("Download started", { description: `${rec.title}.mp4 · ${rec.sizeMb} MB — in production this streams from video storage.` })}>
                <Download /> Download
              </Button>
            )}
          </>
        }
      />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_320px]">
        <VideoPlayer src={rec.url} title={rec.title} protect={!canDownload} watermark={me ? `${me.user.name} · ${me.user.username ?? me.user.email}` : undefined} />
        <Card>
          <CardHeader>
            <CardTitle>About this recording</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 text-sm">
            {[
              ["School", school?.name],
              ["Academic session", `${year?.name} — ${session?.name}`],
              ["Class", cls?.name],
              ["Subject", subject?.name],
              ["Teacher", teacher ? `${teacher.title} ${teacher.firstName} ${teacher.lastName}` : "—"],
              ["Live session", live?.title],
              ["Date", `${fmtDateLong(rec.date)}, ${fmtTime(rec.date)}`],
              ["Duration", fmtDuration(rec.durationSeconds)],
              ["Size", `${rec.sizeMb} MB`],
              ["Views", String(rec.views)],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3">
                <span className="text-muted-foreground">{k}</span>
                <span className="text-right">{v}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

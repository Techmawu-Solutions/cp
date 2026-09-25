"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { CheckCircle2, CircleHelp, Lock, MessageCircle, Pin, Plus, ShieldAlert, Users } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { UserAvatar } from "@/components/common/user-avatar";
import { Field } from "@/components/forms/field";
import { useStore } from "@/lib/store";
import { useCurrentUser } from "@/lib/session";
import { createThread, forumRoleFor } from "@/lib/communication";
import { fmtAgo } from "@/lib/helpers";
import { cn } from "@/lib/utils";

export default function ForumPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const db = useStore();
  const me = useCurrentUser();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isQuestion, setIsQuestion] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const course = db.courses.find((c) => c.id === courseId);
  const role = forumRoleFor(db, me, course);
  if (!me) return null;
  if (!course || !role)
    return <EmptyState icon={ShieldAlert} title="You can't view this forum" description="Forums are only open to the students registered for that class and subject, their teacher, and school administrators." action={<Button onClick={() => router.push("/forums")}>Back to forums</Button>} className="mt-10" />;

  const subject = db.subjects.find((s) => s.id === course.subjectId);
  const cls = db.classes.find((c) => c.id === course.classId);
  const teacher = db.teachers.find((t) => t.id === course.teacherId);
  const members = db.enrollments.filter((e) => e.classId === course.classId && e.subjectId === course.subjectId).length;
  const threads = db.forumThreads.filter((t) => t.courseId === course.id).sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.lastActivityAt.localeCompare(a.lastActivityAt));
  const userById = (id: string) => db.users.find((u) => u.id === id);
  const canPost = role !== "observer";

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Forums", href: "/forums" }, { label: `${subject?.name} — ${cls?.name}` }]}
        title={`${subject?.name} — ${cls?.name}`}
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="flex items-center gap-1">
              <Users className="size-3.5" /> {members} students + {teacher?.title} {teacher?.lastName}
            </span>
            <span className="flex items-center gap-1">
              <Lock className="size-3.5" /> Private to this class and subject
            </span>
          </span>
        }
        actions={
          canPost && (
            <Button onClick={() => setOpen(true)}>
              <Plus /> New thread
            </Button>
          )
        }
      />
      {role === "observer" && <p className="mb-4 rounded-lg border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">You&apos;re viewing this forum as a school administrator. Only the class and teacher can post.</p>}
      {threads.length === 0 ? (
        <EmptyState icon={MessageCircle} title="No threads yet" description="Start the conversation — ask a question or share something useful." />
      ) : (
        <Card className="gap-0 p-0">
          {threads.map((t) => {
            const author = userById(t.authorId);
            const replies = db.forumPosts.filter((p) => p.threadId === t.id).length;
            const unread = !t.readBy.includes(me.user.id);
            return (
              <Link key={t.id} href={`/forums/${course.id}/${t.id}`} className="flex gap-3 border-b px-4 py-3 last:border-0 hover:bg-muted/40">
                <UserAvatar name={author?.name ?? "?"} color={author?.avatarColor} size="sm" className="mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {t.pinned && <Pin className="size-3.5 text-primary" aria-label="Pinned" />}
                    {t.locked && <Lock className="size-3.5 text-muted-foreground" aria-label="Locked" />}
                    <span className={cn("text-sm", unread ? "font-semibold" : "font-medium")}>{t.title}</span>
                    {t.isQuestion &&
                      (t.acceptedPostId ? (
                        <Badge variant="secondary" className="gap-1 text-emerald-700 dark:text-emerald-300">
                          <CheckCircle2 /> Answered
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1">
                          <CircleHelp /> Question
                        </Badge>
                      ))}
                    {unread && <span className="size-2 rounded-full bg-primary" aria-label="Unread" />}
                  </div>
                  <p className="line-clamp-1 text-sm text-muted-foreground">{t.body}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {author?.name} · {fmtAgo(t.createdAt)}
                  </p>
                </div>
                <div className="hidden shrink-0 text-right text-xs text-muted-foreground sm:block">
                  <p className="flex items-center justify-end gap-1">
                    <MessageCircle className="size-3.5" /> {replies}
                  </p>
                  <p>{fmtAgo(t.lastActivityAt)}</p>
                </div>
              </Link>
            );
          })}
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New thread</DialogTitle>
            <DialogDescription>
              Visible only to {cls?.name} students taking {subject?.name} and their teacher.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (title.trim().length < 5) return setErr("Give your thread a clear title (at least 5 characters).");
              if (body.trim().length < 5) return setErr("Add some detail to your post.");
              const t = createThread(course, me.user.id, { title, body, isQuestion });
              toast.success("Thread posted");
              setOpen(false);
              setTitle("");
              setBody("");
              router.push(`/forums/${course.id}/${t.id}`);
            }}
          >
            <Field label="Title" htmlFor="t-title" required>
              <Input id="t-title" value={title} onChange={(e) => (setTitle(e.target.value), setErr(null))} maxLength={120} />
            </Field>
            <Field label="Message" htmlFor="t-body" required>
              <Textarea id="t-body" rows={5} value={body} onChange={(e) => (setBody(e.target.value), setErr(null))} />
            </Field>
            <label className="flex items-center justify-between gap-3 text-sm">
              This is a question that needs an answer
              <Switch checked={isQuestion} onCheckedChange={setIsQuestion} />
            </label>
            {err && <p className="text-sm text-destructive">{err}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Post thread</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

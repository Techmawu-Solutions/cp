"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CheckCircle2, Lock, LockOpen, Pin, PinOff, ShieldAlert, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { UserAvatar } from "@/components/common/user-avatar";
import { RichText } from "@/components/common/rich-text";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { useStore } from "@/lib/store";
import { useCurrentUser } from "@/lib/session";
import { forumRoleFor, markThreadRead, replyToThread } from "@/lib/communication";
import { fmtAgo, plural } from "@/lib/helpers";
import { cn } from "@/lib/utils";
import type { ForumThread } from "@/lib/types";

export default function ThreadPage() {
  const { courseId, threadId } = useParams<{ courseId: string; threadId: string }>();
  const db = useStore();
  const me = useCurrentUser();
  const router = useRouter();
  const [reply, setReply] = useState("");
  const [deleting, setDeleting] = useState<{ kind: "thread" | "post"; id: string } | null>(null);

  const course = db.courses.find((c) => c.id === courseId);
  const thread = db.forumThreads.find((t) => t.id === threadId && t.courseId === courseId);
  const role = forumRoleFor(db, me, course);

  useEffect(() => {
    if (thread && me && role) markThreadRead(thread, me.user.id);
  }, [thread, me, role]);

  if (!me) return null;
  if (!course || !role) return <EmptyState icon={ShieldAlert} title="You can't view this forum" description="Forums are private to their class and subject." action={<Button onClick={() => router.push("/forums")}>Back to forums</Button>} className="mt-10" />;
  if (!thread) return <EmptyState title="Thread not found" description="It may have been removed by the teacher." action={<Button onClick={() => router.push(`/forums/${courseId}`)}>Back to forum</Button>} className="mt-10" />;

  const moderator = role === "moderator" || (role === "observer" && me.can("courses.update"));
  const posts = db.forumPosts.filter((p) => p.threadId === thread.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const user = (id: string) => db.users.find((u) => u.id === id);
  const isTeacher = (id: string) => user(id)?.roleId === "role_teacher";
  const subject = db.subjects.find((s) => s.id === course.subjectId);
  const cls = db.classes.find((c) => c.id === course.classId);
  const canReply = role !== "observer" && !thread.locked;
  const update = (patch: Partial<ForumThread>) => useStore.getState().update("forumThreads", thread.id, patch);

  const renderPost = ({ id, authorId, body, createdAt, original }: { id: string; authorId: string; body: string; createdAt: string; original?: boolean }) => {
    const author = user(authorId);
    const accepted = thread.acceptedPostId === id;
    return (
      <Card key={id} className={cn(accepted && "ring-2 ring-emerald-500/50")}>
        <CardContent className="flex gap-3">
          <UserAvatar name={author?.name ?? "?"} color={author?.avatarColor} size="sm" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium">{author?.name}</span>
              {isTeacher(authorId) && <Badge variant="secondary">Teacher</Badge>}
              {accepted && (
                <Badge className="gap-1 bg-emerald-600 text-white">
                  <CheckCircle2 /> Accepted answer
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">{fmtAgo(createdAt)}</span>
            </div>
            <div className="mt-1 text-sm">
              <RichText text={body} />
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {!original && thread.isQuestion && (moderator || thread.authorId === me.user.id) && !accepted && (
                <Button size="xs" variant="ghost" onClick={() => (update({ acceptedPostId: id }), toast.success("Marked as the answer"))}>
                  <CheckCircle2 /> Accept answer
                </Button>
              )}
              {(moderator || authorId === me.user.id) && (
                <Button size="xs" variant="ghost" className="text-destructive" onClick={() => setDeleting({ kind: original ? "thread" : "post", id })}>
                  <Trash2 /> Delete
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Forums", href: "/forums" }, { label: `${subject?.name} — ${cls?.name}`, href: `/forums/${course.id}` }, { label: thread.title }]}
        title={
          <span className="flex flex-wrap items-center gap-2">
            {thread.pinned && <Pin className="size-5 text-primary" />}
            {thread.locked && <Lock className="size-5 text-muted-foreground" />}
            {thread.title}
          </span>
        }
        actions={
          moderator && (
            <>
              <Button variant="outline" size="sm" onClick={() => (update({ pinned: !thread.pinned }), toast.success(thread.pinned ? "Unpinned" : "Pinned to top"))}>
                {thread.pinned ? <PinOff /> : <Pin />} {thread.pinned ? "Unpin" : "Pin"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => (update({ locked: !thread.locked }), toast.success(thread.locked ? "Thread unlocked" : "Thread locked"))}>
                {thread.locked ? <LockOpen /> : <Lock />} {thread.locked ? "Unlock" : "Lock"}
              </Button>
            </>
          )
        }
      />
      <div className="mx-auto max-w-3xl space-y-3">
        {renderPost({ id: thread.id, authorId: thread.authorId, body: thread.body, createdAt: thread.createdAt, original: true })}
        {posts.length > 0 && <p className="px-1 pt-2 text-xs font-medium text-muted-foreground">{plural(posts.length, "reply", "replies")}</p>}
        {posts.map((p) => renderPost(p))}
        {canReply ? (
          <Card>
            <CardContent>
              <form
                className="space-y-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!reply.trim()) return;
                  replyToThread(thread, me.user.id, reply);
                  setReply("");
                  toast.success("Reply posted");
                }}
              >
                <Textarea rows={3} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Write a reply…" />
                <div className="flex justify-end">
                  <Button type="submit" disabled={!reply.trim()}>
                    Post reply
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : (
          <p className="rounded-lg border bg-muted/40 px-3 py-2 text-center text-sm text-muted-foreground">{thread.locked ? "This thread is locked by the teacher." : "Only the class and its teacher can reply."}</p>
        )}
      </div>
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={deleting?.kind === "thread" ? "Delete this thread?" : "Delete this reply?"}
        description={deleting?.kind === "thread" ? "The thread and all its replies will be removed." : "This reply will be removed."}
        destructive
        confirmLabel="Delete"
        onConfirm={() => {
          const st = useStore.getState();
          if (deleting?.kind === "thread") {
            st.removeWhere("forumPosts", (p) => p.threadId === thread.id);
            st.remove("forumThreads", thread.id);
            router.push(`/forums/${course.id}`);
          } else if (deleting) {
            st.remove("forumPosts", deleting.id);
            if (thread.acceptedPostId === deleting.id) st.update("forumThreads", thread.id, { acceptedPostId: undefined });
          }
          toast.success("Deleted");
        }}
      />
    </>
  );
}

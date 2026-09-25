"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Lock, MessagesSquare, Search, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { AppSelect } from "@/components/common/app-select";
import { useMyForums } from "@/lib/communication";
import { useCurrentUser, useTenant } from "@/lib/session";
import { fmtAgo, plural } from "@/lib/helpers";

/** Forums list (spec §41.3): one forum per class × subject the user belongs to. */
export default function ForumsPage() {
  const me = useCurrentUser();
  const { schoolId } = useTenant();
  const forums = useMyForums();
  const [q, setQ] = useState("");
  const [cls, setCls] = useState("__all");
  const classes = useMemo(() => [...new Map(forums.map((f) => [f.cls?.id, f.cls])).values()].filter(Boolean).sort((a, b) => a!.name.localeCompare(b!.name)), [forums]);
  const shown = forums
    .filter((f) => (cls === "__all" || f.course.classId === cls) && f.course.title.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.unread - a.unread || (b.lastActivity ?? "").localeCompare(a.lastActivity ?? "") || a.course.title.localeCompare(b.course.title));

  if (!schoolId)
    return <EmptyState icon={Lock} title="Forums belong to schools" description="Open a school workspace from the Schools list to view its forums." className="mt-10" />;

  const description =
    me?.portal === "student"
      ? "One forum for each subject you take in your class. Only your classmates in that subject and your teacher can see it."
      : me?.portal === "teacher"
        ? "One forum for each class and subject you teach. You moderate these forums."
        : "Every class × subject forum in your school for the selected academic session.";

  return (
    <>
      <PageHeader title="Forums" description={description} />
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search forums" className="pl-8" />
        </div>
        {classes.length > 1 && <AppSelect className="sm:w-48" value={cls} onChange={setCls} options={[{ value: "__all", label: "All classes" }, ...classes.map((c) => ({ value: c!.id, label: c!.name }))]} />}
      </div>
      {shown.length === 0 ? (
        <EmptyState icon={MessagesSquare} title="No forums" description={me?.portal === "student" ? "You'll get a forum for each subject once you're registered for it." : "Forums appear when a subject is assigned to a class."} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((f) => (
            <Link key={f.course.id} href={`/forums/${f.course.id}`} className="group">
              <Card className="h-full transition-shadow group-hover:shadow-md group-hover:ring-primary/30">
                <CardContent className="flex gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg text-white" style={{ background: f.subject?.color ?? "var(--primary)" }}>
                    <MessagesSquare className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2">
                      <p className="flex-1 truncate font-medium">
                        {f.subject?.name} — {f.cls?.name}
                      </p>
                      {f.unread > 0 && <Badge>{f.unread} new</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {plural(f.threads, "thread")} · {plural(f.posts, "post")}
                      {f.lastActivity && ` · active ${fmtAgo(f.lastActivity)}`}
                    </p>
                    {f.role === "moderator" && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-primary">
                        <ShieldCheck className="size-3" /> You moderate this forum
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

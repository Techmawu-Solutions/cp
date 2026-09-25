"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { AppSelect } from "@/components/common/app-select";
import { useMyNotifications } from "@/components/layout/notification-bell";
import { NOTIFICATION_META } from "@/components/layout/notification-meta";
import { useStore } from "@/lib/store";
import { useCurrentUser } from "@/lib/session";
import { fmtAgo, fmtDateTime } from "@/lib/helpers";
import { cn } from "@/lib/utils";

/** Notifications (spec §41). */
export default function NotificationsPage() {
  const me = useCurrentUser();
  const items = useMyNotifications();
  const markRead = useStore((s) => s.markRead);
  const router = useRouter();
  const [filter, setFilter] = useState("all");
  if (!me) return null;
  const shown = items.filter((n) => (filter === "all" ? true : filter === "unread" ? !n.readBy.includes(me.user.id) : n.kind === filter));
  const unread = items.filter((n) => !n.readBy.includes(me.user.id));

  return (
    <>
      <PageHeader
        title="Notifications"
        description={`${unread.length} unread`}
        actions={
          unread.length > 0 && (
            <Button variant="outline" onClick={() => markRead(unread.map((n) => n.id))}>
              <CheckCheck /> Mark all as read
            </Button>
          )
        }
      />
      <AppSelect
        className="mb-4 sm:w-60"
        value={filter}
        onChange={setFilter}
        options={[{ value: "all", label: "All notifications" }, { value: "unread", label: "Unread" }, ...Object.entries(NOTIFICATION_META).map(([k, v]) => ({ value: k, label: v.label }))]}
      />
      {shown.length === 0 ? (
        <EmptyState title="No notifications" />
      ) : (
        <Card className="gap-0 p-0">
          {shown.map((n) => {
            const meta = NOTIFICATION_META[n.kind];
            const isUnread = !n.readBy.includes(me.user.id);
            return (
              <button
                key={n.id}
                onClick={() => {
                  markRead([n.id]);
                  if (n.href) router.push(n.href);
                }}
                className={cn("flex w-full gap-3 border-b px-4 py-3 text-left last:border-0 hover:bg-muted/50", isUnread && "bg-primary/[0.03]")}
              >
                <span className={cn("mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full", meta.bg)}>
                  <meta.icon className={cn("size-4", meta.fg)} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className={cn("text-sm", isUnread && "font-semibold")}>{n.title}</span>
                    <span className="text-[11px] text-muted-foreground">{meta.label}</span>
                    {isUnread && <span className="size-2 rounded-full bg-primary" />}
                  </span>
                  <span className="block text-sm text-muted-foreground">{n.body}</span>
                  <span className="text-xs text-muted-foreground" title={fmtDateTime(n.createdAt)}>
                    {fmtAgo(n.createdAt)}
                  </span>
                </span>
              </button>
            );
          })}
        </Card>
      )}
    </>
  );
}

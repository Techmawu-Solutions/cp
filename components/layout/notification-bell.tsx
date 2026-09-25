"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useStore } from "@/lib/store";
import { useCurrentUser, useTenant } from "@/lib/session";
import { fmtAgo } from "@/lib/helpers";
import { cn } from "@/lib/utils";
import { NOTIFICATION_META } from "@/components/layout/notification-meta";
import type { AppNotification } from "@/lib/types";

export function useMyNotifications(): AppNotification[] {
  const me = useCurrentUser();
  const notifications = useStore((s) => s.notifications);
  const { workspaces } = useTenant();
  return useMemo(() => {
    if (!me) return [];
    const schoolIds = new Set(workspaces.map((w) => w.id));
    return notifications
      .filter((n) => n.userId === me.user.id || (n.userId === null && n.schoolId !== null && schoolIds.has(n.schoolId)))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [notifications, me, workspaces]);
}

export function NotificationBell() {
  const me = useCurrentUser();
  const items = useMyNotifications();
  const markRead = useStore((s) => s.markRead);
  const router = useRouter();
  const unread = items.filter((n) => me && !n.readBy.includes(me.user.id));

  return (
    <Popover>
      <PopoverTrigger render={<Button variant="ghost" size="icon" className="relative" aria-label={`Notifications (${unread.length} unread)`} />}>
        <Bell />
        {unread.length > 0 && (
          <span className="absolute top-1 right-1 flex min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] leading-4 font-semibold text-white">{unread.length > 9 ? "9+" : unread.length}</span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[22rem] gap-0 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2.5">
          <p className="font-medium">Notifications</p>
          {unread.length > 0 && (
            <button className="text-xs text-primary hover:underline" onClick={() => markRead(unread.map((n) => n.id))}>
              Mark all as read
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">You&apos;re all caught up.</p>}
          {items.slice(0, 8).map((n) => {
            const meta = NOTIFICATION_META[n.kind];
            const isUnread = me && !n.readBy.includes(me.user.id);
            return (
              <button
                key={n.id}
                className="flex w-full gap-3 border-b px-3 py-2.5 text-left last:border-0 hover:bg-muted/60"
                onClick={() => {
                  markRead([n.id]);
                  if (n.href) router.push(n.href);
                }}
              >
                <span className={cn("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full", meta.bg)}>
                  <meta.icon className={cn("size-4", meta.fg)} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className={cn("truncate text-sm", isUnread && "font-semibold")}>{n.title}</span>
                    {isUnread && <span className="size-2 shrink-0 rounded-full bg-primary" />}
                  </span>
                  <span className="line-clamp-2 text-xs text-muted-foreground">{n.body}</span>
                  <span className="text-[11px] text-muted-foreground">{fmtAgo(n.createdAt)}</span>
                </span>
              </button>
            );
          })}
        </div>
        <div className="border-t p-2">
          <Button variant="ghost" className="w-full" onClick={() => router.push("/notifications")}>
            View all notifications
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

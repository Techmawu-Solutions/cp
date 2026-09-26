"use client";

import { useRouter } from "next/navigation";
import { MessageSquare, MessagesSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { UserAvatar } from "@/components/common/user-avatar";
import { useMyConversations, useMyForums } from "@/lib/communication";
import { useCurrentUser } from "@/lib/session";
import { fmtAgo } from "@/lib/helpers";
import { cn } from "@/lib/utils";

/** Header message icon (spec §41.1): recent conversations + unread forum activity. */
export function MessageBell() {
  const me = useCurrentUser();
  const convos = useMyConversations();
  const forums = useMyForums();
  const router = useRouter();
  const unreadMessages = convos.reduce((a, c) => a + c.unread, 0);
  const unreadForums = forums.filter((f) => f.unread > 0);
  const total = unreadMessages + unreadForums.reduce((a, f) => a + f.unread, 0);
  if (!me) return null;

  return (
    <Popover>
      <PopoverTrigger render={<Button variant="ghost" size="icon" className="relative" aria-label={`Messages (${total} unread)`} />}>
        <MessageSquare />
        {total > 0 && <span className="absolute top-1 right-1 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] leading-4 font-semibold text-primary-foreground">{total > 9 ? "9+" : total}</span>}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[22rem] max-w-[calc(100vw-1rem)] gap-0 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2.5">
          <p className="font-medium">Messages</p>
          <button className="text-xs text-primary hover:underline" onClick={() => router.push("/messages?new=1")}>
            New message
          </button>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {convos.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">No conversations yet.</p>}
          {convos.slice(0, 6).map(({ conversation, others, last, unread }) => (
            <button key={conversation.id} className="flex w-full gap-3 border-b px-3 py-2.5 text-left last:border-0 hover:bg-muted/60" onClick={() => router.push(`/messages?c=${conversation.id}`)}>
              <UserAvatar name={others[0]?.name ?? "?"} color={others[0]?.avatarColor} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className={cn("truncate text-sm", unread > 0 && "font-semibold")}>{others.map((o) => o.name).join(", ")}</span>
                  {unread > 0 && <span className="ml-auto rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">{unread}</span>}
                </span>
                <span className="line-clamp-1 text-xs text-muted-foreground">
                  {last?.senderId === me.user.id && "You: "}
                  {last?.body}
                </span>
                {last && <span className="text-[11px] text-muted-foreground">{fmtAgo(last.sentAt)}</span>}
              </span>
            </button>
          ))}
        </div>
        {unreadForums.length > 0 && (
          <div className="border-t">
            <p className="px-3 pt-2.5 text-xs font-medium text-muted-foreground">Forum activity</p>
            {unreadForums.slice(0, 3).map((f) => (
              <button key={f.course.id} className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted/60" onClick={() => router.push(`/forums/${f.course.id}`)}>
                <MessagesSquare className="size-4 text-muted-foreground" />
                <span className="flex-1 truncate text-sm">{f.course.title}</span>
                <span className="text-xs text-primary">{f.unread} new</span>
              </button>
            ))}
          </div>
        )}
        <div className="grid grid-cols-2 gap-1 border-t p-2">
          <Button variant="ghost" onClick={() => router.push("/messages")}>
            Open messages
          </Button>
          <Button variant="ghost" onClick={() => router.push("/forums")}>
            Forums
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

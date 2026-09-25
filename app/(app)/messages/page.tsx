"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, MessageSquarePlus, Search, Send } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { UserAvatar } from "@/components/common/user-avatar";
import { useStore } from "@/lib/store";
import { useCurrentUser, useTenant } from "@/lib/session";
import { markConversationRead, messageableUsers, openConversation, sendMessage, useMyConversations } from "@/lib/communication";
import { fmtAgo, fmtDay, fmtTime } from "@/lib/helpers";
import { cn } from "@/lib/utils";

export default function MessagesPage() {
  return (
    <Suspense>
      <Messages />
    </Suspense>
  );
}

function Messages() {
  const me = useCurrentUser();
  const db = useStore();
  const params = useSearchParams();
  const router = useRouter();
  const convos = useMyConversations();
  const activeId = params.get("c");
  const [composeOpen, setComposeOpen] = useState(params.get("new") === "1");
  const [filter, setFilter] = useState("");
  const [draft, setDraft] = useState("");
  const bottom = useRef<HTMLDivElement>(null);
  const active = convos.find((c) => c.conversation.id === activeId);

  useEffect(() => {
    if (active && me && active.unread > 0) markConversationRead(active.conversation.id, me.user.id);
  }, [active, me]);
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [active?.messages.length, activeId]);

  const { schoolId: workspaceId } = useTenant();
  const contacts = useMemo(() => (me ? messageableUsers(db, me, workspaceId ?? me.user.schoolId) : []), [db, me, workspaceId]);
  const roleLabel = (userId: string) => {
    const u = db.users.find((x) => x.id === userId);
    return db.roles.filter((r) => u?.roleId === r.id).map((r) => r.name).join(", ");
  };
  if (!me) return null;

  const visible = convos.filter((c) => !filter || c.others.some((o) => o.name.toLowerCase().includes(filter.toLowerCase())));
  const send = () => {
    if (!active || !draft.trim()) return;
    sendMessage(active.conversation.id, me.user.id, draft);
    setDraft("");
  };

  return (
    <>
      <PageHeader
        title="Messages"
        description="Direct messages stay within your school. Students can message the teachers who teach them."
        actions={
          <Button onClick={() => setComposeOpen(true)}>
            <MessageSquarePlus /> New message
          </Button>
        }
      />
      <Card className="h-[calc(100dvh-13rem)] min-h-[440px] flex-row gap-0 overflow-hidden p-0">
        {/* Conversation list — hidden on mobile while a conversation is open */}
        <div className={cn("flex w-full flex-col border-r md:w-80 md:shrink-0", active && "hidden md:flex")}>
          <div className="border-b p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Search conversations" className="pl-8" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {visible.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">No conversations.</p>}
            {visible.map(({ conversation, others, last, unread }) => (
              <button
                key={conversation.id}
                onClick={() => router.replace(`/messages?c=${conversation.id}`)}
                className={cn("flex w-full gap-3 border-b px-3 py-3 text-left hover:bg-muted/60", conversation.id === activeId && "bg-accent")}
              >
                <UserAvatar name={others[0]?.name ?? "?"} color={others[0]?.avatarColor} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2">
                    <span className={cn("truncate text-sm", unread > 0 && "font-semibold")}>{others.map((o) => o.name).join(", ")}</span>
                    {last && <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">{fmtAgo(last.sentAt).replace("about ", "")}</span>}
                  </span>
                  {conversation.subject && <span className="block truncate text-xs font-medium text-muted-foreground">{conversation.subject}</span>}
                  <span className="flex items-center gap-2">
                    <span className="line-clamp-1 flex-1 text-xs text-muted-foreground">
                      {last?.senderId === me.user.id && "You: "}
                      {last?.body ?? "No messages yet"}
                    </span>
                    {unread > 0 && <span className="rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">{unread}</span>}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Thread */}
        <div className={cn("min-w-0 flex-1 flex-col", active ? "flex" : "hidden md:flex")}>
          {!active ? (
            <div className="flex flex-1 items-center justify-center p-6">
              <EmptyState title="Select a conversation" description="Or start a new message." className="border-0" />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 border-b px-3 py-2.5">
                <Button variant="ghost" size="icon-sm" className="md:hidden" onClick={() => router.replace("/messages")} aria-label="Back to conversations">
                  <ArrowLeft />
                </Button>
                <UserAvatar name={active.others[0]?.name ?? "?"} color={active.others[0]?.avatarColor} size="sm" />
                <div className="min-w-0">
                  <p className="truncate font-medium">{active.others.map((o) => o.name).join(", ")}</p>
                  <p className="truncate text-xs text-muted-foreground">{active.others[0] && roleLabel(active.others[0].id)}</p>
                </div>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto bg-muted/20 p-4">
                {active.messages.map((m, i) => {
                  const mine = m.senderId === me.user.id;
                  const showDay = i === 0 || fmtDay(active.messages[i - 1]!.sentAt) !== fmtDay(m.sentAt);
                  return (
                    <div key={m.id}>
                      {showDay && <p className="my-2 text-center text-[11px] text-muted-foreground">{fmtDay(m.sentAt)}</p>}
                      <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
                        <div className={cn("max-w-[80%] rounded-2xl px-3.5 py-2 text-sm shadow-xs", mine ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-card ring-1 ring-border")}>
                          <p className="whitespace-pre-wrap">{m.body}</p>
                          <p className={cn("mt-0.5 text-right text-[10px]", mine ? "text-primary-foreground/70" : "text-muted-foreground")}>{fmtTime(m.sentAt)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottom} />
              </div>
              <form
                className="flex items-end gap-2 border-t p-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  send();
                }}
              >
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  rows={1}
                  placeholder="Write a message…  (Enter to send, Shift+Enter for a new line)"
                  className="max-h-32 min-h-10 resize-none"
                />
                <Button type="submit" size="icon-lg" disabled={!draft.trim()} aria-label="Send">
                  <Send />
                </Button>
              </form>
            </>
          )}
        </div>
      </Card>

      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New message</DialogTitle>
            <DialogDescription>{me.portal === "student" ? "You can message the teachers of your subjects." : "People you can message at your school."}</DialogDescription>
          </DialogHeader>
          <ContactPicker
            contacts={contacts.map((c) => ({ ...c, role: roleLabel(c.id) }))}
            onPick={(u) => {
              const id = openConversation(me.user, u);
              setComposeOpen(false);
              router.replace(`/messages?c=${id}`);
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

function ContactPicker({ contacts, onPick }: { contacts: (ReturnType<typeof useStore.getState>["users"][number] & { role: string })[]; onPick: (u: ReturnType<typeof useStore.getState>["users"][number]) => void }) {
  const [q, setQ] = useState("");
  const shown = contacts.filter((c) => c.name.toLowerCase().includes(q.toLowerCase())).slice(0, 50);
  return (
    <div className="space-y-2">
      <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search people" />
      <div className="max-h-72 overflow-y-auto rounded-lg border">
        {shown.length === 0 && <p className="p-4 text-center text-sm text-muted-foreground">No one found.</p>}
        {shown.map((c) => (
          <button key={c.id} onClick={() => onPick(c)} className="flex w-full items-center gap-3 border-b px-3 py-2 text-left last:border-0 hover:bg-muted/60">
            <UserAvatar name={c.name} color={c.avatarColor} size="sm" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{c.name}</span>
              <span className="block truncate text-xs text-muted-foreground">{c.role}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

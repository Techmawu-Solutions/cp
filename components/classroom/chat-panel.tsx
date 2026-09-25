"use client";

import { useEffect, useRef, useState } from "react";
import { Megaphone, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ClassroomApi } from "@/components/classroom/use-classroom";
import { fmtTime } from "@/lib/helpers";
import { cn } from "@/lib/utils";

/** Live chat (spec §32 communication); hosts can post announcements. */
export function ChatPanel({ room, selfId, isHost }: { room: ClassroomApi; selfId: string; isHost: boolean }) {
  const [text, setText] = useState("");
  const [announce, setAnnounce] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [room.chat.length]);
  const send = () => {
    if (!text.trim()) return;
    if (announce) room.announce(text.trim());
    else room.sendChat(text.trim());
    setText("");
  };
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex-1 space-y-2.5 overflow-y-auto p-3">
        {room.chat.map((m) =>
          m.system ? (
            <p key={m.id} className="text-center text-[11px] text-slate-400">
              {m.text}
            </p>
          ) : m.announcement ? (
            <div key={m.id} className="rounded-lg border border-amber-400/40 bg-amber-400/10 p-2 text-sm text-amber-100">
              <p className="mb-0.5 flex items-center gap-1 text-[11px] font-semibold text-amber-300">
                <Megaphone className="size-3" /> Announcement · {m.name}
              </p>
              {m.text}
            </div>
          ) : (
            <div key={m.id} className={cn("flex flex-col", m.authorId === selfId && "items-end")}>
              <span className="text-[11px] text-slate-400">
                {m.authorId === selfId ? "You" : m.name} · {fmtTime(m.at)}
              </span>
              <span className={cn("max-w-[85%] rounded-2xl px-3 py-1.5 text-sm", m.authorId === selfId ? "rounded-br-sm bg-blue-600 text-white" : "rounded-bl-sm bg-slate-700 text-slate-100")}>{m.text}</span>
            </div>
          ),
        )}
        <div ref={bottom} />
      </div>
      <form
        className="border-t border-slate-700 p-2"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        {isHost && (
          <label className="mb-1.5 flex items-center gap-1.5 text-[11px] text-slate-400">
            <input type="checkbox" checked={announce} onChange={(e) => setAnnounce(e.target.checked)} className="accent-amber-400" /> Send as announcement
          </label>
        )}
        <div className="flex gap-2">
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Message everyone…" className="border-slate-600 bg-slate-800 text-slate-100 placeholder:text-slate-500" />
          <Button type="submit" size="icon" disabled={!text.trim()} aria-label="Send">
            <Send />
          </Button>
        </div>
        <p className="mt-1 text-[10px] text-slate-500">Private chat is coming soon.</p>
      </form>
    </div>
  );
}

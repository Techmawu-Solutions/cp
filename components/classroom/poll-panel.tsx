"use client";

import { useState } from "react";
import { Plus, X, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ClassroomApi } from "@/components/classroom/use-classroom";
import { cn } from "@/lib/utils";

/** Live polls (spec §32 teaching). */
export function PollPanel({ room, isHost, selfId }: { room: ClassroomApi; isHost: boolean; selfId: string }) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [creating, setCreating] = useState(false);
  const polls = [...room.polls].reverse();

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto p-3 text-slate-100">
      {isHost && !creating && (
        <Button className="mb-3" onClick={() => setCreating(true)}>
          <Plus /> New poll
        </Button>
      )}
      {creating && (
        <form
          className="mb-4 space-y-2 rounded-lg border border-slate-700 p-3"
          onSubmit={(e) => {
            e.preventDefault();
            const opts = options.map((o) => o.trim()).filter(Boolean);
            if (!question.trim() || opts.length < 2) return;
            room.createPoll(question.trim(), opts);
            setQuestion("");
            setOptions(["", ""]);
            setCreating(false);
          }}
        >
          <Input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Question" className="border-slate-600 bg-slate-800" autoFocus />
          {options.map((o, i) => (
            <div key={i} className="flex gap-1">
              <Input value={o} onChange={(e) => setOptions(options.map((x, j) => (j === i ? e.target.value : x)))} placeholder={`Option ${i + 1}`} className="h-8 border-slate-600 bg-slate-800" />
              {options.length > 2 && (
                <Button type="button" size="icon-sm" variant="ghost" onClick={() => setOptions(options.filter((_, j) => j !== i))} aria-label="Remove option">
                  <X />
                </Button>
              )}
            </div>
          ))}
          <div className="flex gap-2">
            {options.length < 6 && (
              <Button type="button" size="sm" variant="ghost" onClick={() => setOptions([...options, ""])}>
                <Plus /> Option
              </Button>
            )}
            <Button type="button" size="sm" variant="ghost" className="ml-auto" onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Launch
            </Button>
          </div>
        </form>
      )}
      {polls.length === 0 && !creating && (
        <div className="flex flex-1 flex-col items-center justify-center text-center text-sm text-slate-400">
          <BarChart3 className="mb-2 size-6" />
          {isHost ? "Launch a poll to check understanding." : "No polls yet."}
        </div>
      )}
      <div className="space-y-3">
        {polls.map((p) => {
          const total = Object.keys(p.votes).length;
          const mine = p.votes[selfId];
          const showResults = isHost || mine !== undefined || !p.open;
          return (
            <div key={p.id} className="rounded-lg border border-slate-700 p-3">
              <div className="mb-2 flex items-start gap-2">
                <p className="flex-1 text-sm font-medium">{p.question}</p>
                <span className={cn("rounded px-1.5 py-0.5 text-[10px]", p.open ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-700 text-slate-300")}>{p.open ? "Live" : "Closed"}</span>
              </div>
              <div className="space-y-1.5">
                {p.options.map((o, i) => {
                  const n = Object.values(p.votes).filter((v) => v === i).length;
                  const pct = total ? (n / total) * 100 : 0;
                  return showResults ? (
                    <div key={i} className="relative overflow-hidden rounded-md bg-slate-800 px-2.5 py-1.5 text-sm">
                      <div className={cn("absolute inset-y-0 left-0 transition-all", mine === i ? "bg-blue-500/40" : "bg-slate-600/60")} style={{ width: `${pct}%` }} />
                      <div className="relative flex justify-between gap-2">
                        <span>
                          {o}
                          {mine === i && " ✓"}
                        </span>
                        <span className="tabular-nums">{pct.toFixed(0)}%</span>
                      </div>
                    </div>
                  ) : (
                    <button key={i} onClick={() => room.vote(p.id, i)} className="w-full rounded-md border border-slate-600 px-2.5 py-1.5 text-left text-sm hover:border-blue-400 hover:bg-slate-800">
                      {o}
                    </button>
                  );
                })}
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                <span>{total} votes</span>
                {isHost && p.open && (
                  <button onClick={() => room.closePoll(p.id)} className="underline">
                    End poll
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

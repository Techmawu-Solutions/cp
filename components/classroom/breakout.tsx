"use client";

import { PersonName } from "@/components/common/student-name";
import { useState } from "react";
import { ArrowLeft, DoorOpen, Hand, LogIn, Megaphone, Shuffle, Timer, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { AppSelect } from "@/components/common/app-select";
import { UserAvatar } from "@/components/common/user-avatar";
import type { Breakout, BreakoutRoom } from "@/components/classroom/stage-sync";
import { uid } from "@/lib/helpers";
import { cn } from "@/lib/utils";

/**
 * Breakout rooms (spec section 32). The teacher splits the class into small groups;
 * each group gets its own room and whiteboard, and the teacher can visit any
 * room, answer help requests, broadcast to every room and bring everyone back.
 */

export interface Member {
  id: string;
  name: string;
  color: string;
  speaking?: boolean;
}

export const fmtLeft = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

const DURATIONS = [
  { value: "5", label: "5 min" },
  { value: "10", label: "10 min" },
  { value: "15", label: "15 min" },
  { value: "20", label: "20 min" },
  { value: "30", label: "30 min" },
  { value: "0", label: "No time limit" },
];

type Assign = "auto" | "manual" | "choose";

const shuffle = <T,>(xs: T[]) => {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
};

const deal = (ids: string[], count: number) => {
  const groups: string[][] = Array.from({ length: count }, () => []);
  shuffle(ids).forEach((id, i) => groups[i % count]!.push(id));
  return groups;
};

function buildBreakout(rooms: { name: string; members: string[] }[], minutes: number, o: { autoReturn: boolean; allowReturn: boolean; choose: boolean }): Breakout {
  return {
    status: "open",
    startedAt: new Date().toISOString(),
    rooms: rooms.map((r): BreakoutRoom => ({ id: uid("room"), ...r })),
    endsAt: minutes ? new Date(Date.now() + minutes * 60_000).toISOString() : null,
    autoReturn: !!minutes && o.autoReturn,
    allowReturn: o.allowReturn,
    choose: o.choose,
    boards: {},
    help: [],
    visiting: null,
    inMain: [],
  };
}

/** Teacher: set up and open breakout rooms. */
export function BreakoutSetup({ students, onOpen }: { students: Member[]; onOpen: (b: Breakout) => void }) {
  const [count, setCount] = useState(() => String(Math.min(6, Math.max(2, Math.round(students.length / 4)))));
  const n = Math.min(20, Math.max(2, Number(count) || 2));
  const [assign, setAssign] = useState<Assign>("auto");
  const [names, setNames] = useState<string[]>([]);
  const [groups, setGroups] = useState<string[][]>(() => deal(students.map((s) => s.id), n));
  const [minutes, setMinutes] = useState("10");
  const [autoReturn, setAutoReturn] = useState(true);
  const [allowReturn, setAllowReturn] = useState(true);
  const name = (i: number) => names[i]?.trim() || `Group ${i + 1}`;
  // Students who joined after the groups were dealt go into the smallest group.
  const assigned = new Set(groups.flat());
  // Deterministic while the count is being edited; a new count reshuffles in its change handler.
  const current = groups.length === n ? groups : Array.from({ length: n }, (_, i) => groups.flat().filter((_, j) => j % n === i));
  const withNew = students.filter((s) => !assigned.has(s.id)).reduce((g, s) => {
    const next = g.map((x) => [...x]);
    next.sort((a, b) => a.length - b.length)[0]!.push(s.id);
    return next;
  }, current);
  const groupOf = (id: string) => withNew.findIndex((g) => g.includes(id));

  const move = (id: string, to: number) => setGroups(withNew.map((g, i) => (i === to ? [...g.filter((x) => x !== id), id] : g.filter((x) => x !== id))));

  const open = () => onOpen(buildBreakout(Array.from({ length: n }, (_, i) => ({ name: name(i), members: assign === "choose" ? [] : (withNew[i] ?? []) })), Number(minutes), { autoReturn, allowReturn, choose: assign === "choose" }));

  const byId = new Map(students.map((s) => [s.id, s]));

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto p-3 text-sm text-slate-200">
      <p className="text-xs text-slate-400">Split the class into small groups. Each group gets its own room and whiteboard; you can visit any room and bring everyone back.</p>
      {students.length < 2 ? (
        <p className="mt-4 rounded-lg bg-slate-800 p-3 text-slate-300">At least two students need to be in class to open breakout rooms.</p>
      ) : (
        <div className="mt-3 space-y-4">
          <div className="flex items-center gap-3">
            <label htmlFor="bo-count" className="flex-1">
              Number of rooms
              <span className="block text-xs text-slate-400">About {Math.ceil(students.length / n)} students each</span>
            </label>
            <Input id="bo-count" numeric="integer" maxLength={2} value={count} onChange={(e) => {
                setCount(e.target.value);
                const k = Number(e.target.value);
                if (k >= 2 && k <= 20) setGroups(deal(students.map((x) => x.id), k));
              }}
              onBlur={() => setCount(String(n))} className="w-16 border-slate-600 bg-slate-800 text-center" />
          </div>

          <div>
            <p className="mb-1.5">Put students in rooms</p>
            <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-800 p-1 text-xs">
              {(
                [
                  ["auto", "Automatically"],
                  ["manual", "Manually"],
                  ["choose", "Let them choose"],
                ] as const
              ).map(([k, label]) => (
                <button key={k} type="button" onClick={() => setAssign(k)} className={cn("rounded-md px-2 py-1.5", assign === k ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-700")} aria-pressed={assign === k}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p>Rooms</p>
              {assign !== "choose" && (
                <Button size="xs" variant="ghost" className="text-slate-300 hover:bg-slate-700" onClick={() => setGroups(deal(students.map((s) => s.id), n))}>
                  <Shuffle /> Reshuffle
                </Button>
              )}
            </div>
            {Array.from({ length: n }, (_, i) => (
              <div key={i} className="rounded-lg border border-slate-700 p-2">
                <Input value={names[i] ?? ""} placeholder={`Group ${i + 1}`} onChange={(e) => setNames((xs) => Object.assign([...xs], { [i]: e.target.value }))} className="h-7 border-slate-600 bg-slate-800 text-sm" aria-label={`Name of room ${i + 1}`} />
                {assign === "choose" ? (
                  <p className="mt-1.5 text-xs text-slate-400">Students pick this room themselves.</p>
                ) : (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {(withNew[i] ?? []).map((id) => (
                      <span key={id} className="inline-flex items-center gap-1 rounded-full bg-slate-800 py-0.5 pr-2 pl-0.5 text-xs">
                        <UserAvatar name={byId.get(id)?.name ?? "?"} color={byId.get(id)?.color} size="xs" /> {byId.get(id)?.name.split(" ")[0]}
                      </span>
                    ))}
                    {(withNew[i] ?? []).length === 0 && <span className="text-xs text-slate-500">Empty</span>}
                  </div>
                )}
              </div>
            ))}
          </div>

          {assign === "manual" && (
            <div className="space-y-1.5">
              <p>Move students</p>
              {students.map((s) => (
                <div key={s.id} className="flex items-center gap-2">
                  <UserAvatar name={s.name} color={s.color} size="xs" />
                  <PersonName userId={s.id} name={s.name} className="flex-1" usernameClassName="text-slate-400" />
                  <div className="w-32">
                    <AppSelect size="sm" value={String(groupOf(s.id))} onChange={(v) => move(s.id, Number(v))} options={Array.from({ length: n }, (_, i) => ({ value: String(i), label: name(i) }))} aria-label={`Room for ${s.name}`} />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="flex flex-1 items-center gap-1.5">
                <Timer className="size-4" /> Time in rooms
              </span>
              <div className="w-36">
                <AppSelect size="sm" value={minutes} onChange={setMinutes} options={DURATIONS} aria-label="Time in rooms" />
              </div>
            </div>
            <label className="flex items-start gap-2">
              <Checkbox checked={autoReturn && minutes !== "0"} disabled={minutes === "0"} onCheckedChange={(c) => setAutoReturn(!!c)} className="mt-0.5" />
              <span>
                Bring everyone back when time is up <span className="block text-xs text-slate-400">With a 30-second countdown. Everyone gets a warning a minute before.</span>
              </span>
            </label>
            <label className="flex items-start gap-2">
              <Checkbox checked={allowReturn} onCheckedChange={(c) => setAllowReturn(!!c)} className="mt-0.5" />
              <span>Students can go back to the main room on their own</span>
            </label>
          </div>

          <Button className="w-full" onClick={open}>
            <DoorOpen /> Open {n} rooms
          </Button>
        </div>
      )}
    </div>
  );
}

/** Teacher: rooms are open — overview of every room, with help requests, visiting, broadcasting and closing. */
export function BreakoutOverview({
  b,
  now,
  members,
  onVisit,
  onBroadcast,
  onClose,
  onMove,
  onExtend,
}: {
  b: Breakout;
  now: number;
  members: Map<string, Member>;
  onVisit: (roomId: string) => void;
  onBroadcast: (text: string) => void;
  onClose: () => void;
  onMove: (userId: string, roomId: string) => void;
  onExtend: (minutes: number) => void;
}) {
  const [text, setText] = useState("");
  const unassigned = [...members.values()].filter((m) => !b.rooms.some((r) => r.members.includes(m.id)));
  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto p-3 text-slate-100 sm:p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Users className="size-5" /> Breakout rooms
        </h2>
        {b.status === "closing" ? (
          <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-sm text-amber-200">Bringing everyone back in {fmtLeft(Date.parse(b.closesAt!) - now)}</span>
        ) : b.endsAt ? (
          <span className={cn("rounded-full px-2.5 py-0.5 text-sm tabular-nums", Date.parse(b.endsAt) - now < 60_000 ? "bg-red-500/20 text-red-200" : "bg-slate-800 text-slate-300")}>{Date.parse(b.endsAt) > now ? `${fmtLeft(Date.parse(b.endsAt) - now)} left` : "Time's up"}</span>
        ) : (
          <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-sm text-slate-300">No time limit</span>
        )}
        <div className="ml-auto flex gap-2">
          {b.status === "open" && b.endsAt && (
            <Button size="sm" variant="secondary" onClick={() => onExtend(5)}>
              +5 min
            </Button>
          )}
          {b.status === "open" && (
            <Button size="sm" className="bg-red-600 text-white hover:bg-red-500" onClick={onClose}>
              <X /> Close rooms
            </Button>
          )}
        </div>
      </div>

      {b.status === "open" && (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!text.trim()) return;
            onBroadcast(text.trim());
            setText("");
          }}
        >
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Message every room, e.g. “5 minutes left — agree on your answer”" className="border-slate-600 bg-slate-800" aria-label="Broadcast message" />
          <Button type="submit" size="sm" variant="secondary" className="h-8 shrink-0" disabled={!text.trim()}>
            <Megaphone /> <span className="max-sm:sr-only">Broadcast</span>
          </Button>
        </form>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {b.rooms.map((r) => {
          const help = b.help.includes(r.id);
          const strokes = b.boards[r.id]?.length ?? 0;
          return (
            <div key={r.id} className={cn("rounded-xl border bg-slate-900 p-3", help ? "border-amber-400" : "border-slate-700")}>
              <div className="flex items-center gap-2">
                <p className="min-w-0 flex-1 truncate font-medium">{r.name}</p>
                {help && (
                  <span className="flex items-center gap-1 rounded-full bg-amber-400 px-2 py-0.5 text-xs font-semibold text-amber-950">
                    <Hand className="size-3.5" /> Needs help
                  </span>
                )}
              </div>
              <div className="mt-2 flex min-h-8 flex-wrap gap-1">
                {r.members.map((id) => {
                  const m = members.get(id);
                  const back = b.inMain.includes(id);
                  return (
                    <span key={id} className={cn("inline-flex items-center gap-1 rounded-full bg-slate-800 py-0.5 pr-2 pl-0.5 text-xs", m?.speaking && "ring-1 ring-emerald-400", back && "opacity-50")} title={back ? "Back in the main room" : m ? undefined : "Not in class"}>
                      <UserAvatar name={m?.name ?? "?"} color={m?.color} size="xs" /> {(m?.name ?? "Left class").split(" ")[0]}
                    </span>
                  );
                })}
                {r.members.length === 0 && <span className="text-xs text-slate-500">{b.choose ? "Waiting for students to choose" : "Empty"}</span>}
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="text-xs text-slate-400">{strokes ? `Whiteboard · ${strokes} stroke${strokes === 1 ? "" : "s"}` : "Whiteboard empty"}</span>
                <Button size="xs" variant={help ? "default" : "secondary"} onClick={() => onVisit(r.id)} disabled={b.status !== "open"}>
                  <LogIn /> Join
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {unassigned.length > 0 && b.status === "open" && (
        <div className="rounded-xl border border-slate-700 p-3">
          <p className="mb-2 text-sm font-medium">{b.choose ? "Still choosing" : "Not in a room"} ({unassigned.length})</p>
          <div className="space-y-1.5">
            {unassigned.map((m) => (
              <div key={m.id} className="flex items-center gap-2 text-sm">
                <UserAvatar name={m.name} color={m.color} size="xs" />
                <PersonName userId={m.id} name={m.name} className="flex-1" usernameClassName="text-slate-400" />
                <div className="w-36">
                  <AppSelect size="sm" value={null} placeholder="Send to…" onChange={(v) => onMove(m.id, v)} options={b.rooms.map((r) => ({ value: r.id, label: r.name }))} aria-label={`Room for ${m.name}`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Top bar inside a breakout room — for its students, and for the teacher while visiting. */
export function BreakoutRoomBar({ b, room, now, members, isHost, onHelp, onReturn, onLeaveVisit }: { b: Breakout; room: BreakoutRoom; now: number; members: Map<string, Member>; isHost: boolean; onHelp?: () => void; onReturn?: () => void; onLeaveVisit?: () => void }) {
  const helpAsked = b.help.includes(room.id);
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-white/10 bg-indigo-950/60 px-3 py-2 text-sm text-slate-100">
      <span className="flex items-center gap-1.5 font-semibold">
        <Users className="size-4" /> {room.name}
      </span>
      <span className="hidden truncate text-xs text-slate-300 sm:inline">{room.members.map((id) => members.get(id)?.name.split(" ")[0] ?? "…").join(", ")}</span>
      {b.visiting === room.id && !isHost && <span className="rounded-full bg-emerald-600/80 px-2 py-0.5 text-xs">Teacher is here</span>}
      {b.status === "closing" ? (
        <span className="rounded-full bg-amber-500/25 px-2 py-0.5 text-xs text-amber-100">Back to the main room in {fmtLeft(Date.parse(b.closesAt!) - now)}</span>
      ) : b.endsAt ? (
        <span className={cn("rounded-full px-2 py-0.5 text-xs tabular-nums", Date.parse(b.endsAt) - now < 60_000 ? "bg-red-500/30 text-red-100" : "bg-white/10")}>{Date.parse(b.endsAt) > now ? `${fmtLeft(Date.parse(b.endsAt) - now)} left` : "Time's up"}</span>
      ) : null}
      <div className="ml-auto flex gap-2">
        {isHost ? (
          <Button size="xs" variant="secondary" onClick={onLeaveVisit}>
            <ArrowLeft /> All rooms
          </Button>
        ) : (
          <>
            <Button size="xs" variant={helpAsked ? "secondary" : "default"} className={cn(helpAsked && "text-amber-300")} onClick={onHelp} disabled={helpAsked || b.status !== "open"}>
              <Hand /> {helpAsked ? "Help requested" : "Ask for help"}
            </Button>
            {b.allowReturn && b.status === "open" && (
              <Button size="xs" variant="secondary" onClick={onReturn}>
                <DoorOpen /> Main room
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/** Student with no room yet, when students choose their own. */
export function BreakoutChooser({ b, members, onPick }: { b: Breakout; members: Map<string, Member>; onPick: (roomId: string) => void }) {
  return (
    <div className="flex h-full items-center justify-center overflow-y-auto p-4">
      <div className="w-full max-w-lg rounded-2xl bg-slate-900 p-5 text-slate-100 ring-1 ring-white/10">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Users className="size-5" /> Choose a breakout room
        </h2>
        <p className="mt-1 text-sm text-slate-400">Your teacher has opened rooms for group work. Pick one to join.</p>
        <div className="mt-4 space-y-2">
          {b.rooms.map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-lg border border-slate-700 p-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{r.name}</p>
                <p className="truncate text-xs text-slate-400">{r.members.length ? r.members.map((id) => members.get(id)?.name.split(" ")[0] ?? "…").join(", ") : "No one yet"}</p>
              </div>
              <Button size="sm" onClick={() => onPick(r.id)}>
                Join
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

"use client";

import { Hand, Lock, MicOff, MoreVertical, UserMinus, UserCheck, VideoOff, Clock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/common/user-avatar";
import type { ClassroomApi } from "@/components/classroom/use-classroom";
import { fmtTime } from "@/lib/helpers";

/** Participant list + classroom management for the host (spec §32). */
export function ParticipantPanel({ room, isHost, rosterSize }: { room: ClassroomApi; isHost: boolean; rosterSize: number }) {
  const inRoom = [...room.inRoom].sort((a, b) => Number(b.role === "host") - Number(a.role === "host") || Number(b.handRaised) - Number(a.handRaised) || a.name.localeCompare(b.name));
  const hands = inRoom.filter((p) => p.handRaised);
  const absent = rosterSize - inRoom.filter((p) => p.role === "student").length;
  return (
    <div className="flex h-full min-h-0 flex-col">
      {isHost && (
        <div className="space-y-2 border-b border-slate-700 p-3 text-sm">
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" className="flex-1" onClick={() => (room.muteAll(), toast.success("Everyone muted"))}>
              <MicOff /> Mute all
            </Button>
            {hands.length > 0 && (
              <Button size="sm" variant="secondary" className="flex-1" onClick={room.lowerAllHands}>
                <Hand /> Lower hands
              </Button>
            )}
          </div>
          <label className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-1.5">
              <Lock className="size-3.5" /> Lock classroom
            </span>
            <Switch checked={room.locked} onCheckedChange={(v) => (room.setLocked(v), toast.message(v ? "Classroom locked — no one else can join" : "Classroom unlocked"))} />
          </label>
          <label className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-1.5">
              <Clock className="size-3.5" /> Waiting room
            </span>
            <Switch checked={room.waitingRoom} onCheckedChange={room.setWaitingRoom} />
          </label>
        </div>
      )}
      {isHost && room.waiting.length > 0 && (
        <div className="border-b border-slate-700 p-3">
          <div className="mb-2 flex items-center justify-between text-xs font-semibold text-amber-300">
            <span>Waiting to join ({room.waiting.length})</span>
            <button onClick={room.admitAll} className="underline">
              Admit all
            </button>
          </div>
          {room.waiting.map((p) => (
            <div key={p.id} className="flex items-center gap-2 py-1 text-sm text-slate-200">
              <UserAvatar name={p.name} color={p.color} size="xs" />
              <span className="flex-1 truncate">{p.name}</span>
              <Button size="xs" onClick={() => room.admit(p.id)}>
                <UserCheck /> Admit
              </Button>
            </div>
          ))}
        </div>
      )}
      <div className="px-3 pt-3 text-xs text-slate-400">
        In class ({inRoom.length}) · {Math.max(0, absent)} not joined
      </div>
      <ul className="flex-1 overflow-y-auto p-2">
        {inRoom.map((p) => (
          <li key={p.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-200 hover:bg-slate-800">
            <UserAvatar name={p.name} color={p.color} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate">
                {p.name}
                {p.isSelf && " (You)"}
              </p>
              <p className="text-[11px] text-slate-400">{p.role === "host" ? "Teacher · host" : `Joined ${fmtTime(p.joinedAt)}`}</p>
            </div>
            {p.handRaised && <Hand className="size-4 text-amber-400" />}
            {!p.micOn && <MicOff className="size-3.5 text-slate-500" />}
            {!p.camOn && <VideoOff className="size-3.5 text-slate-500" />}
            {isHost && !p.isSelf && p.role !== "host" && (
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button size="icon-xs" variant="ghost" className="text-slate-300 hover:bg-slate-700" aria-label={`Manage ${p.name}`} />}>
                  <MoreVertical />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onClick={() => room.mute(p.id)}>
                    <MicOff /> Mute
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => room.disableCamera(p.id)}>
                    <VideoOff /> Disable camera
                  </DropdownMenuItem>
                  {p.handRaised && (
                    <DropdownMenuItem onClick={() => room.lowerHand(p.id)}>
                      <Hand /> Lower hand
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem variant="destructive" onClick={() => (room.remove(p.id), toast.message(`${p.name} was removed`))}>
                    <UserMinus /> Remove
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

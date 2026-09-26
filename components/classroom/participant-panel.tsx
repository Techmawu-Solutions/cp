"use client";

import { useState } from "react";
import { Clock, Hand, Lock, Mic, MicOff, MoreVertical, UserCheck, UserMinus, UserX, Video, VideoOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/common/user-avatar";
import type { ClassroomApi, Participant } from "@/components/classroom/use-classroom";
import { allowBackToLive, removeFromLive, setLiveControls } from "@/lib/actions";
import type { LiveControls } from "@/lib/types";
import { fmtTime } from "@/lib/helpers";

/**
 * Participant list + classroom management for the host (spec §32): mute or
 * stop the video of one member or everyone, decide whether members may turn
 * on video or unmute themselves, and remove members until they're let back.
 */
export function ParticipantPanel({ room, isHost, rosterSize, liveId, controls, removed }: { room: ClassroomApi; isHost: boolean; rosterSize: number; liveId: string; controls: LiveControls; removed: { id: string; name: string }[] }) {
  const [muteAllOpen, setMuteAllOpen] = useState(false);
  const [removing, setRemoving] = useState<Participant | null>(null);
  const inRoom = [...room.inRoom].sort((a, b) => Number(b.role === "host") - Number(a.role === "host") || Number(b.handRaised) - Number(a.handRaised) || a.name.localeCompare(b.name));
  const hands = inRoom.filter((p) => p.handRaised);
  const members = inRoom.filter((p) => p.role === "student");
  const absent = rosterSize - members.length - removed.length;

  const allowBack = (p: { id: string; name: string }) => {
    allowBackToLive(liveId, p.id);
    room.allowBack(p.id);
    toast.success(`${p.name} can join again`, { description: room.waitingRoom ? "They'll appear in the waiting room when they rejoin." : undefined });
  };
  const remove = (p: Participant) => {
    removeFromLive(liveId, p.id);
    room.remove(p.id);
    toast.message(`${p.name} was removed`, { description: "They can't rejoin until you let them back.", action: { label: "Let back in", onClick: () => allowBack(p) } });
  };
  const setVideoAllowed = (v: boolean) => {
    setLiveControls(liveId, { allowVideo: v });
    if (!v) room.stopAllVideo();
    toast.message(v ? "Members can turn on their video" : "Members' video is off", { description: v ? undefined : "They can't turn it back on until you allow it." });
  };
  const setUnmuteAllowed = (v: boolean) => {
    setLiveControls(liveId, { allowUnmute: v });
    toast.message(v ? "Members can unmute themselves" : "Members can't unmute themselves", { description: v ? undefined : "Unmute a member from their row, or allow it again here." });
  };

  return (
    // On short screens the whole panel scrolls, so the member list never gets squeezed below the host controls.
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      {isHost && (
        <div className="shrink-0 space-y-2 border-b border-slate-700 p-3 text-sm">
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" className="flex-1" onClick={() => setMuteAllOpen(true)}>
              <MicOff /> Mute all
            </Button>
            <Button size="sm" variant="secondary" className="flex-1" onClick={() => (room.stopAllVideo(), toast.success("Everyone's video is off", { description: controls.allowVideo ? "Members can turn it back on." : undefined }))}>
              <VideoOff /> Stop all video
            </Button>
          </div>
          {hands.length > 0 && (
            <Button size="sm" variant="secondary" className="w-full" onClick={room.lowerAllHands}>
              <Hand /> Lower all hands ({hands.length})
            </Button>
          )}
          <p className="pt-1 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">Members can</p>
          <ToggleRow icon={<Video className="size-3.5" />} label="Turn on their video" checked={controls.allowVideo} onChange={setVideoAllowed} />
          <ToggleRow icon={<Mic className="size-3.5" />} label="Unmute themselves" checked={controls.allowUnmute} onChange={setUnmuteAllowed} />
          <p className="pt-1 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">Classroom</p>
          <ToggleRow icon={<Lock className="size-3.5" />} label="Lock classroom" checked={room.locked} onChange={(v) => (room.setLocked(v), toast.message(v ? "Classroom locked — no one else can join" : "Classroom unlocked"))} />
          <ToggleRow icon={<Clock className="size-3.5" />} label="Waiting room" checked={room.waitingRoom} onChange={room.setWaitingRoom} />
        </div>
      )}
      <div className="flex-1 [@media(min-height:720px)]:min-h-0 [@media(min-height:720px)]:overflow-y-auto">
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
        <ul className="p-2">
          {inRoom.map((p) => {
            const manage = isHost && !p.isSelf && p.role !== "host";
            return (
              <li key={p.id} className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-slate-200 hover:bg-slate-800">
                <UserAvatar name={p.name} color={p.color} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate">
                    {p.name}
                    {p.isSelf && " (You)"}
                  </p>
                  <p className="text-[11px] text-slate-400">{p.role === "host" ? "Teacher · host" : `Joined ${fmtTime(p.joinedAt)}`}</p>
                </div>
                {p.handRaised && <Hand className="size-4 shrink-0 text-amber-400" />}
                {manage ? (
                  <>
                    <Button size="icon-xs" variant="ghost" className={p.micOn ? "text-emerald-400 hover:bg-slate-700" : "text-slate-500 hover:bg-slate-700"} disabled={!p.micOn} onClick={() => (room.mute(p.id), toast.message(`${p.name} muted`))} aria-label={p.micOn ? `Mute ${p.name}` : `${p.name} is muted`} title={p.micOn ? "Mute" : "Muted"}>
                      {p.micOn ? <Mic /> : <MicOff />}
                    </Button>
                    <Button size="icon-xs" variant="ghost" className={p.camOn ? "text-emerald-400 hover:bg-slate-700" : "text-slate-500 hover:bg-slate-700"} disabled={!p.camOn} onClick={() => (room.disableCamera(p.id), toast.message(`${p.name}'s video turned off`))} aria-label={p.camOn ? `Turn off ${p.name}'s video` : `${p.name}'s video is off`} title={p.camOn ? "Turn off video" : "Video off"}>
                      {p.camOn ? <Video /> : <VideoOff />}
                    </Button>
                  </>
                ) : (
                  <>
                    {!p.micOn && <MicOff className="size-3.5 shrink-0 text-slate-500" />}
                    {!p.camOn && <VideoOff className="size-3.5 shrink-0 text-slate-500" />}
                  </>
                )}
                {manage && (
                  <DropdownMenu>
                    <DropdownMenuTrigger render={<Button size="icon-xs" variant="ghost" className="text-slate-300 hover:bg-slate-700" aria-label={`Manage ${p.name}`} />}>
                      <MoreVertical />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem disabled={!p.micOn} onClick={() => room.mute(p.id)}>
                        <MicOff /> Mute
                      </DropdownMenuItem>
                      <DropdownMenuItem disabled={!p.camOn} onClick={() => room.disableCamera(p.id)}>
                        <VideoOff /> Turn off video
                      </DropdownMenuItem>
                      {p.handRaised && (
                        <DropdownMenuItem onClick={() => room.lowerHand(p.id)}>
                          <Hand /> Lower hand
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive" onClick={() => setRemoving(p)}>
                        <UserMinus /> Remove from class
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </li>
            );
          })}
        </ul>
        {isHost && removed.length > 0 && (
          <div className="border-t border-slate-700 p-3">
            <p className="mb-2 text-xs font-semibold text-red-300">Removed ({removed.length}) — can&apos;t rejoin until you let them back</p>
            {removed.map((p) => (
              <div key={p.id} className="flex items-center gap-2 py-1 text-sm text-slate-300">
                <UserX className="size-4 shrink-0 text-red-400" />
                <span className="flex-1 truncate">{p.name}</span>
                <Button size="xs" variant="secondary" onClick={() => allowBack(p)}>
                  <UserCheck /> Let back in
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {muteAllOpen && (
      <MuteAllDialog
        open
        onOpenChange={setMuteAllOpen}
        members={members.filter((p) => p.micOn).length}
        allowUnmute={controls.allowUnmute}
        onConfirm={(includeSelf, allowUnmute) => {
          room.muteAll(includeSelf);
          if (allowUnmute !== controls.allowUnmute) setLiveControls(liveId, { allowUnmute });
          toast.success(includeSelf ? "Everyone muted, including you" : "All members muted", { description: allowUnmute ? "Members can unmute themselves." : "Members can't unmute themselves until you allow it." });
        }}
      />
      )}
      <Dialog open={!!removing} onOpenChange={(o) => !o && setRemoving(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove {removing?.name}?</DialogTitle>
            <DialogDescription>They leave the class now and can&apos;t rejoin — not even from the lobby — until you let them back in from the Participants list. Their attendance up to now is kept.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoving(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => (removing && remove(removing), setRemoving(null))}>
              <UserMinus /> Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ToggleRow({ icon, label, checked, onChange }: { icon: React.ReactNode; label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between text-slate-300">
      <span className="flex items-center gap-1.5">
        {icon} {label}
      </span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

/** "Mute all" (mounted fresh each time it opens) asks whether the host should be muted too, and whether members may unmute themselves afterwards. */
function MuteAllDialog({ open, onOpenChange, members, allowUnmute, onConfirm }: { open: boolean; onOpenChange: (o: boolean) => void; members: number; allowUnmute: boolean; onConfirm: (includeSelf: boolean, allowUnmute: boolean) => void }) {
  const [includeSelf, setIncludeSelf] = useState(false);
  const [unmute, setUnmute] = useState(allowUnmute);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Mute everyone?</DialogTitle>
          <DialogDescription>{members ? `${members} member${members === 1 ? " is" : "s are"} unmuted right now.` : "No members are unmuted right now."}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <label className="flex items-start gap-2">
            <Checkbox checked={includeSelf} onCheckedChange={(c) => setIncludeSelf(!!c)} className="mt-0.5" />
            <span>
              Mute me too <span className="block text-xs text-muted-foreground">Leave this off to keep talking to the class.</span>
            </span>
          </label>
          <label className="flex items-start gap-2">
            <Checkbox checked={unmute} onCheckedChange={(c) => setUnmute(!!c)} className="mt-0.5" />
            <span>
              Let members unmute themselves <span className="block text-xs text-muted-foreground">Turn off to keep the class quiet until you allow it.</span>
            </span>
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              onConfirm(includeSelf, unmute);
              onOpenChange(false);
            }}
          >
            <MicOff /> {includeSelf ? "Mute everyone" : "Mute all members"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

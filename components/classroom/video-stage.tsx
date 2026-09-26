"use client";

import { useEffect, useRef } from "react";
import { Hand, MicOff, Monitor, Pin, VideoOff, Volume2, VolumeX } from "lucide-react";
import { UserAvatar } from "@/components/common/user-avatar";
import { RichText } from "@/components/common/rich-text";
import type { Participant, Reaction } from "@/components/classroom/use-classroom";
import { cn } from "@/lib/utils";

export function StreamVideo({ stream, muted = true, mirror, className, videoRef }: { stream: MediaStream | null; muted?: boolean; mirror?: boolean; className?: string; videoRef?: React.RefObject<HTMLVideoElement | null> }) {
  const local = useRef<HTMLVideoElement>(null);
  const ref = videoRef ?? local;
  useEffect(() => {
    if (ref.current && ref.current.srcObject !== stream) ref.current.srcObject = stream;
  }, [stream, ref]);
  return <video ref={ref} autoPlay playsInline muted={muted} className={cn("size-full object-cover", mirror && "-scale-x-100", className)} />;
}

/** One participant tile (spec §32 video). Simulated people render as avatars. */
export function ParticipantTile({ p, stream, large, videoRef, pinned, onPin }: { p: Participant; stream?: MediaStream | null; large?: boolean; videoRef?: React.RefObject<HTMLVideoElement | null>; pinned?: boolean; onPin?: () => void }) {
  const showVideo = p.camOn && !!stream;
  return (
    <div className={cn("group relative flex aspect-video items-center justify-center overflow-hidden rounded-xl bg-slate-800 ring-2 transition-shadow", p.speaking ? "ring-emerald-400" : pinned ? "ring-blue-400" : "ring-transparent")}>
      {onPin && (
        <button
          type="button"
          onClick={onPin}
          aria-label={pinned ? `Unpin ${p.name}` : `Pin ${p.name}`}
          title={pinned ? "Unpin" : "Pin to main view"}
          className={cn("absolute top-1.5 left-1.5 z-10 flex size-7 items-center justify-center rounded-full bg-black/55 text-white transition-opacity hover:bg-black/75 focus-visible:opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100", pinned && "bg-blue-600 [@media(hover:hover)]:opacity-100")}
        >
          <Pin className="size-3.5" />
        </button>
      )}
      {showVideo ? (
        <StreamVideo stream={stream!} mirror={p.isSelf} videoRef={videoRef} />
      ) : (
        <div className={cn("flex flex-col items-center justify-center", p.camOn && !p.isSelf && "bg-gradient-to-br from-slate-700 to-slate-900 size-full")}>
          <UserAvatar name={p.name} color={p.color} size={large ? "xl" : "lg"} className={cn(p.speaking && "animate-pulse")} />
          {p.camOn && !p.isSelf && large && <span className="mt-2 text-xs text-slate-400">Camera on (simulated participant)</span>}
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 flex items-center gap-1.5 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5 text-xs text-white">
        {!p.micOn && <MicOff className="size-3.5 text-red-400" />}
        {!p.camOn && <VideoOff className="size-3.5 text-slate-300" />}
        <span className="truncate">
          {p.name}
          {p.isSelf && " (You)"}
          {p.role === "host" && " · Teacher"}
        </span>
      </div>
      {p.handRaised && (
        <span className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-full bg-amber-400 text-amber-950 shadow">
          <Hand className="size-4" />
        </span>
      )}
    </div>
  );
}

export type StageLayout = "speaker" | "gallery" | "focus";

export const LAYOUT_LABEL: Record<StageLayout, string> = { speaker: "Speaker view", gallery: "Gallery — all members", focus: "Focus — main view only" };

/**
 * VideoStage (spec §57). Three view modes:
 * - speaker: the main stage (speaker, pinned member or shared content) with a
 *   filmstrip of everyone else
 * - gallery: every member as an equal tile
 * - focus: the main stage only, no filmstrip
 * Screen share, a presentation or the whiteboard take the main stage.
 */
export function VideoStage({
  layout,
  participants,
  speaker,
  localStream,
  screenStream,
  presentation,
  whiteboard,
  speakerVideoRef,
  reactions,
  hideNoVideo = false,
  hideSelf = false,
  pinnedId,
  onPin,
  onShowShared,
}: {
  layout: StageLayout;
  participants: Participant[];
  speaker: Participant | undefined;
  localStream: MediaStream | null;
  screenStream: MediaStream | null;
  presentation?: { title: string; body: string } | null;
  whiteboard?: React.ReactNode;
  speakerVideoRef: React.RefObject<HTMLVideoElement | null>;
  reactions: Reaction[];
  /** Leave out members whose camera is off. */
  hideNoVideo?: boolean;
  /** Leave out your own tile (you still appear to everyone else). */
  hideSelf?: boolean;
  pinnedId?: string | null;
  onPin?: (id: string | null) => void;
  /** Switches back to a view that shows the shared content. */
  onShowShared?: () => void;
}) {
  const streamFor = (p: Participant) => (p.isSelf ? localStream : null);
  const sharing = !!screenStream || !!presentation || !!whiteboard;
  const visible = participants.filter((p) => (!hideSelf || !p.isSelf) && (!hideNoVideo || p.camOn));
  const pin = (p: Participant) => (onPin ? () => onPin(pinnedId === p.id ? null : p.id) : undefined);
  // The speaker's video element feeds picture-in-picture, so only the tile that holds the main view gets the ref.
  const tile = (p: Participant, main = false) => <ParticipantTile p={p} stream={streamFor(p)} large={main} videoRef={main ? speakerVideoRef : undefined} pinned={pinnedId === p.id} onPin={pin(p)} />;
  const n = visible.length;

  return (
    <div className="relative flex h-full min-h-0 flex-col gap-2 p-2 sm:p-3">
      {layout === "gallery" ? (
        <>
          {sharing && onShowShared && (
            <button type="button" onClick={onShowShared} className="flex shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600/90 px-3 py-1.5 text-sm text-white hover:bg-blue-600">
              <Monitor className="size-4" /> {whiteboard ? "The whiteboard" : presentation ? "A presentation" : "A screen"} is being shared — show it
            </button>
          )}
          <div
            className={cn(
              "grid min-h-0 flex-1 gap-2 overflow-y-auto",
              n > 6 ? "content-start" : "content-center",
              n <= 1 ? "grid-cols-1" : n <= 4 ? "grid-cols-2" : n <= 9 ? "grid-cols-2 sm:grid-cols-3" : n <= 16 ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4" : "grid-cols-2 sm:grid-cols-4 xl:grid-cols-6",
            )}
          >
            {visible.map((p) => (
              <div key={p.id} className={cn(n <= 2 && "mx-auto w-full max-w-3xl")}><ParticipantTile p={p} stream={streamFor(p)} videoRef={!sharing && p.id === speaker?.id ? speakerVideoRef : undefined} pinned={pinnedId === p.id} onPin={pin(p)} /></div>
            ))}
            {n === 0 && <p className="col-span-full self-center text-center text-sm text-slate-400">No one with their camera on. Turn off “Hide members without video” to see everyone.</p>}
          </div>
        </>
      ) : (
        <>
          <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-xl bg-slate-900">
            {whiteboard ? (
              whiteboard
            ) : screenStream ? (
              <>
                <StreamVideo stream={screenStream} className="object-contain" videoRef={speakerVideoRef} />
                <span className="absolute top-3 left-3 flex items-center gap-1.5 rounded-md bg-black/60 px-2 py-1 text-xs text-white">
                  <Monitor className="size-3.5" /> Screen share
                </span>
                <ScreenAudioBadge stream={screenStream} />
              </>
            ) : presentation ? (
              <div className="size-full overflow-y-auto bg-white p-6 text-slate-900 sm:p-10">
                <p className="mb-2 text-xs font-medium tracking-wide text-slate-500 uppercase">Presentation · shared by the teacher</p>
                <h2 className="mb-4 text-2xl font-bold sm:text-3xl">{presentation.title}</h2>
                <div className="text-base sm:text-lg">
                  <RichText text={presentation.body} />
                </div>
              </div>
            ) : speaker ? (
              <div className="aspect-video h-full max-h-full max-w-full">{tile(speaker, true)}</div>
            ) : null}
          </div>
          {layout === "speaker" && (
            <div className="flex shrink-0 gap-2 overflow-x-auto pb-1">
              {visible
                .filter((p) => sharing || p.id !== speaker?.id)
                .map((p) => (
                  <div key={p.id} className="w-32 shrink-0 sm:w-40">
                    {tile(p)}
                  </div>
                ))}
            </div>
          )}
        </>
      )}
      <div className="pointer-events-none absolute right-4 bottom-24 flex flex-col items-end gap-1">
        {reactions.map((r) => (
          <div key={r.id} className="animate-in fade-in slide-in-from-bottom-8 flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1 text-sm text-white duration-500">
            <span className="text-xl">{r.emoji}</span>
            <span className="text-xs">{r.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Shows whether the screen share carries sound, with a live level meter so the
 * teacher can see a playing video's audio is reaching the class (spec §32.1).
 */
function ScreenAudioBadge({ stream }: { stream: MediaStream }) {
  const track = stream.getAudioTracks()[0];
  const bar = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!track || typeof AudioContext === "undefined") return;
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    ctx.createMediaStreamSource(new MediaStream([track])).connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    let raf = 0;
    const tick = () => {
      analyser.getByteTimeDomainData(data);
      let peak = 0;
      for (const v of data) peak = Math.max(peak, Math.abs(v - 128));
      if (bar.current) bar.current.style.transform = `scaleX(${Math.min(1, peak / 64)})`;
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => {
      cancelAnimationFrame(raf);
      void ctx.close();
    };
  }, [track]);

  if (!track)
    return (
      <span className="absolute top-3 right-3 flex max-w-[60%] items-center gap-1.5 rounded-md bg-amber-500/90 px-2 py-1 text-xs text-black" title="Share a browser tab or your entire screen with “Share audio” on to include sound.">
        <VolumeX className="size-3.5 shrink-0" /> <span className="truncate">No sound shared</span>
      </span>
    );
  return (
    <span className="absolute top-3 right-3 flex items-center gap-1.5 rounded-md bg-black/60 px-2 py-1 text-xs text-white" title="Students hear this sound">
      <Volume2 className="size-3.5" /> Sharing sound
      <span className="h-1.5 w-12 overflow-hidden rounded-full bg-white/20">
        <span ref={bar} className="block h-full origin-left scale-x-0 rounded-full bg-emerald-400 transition-transform duration-75" />
      </span>
    </span>
  );
}

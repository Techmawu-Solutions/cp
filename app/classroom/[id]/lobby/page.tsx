"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CalendarClock, Loader2, Mic, MicOff, PlayCircle, Radio, ShieldAlert, Users, Video, VideoOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/common/user-avatar";
import { LinkButton } from "@/components/common/link-button";
import { useLiveContext } from "@/components/classroom/use-live-context";
import { acquireLocalMedia, setTrackEnabled } from "@/lib/media-store";
import { startLive } from "@/lib/actions";
import { fmtDay, fmtTime } from "@/lib/helpers";
import { cn } from "@/lib/utils";
import { useNow } from "@/lib/use-now";

export default function LobbyPage() {
  const { id } = useParams<{ id: string }>();
  const ctx = useLiveContext(id);
  const router = useRouter();
  const video = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [camOn, setCamOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [mediaState, setMediaState] = useState<"loading" | "ready" | "denied">("loading");
  const [waiting, setWaiting] = useState(false);
  const now = useNow(15_000);

  useEffect(() => {
    if (!ctx.role || ctx.role === "observer") return;
    acquireLocalMedia({ video: true, audio: true }).then((s) => {
      setStream(s);
      setMediaState(s ? "ready" : "denied");
    });
  }, [ctx.role]);
  useEffect(() => {
    if (video.current && stream) video.current.srcObject = stream;
  }, [stream, camOn]);

  if (!ctx.live || !ctx.role)
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center p-6 text-center">
        <ShieldAlert className="size-10 text-red-400" />
        <h1 className="mt-3 text-xl font-semibold">You can&apos;t join this class</h1>
        <p className="mt-1 max-w-sm text-sm text-slate-400">Live classes are open to the subject teacher and the students registered for that class and subject.</p>
        <LinkButton href="/" className="mt-6">
          Back to dashboard
        </LinkButton>
      </div>
    );

  const { live, role } = ctx;
  const isHost = role === "host";
  const ended = live.status === "ended";
  const started = live.status === "live";
  const minutesToStart = Math.round((Date.parse(live.scheduledAt) - now) / 60000);

  const enter = () => {
    sessionStorage.setItem(`classroom:${id}`, JSON.stringify({ camOn: camOn && !!stream, micOn: micOn && !!stream }));
    if (isHost && !started) {
      startLive(live.id);
      toast.success("Class started — students have been notified");
    }
    if (!isHost && live.waitingRoom && role === "student") {
      setWaiting(true);
      setTimeout(() => router.push(`/classroom/${id}`), 2500);
      return;
    }
    router.push(`/classroom/${id}`);
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-5xl flex-col p-4 sm:p-8">
      <Link href={ctx.back} className="mb-6 flex items-center gap-1.5 text-sm text-slate-400 hover:text-white">
        <ArrowLeft className="size-4" /> Back
      </Link>
      <div className="grid flex-1 items-center gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <div className="relative aspect-video overflow-hidden rounded-2xl bg-slate-800 ring-1 ring-white/10">
            {stream && camOn ? (
              <video ref={video} autoPlay playsInline muted className="size-full -scale-x-100 object-cover" />
            ) : (
              <div className="flex size-full flex-col items-center justify-center gap-3">
                {mediaState === "loading" ? <Loader2 className="size-8 animate-spin text-slate-400" /> : <UserAvatar name={ctx.me!.user.name} color={ctx.me!.user.avatarColor} size="xl" />}
                <p className="text-sm text-slate-400">{mediaState === "denied" ? "Camera unavailable — you can still join and follow along." : role === "observer" ? "Joining as an observer (camera off)" : camOn ? "Starting camera…" : "Camera is off"}</p>
              </div>
            )}
            {role !== "observer" && (
              <div className="absolute inset-x-0 bottom-4 flex justify-center gap-3">
                <button
                  onClick={() => (setMicOn(!micOn), setTrackEnabled("audio", !micOn))}
                  className={cn("flex size-12 items-center justify-center rounded-full", micOn ? "bg-slate-700/90 hover:bg-slate-600" : "bg-red-600 hover:bg-red-500")}
                  aria-label={micOn ? "Mute microphone" : "Unmute microphone"}
                >
                  {micOn ? <Mic className="size-5" /> : <MicOff className="size-5" />}
                </button>
                <button
                  onClick={() => (setCamOn(!camOn), setTrackEnabled("video", !camOn))}
                  className={cn("flex size-12 items-center justify-center rounded-full", camOn ? "bg-slate-700/90 hover:bg-slate-600" : "bg-red-600 hover:bg-red-500")}
                  aria-label={camOn ? "Turn camera off" : "Turn camera on"}
                >
                  {camOn ? <Video className="size-5" /> : <VideoOff className="size-5" />}
                </button>
              </div>
            )}
          </div>
          <p className="mt-3 text-center text-xs text-slate-500">Check your camera and microphone before joining. Video is handled by the live video provider in production.</p>
        </div>

        <div className="space-y-5">
          <div>
            <p className="text-sm text-slate-400">
              {ctx.subject?.name} — {ctx.cls?.name}
            </p>
            <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">{live.title}</h1>
            <p className="mt-2 flex items-center gap-2 text-sm text-slate-300">
              <CalendarClock className="size-4" /> {fmtDay(live.scheduledAt)} · {fmtTime(live.scheduledAt)} · {live.durationMinutes} min
            </p>
            <p className="mt-1 flex items-center gap-2 text-sm text-slate-300">
              <Users className="size-4" /> {ctx.roster.length} students · {ctx.host.name}
            </p>
          </div>

          {ended ? (
            <div className="rounded-xl border border-slate-700 p-4">
              <p className="font-medium">This class has ended.</p>
              {live.recordingId ? (
                <LinkButton href={`/recordings/${live.recordingId}`} className="mt-3">
                  <PlayCircle /> Watch recording
                </LinkButton>
              ) : (
                <p className="mt-1 text-sm text-slate-400">The recording is processing.</p>
              )}
            </div>
          ) : isHost ? (
            <div className="space-y-3">
              <Button size="lg" className="h-12 w-full text-base" onClick={enter}>
                <Radio /> {started ? "Rejoin class" : "Start class"}
              </Button>
              <p className="text-xs text-slate-400">Starting notifies every student in {ctx.cls?.name}. The class is recorded automatically and the recording is added to the course when it ends.</p>
            </div>
          ) : waiting ? (
            <div className="flex items-center gap-3 rounded-xl border border-amber-400/40 bg-amber-400/10 p-4 text-sm text-amber-100">
              <Loader2 className="size-5 animate-spin" /> Waiting for {ctx.host.name} to let you in…
            </div>
          ) : started || role === "observer" ? (
            <div className="space-y-3">
              {started && (
                <p className="flex items-center gap-2 text-sm text-emerald-300">
                  <span className="size-2 animate-pulse rounded-full bg-emerald-400" /> Class is live — {ctx.host.name} is teaching
                </p>
              )}
              <Button size="lg" className="h-12 w-full text-base" onClick={enter} disabled={!started}>
                {role === "observer" ? "Observe class" : "Join Class"}
              </Button>
              {!started && <p className="text-xs text-slate-400">You can observe once the teacher starts the class.</p>}
            </div>
          ) : (
            <div className="space-y-3 rounded-xl border border-slate-700 p-4">
              <p className="font-medium">Waiting for {ctx.host.name} to start the class</p>
              <p className="text-sm text-slate-400">{minutesToStart > 0 ? `Scheduled to start in ${minutesToStart} minutes.` : "It should begin any moment."} This page updates automatically.</p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  startLive(live.id);
                  toast.message("Simulated: the teacher started the class");
                }}
              >
                Prototype: simulate teacher starting
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

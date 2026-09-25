"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  BarChart3,
  Expand,
  Hand,
  LayoutGrid,
  Lock,
  MessageSquare,
  Mic,
  MicOff,
  MonitorUp,
  MonitorX,
  PenLine,
  PhoneOff,
  PictureInPicture2,
  Presentation,
  Smile,
  Square,
  Users,
  Video,
  VideoOff,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { FullPageLoader } from "@/components/common/full-page-loader";
import { useLiveContext } from "@/components/classroom/use-live-context";
import { useClassroom, type ClassroomApi } from "@/components/classroom/use-classroom";
import { VideoStage } from "@/components/classroom/video-stage";
import { ChatPanel } from "@/components/classroom/chat-panel";
import { ParticipantPanel } from "@/components/classroom/participant-panel";
import { PollPanel } from "@/components/classroom/poll-panel";
import { Whiteboard } from "@/components/classroom/whiteboard";
import { openClassroomPip } from "@/components/classroom/pip";
import { acquireLocalMedia, currentLocalMedia, releaseLocalMedia, setTrackEnabled } from "@/lib/media-store";
import { endLive } from "@/lib/actions";
import { useStore } from "@/lib/store";
import { uid } from "@/lib/helpers";
import { cn } from "@/lib/utils";

type Panel = "chat" | "people" | "polls" | null;

export default function ClassroomPage() {
  const { id } = useParams<{ id: string }>();
  const ctx = useLiveContext(id);
  const router = useRouter();

  useEffect(() => {
    if (!ctx.live || !ctx.role || ctx.live.status === "scheduled" || ctx.live.status === "cancelled") router.replace(`/classroom/${id}/lobby`);
    else if (ctx.live.status === "ended") router.replace(`/classroom/${id}/ended`);
  }, [ctx.live, ctx.role, id, router]);

  if (!ctx.live || !ctx.role || ctx.live.status !== "live") return <FullPageLoader />;
  return <Room liveId={id} />;
}

function Room({ liveId }: { liveId: string }) {
  const ctx = useLiveContext(liveId);
  const router = useRouter();
  const me = ctx.me!;
  const role = ctx.role!;
  const isHost = role === "host";
  const prefs = useMemo(() => {
    try {
      return JSON.parse(sessionStorage.getItem(`classroom:${liveId}`) ?? "{}") as { camOn?: boolean; micOn?: boolean };
    } catch {
      return {};
    }
  }, [liveId]);

  const room = useClassroom({
    self: { userId: me.user.id, name: me.user.name, color: me.user.avatarColor, studentId: ctx.student?.id },
    host: ctx.host!,
    roster: ctx.roster ?? [],
    selfRole: role,
    waitingRoomDefault: ctx.live!.waitingRoom,
    topic: ctx.live!.title,
  });
  const self = room.participants.find((p) => p.isSelf)!;
  const [localStream, setLocalStream] = useState<MediaStream | null>(() => currentLocalMedia());
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [layout, setLayout] = useState<"speaker" | "grid">("speaker");
  const [panel, setPanel] = useState<Panel>(null);
  const [whiteboard, setWhiteboard] = useState(false);
  const [presenting, setPresenting] = useState(!isHost && !!ctx.lesson);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [isDesktop, setIsDesktop] = useState(true);
  const speakerVideo = useRef<HTMLVideoElement | null>(null);
  const container = useRef<HTMLDivElement>(null);

  // Restore lobby choices for camera and mic.
  useEffect(() => {
    if (role === "observer") {
      room.setSelf({ camOn: false, micOn: false });
      return;
    }
    const cam = prefs.camOn ?? isHost;
    const mic = prefs.micOn ?? isHost;
    room.setSelf({ camOn: cam, micOn: mic });
    if (!localStream && (cam || mic)) acquireLocalMedia({ video: true, audio: true }).then(setLocalStream);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    setTrackEnabled("video", self.camOn);
    setTrackEnabled("audio", self.micOn);
  }, [self.camOn, self.micOn]);
  useEffect(() => {
    const started = Date.parse(ctx.live!.startedAt ?? new Date().toISOString());
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(t);
  }, [ctx.live]);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const on = () => setIsDesktop(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  const setChatOpen = room.setChatOpen;
  useEffect(() => {
    setChatOpen(panel === "chat");
  }, [panel, setChatOpen]);

  const speaker = room.inRoom.find((p) => p.role === "host" && !p.isSelf) ?? (isHost ? self : room.inRoom.find((p) => p.speaking) ?? room.inRoom[0]);
  const hands = room.inRoom.filter((p) => p.handRaised && !p.isSelf).length;
  const openPoll = room.polls.find((p) => p.open);

  const toggleScreen = async () => {
    if (screenStream) {
      screenStream.getTracks().forEach((t) => t.stop());
      setScreenStream(null);
      return;
    }
    try {
      const s = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      s.getVideoTracks()[0]?.addEventListener("ended", () => setScreenStream(null));
      setWhiteboard(false);
      setPresenting(false);
      setScreenStream(s);
    } catch {
      toast.error("Screen sharing was cancelled or isn't supported on this device.");
    }
  };

  const pip = async () => {
    try {
      const r = await openClassroomPip({ videoEl: speakerVideo.current, speaker: () => ({ name: speaker?.name ?? "Class", color: speaker?.color ?? "#2563eb", speaking: !!speaker?.speaking, title: `${ctx.subject?.name} — ${ctx.cls?.name}`, handCount: hands }) });
      if (r === "unsupported") toast.error("Picture-in-picture isn't supported in this browser.");
    } catch {
      toast.error("Couldn't open picture-in-picture.");
    }
  };

  const cleanup = () => {
    screenStream?.getTracks().forEach((t) => t.stop());
    releaseLocalMedia();
    if (document.pictureInPictureElement) document.exitPictureInPicture().catch(() => {});
  };

  const endClass = () => {
    endLive(liveId, room.attendance());
    cleanup();
    router.replace(`/classroom/${liveId}/ended`);
  };

  const leave = () => {
    // Students' own attendance is captured when they leave (spec §40).
    if (role === "student" && ctx.student) {
      const st = useStore.getState();
      const live = ctx.live!;
      const joined = self.joinedAt;
      const left = new Date().toISOString();
      st.removeWhere("attendance", (a) => a.liveSessionId === live.id && a.studentId === ctx.student!.id);
      st.insert("attendance", { id: uid("att"), schoolId: live.schoolId, sessionId: live.sessionId, classId: live.classId, studentId: ctx.student.id, date: live.startedAt ?? joined, kind: "live", liveSessionId: live.id, joinTime: joined, leaveTime: left, durationMinutes: Math.max(1, Math.round((Date.parse(left) - Date.parse(joined)) / 60000)), status: Date.parse(joined) - Date.parse(live.startedAt ?? joined) > 10 * 60000 ? "late" : "present" });
    }
    cleanup();
    router.replace(`/classroom/${liveId}/ended?left=1`);
  };

  const mm = String(Math.floor(elapsed / 3600)).padStart(2, "0");
  const ss = `${String(Math.floor((elapsed % 3600) / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;
  const panelBody = panel === "chat" ? <ChatPanel room={room} selfId={me.user.id} isHost={isHost} /> : panel === "people" ? <ParticipantPanel room={room} isHost={isHost} rosterSize={ctx.roster?.length ?? 0} /> : panel === "polls" ? <PollPanel room={room} isHost={isHost} selfId={me.user.id} /> : null;
  const panelTitle = panel === "chat" ? "Live Chat" : panel === "people" ? "Participants" : "Polls";

  return (
    <div ref={container} className="flex h-dvh flex-col bg-slate-950">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-white/10 px-3 sm:px-4">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold sm:text-base">
            {ctx.subject?.name} — {ctx.cls?.name}
          </p>
          <p className="truncate text-xs text-slate-400">{ctx.live!.title}</p>
        </div>
        <span className="flex items-center gap-1.5 rounded-md bg-red-600/90 px-2 py-1 text-xs font-semibold">
          <span className="size-2 animate-pulse rounded-full bg-white" /> REC {mm !== "00" && `${mm}:`}
          {ss}
        </span>
        {room.locked && <Lock className="size-4 text-amber-400" aria-label="Classroom locked" />}
        <button onClick={() => setPanel(panel === "people" ? null : "people")} className="hidden items-center gap-1.5 rounded-md px-2 py-1 text-sm text-slate-300 hover:bg-white/10 sm:flex">
          <Users className="size-4" /> {room.inRoom.filter((p) => p.role === "student").length} Students
        </button>
        <Button size="icon-sm" variant="ghost" className="text-slate-300 hover:bg-white/10" onClick={() => setLayout(layout === "grid" ? "speaker" : "grid")} aria-label={layout === "grid" ? "Speaker view" : "Grid view"} title={layout === "grid" ? "Speaker view" : "Grid view"}>
          {layout === "grid" ? <Square /> : <LayoutGrid />}
        </Button>
        <Button size="icon-sm" variant="ghost" className="text-slate-300 hover:bg-white/10" onClick={pip} aria-label="Picture-in-picture" title="Picture-in-picture">
          <PictureInPicture2 />
        </Button>
        <Button size="icon-sm" variant="ghost" className="hidden text-slate-300 hover:bg-white/10 sm:inline-flex" onClick={() => (document.fullscreenElement ? document.exitFullscreen() : container.current?.requestFullscreen())} aria-label="Fullscreen" title="Fullscreen">
          <Expand />
        </Button>
      </header>

      {/* Stage + side panel */}
      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1">
          <VideoStage
            layout={layout}
            participants={room.inRoom}
            speaker={speaker}
            localStream={localStream}
            screenStream={screenStream}
            presentation={presenting && ctx.lesson ? { title: ctx.lesson.title, body: ctx.lesson.body ?? "" } : null}
            whiteboard={whiteboard ? <Whiteboard readOnly={!isHost} /> : undefined}
            speakerVideoRef={speakerVideo}
            reactions={room.reactions}
          />
          {!isHost && openPoll && openPoll.votes[me.user.id] === undefined && panel !== "polls" && (
            <button onClick={() => setPanel("polls")} className="fixed bottom-24 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-medium shadow-lg">
              <BarChart3 className="size-4" /> New poll: {openPoll.question.slice(0, 40)}…
            </button>
          )}
        </div>
        {panel && isDesktop && (
          <aside className="flex w-80 shrink-0 flex-col border-l border-white/10 bg-slate-900">
            <div className="flex h-11 items-center justify-between border-b border-white/10 px-3">
              <p className="text-sm font-medium">{panelTitle}</p>
              <Button size="icon-xs" variant="ghost" className="text-slate-300 hover:bg-white/10" onClick={() => setPanel(null)} aria-label="Close panel">
                <X />
              </Button>
            </div>
            <div className="min-h-0 flex-1">{panelBody}</div>
          </aside>
        )}
      </div>
      <Sheet open={!!panel && !isDesktop} onOpenChange={(o) => !o && setPanel(null)}>
        <SheetContent side="bottom" className="dark h-[70dvh] border-slate-800 bg-slate-900 p-0 text-slate-100">
          <SheetTitle className="border-b border-white/10 px-4 py-3 text-sm">{panelTitle}</SheetTitle>
          <div className="min-h-0 flex-1">{panelBody}</div>
        </SheetContent>
      </Sheet>

      {/* Toolbar (spec §31) */}
      <Toolbar
        room={room}
        role={role}
        self={self}
        panel={panel}
        setPanel={setPanel}
        screenOn={!!screenStream}
        onScreen={toggleScreen}
        whiteboard={whiteboard}
        onWhiteboard={() => (setWhiteboard(!whiteboard), setPresenting(false))}
        presenting={presenting}
        onPresent={ctx.lesson ? () => (setPresenting(!presenting), setWhiteboard(false)) : undefined}
        onPip={pip}
        onEnd={() => setConfirmEnd(true)}
        onLeave={leave}
        hands={hands}
      />
      <ConfirmDialog
        open={confirmEnd}
        onOpenChange={setConfirmEnd}
        title="End class for everyone?"
        description="Attendance will be saved and the recording will start processing. It's added to the course automatically when ready."
        destructive
        confirmLabel="End Class"
        onConfirm={endClass}
      />
    </div>
  );
}

function ToolButton({ label, active, danger, onClick, children, badge, className }: { label: string; active?: boolean; danger?: boolean; onClick?: () => void; children: React.ReactNode; badge?: number; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={cn("relative flex shrink-0 flex-col items-center gap-1 rounded-xl px-2.5 py-1.5 text-[10px] text-slate-300 transition-colors hover:bg-white/10 sm:px-3", active && "bg-white/15 text-white", danger && "bg-red-600 text-white hover:bg-red-500", className)}
    >
      <span className="[&_svg]:size-5">{children}</span>
      <span className="hidden sm:block">{label}</span>
      {!!badge && <span className="absolute top-0.5 right-1 min-w-4 rounded-full bg-blue-500 px-1 text-[10px] leading-4 font-semibold text-white">{badge > 9 ? "9+" : badge}</span>}
    </button>
  );
}

/** ClassroomToolbar (spec §57): 🎤 📹 🖥 ✋ 👍 💬 👥 ⚙ + End Class. */
function Toolbar({
  room,
  role,
  self,
  panel,
  setPanel,
  screenOn,
  onScreen,
  whiteboard,
  onWhiteboard,
  presenting,
  onPresent,
  onPip,
  onEnd,
  onLeave,
  hands,
}: {
  room: ClassroomApi;
  role: "host" | "student" | "observer";
  self: ClassroomApi["participants"][number];
  panel: Panel;
  setPanel: (p: Panel) => void;
  screenOn: boolean;
  onScreen: () => void;
  whiteboard: boolean;
  onWhiteboard: () => void;
  presenting: boolean;
  onPresent?: () => void;
  onPip: () => void;
  onEnd: () => void;
  onLeave: () => void;
  hands: number;
}) {
  const isHost = role === "host";
  const canTalk = role !== "observer";
  return (
    <footer className="flex shrink-0 items-center gap-1 overflow-x-auto border-t border-white/10 bg-slate-900/80 px-2 py-2 sm:justify-center sm:gap-2">
      {canTalk && (
        <>
          <ToolButton label={self.micOn ? "Mute" : "Unmute"} danger={!self.micOn} onClick={() => room.setSelf({ micOn: !self.micOn })}>
            {self.micOn ? <Mic /> : <MicOff />}
          </ToolButton>
          <ToolButton label={self.camOn ? "Stop video" : "Start video"} danger={!self.camOn} onClick={() => room.setSelf({ camOn: !self.camOn })}>
            {self.camOn ? <Video /> : <VideoOff />}
          </ToolButton>
        </>
      )}
      {isHost && (
        <ToolButton label={screenOn ? "Stop share" : "Share screen"} active={screenOn} onClick={onScreen}>
          {screenOn ? <MonitorX /> : <MonitorUp />}
        </ToolButton>
      )}
      {isHost && onPresent && (
        <ToolButton label="Present" active={presenting} onClick={onPresent}>
          <Presentation />
        </ToolButton>
      )}
      {isHost && (
        <ToolButton label="Whiteboard" active={whiteboard} onClick={onWhiteboard}>
          <PenLine />
        </ToolButton>
      )}
      {role === "student" && (
        <ToolButton label={self.handRaised ? "Lower hand" : "Raise hand"} active={self.handRaised} onClick={() => (room.setSelf({ handRaised: !self.handRaised }), !self.handRaised && toast.message("Your hand is raised"))}>
          <Hand />
        </ToolButton>
      )}
      <Popover>
        <PopoverTrigger render={<button type="button" className="relative flex shrink-0 flex-col items-center gap-1 rounded-xl px-2.5 py-1.5 text-[10px] text-slate-300 hover:bg-white/10 sm:px-3" aria-label="Reactions" title="Reactions" />}>
          <Smile className="size-5" />
          <span className="hidden sm:block">React</span>
        </PopoverTrigger>
        <PopoverContent side="top" className="w-auto flex-row gap-1 p-1.5">
          {["👍", "👏", "❤️", "😂", "🎉", "🤔", "🙋"].map((e) => (
            <button key={e} onClick={() => room.react(e)} className="rounded-md p-1.5 text-2xl hover:bg-muted" aria-label={`React ${e}`}>
              {e}
            </button>
          ))}
        </PopoverContent>
      </Popover>
      <ToolButton label="Chat" active={panel === "chat"} onClick={() => setPanel(panel === "chat" ? null : "chat")} badge={panel === "chat" ? 0 : room.unreadChat}>
        <MessageSquare />
      </ToolButton>
      <ToolButton label="People" active={panel === "people"} onClick={() => setPanel(panel === "people" ? null : "people")} badge={isHost ? hands + room.waiting.length : 0}>
        <Users />
      </ToolButton>
      <ToolButton label="Polls" active={panel === "polls"} onClick={() => setPanel(panel === "polls" ? null : "polls")} badge={!isHost && room.polls.some((p) => p.open && p.votes[self.id] === undefined) ? 1 : 0}>
        <BarChart3 />
      </ToolButton>
      <ToolButton label="Pop out" onClick={onPip} className="sm:hidden">
        <PictureInPicture2 />
      </ToolButton>
      <span className="mx-1 h-8 w-px shrink-0 bg-white/10" />
      {isHost ? (
        <Button className="shrink-0 bg-red-600 text-white hover:bg-red-500" onClick={onEnd}>
          <PhoneOff /> End Class
        </Button>
      ) : (
        <Button className="shrink-0 bg-red-600 text-white hover:bg-red-500" onClick={onLeave}>
          <PhoneOff /> Leave
        </Button>
      )}
    </footer>
  );
}

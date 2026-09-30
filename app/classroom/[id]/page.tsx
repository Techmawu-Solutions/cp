"use client";

import { BackgroundPicker } from "@/components/classroom/background-picker";
import { NO_BACKGROUND, saveBackground, savedBackground, useBackgroundStream, type BackgroundChoice } from "@/lib/virtual-background";
import { useRoomPresence } from "@/lib/live-presence";
import { DocImportDialog } from "@/components/classroom/doc-import-dialog";
import { lessonPages } from "@/lib/lesson-pages";
import type { PageBackground } from "@/lib/types";
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  BookOpenText,
  CalendarClock,
  ChevronDown,
  Coffee,
  DoorOpen,
  Expand,
  Focus,
  GalleryHorizontalEnd,
  Hand,
  LayoutGrid,
  Lock,
  MessageSquare,
  Mic,
  MicOff,
  MonitorUp,
  MonitorX,
  Pause,
  PhoneOff,
  PictureInPicture2,
  PinOff,
  Play,
  Presentation,
  Smile,
  Square,
  Users,
  Video,
  VideoOff,
  X,
  WifiOff,
  Wallpaper,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { FullPageLoader } from "@/components/common/full-page-loader";
import { useLiveContext } from "@/components/classroom/use-live-context";
import { useClassroom, type ClassroomApi } from "@/components/classroom/use-classroom";
import { LAYOUT_LABEL, VideoStage, type StageLayout } from "@/components/classroom/video-stage";
import { ChatPanel } from "@/components/classroom/chat-panel";
import { ParticipantPanel } from "@/components/classroom/participant-panel";
import { PollPanel } from "@/components/classroom/poll-panel";
import { Whiteboard, boardImage } from "@/components/classroom/whiteboard";
import { prepareBoardMath } from "@/components/classroom/board-math";
import { pageHasContent } from "@/lib/board";
import { prepareBackgrounds } from "@/components/classroom/board-paint";
import { downloadFlipChartPdf, flipChartImages } from "@/components/classroom/flip-chart-files";
import type { FlipChartActions } from "@/components/classroom/flip-chart-menu";
import { canDraw, roomOf, useStageSync, visiblePageId, type Breakout } from "@/components/classroom/stage-sync";
import { BreakoutChooser, BreakoutOverview, BreakoutRoomBar, BreakoutSetup, fmtLeft, type Member } from "@/components/classroom/breakout";
import { useNow } from "@/lib/use-now";
import { canShareScreen, isMobileDevice } from "@/lib/device";
import { openClassroomPip } from "@/components/classroom/pip";
import { acquireLocalMedia, currentLocalMedia, releaseLocalMedia, setTrackEnabled } from "@/lib/media-store";
import { checkGuardianAlerts } from "@/lib/guardian-alerts";
import { DEFAULT_LIVE_CONTROLS, addBoardImagesToCourse, addLiveAttendance, endOverdueLiveClasses, plannedEnd, continueLiveLater, saveFlipChart, endLive, pauseLive, recordBreakout, resumeLive, saveWhiteboardPages } from "@/lib/actions";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { LanguageSwitcher } from "@/components/common/language-switcher";

type Panel = "chat" | "people" | "polls" | "breakout" | null;

export default function ClassroomPage() {
  const { id } = useParams<{ id: string }>();
  const ctx = useLiveContext(id);
  const router = useRouter();

  useEffect(() => {
    if (!ctx.live || !ctx.role || ctx.live.status === "scheduled" || ctx.live.status === "cancelled") router.replace(`/classroom/${id}/lobby`);
    else if (ctx.live.status === "ended") {
      // The class ended while this student was in it (the teacher ended it, or its time was up):
      // add their last stretch in the room to their attendance (spec section 40).
      const key = `classroom-joined:${id}`;
      const joined = sessionStorage.getItem(key);
      if (joined && ctx.student) addLiveAttendance(id, ctx.student.id, { joinTime: joined, leaveTime: ctx.live.endedAt ?? new Date().toISOString() });
      sessionStorage.removeItem(key);
      router.replace(`/classroom/${id}/ended`);
    }
  }, [ctx.live, ctx.role, ctx.student, id, router]);

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

  const controls = ctx.live!.controls ?? DEFAULT_LIVE_CONTROLS;
  const removedIds = useMemo(() => ctx.live!.removedUserIds ?? [], [ctx.live]);
  const room = useClassroom({
    self: { userId: me.user.id, name: me.user.name, color: me.user.avatarColor, studentId: ctx.student?.id },
    host: ctx.host!,
    roster: ctx.roster ?? [],
    selfRole: role,
    waitingRoomDefault: ctx.live!.waitingRoom,
    topic: ctx.live!.title,
    controls,
    removedIds,
  });
  const self = room.participants.find((p) => p.isSelf)!;
  // Remember when this student joined, so their time is recorded however the class ends.
  useEffect(() => {
    if (role === "student") sessionStorage.setItem(`classroom-joined:${liveId}`, self.joinedAt);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on entering the room
  }, []);
  const [localStream, setLocalStream] = useState<MediaStream | null>(() => currentLocalMedia());
  // Camera background (spec section 32): the teacher can blur it or replace it with a picture.
  const [background, setBackground] = useState<BackgroundChoice>(() => (isHost ? savedBackground(me.user.id) : NO_BACKGROUND));
  const [backgroundOpen, setBackgroundOpen] = useState(false);
  const withBackground = useBackgroundStream(isHost ? localStream : null, background);
  const cameraStream = isHost ? withBackground.stream : localStream;
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [layout, setLayout] = useState<StageLayout>("speaker");
  const [hideNoVideo, setHideNoVideo] = useState(false);
  const [hideSelf, setHideSelf] = useState(false);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  // The main stage (whiteboard, presentation, screen share) is the teacher's to set and is synced to everyone.
  const lesson = useMemo(() => (ctx.lesson ? { title: ctx.lesson.title, body: ctx.lesson.body ?? "" } : null), [ctx.lesson]);
  const stage = useStageSync({ liveId, selfId: me.user.id, isHost, lesson });
  const whiteboard = stage.state.mode === "whiteboard";
  // Presenting (spec section 32.2): a lesson or document is shown on the board, where the teacher can write,
  // point with the laser and everyone can zoom. The older text-only presentation mode is still shown if set.
  const [presentOpen, setPresentOpen] = useState(false);
  const [presentingBoard, setPresentingBoard] = useState(false);
  const presenting = stage.state.mode === "presentation" || (presentingBoard && whiteboard);
  // The teacher sees the page they're on; students see the pinned page (or else the teacher's page).
  const shownPageId = visiblePageId(stage.state);
  const boardPage = isHost ? stage.state.pages[stage.state.page] : stage.state.pages.find((p) => p.id === shownPageId);
  const boardStrokes = boardPage?.strokes ?? [];
  const iCanDraw = isHost || canDraw(stage.state.drawers, me.user.id);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const now = useNow(1000);
  const [isDesktop, setIsDesktop] = useState(true);
  const speakerVideo = useRef<HTMLVideoElement | null>(null);

  // Restore lobby choices for camera and mic.
  useEffect(() => {
    if (role === "observer") {
      room.setSelf({ camOn: false, micOn: false });
      return;
    }
    // Members only start with camera or mic on if the host currently allows it.
    const cam = (prefs.camOn ?? isHost) && (isHost || controls.allowVideo);
    const mic = (prefs.micOn ?? isHost) && (isHost || controls.allowUnmute);
    room.setSelf({ camOn: cam, micOn: mic });
    if (!localStream && (cam || mic)) acquireLocalMedia({ video: true, audio: true }).then(setLocalStream);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    setTrackEnabled("video", self.camOn);
    setTrackEnabled("audio", self.micOn);
  }, [self.camOn, self.micOn]);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const on = () => setIsDesktop(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  // Host permissions apply to members: video stops when it's disallowed, and a removed member is sent out.
  useEffect(() => {
    if (isHost) return;
    if (!controls.allowVideo && self.camOn) {
      room.setSelf({ camOn: false });
      toast.message("The teacher turned off video for members");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controls.allowVideo, self.camOn, isHost]);
  const removedSelf = !isHost && removedIds.includes(me.user.id);
  useEffect(() => {
    if (!removedSelf) return;
    screenStream?.getTracks().forEach((t) => t.stop());
    releaseLocalMedia();
    toast.error("You were removed from this class", { description: "You can join again when the teacher lets you back in." });
    router.replace(`/classroom/${liveId}/lobby`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [removedSelf]);

  // The teacher ended the class in another tab: re-read the shared database (recording, attendance) and follow.
  const classEnded = stage.ended;
  useEffect(() => {
    if (!classEnded) return;
    screenStream?.getTracks().forEach((t) => t.stop());
    releaseLocalMedia();
    // Their last stretch in the room is recorded as the page follows the class to its end.
    void Promise.resolve(useStore.persist.rehydrate()).then(() => router.replace(`/classroom/${liveId}/ended`));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classEnded]);

  // Screen share reaches students through the video provider in production; the prototype relays still frames.
  const sendFrame = stage.sendFrame;
  useEffect(() => {
    if (!isHost || !screenStream) return;
    const v = document.createElement("video");
    v.muted = true;
    v.playsInline = true;
    v.srcObject = screenStream;
    void v.play().catch(() => {});
    const c = document.createElement("canvas");
    const t = setInterval(() => {
      if (!v.videoWidth) return;
      const w = Math.min(1280, v.videoWidth);
      c.width = w;
      c.height = Math.round((v.videoHeight * w) / v.videoWidth);
      c.getContext("2d")!.drawImage(v, 0, 0, c.width, c.height);
      sendFrame(c.toDataURL("image/jpeg", 0.6));
    }, 400);
    return () => {
      clearInterval(t);
      v.srcObject = null;
    };
  }, [isHost, screenStream, sendFrame]);

  // Students: follow what the teacher puts on the stage, and hear about drawing permission.
  const stageMode = stage.state.mode;
  // Adjusted during render (not in an effect): when the teacher starts sharing, gallery viewers switch to the shared view.
  const [seenMode, setSeenMode] = useState(stageMode);
  if (seenMode !== stageMode) {
    setSeenMode(stageMode);
    if (!isHost && stageMode !== "video" && layout === "gallery") setLayout("speaker");
  }
  const prevMode = useRef(stageMode);
  useEffect(() => {
    if (isHost || prevMode.current === stageMode) return;
    prevMode.current = stageMode;
    if (stageMode !== "video") {
      toast.message(stageMode === "whiteboard" ? "The teacher opened the whiteboard" : stageMode === "presentation" ? "The teacher is presenting" : "The teacher is sharing their screen");
    }
  }, [stageMode, isHost]);
  const allowedToDraw = !isHost && canDraw(stage.state.drawers, me.user.id);
  // One student asked to answer on the board: everyone sees who, and that student is told it's their turn.
  const drawersNow = stage.state.drawers;
  const answeringId = Array.isArray(drawersNow) && drawersNow.length === 1 ? drawersNow[0] : undefined;
  const answeringName = answeringId ? (room.participants.find((p) => p.id === answeringId)?.name ?? ctx.roster?.find((r) => r.userId === answeringId)?.name) : undefined;
  const answeringLabel = isHost ? undefined : answeringId === me.user.id ? "Your turn — answer on the board" : answeringName ? `${answeringName} is answering · view only` : undefined;
  const prevDraw = useRef(allowedToDraw);
  useEffect(() => {
    if (prevDraw.current === allowedToDraw) return;
    prevDraw.current = allowedToDraw;
    toast.message(allowedToDraw ? (answeringId === me.user.id ? "Your turn — the teacher asked you to answer on the whiteboard" : "The teacher has let you draw on the whiteboard") : "Drawing on the whiteboard is off");
  }, [allowedToDraw, answeringId, me.user.id]);

  // ------------------------------------------------------------ pause (spec section 32): a break with a countdown
  const pauseState = stage.state.pause ?? null;
  const startPause = (minutes: number) => {
    stage.pause(minutes);
    pauseLive(liveId, minutes);
    room.muteAll(true);
    room.stopAllVideo();
    room.setSelf({ camOn: false, micOn: false });
    toast.message(`Class paused for ${minutes} minutes`, { description: "Recording and attendance are paused. Everyone's mic and camera are off." });
  };
  const resumeClass = () => {
    stage.resume();
    resumeLive(liveId);
    toast.success("Class resumed", { description: "Recording and attendance continue." });
  };
  const paused = !!pauseState;
  const prevPaused = useRef(paused);
  useEffect(() => {
    if (isHost || prevPaused.current === paused) return;
    prevPaused.current = paused;
    if (paused) {
      room.setSelf({ camOn: false, micOn: false });
      toast.message("The teacher paused the class for a break");
    } else toast.message("Class resumed");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, isHost]);
  // Class time shown on the REC badge leaves out breaks.
  const pausedMs = (ctx.live!.pauses ?? []).reduce((t, p) => t + Date.parse(p.to) - Date.parse(p.from), 0) + (pauseState ? Math.max(0, now - Date.parse(pauseState.since)) : 0);
  const elapsed = Math.max(0, Math.floor((now - Date.parse(ctx.live!.startedAt ?? new Date(now).toISOString()) - (isHost ? pausedMs : pauseState ? Math.max(0, now - Date.parse(pauseState.since)) : 0)) / 1000));

  // ------------------------------------------------------------ breakout rooms (spec section 32)
  const bo = stage.state.breakout ?? null;
  const members = useMemo(() => new Map<string, Member>(room.participants.filter((p) => p.role === "student").map((p) => [p.id, { id: p.id, name: p.name, color: p.color, speaking: p.speaking && p.present }])), [room.participants]);
  const myRoom = isHost ? undefined : roomOf(bo, me.user.id);
  const inMainDuringBreakout = !isHost && !!bo && !!myRoom && bo.inMain.includes(me.user.id);
  const choosing = !isHost && !!bo && bo.status === "open" && bo.choose && !myRoom;
  const visitingRoom = isHost && bo?.visiting ? bo.rooms.find((r) => r.id === bo.visiting) : undefined;
  const activeRoom = visitingRoom ?? (myRoom && !inMainDuringBreakout ? myRoom : undefined);
  const hostOverview = isHost && !!bo && !visitingRoom;
  const setBreakout = stage.setBreakout;
  const updateBo = (fn: (b: Breakout) => Breakout) => setBreakout((b) => (b ? fn(b) : b));
  const closeRooms = () => updateBo((b) => ({ ...b, status: "closing", closesAt: new Date(Date.now() + 30_000).toISOString(), visiting: null }));
  const finishBreakout = async () => {
    if (!bo) return;
    const withBoards = bo.rooms.filter((r) => (bo.boards[r.id]?.length ?? 0) > 0);
    await prepareBoardMath(withBoards.flatMap((r) => bo.boards[r.id]!));
    const saved = saveWhiteboardPages(
      liveId,
      withBoards.map((r) => boardImage(bo.boards[r.id]!)),
      (i) => `${withBoards[i]!.name} whiteboard`,
    );
    recordBreakout(liveId, { startedAt: bo.startedAt, endedAt: new Date().toISOString(), groups: bo.rooms.length });
    setBreakout(() => null);
    toast.success("Everyone is back in the main room", { description: saved ? `${saved} group whiteboard${saved === 1 ? "" : "s"} saved to the course.` : undefined });
  };
  // The teacher's screen runs the timers: time up → 30-second countdown → everyone back.
  const boStatus = bo?.status;
  const boEnds = bo?.endsAt ? Date.parse(bo.endsAt) : null;
  const boCloses = bo?.closesAt ? Date.parse(bo.closesAt) : null;
  const boAuto = !!bo?.autoReturn;
  useEffect(() => {
    if (!isHost || !boStatus) return;
    if (boStatus === "open" && boAuto && boEnds && now >= boEnds) closeRooms();
    if (boStatus === "closing" && boCloses && now >= boCloses) finishBreakout();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, isHost, boStatus, boEnds, boCloses, boAuto]);
  // Students who arrive while rooms are open go to the smallest room (unless students choose their own).
  const boChoose = !!bo?.choose;
  const lateJoiners = isHost && boStatus === "open" && !boChoose ? room.inRoom.filter((p) => p.role === "student" && !bo!.rooms.some((r) => r.members.includes(p.id))).map((p) => p.id).join(",") : "";
  useEffect(() => {
    if (!lateJoiners) return;
    setBreakout((b) => {
      if (!b) return b;
      let rooms = b.rooms;
      for (const id of lateJoiners.split(",")) {
        if (rooms.some((r) => r.members.includes(id))) continue;
        const smallest = [...rooms].sort((x, y) => x.members.length - y.members.length)[0]!;
        rooms = rooms.map((r) => (r.id === smallest.id ? { ...r, members: [...r.members, id] } : r));
      }
      return { ...b, rooms };
    });
  }, [lateJoiners, setBreakout]);
  // Simulated groups sometimes ask for help.
  const boOpen = isHost && boStatus === "open";
  useEffect(() => {
    if (!boOpen) return;
    const t = setInterval(() => {
      if (Math.random() > 0.08) return;
      setBreakout((b) => {
        if (!b) return b;
        const candidates = b.rooms.filter((r) => r.members.length > 0 && !b.help.includes(r.id) && b.visiting !== r.id);
        const pick = candidates[Math.floor(Math.random() * candidates.length)];
        if (!pick) return b;
        toast.message(`${pick.name} is asking for help`, { description: "Join the room from the breakout overview." });
        return { ...b, help: [...b.help, pick.id] };
      });
    }, 5000);
    return () => clearInterval(t);
  }, [boOpen, setBreakout]);
  // Students: hear about rooms opening, messages from the teacher, the one-minute warning and closing.
  const boStarted = bo?.startedAt;
  const prevBo = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (isHost || prevBo.current === boStarted) return;
    const was = prevBo.current;
    prevBo.current = boStarted;
    if (boStarted) toast.message("Breakout rooms are open", { description: "You're working in a small group now." });
    else if (was) toast.message("You're back in the main room");
  }, [boStarted, isHost]);
  const bcast = bo?.broadcast?.at;
  const seenBcast = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!bcast || seenBcast.current === bcast) return;
    seenBcast.current = bcast;
    if (!isHost) toast.message("Message from the teacher", { description: bo?.broadcast?.text, duration: 10000 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bcast, isHost]);
  const warnedFor = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (isHost || !boEnds || boStatus !== "open" || warnedFor.current === boStarted) return;
    if (boEnds - now <= 60_000 && boEnds > now) {
      warnedFor.current = boStarted;
      toast.warning("One minute left in breakout rooms");
    }
  }, [now, boEnds, boStatus, boStarted, isHost]);

  // Escape closes the side panel (on phones it covers the stage).
  useEffect(() => {
    if (!panel) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPanel(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panel]);
  const setChatOpen = room.setChatOpen;
  useEffect(() => {
    setChatOpen(panel === "chat");
  }, [panel, setChatOpen]);

  const pinned = room.inRoom.find((p) => p.id === pinnedId);
  const speaker = pinned ?? room.inRoom.find((p) => p.role === "host" && !p.isSelf) ?? (isHost ? self : room.inRoom.find((p) => p.speaking) ?? room.inRoom[0]);
  const pin = (id: string | null) => {
    setPinnedId(id);
    if (id && layout === "gallery") setLayout("speaker");
    const who = room.inRoom.find((p) => p.id === id);
    toast.message(who ? `${who.isSelf ? "You are" : `${who.name} is`} pinned to the main view` : "Unpinned", { description: who ? "Only your view changes." : undefined });
  };
  const hands = room.inRoom.filter((p) => p.handRaised && !p.isSelf).length;
  const openPoll = room.polls.find((p) => p.open);

  const [noScreenShare, setNoScreenShare] = useState(false);
  const stopScreen = () => {
    screenStream?.getTracks().forEach((t) => t.stop());
    setScreenStream(null);
  };
  const toggleScreen = async () => {
    if (screenStream) {
      stopScreen();
      stage.setMode("video");
      return;
    }
    // Phone and tablet browsers don't let websites capture the screen (only installed apps can) — some
    // expose the API and then refuse — so explain up front instead of failing with an error.
    if (!canShareScreen()) {
      setNoScreenShare(true);
      return;
    }
    try {
      // Capture the shared screen's sound too, so a video played by the teacher is heard by students
      // (spec section 32.1). Processing is off because this is media audio, not a voice.
      const s = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 30 } },
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
        systemAudio: "include",
        selfBrowserSurface: "exclude",
        surfaceSwitching: "include",
      } as DisplayMediaStreamOptions);
      const video = s.getVideoTracks()[0];
      const withSound = s.getAudioTracks().length > 0;
      // Smooth motion for video playback; sharp text for slides and documents.
      if (video) video.contentHint = withSound ? "motion" : "detail";
      video?.addEventListener("ended", () => {
        s.getTracks().forEach((t) => t.stop());
        setScreenStream(null);
        stage.setMode("video");
      });
      if (!withSound)
        toast.warning("Your screen is shared without sound", {
          description: "To share a video's sound, share a browser tab or your entire screen and turn on “Share audio” in the browser's picker. Sharing a single app window doesn't include sound.",
          duration: 12000,
        });
      setScreenStream(s);
      stage.setMode("screen");
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "";
      // A mobile browser we didn't recognise still refuses: show the same explanation.
      if (isMobileDevice() || name === "NotSupportedError" || name === "TypeError") setNoScreenShare(true);
      else if (name === "NotAllowedError") toast.message("Screen sharing didn't start", { description: "It was cancelled, or the browser or system blocked it. On a Mac, allow screen recording for your browser in System Settings → Privacy & Security." });
      else toast.error("Screen sharing couldn't start in this browser. Try the latest Chrome, Edge or Firefox on a laptop or desktop.");
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

  const endClass = async (continueAt?: { at: string; minutes: number }, keepChart = false) => {
    if (keepChart && stage.state.pages.some(pageHasContent)) {
      const saved = saveChart(chartTitle);
      if (saved) toast.success(`Flip chart “${saved.title}” saved`, { description: "Open it from the whiteboard in any class." });
    }
    if (bo) await finishBreakout();
    // Formulas on the board are drawn from prepared images; make sure they're ready before saving.
    await prepareBoardMath(stage.state.pages.flatMap((p) => p.strokes));
    if (continueAt) {
      const next = continueLiveLater(liveId, continueAt.at, continueAt.minutes);
      if (next) toast.success(`${next.title} scheduled`, { description: `Students have been told it continues ${new Date(continueAt.at).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}.` });
    }
    await prepareBackgrounds(stage.state.pages.map((p) => p.background));
    const pages = stage.state.pages.filter(pageHasContent).map((p) => boardImage(p.strokes, 1600, "image/png", p.background));
    const saved = saveWhiteboardPages(liveId, pages);
    if (saved) toast.success(`Whiteboard saved to the course`, { description: `${saved} page${saved === 1 ? "" : "s"} added for students to look back at.` });
    try {
      sessionStorage.removeItem(`classroom-stage:${liveId}`);
    } catch {
      /* ignore */
    }
    endLive(liveId, room.attendance());
    // Give the save a moment to reach the shared database, then send every student to the class-ended screen.
    const announce = stage.announceEnded;
    setTimeout(announce, 600);
    cleanup();
    router.replace(`/classroom/${liveId}/ended`);
  };

  const leave = () => {
    // Students' own attendance is captured when they leave (spec section 40). Leaving and rejoining adds
    // each stretch in the room to the same record; earlier stretches are kept.
    if (role === "student" && ctx.student) addLiveAttendance(ctx.live!.id, ctx.student.id, { joinTime: self.joinedAt, leaveTime: new Date().toISOString() });
    sessionStorage.removeItem(`classroom-joined:${liveId}`);
    cleanup();
    router.replace(`/classroom/${liveId}/ended?left=1`);
  };

  // One session per person (spec section 32): joining from another device or browser closes this one.
  useRoomPresence(liveId, me.user.id, self.joinedAt, (device) => {
    if (role === "student" && ctx.student) addLiveAttendance(ctx.live!.id, ctx.student.id, { joinTime: self.joinedAt, leaveTime: new Date().toISOString() });
    sessionStorage.removeItem(`classroom-joined:${liveId}`);
    if (isHost) stage.handOver();
    cleanup();
    router.replace(`/classroom/${liveId}/ended?replaced=${encodeURIComponent(device)}`);
  });

  const mm = String(Math.floor(elapsed / 3600)).padStart(2, "0");
  const ss = `${String(Math.floor((elapsed % 3600) / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;
  // Flip chart (spec section 32): save the whiteboard pages for reuse, open saved ones, add to the course, download.
  const chartTitle = stage.state.chart?.title ?? ctx.live!.title.replace(/\s*\(Part \d+\)$/, "");
  const saveChart = (title: string, asNew = false) => {
    const saved = saveFlipChart({ id: asNew ? undefined : stage.state.chart?.id, title, pages: stage.state.pages, subjectId: ctx.live!.subjectId, sourceLiveId: liveId });
    if (saved) stage.setChart({ id: saved.id, title: saved.title });
    return saved;
  };

  // ------------------------------------------------------------ class time (spec section 33.1)
  // The class ends by itself at its planned end (the scheduled end, pushed back by breaks) — even if
  // the teacher's connection dropped. Nobody else is ever made host: the subject teacher returns as host.
  const endsAt = plannedEnd(ctx.live!, now);
  const leftMs = endsAt - now;
  const endLabel = new Date(endsAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const timeUp = useRef({ five: false, one: false, done: false });
  const onClassTime = useEffectEvent((left: number) => {
    const t = timeUp.current;
    if (t.done) return;
    if (isHost && left <= 5 * 60_000 && left > 60_000 && !t.five) {
      t.five = true;
      toast.warning("5 minutes left", { description: `The class ends automatically at ${endLabel}. To carry on another time, use End class → continue later.`, duration: 10_000 });
    }
    if (isHost && left <= 60_000 && left > 0 && !t.one) {
      t.one = true;
      toast.warning("1 minute left", { description: `The class ends at ${endLabel}.` });
    }
    if (left > 0 || paused) return;
    if (isHost) {
      t.done = true;
      toast.message("Class time is up — the class has ended", { description: "The recording and attendance are being saved." });
      void endClass();
    } else if (left <= -15_000) {
      // The teacher's device didn't end it (their connection dropped): end it here.
      t.done = true;
      endOverdueLiveClasses();
    }
  });
  useEffect(() => onClassTime(leftMs), [leftMs]);

  // Vacation Classes: text guardians about students who haven't joined or who left early (spec section 49.1.8).
  const onGuardianCheck = useEffectEvent(() => {
    if (!isHost) return;
    const presence = room.participants.filter((p) => p.studentId).map((p) => ({ studentId: p.studentId!, joined: true, present: p.present, leftAt: p.leftAt, removed: p.removed }));
    const sent = checkGuardianAlerts(liveId, presence);
    if (!sent.length) return;
    const absent = sent.filter((m) => m.kind === "live_absent").length;
    const early = sent.length - absent;
    toast.message(`SMS sent to ${sent.length} guardian${sent.length > 1 ? "s" : ""}`, { description: [absent && `${absent} not joined yet`, early && `${early} left early`].filter(Boolean).join(" · ") });
  });
  useEffect(() => {
    const t = setInterval(onGuardianCheck, 20_000);
    return () => clearInterval(t);
  }, []);

  const courseLessons = useStore((st) => st.contents)
    .filter((c) => c.courseId === ctx.live!.courseId && c.type === "text" && c.published && (c.body ?? "").trim())
    .sort((a, b) => a.order - b.order)
    .map((c) => ({ id: c.id, title: c.title, body: c.body ?? "" }));
  /** Puts pages on the board for the class and shows the board (spec section 32.2). */
  const presentPages = (backgrounds: PageBackground[], what: string) => {
    if (!backgrounds.length) return;
    stopScreen();
    stage.loadPages(
      backgrounds.map((background) => ({ id: "", strokes: [], background })),
      { replace: false, keepPrivate: false },
    );
    stage.setMode("whiteboard");
    setPresentingBoard(true);
    toast.success(`Presenting ${what}`, { description: "Turn pages below the board, write or highlight on it, and use the laser to point. Everyone can zoom." });
  };
  // PDFs and pictures in this course that can go on the whiteboard to be written on.
  const courseFiles = useStore((st) => st.contents)
    .filter((c) => c.courseId === ctx.live!.courseId && c.url && !c.url.startsWith("blob:") && /\.(pdf|png|jpe?g|gif|webp)$/i.test(c.fileName ?? c.url))
    .map((c) => ({ title: c.title, url: c.url!, fileName: c.fileName ?? c.url!.split("/").pop()! }));
  const flipChart: FlipChartActions = {
    chart: stage.state.chart ?? null,
    pages: stage.state.pages,
    defaultTitle: chartTitle,
    onSave: (title, asNew) => {
      const saved = saveChart(title, asNew);
      if (saved) toast.success(`Saved “${saved.title}”`, { description: `${saved.pages.length} page${saved.pages.length === 1 ? "" : "s"} in Live Classes → Flip charts, ready to open in any class.` });
    },
    onOpen: (chart, opts) => {
      stage.loadPages(chart.pages, { ...opts, chart: { id: chart.id, title: chart.title } });
      toast.success(`Opened “${chart.title}”`, { description: opts.replace ? "Students see its first page." : opts.keepPrivate ? "Its pages are private — show a page when you're ready." : "Its pages follow the page you're on." });
    },
    onAddToCourse: async () => {
      const images = await flipChartImages(stage.state.pages);
      const n = addBoardImagesToCourse(ctx.live!.courseId, `Whiteboard — ${chartTitle}`, images);
      toast.success(n ? `${n} page${n === 1 ? "" : "s"} added to the course` : "No pages to add");
    },
    onDownloadPdf: async () => {
      const n = await downloadFlipChartPdf(stage.state.pages, chartTitle);
      toast.success(`Downloaded ${n} page${n === 1 ? "" : "s"} as PDF`);
    },
  };

  const breakoutSetup =
    panel === "breakout" ? (
      <BreakoutSetup
        students={room.inRoom.filter((p) => p.role === "student").map((p) => ({ id: p.id, name: p.name, color: p.color }))}
        onOpen={(b) => {
          setBreakout(() => b);
          setPanel(null);
          toast.success(`${b.rooms.length} breakout rooms are open`, { description: b.choose ? "Students are choosing their rooms." : "Students have been moved to their rooms." });
        }}
      />
    ) : null;
  const panelBody = panel === "chat" ? <ChatPanel room={room} selfId={me.user.id} isHost={isHost} /> : panel === "people" ? <ParticipantPanel room={room} isHost={isHost} rosterSize={ctx.roster?.length ?? 0} liveId={liveId} controls={controls} drawers={stage.state.drawers} onDrawers={stage.setDrawers} whiteboardOpen={whiteboard} removed={removedIds.map((id) => ({ id, name: room.participants.find((p) => p.id === id)?.name ?? ctx.roster?.find((r) => r.userId === id)?.name ?? "Member" }))} /> : panel === "polls" ? <PollPanel room={room} isHost={isHost} selfId={me.user.id} /> : breakoutSetup;
  const panelTitle = panel === "chat" ? "Live Chat" : panel === "people" ? "Participants" : panel === "breakout" ? "Breakout rooms" : "Polls";

  return (
    <div className="flex h-dvh flex-col bg-slate-950">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-white/10 px-3 sm:px-4">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold sm:text-base">
            {ctx.subject?.name} — {ctx.cls?.name}
          </p>
          <p className="truncate text-xs text-slate-400">{ctx.live!.title}</p>
        </div>
        {paused ? (
          <span className="flex items-center gap-1.5 rounded-md bg-amber-500 px-2 py-1 text-xs font-semibold text-amber-950" title="Recording is paused during the break">
            <Pause className="size-3" /> PAUSED
          </span>
        ) : (
          <span className="flex items-center gap-1.5 rounded-md bg-red-600/90 px-2 py-1 text-xs font-semibold">
            <span className="size-2 animate-pulse rounded-full bg-white" /> REC {mm !== "00" && `${mm}:`}
            {ss}
          </span>
        )}
        <span className={cn("hidden rounded-md px-2 py-1 text-xs tabular-nums sm:inline", leftMs <= 10 * 60_000 ? "bg-amber-500/20 text-amber-200" : "text-slate-400")} title="The class ends automatically at this time">
          {leftMs <= 10 * 60_000 ? `Ends in ${Math.max(0, Math.ceil(leftMs / 60_000))} min` : `Ends ${endLabel}`}
        </span>
        {room.locked && <Lock className="size-4 text-amber-400" aria-label="Classroom locked" />}
        <button onClick={() => setPanel(panel === "people" ? null : "people")} className="hidden items-center gap-1.5 rounded-md px-2 py-1 text-sm text-slate-300 hover:bg-white/10 sm:flex">
          <Users className="size-4" /> {room.inRoom.filter((p) => p.role === "student").length} Students
        </button>
        <LanguageSwitcher className="text-slate-300 hover:bg-white/10" />
        <ViewMenu layout={layout} setLayout={setLayout} hideNoVideo={hideNoVideo} setHideNoVideo={setHideNoVideo} hideSelf={hideSelf} setHideSelf={setHideSelf} pinnedName={pinned ? (pinned.isSelf ? "You" : pinned.name) : null} onUnpin={() => pin(null)} />
        <Button size="icon-sm" variant="ghost" className="text-slate-300 hover:bg-white/10" onClick={pip} aria-label="Picture-in-picture" title="Picture-in-picture">
          <PictureInPicture2 />
        </Button>
        {/* The whole page goes full screen: dialogs and menus open on <body>, which a full-screen panel would hide. */}
        <Button size="icon-sm" variant="ghost" className="hidden text-slate-300 hover:bg-white/10 sm:inline-flex" onClick={() => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen())} aria-label="Fullscreen" title="Fullscreen">
          <Expand />
        </Button>
      </header>

      {/* Stage + side panel */}
      <div className="relative flex min-h-0 flex-1">
        <div className="relative flex min-w-0 flex-1 flex-col">
          {hostOverview && bo ? (
            <BreakoutOverview
              b={bo}
              now={now}
              members={members}
              onVisit={(roomId) => updateBo((b) => ({ ...b, visiting: roomId, help: b.help.filter((x) => x !== roomId) }))}
              onBroadcast={(text) => (updateBo((b) => ({ ...b, broadcast: { text, at: new Date().toISOString() } })), toast.success("Message sent to every room"))}
              onClose={closeRooms}
              onMove={(userId, roomId) => updateBo((b) => ({ ...b, inMain: b.inMain.filter((x) => x !== userId), rooms: b.rooms.map((r) => ({ ...r, members: r.id === roomId ? [...r.members.filter((x) => x !== userId), userId] : r.members.filter((x) => x !== userId) })) }))}
              onExtend={(m) => updateBo((b) => ({ ...b, endsAt: b.endsAt ? new Date(Math.max(Date.now(), Date.parse(b.endsAt)) + m * 60_000).toISOString() : null }))}
            />
          ) : choosing && bo ? (
            <BreakoutChooser b={bo} members={members} onPick={(roomId) => (stage.request({ act: "pick", room: roomId }), toast.message("Joining room…"))} />
          ) : (
          <>
          {activeRoom && bo && (
            <BreakoutRoomBar
              b={bo}
              room={activeRoom}
              now={now}
              members={members}
              isHost={isHost}
              onHelp={() => (stage.request({ act: "help", room: activeRoom.id }), toast.success("Help requested", { description: "Your teacher will join your room." }))}
              onReturn={() => stage.request({ act: "return" })}
              onLeaveVisit={() => updateBo((b) => ({ ...b, visiting: null }))}
            />
          )}
          {!isHost && bo && !activeRoom && !choosing && (
            <div className="flex shrink-0 flex-wrap items-center justify-center gap-2 bg-indigo-950/60 px-3 py-2 text-sm text-slate-100">
              <Users className="size-4" /> Breakout rooms are open.
              {myRoom && bo.status === "open" && (
                <Button size="xs" onClick={() => stage.request({ act: "rejoin" })}>
                  Rejoin {myRoom.name}
                </Button>
              )}
            </div>
          )}
          <div className="min-h-0 flex-1">
          <VideoStage
            layout={activeRoom ? "speaker" : layout}
            participants={activeRoom ? room.inRoom.filter((p) => activeRoom.members.includes(p.id) || p.isSelf || (p.role === "host" && bo?.visiting === activeRoom.id)) : room.inRoom}
            speaker={speaker}
            localStream={cameraStream}
            screenStream={screenStream}
            screenImage={!isHost && stage.state.mode === "screen" ? stage.frame : null}
            presentation={!activeRoom && presenting ? (stage.state.presentation ?? null) : null}
            whiteboard={
              activeRoom && bo ? (
                <Whiteboard label={`${activeRoom.name}'s whiteboard — everyone in the room can draw`} strokes={bo.boards[activeRoom.id] ?? []} selfId={me.user.id} canDraw onStroke={(st) => stage.drawStroke(st, activeRoom.id)} onUndo={() => stage.undo(activeRoom.id)} />
              ) : whiteboard ? (
                <Whiteboard
                  label={answeringLabel}
                  strokes={boardStrokes}
                  background={boardPage?.background}
                  // The teacher's laser pointer, shown to students on the page it's pointing at.
                  laser={!isHost && stage.laser && (!stage.laser.pageId || stage.laser.pageId === boardPage?.id) ? stage.laser : null}
                  onLaser={isHost ? (at) => stage.sendLaser(at ? { ...at, pageId: boardPage?.id } : null) : undefined}
                  selfId={me.user.id}
                  canDraw={iCanDraw}
                  onStroke={stage.drawStroke}
                  onUndo={stage.undo}
                  host={
                    isHost
                      ? {
                          page: stage.state.page,
                          pages: stage.state.pages,
                          shownId: shownPageId,
                          pinned: stage.state.pinned ?? null,
                          onPage: stage.setPage,
                          onAddPage: stage.addPage,
                          onDuplicate: stage.duplicatePage,
                          onMove: stage.movePage,
                          onDelete: (id) => {
                            const n = stage.state.pages.findIndex((p) => p.id === id) + 1;
                            stage.deletePage(id);
                            toast.message(`Page ${n} deleted`);
                          },
                          onPin: (id) => {
                            stage.pinPage(id);
                            const n = stage.state.pages.findIndex((p) => p.id === id) + 1;
                            toast.message(id ? `Students now see page ${n}` : "Students follow your page again", { description: id ? "It stays on their screens while you work on other pages — those stay private until you show them." : "They see whichever page you're on." });
                          },
                          onClear: stage.clearPage,
                          flipChart,
                          courseFiles,
                          onImport: (backgrounds, keepPrivate) => {
                            stage.loadPages(
                              backgrounds.map((background) => ({ id: "", strokes: [], background })),
                              { replace: false, keepPrivate },
                            );
                            toast.success(`${backgrounds.length} page${backgrounds.length === 1 ? "" : "s"} added to the board`, { description: keepPrivate ? "They're private — show a page when you're ready." : "Students see the page you're on." });
                          },
                          drawers: stage.state.drawers,
                          students: room.inRoom.filter((p) => p.role === "student").map((p) => ({ id: p.id, name: p.name })),
                          onDrawers: (d) => {
                            stage.setDrawers(d);
                            const one = Array.isArray(d) && d.length === 1 ? room.participants.find((p) => p.id === d[0]) : undefined;
                            toast.message(d === "none" ? "Only you can draw now" : d === "all" ? "Everyone can draw on the whiteboard" : one ? `${one.name} can answer on the board` : "Drawing updated", { description: one ? "Only they can draw until you choose someone else or “Only me”." : undefined });
                          },
                        }
                      : undefined
                  }
                />
              ) : undefined
            }
            speakerVideoRef={speakerVideo}
            reactions={room.reactions}
            hideNoVideo={hideNoVideo}
            hideSelf={hideSelf}
            pinnedId={pinned?.id ?? null}
            onPin={pin}
            onShowShared={() => setLayout("speaker")}
          />
          </div>
          </>
          )}
          {/* The teacher's device left (e.g. their connection dropped). Students stay in class; nobody else becomes host. */}
          {!isHost && stage.hostLeft && !pauseState && (
            <div role="status" className="fixed top-14 left-1/2 z-30 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-sm font-medium text-amber-950 shadow-lg">
              <WifiOff className="size-4 shrink-0" />
              <span>
                {ctx.host?.name ?? "The teacher"} lost connection. Stay in class — they&apos;ll be back as host. The class ends at {endLabel}.
              </span>
            </div>
          )}
          {pauseState && <PauseScreen pause={pauseState} now={now} isHost={isHost} onResume={resumeClass} onExtend={(m) => (stage.extendPause(m), toast.message(`Break extended by ${m} minutes`))} />}
          {!isHost && openPoll && openPoll.votes[me.user.id] === undefined && panel !== "polls" && (
            <button onClick={() => setPanel("polls")} className="fixed bottom-24 left-1/2 z-30 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-medium shadow-lg">
              <BarChart3 className="size-4 shrink-0" /> <span className="truncate">New poll: {openPoll.question.slice(0, 40)}…</span>
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
        {/* Phones and tablets: the panel covers the stage but not the header or toolbar, so the class stays one tap away. */}
        {panel && !isDesktop && (
          <section role="dialog" aria-label={panelTitle} className="dark absolute inset-0 z-30 flex flex-col bg-slate-900 text-slate-100">
            <div className="flex h-12 shrink-0 items-center gap-2 border-b border-white/10 px-2">
              <Button size="sm" variant="ghost" className="text-slate-200 hover:bg-white/10" onClick={() => setPanel(null)}>
                <ArrowLeft /> Back to class
              </Button>
              <p className="flex-1 truncate text-right text-sm font-medium pr-2">{panelTitle}</p>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">{panelBody}</div>
          </section>
        )}
      </div>

      {/* Toolbar (spec section 31) */}
      <Toolbar
        room={room}
        role={role}
        self={self}
        panel={panel}
        setPanel={setPanel}
        screenOn={!!screenStream}
        onScreen={toggleScreen}
        whiteboard={whiteboard}
        onWhiteboard={() => {
          if (!whiteboard) return stage.setMode("whiteboard");
          // Closing the board goes back to what was showing before it (a presentation or screen share); pages are kept.
          const back = stage.state.prevMode === "presentation" && stage.state.presentation ? "presentation" : stage.state.prevMode === "screen" && screenStream ? "screen" : "video";
          stage.setMode(back);
          setPresentingBoard(false);
          if (stage.state.pages.some(pageHasContent)) toast.message("Board hidden — your pages are kept", { description: back === "video" ? "Tap Whiteboard to show them again. To stop drawing without hiding the board, use the Pointer tool." : `Back to your ${back === "screen" ? "screen share" : "presentation"}. Tap Whiteboard to show the board again.` });
        }}
        presenting={presenting}
        onBackground={isHost ? () => setBackgroundOpen(true) : undefined}
        backgroundOn={background.kind !== "none"}
        onPresent={() => {
          if (presenting) {
            stage.setMode("video");
            setPresentingBoard(false);
          } else setPresentOpen(true);
        }}
        boardHasDocs={stage.state.pages.some((p) => !!p.background)}
        onPip={pip}
        onEnd={() => setConfirmEnd(true)}
        canEnd={!!me.can("live_classes.end")}
        onLeave={leave}
        hands={hands}
        controls={controls}
        paused={paused}
        onPause={startPause}
        onResume={resumeClass}
        breakoutOpen={!!bo}
        onBreakout={() => (bo ? (updateBo((b) => ({ ...b, visiting: null })), setPanel(null)) : setPanel(panel === "breakout" ? null : "breakout"))}
      />
      <Dialog open={noScreenShare} onOpenChange={setNoScreenShare}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MonitorX className="size-5" /> Screen sharing isn&apos;t available on phones and tablets
            </DialogTitle>
            <DialogDescription>Mobile browsers (Chrome on Android, Safari on iPhone and iPad) don&apos;t allow websites to share the screen — only installed apps can. To share your screen, join this class from a laptop or desktop. From this device you can show your class:</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button variant="outline" className="h-auto justify-start py-2.5" onClick={() => (setNoScreenShare(false), setPresentOpen(true))}>
              <BookOpenText /> <span className="text-left">Present a lesson or document</span>
            </Button>
            <Button variant="outline" className="h-auto justify-start py-2.5" onClick={() => (setNoScreenShare(false), stage.setMode("whiteboard"))}>
              <Presentation /> <span className="text-left">Open the whiteboard</span>
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => setNoScreenShare(false)}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {isHost && (
        <BackgroundPicker
          open={backgroundOpen}
          onOpenChange={setBackgroundOpen}
          value={background}
          onChange={(c) => {
            setBackground(c);
            saveBackground(me.user.id, c);
          }}
          preview={withBackground.stream}
          loading={withBackground.loading}
          error={withBackground.error}
          cameraOn={self.camOn && !!localStream}
        />
      )}
      {isHost && (
        <DocImportDialog
          mode="present"
          open={presentOpen}
          onOpenChange={setPresentOpen}
          courseFiles={courseFiles}
          lessons={courseLessons}
          onPresentLesson={(l) => presentPages(lessonPages(l.title, l.body), l.title)}
          onImport={(backgrounds) => presentPages(backgrounds, backgrounds[0]?.label?.split(" · ")[0] ?? "the document")}
          onShareScreen={() => void toggleScreen()}
        />
      )}
      {confirmEnd && <EndClassDialog boardHasContent={stage.state.pages.some(pageHasContent)} savedChart={stage.state.chart?.title ?? null} onCancel={() => setConfirmEnd(false)} onEnd={(c, keep) => (setConfirmEnd(false), endClass(c, keep))} durationMinutes={ctx.live!.durationMinutes} breakoutOpen={!!bo} now={now} />}
    </div>
  );
}

function ToolButton({ label, active, danger, locked, onClick, children, badge, className }: { label: string; active?: boolean; danger?: boolean; locked?: boolean; onClick?: () => void; children: React.ReactNode; badge?: number; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      aria-disabled={locked || undefined}
      className={cn("relative flex shrink-0 flex-col items-center gap-1 rounded-xl px-2.5 py-1.5 text-[10px] text-slate-300 transition-colors hover:bg-white/10 sm:px-3", active && "bg-white/15 text-white", danger && "bg-red-600 text-white hover:bg-red-500", locked && "bg-slate-700 text-slate-400 hover:bg-slate-700", className)}
    >
      {locked && <Lock className="absolute top-0.5 left-1 size-3 text-amber-300" />}
      <span className="[&_svg]:size-5">{children}</span>
      <span className="hidden sm:block">{label}</span>
      {!!badge && <span className="absolute top-0.5 right-1 min-w-4 rounded-full bg-blue-500 px-1 text-[10px] leading-4 font-semibold text-white">{badge > 9 ? "9+" : badge}</span>}
    </button>
  );
}

/** ClassroomToolbar (spec section 57): 🎤 📹 🖥 ✋ 👍 💬 👥 ⚙ + End Class. */
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
  onBackground,
  backgroundOn,
  onPip,
  onEnd,
  canEnd,
  onLeave,
  hands,
  controls,
  boardHasDocs,
  paused,
  onPause,
  onResume,
  breakoutOpen,
  onBreakout,
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
  onBackground?: () => void;
  backgroundOn?: boolean;
  onPip: () => void;
  onEnd: () => void;
  /** The host's role can end classes; without it the host can only leave (the class keeps running). */
  canEnd: boolean;
  onLeave: () => void;
  hands: number;
  controls: { allowVideo: boolean; allowUnmute: boolean };
  boardHasDocs: boolean;
  paused: boolean;
  onPause: (minutes: number) => void;
  onResume: () => void;
  breakoutOpen: boolean;
  onBreakout: () => void;
}) {
  const isHost = role === "host";
  const canTalk = role !== "observer";
  // Members can always mute and stop video; turning them on depends on what the host allows.
  const micLocked = !isHost && !self.micOn && !controls.allowUnmute;
  const camLocked = !isHost && !self.camOn && !controls.allowVideo;
  return (
    <footer className="flex shrink-0 items-center gap-1 border-t border-white/10 bg-slate-900/80 px-2 py-2 sm:justify-center sm:gap-2">
      {/* Tools scroll on narrow screens; the End/Leave button stays pinned in view. */}
      <div className="flex min-w-0 items-center gap-1 overflow-x-auto [scrollbar-width:none] max-sm:flex-1 sm:gap-2 [&::-webkit-scrollbar]:hidden">
      {canTalk && (
        <>
          <ToolButton
            label={self.micOn ? "Mute" : micLocked ? "Muted by teacher" : "Unmute"}
            danger={!self.micOn}
            locked={micLocked}
            onClick={() => (micLocked ? toast.message("The teacher has turned off unmuting for members", { description: "Raise your hand if you'd like to speak." }) : room.setSelf({ micOn: !self.micOn }))}
          >
            {self.micOn ? <Mic /> : <MicOff />}
          </ToolButton>
          <ToolButton
            label={self.camOn ? "Stop video" : camLocked ? "Video off by teacher" : "Start video"}
            danger={!self.camOn}
            locked={camLocked}
            onClick={() => (camLocked ? toast.message("The teacher has turned off video for members") : room.setSelf({ camOn: !self.camOn }))}
          >
            {self.camOn ? <Video /> : <VideoOff />}
          </ToolButton>
        </>
      )}
      {onBackground && (
        <ToolButton label="Background" active={backgroundOn} onClick={onBackground}>
          <Wallpaper />
        </ToolButton>
      )}
      {isHost && (
        <ToolButton label={screenOn ? "Stop share" : "Share screen"} active={screenOn} onClick={onScreen}>
          {screenOn ? <MonitorX /> : <MonitorUp />}
        </ToolButton>
      )}
      {isHost && onPresent && (
        <ToolButton label="Present" active={presenting} onClick={onPresent}>
          <BookOpenText />
        </ToolButton>
      )}
      {/* Shows or hides the board (with any PDF on it). It is not the pen: drawing is switched on and off with the board's own tools. */}
      {isHost && (
        <ToolButton label={whiteboard ? "Hide board" : boardHasDocs ? "Board & PDFs" : "Whiteboard"} active={whiteboard} onClick={onWhiteboard}>
          <Presentation />
        </ToolButton>
      )}
      {isHost && (
        <ToolButton label="Breakouts" active={panel === "breakout" || breakoutOpen} onClick={onBreakout}>
          <DoorOpen />
        </ToolButton>
      )}
      {isHost &&
        (paused ? (
          <ToolButton label="Resume" active onClick={onResume}>
            <Play />
          </ToolButton>
        ) : (
          <Popover>
            <PopoverTrigger render={<button type="button" className="relative flex shrink-0 flex-col items-center gap-1 rounded-xl px-2.5 py-1.5 text-[10px] text-slate-300 hover:bg-white/10 sm:px-3" aria-label="Pause class" title="Pause class for a break" />}>
              <Pause className="size-5" />
              <span className="hidden sm:block">Pause</span>
            </PopoverTrigger>
            <PopoverContent side="top" className="w-56 gap-1 p-2">
              <p className="px-1 pb-1 text-xs text-muted-foreground">Pause for a break. Recording and attendance stop until you resume.</p>
              {[5, 10, 15, 20, 30].map((m) => (
                <button key={m} onClick={() => onPause(m)} className="rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted">
                  {m}-minute break
                </button>
              ))}
            </PopoverContent>
          </Popover>
        ))}
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
      </div>
      <span className="mx-1 h-8 w-px shrink-0 bg-white/10" />
      {isHost && canEnd ? (
        <Button className="shrink-0 bg-red-600 text-white hover:bg-red-500" onClick={onEnd}>
          <PhoneOff /> <span className="max-sm:sr-only">End Class</span>
        </Button>
      ) : (
        <Button className="shrink-0 bg-red-600 text-white hover:bg-red-500" onClick={onLeave}>
          <PhoneOff /> <span className="max-sm:sr-only">Leave</span>
        </Button>
      )}
    </footer>
  );
}

const LAYOUT_ICON: Record<StageLayout, React.ReactNode> = { speaker: <Square />, gallery: <LayoutGrid />, focus: <Focus /> };

/** How this viewer sees the class: speaker, gallery (all members) or focus, plus filters. Only changes your own view. */
function ViewMenu({
  layout,
  setLayout,
  hideNoVideo,
  setHideNoVideo,
  hideSelf,
  setHideSelf,
  pinnedName,
  onUnpin,
}: {
  layout: StageLayout;
  setLayout: (l: StageLayout) => void;
  hideNoVideo: boolean;
  setHideNoVideo: (v: boolean) => void;
  hideSelf: boolean;
  setHideSelf: (v: boolean) => void;
  pinnedName: string | null;
  onUnpin: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<button type="button" className="flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2 text-sm text-slate-300 outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/40 [&_svg]:size-4" aria-label={`View: ${LAYOUT_LABEL[layout]}`} title="Change view" />}
      >
        {LAYOUT_ICON[layout]}
        <span className="hidden md:inline">View</span>
        <ChevronDown className="hidden !size-3.5 md:block" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel>View mode</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={layout} onValueChange={(v) => setLayout(v as StageLayout)}>
            <DropdownMenuRadioItem value="speaker" closeOnClick>
              <Square /> Speaker
              <span className="ml-auto pr-3 text-xs text-muted-foreground">main + strip</span>
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="gallery" closeOnClick>
              <LayoutGrid /> Gallery
              <span className="ml-auto pr-3 text-xs text-muted-foreground">all members</span>
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="focus" closeOnClick>
              <Focus /> Focus
              <span className="ml-auto pr-3 text-xs text-muted-foreground">main view only</span>
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Show</DropdownMenuLabel>
          <DropdownMenuCheckboxItem checked={hideNoVideo} onCheckedChange={(v) => setHideNoVideo(!!v)}>
            <VideoOff /> Hide members without video
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem checked={hideSelf} onCheckedChange={(v) => setHideSelf(!!v)}>
            <GalleryHorizontalEnd /> Hide self view
          </DropdownMenuCheckboxItem>
        </DropdownMenuGroup>
        {pinnedName && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onUnpin}>
              <PinOff /> Unpin {pinnedName}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Shown to everyone while the class is paused for a break. Chat and the toolbar stay usable. */
function PauseScreen({ pause, now, isHost, onResume, onExtend }: { pause: { since: string; until: string }; now: number; isHost: boolean; onResume: () => void; onExtend: (minutes: number) => void }) {
  const left = Date.parse(pause.until) - now;
  const over = left <= 0;
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/95 p-4 text-center text-slate-100" role="status">
      <div className="max-w-sm">
        <Coffee className="mx-auto size-12 text-amber-300" />
        <h2 className="mt-3 text-xl font-semibold">{over ? "Break's over" : "Class paused"}</h2>
        {over ? (
          <p className="mt-1 text-slate-300">{isHost ? "Resume when everyone is back." : "The teacher will resume the class shortly."}</p>
        ) : (
          <>
            <p className="mt-1 text-slate-300">Back in</p>
            <p className="text-5xl font-bold tabular-nums">{fmtLeft(left)}</p>
          </>
        )}
        <p className="mt-3 text-sm text-slate-400">Recording and attendance are paused{isHost ? "" : " — you won't be marked absent for the break"}. Chat stays open.</p>
        {isHost && (
          <div className="mt-5 flex justify-center gap-2">
            <Button onClick={onResume} className={cn(over && "animate-pulse")}>
              <Play /> Resume class
            </Button>
            <Button variant="secondary" onClick={() => onExtend(5)}>
              +5 min
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

const pad = (n: number) => String(n).padStart(2, "0");
const localInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

/** End the class now, or end this sitting and schedule the next part. */
function EndClassDialog({ onCancel, onEnd, durationMinutes, breakoutOpen, now, boardHasContent, savedChart }: { onCancel: () => void; onEnd: (continueAt: { at: string; minutes: number } | undefined, keepChart: boolean) => void; durationMinutes: number; breakoutOpen: boolean; now: number; boardHasContent: boolean; savedChart: string | null }) {
  const [mode, setMode] = useState<"end" | "continue">("end");
  const [keepChart, setKeepChart] = useState(true);
  // Default: same time tomorrow, on the hour.
  const [at, setAt] = useState(() => {
    const d = new Date(Date.now() + 86_400_000);
    d.setMinutes(0, 0, 0);
    return localInput(d);
  });
  const [minutes, setMinutes] = useState(String(durationMinutes));
  const when = Date.parse(at);
  const problem = mode === "continue" && (Number.isNaN(when) ? "Choose when the class continues." : when < now ? "Choose a time in the future." : !Number(minutes) ? "Enter how long the next part runs." : null);
  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>End class for everyone?</DialogTitle>
          <DialogDescription>Attendance is saved and the recording starts processing; it&apos;s added to the course when ready, with any whiteboard pages.{breakoutOpen ? " Breakout rooms close and their whiteboards are saved." : ""}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 text-sm">
          {(
            [
              ["end", "End class", "The lesson is finished."],
              ["continue", "End and continue later", "This becomes Part 1; Part 2 is scheduled and students are told when it continues."],
            ] as const
          ).map(([k, title, hint]) => (
            <label key={k} className={cn("flex cursor-pointer items-start gap-3 rounded-lg border p-3", mode === k && "border-primary bg-primary/5")}>
              <input type="radio" name="end-mode" checked={mode === k} onChange={() => setMode(k)} className="mt-1 accent-[var(--primary)]" />
              <span>
                <span className="font-medium">{title}</span>
                <span className="block text-xs text-muted-foreground">{hint}</span>
              </span>
            </label>
          ))}
          {mode === "continue" && (
            <div className="grid gap-3 rounded-lg bg-muted/50 p-3 sm:grid-cols-[1fr_7rem]">
              <label className="space-y-1">
                <span className="flex items-center gap-1.5 text-xs font-medium">
                  <CalendarClock className="size-3.5" /> Continues on
                </span>
                <Input type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium">Minutes</span>
                <Input numeric="integer" maxLength={3} value={minutes} onChange={(e) => setMinutes(e.target.value)} />
              </label>
              {problem && <p className="text-xs text-destructive sm:col-span-2">{problem}</p>}
            </div>
          )}
          {boardHasContent && (
            <label className="flex items-start gap-2 pt-1">
              <Checkbox checked={keepChart} onCheckedChange={(c) => setKeepChart(!!c)} className="mt-0.5" />
              <span>
                {savedChart ? `Save changes to the flip chart “${savedChart}”` : "Save the whiteboard as a flip chart for reuse"}
                <span className="block text-xs text-muted-foreground">Keeps every page editable in Live Classes → Flip charts. The pages are also added to the course as images either way.</span>
              </span>
            </label>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="destructive" disabled={!!problem} onClick={() => onEnd(mode === "continue" ? { at: new Date(when).toISOString(), minutes: Number(minutes) } : undefined, boardHasContent && keepChart)}>
            <PhoneOff /> {mode === "continue" ? "End and schedule Part 2" : "End Class"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

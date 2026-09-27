"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { uid } from "@/lib/helpers";
import type { GraphSpec } from "@/lib/graph-math";

/**
 * What the teacher puts on the class's main stage, kept in step for everyone
 * in the room (spec §32): the whiteboard (every pen stroke, as it's drawn),
 * a presentation, or a screen share — and back to the teacher's video.
 *
 * In production these messages travel on the live video provider's data
 * channel (e.g. LiveKit data packets) and the screen share is a video track.
 * The prototype relays them between tabs of the same browser with a
 * BroadcastChannel — sign in as the teacher in one tab and a student in
 * another — and relays the screen share as a few still frames a second.
 * With no teacher tab open, a simulated teacher drives the stage.
 */

export type StageMode = "video" | "whiteboard" | "presentation" | "screen";

export type StrokeKind = "pen" | "line" | "arrow" | "rect" | "ellipse" | "triangle" | "text" | "math" | "graph";

/** One item on the whiteboard: a pen stroke, a shape, a text label or a graph. */
export interface Stroke {
  id: string;
  /** User who drew it. */
  by: string;
  /** Default "pen". */
  kind?: StrokeKind;
  color: string;
  /** Line width (or text size) per 1000 px of board width, so boards of any size match. */
  size: number;
  eraser?: boolean;
  /**
   * In 0–1 board coordinates (the board is 16:9): pen — x0, y0, x1, y1…;
   * shapes — the two corners of the drag; text and maths — top-left; graph — x, y,
   * width, height of its box.
   */
  pts: number[];
  text?: string;
  /** LaTeX for a "math" item. */
  tex?: string;
  graph?: GraphSpec;
}

export type Drawers = "none" | "all" | string[];

export interface StageState {
  mode: StageMode;
  presentation?: { title: string; body: string };
  /** Whiteboard pages; students follow the teacher's page. */
  pages: Stroke[][];
  page: number;
  /** Who besides the teacher may draw on the whiteboard. */
  drawers: Drawers;
  /** Class paused for a break (spec §32): since when, and when the teacher expects to be back. */
  pause?: { since: string; until: string } | null;
  /** Breakout rooms, while they're open. */
  breakout?: Breakout | null;
}

export interface BreakoutRoom {
  id: string;
  name: string;
  /** User ids of the students in the room. */
  members: string[];
}

/** Breakout rooms (spec §32): small groups, each with its own room and whiteboard. */
export interface Breakout {
  /** "closing": everyone is being brought back, at `closesAt`. */
  status: "open" | "closing";
  startedAt: string;
  rooms: BreakoutRoom[];
  /** Timer end, or null for no time limit. */
  endsAt: string | null;
  closesAt?: string;
  /** Bring everyone back automatically when the timer ends. */
  autoReturn: boolean;
  /** Students may go back to the main room on their own. */
  allowReturn: boolean;
  /** Students pick their own room. */
  choose: boolean;
  /** Each room's whiteboard. */
  boards: Record<string, Stroke[]>;
  /** Rooms asking the teacher for help. */
  help: string[];
  /** The room the teacher is visiting, if any. */
  visiting: string | null;
  /** Last message the teacher broadcast to every room. */
  broadcast?: { text: string; at: string };
  /** Students who went back to the main room early. */
  inMain: string[];
}

export type BreakoutRequest = { act: "help"; room: string } | { act: "pick"; room: string } | { act: "return" } | { act: "rejoin" };

type Msg =
  | { k: "hello"; from: string }
  | { k: "state"; state: StageState }
  | { k: "stroke"; page: number; stroke: Stroke; room?: string }
  | { k: "undo"; page: number; id: string; room?: string }
  | { k: "bo"; from: string; req: BreakoutRequest }
  | { k: "frame"; data: string }
  | { k: "bye" }
  | { k: "ended" };

const EMPTY: StageState = { mode: "video", pages: [[]], page: 0, drawers: "none" };

export const canDraw = (drawers: Drawers, userId: string) => drawers === "all" || (Array.isArray(drawers) && drawers.includes(userId));

/** The breakout room a user is in, if any. */
export const roomOf = (b: Breakout | null | undefined, userId: string) => b?.rooms.find((r) => r.members.includes(userId));

const upsert = (strokes: Stroke[], s: Stroke) => {
  const i = strokes.findIndex((x) => x.id === s.id);
  if (i === -1) return [...strokes, s];
  const next = strokes.slice();
  next[i] = s;
  return next;
};

export function useStageSync({ liveId, selfId, isHost, lesson }: { liveId: string; selfId: string; isHost: boolean; lesson?: { title: string; body: string } | null }) {
  const storeKey = `classroom-stage:${liveId}`;
  const [state, setState] = useState<StageState>(() => {
    if (!isHost) return EMPTY;
    // The teacher's board survives a reload of their tab.
    try {
      const saved = sessionStorage.getItem(storeKey);
      if (saved) return { ...EMPTY, ...(JSON.parse(saved) as StageState), mode: "video" };
    } catch {
      /* ignore */
    }
    return EMPTY;
  });
  const [frame, setFrame] = useState<string | null>(null);
  const [simulated, setSimulated] = useState(() => !isHost && typeof BroadcastChannel === "undefined");
  const [hostConnected, setHostConnected] = useState(isHost);
  const [ended, setEnded] = useState(false);
  const channel = useRef<BroadcastChannel | null>(null);
  const heardHost = useRef(false);
  const stateRef = useRef(state);
  const onRequest = useRef<(from: string, req: BreakoutRequest) => void>(() => {});
  useEffect(() => {
    stateRef.current = state;
    if (isHost) {
      try {
        sessionStorage.setItem(storeKey, JSON.stringify({ ...state, presentation: undefined }));
      } catch {
        /* quota or blocked storage: the board just won't survive a reload */
      }
    }
  }, [state, isHost, storeKey]);

  const post = useCallback((m: Msg) => channel.current?.postMessage(m), []);

  // ------------------------------------------------------------ channel
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const ch = new BroadcastChannel(`classproject-live:${liveId}`);
    channel.current = ch;
    ch.onmessage = (e: MessageEvent<Msg>) => {
      const m = e.data;
      if (m.k === "hello") {
        // A late joiner asks for the current stage; only the teacher answers.
        if (isHost) ch.postMessage({ k: "state", state: stateRef.current } satisfies Msg);
      } else if (m.k === "state") {
        if (isHost) return;
        heardHost.current = true;
        setSimulated(false);
        setHostConnected(true);
        setState(m.state);
        if (m.state.mode !== "screen") setFrame(null);
      } else if (m.k === "stroke") {
        setState((s) => applyStroke(s, m.page, m.stroke, m.room));
      } else if (m.k === "undo") {
        setState((s) => removeStroke(s, m.page, m.id, m.room));
      } else if (m.k === "bo") {
        if (isHost) onRequest.current(m.from, m.req);
      } else if (m.k === "frame") {
        if (!isHost) setFrame(m.data);
      } else if (m.k === "ended") {
        if (!isHost) setEnded(true);
      } else if (m.k === "bye") {
        if (isHost) return;
        setHostConnected(false);
        setState((s) => ({ ...s, mode: "video" }));
        setFrame(null);
      }
    };
    if (isHost) ch.postMessage({ k: "state", state: stateRef.current } satisfies Msg);
    else ch.postMessage({ k: "hello", from: selfId } satisfies Msg);
    // No teacher tab answered: a simulated teacher runs the stage for this student.
    const fallback = isHost ? undefined : setTimeout(() => !heardHost.current && setSimulated(true), 1500);
    const bye = () => isHost && ch.postMessage({ k: "bye" } satisfies Msg);
    window.addEventListener("pagehide", bye);
    return () => {
      clearTimeout(fallback);
      bye();
      window.removeEventListener("pagehide", bye);
      ch.close();
      channel.current = null;
    };
  }, [liveId, isHost, selfId]);

  // ------------------------------------------------------------ teacher actions (broadcast the whole stage)
  const commit = useCallback(
    (fn: (s: StageState) => StageState) => {
      setState((s) => {
        const next = fn(s);
        post({ k: "state", state: next });
        return next;
      });
    },
    [post],
  );

  const setMode = useCallback((mode: StageMode, presentation?: { title: string; body: string }) => commit((s) => ({ ...s, mode, presentation: mode === "presentation" ? presentation : undefined })), [commit]);
  const setPage = useCallback((page: number) => commit((s) => ({ ...s, page: Math.max(0, Math.min(page, s.pages.length - 1)) })), [commit]);
  const addPage = useCallback(() => commit((s) => ({ ...s, pages: [...s.pages, []], page: s.pages.length })), [commit]);
  const clearPage = useCallback(() => commit((s) => ({ ...s, pages: s.pages.map((p, i) => (i === s.page ? [] : p)) })), [commit]);
  const setDrawers = useCallback((drawers: Drawers) => commit((s) => ({ ...s, drawers })), [commit]);

  // ------------------------------------------------------------ pause (teacher)
  const pause = useCallback((minutes: number) => commit((s) => ({ ...s, pause: { since: new Date().toISOString(), until: new Date(Date.now() + minutes * 60_000).toISOString() } })), [commit]);
  const extendPause = useCallback((minutes: number) => commit((s) => (s.pause ? { ...s, pause: { ...s.pause, until: new Date(Math.max(Date.now(), Date.parse(s.pause.until)) + minutes * 60_000).toISOString() } } : s)), [commit]);
  const resume = useCallback(() => commit((s) => ({ ...s, pause: null })), [commit]);

  // ------------------------------------------------------------ breakout rooms (teacher)
  const setBreakout = useCallback((fn: (b: Breakout | null) => Breakout | null) => commit((s) => ({ ...s, breakout: fn(s.breakout ?? null) })), [commit]);
  // Students' requests reach the teacher, who updates the rooms for everyone.
  useEffect(() => {
    onRequest.current = (from, req) =>
      setBreakout((b) => {
        if (!b) return b;
        if (req.act === "help") return b.help.includes(req.room) ? b : { ...b, help: [...b.help, req.room] };
        if (req.act === "pick") return { ...b, rooms: b.rooms.map((r) => ({ ...r, members: r.id === req.room ? [...r.members.filter((x) => x !== from), from] : r.members.filter((x) => x !== from) })) };
        if (req.act === "return") return b.inMain.includes(from) ? b : { ...b, inMain: [...b.inMain, from] };
        return { ...b, inMain: b.inMain.filter((x) => x !== from) };
      });
  }, [setBreakout]);
  /** A student asks something of the teacher (help, pick a room, go back to the main room or rejoin their room). */
  const request = useCallback((req: BreakoutRequest) => post({ k: "bo", from: selfId, req }), [post, selfId]);

  // ------------------------------------------------------------ anyone allowed to draw (the class board, or a breakout room's board)
  const drawStroke = useCallback(
    (stroke: Stroke, room?: string) => {
      const page = stateRef.current.page;
      setState((s) => applyStroke(s, page, stroke, room));
      post({ k: "stroke", page, stroke, room });
    },
    [post],
  );
  const undo = useCallback(
    (room?: string) => {
      const page = stateRef.current.page;
      const list = room ? (stateRef.current.breakout?.boards[room] ?? []) : (stateRef.current.pages[page] ?? []);
      const mine = [...list].reverse().find((x) => x.by === selfId);
      if (!mine) return;
      setState((s) => removeStroke(s, page, mine.id, room));
      post({ k: "undo", page, id: mine.id, room });
    },
    [post, selfId],
  );

  const sendFrame = useCallback((data: string) => post({ k: "frame", data }), [post]);
  /** Teacher ended the class: tell every student's screen. */
  // Its own short-lived channel: the teacher's page may already have left the room when this is sent.
  const announceEnded = useCallback(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const ch = new BroadcastChannel(`classproject-live:${liveId}`);
    ch.postMessage({ k: "ended" } satisfies Msg);
    ch.close();
  }, [liveId]);

  // ------------------------------------------------------------ simulated teacher (student demo with no teacher tab)
  useEffect(() => {
    if (!simulated || isHost) return;
    const script = teacherScript(lesson);
    let t = 0;
    const timer = setInterval(() => {
      const step = script(t++);
      if (step) setState((s) => step(s));
    }, 100);
    return () => clearInterval(timer);
  }, [simulated, isHost, lesson]);

  return { state, frame, simulated, hostConnected, ended, announceEnded, setMode, setPage, addPage, clearPage, setDrawers, drawStroke, undo, sendFrame, pause, extendPause, resume, setBreakout, request };
}

function applyStroke(s: StageState, page: number, stroke: Stroke, room?: string): StageState {
  if (room) return s.breakout ? { ...s, breakout: { ...s.breakout, boards: { ...s.breakout.boards, [room]: upsert(s.breakout.boards[room] ?? [], stroke) } } } : s;
  return { ...s, pages: s.pages.map((p, i) => (i === page ? upsert(p, stroke) : p)) };
}

function removeStroke(s: StageState, page: number, id: string, room?: string): StageState {
  if (room) return s.breakout ? { ...s, breakout: { ...s.breakout, boards: { ...s.breakout.boards, [room]: (s.breakout.boards[room] ?? []).filter((x) => x.id !== id) } } } : s;
  return { ...s, pages: s.pages.map((p, i) => (i === page ? p.filter((x) => x.id !== id) : p)) };
}

export type StageSync = ReturnType<typeof useStageSync>;

// ------------------------------------------------------------------ simulated teacher

/** Shapes the simulated teacher draws: a router connected to three computers, then a tick. */
function diagram(): { color: string; size: number; pts: number[] }[] {
  const rect = (x: number, y: number, w: number, h: number) => [x, y, x + w, y, x + w, y + h, x, y + h, x, y];
  const densify = (pts: number[], n = 12) => {
    const out: number[] = [];
    for (let i = 0; i < pts.length - 2; i += 2) for (let k = 0; k < n; k++) out.push(pts[i]! + ((pts[i + 2]! - pts[i]!) * k) / n, pts[i + 1]! + ((pts[i + 3]! - pts[i + 1]!) * k) / n);
    out.push(pts[pts.length - 2]!, pts[pts.length - 1]!);
    return out;
  };
  const circle = (cx: number, cy: number, r: number) => {
    const pts: number[] = [];
    for (let a = 0; a <= 36; a++) pts.push(cx + r * Math.cos((a / 36) * Math.PI * 2), cy + r * 1.78 * Math.sin((a / 36) * Math.PI * 2));
    return pts;
  };
  return [
    { color: "#2563eb", size: 5, pts: circle(0.5, 0.25, 0.07) },
    { color: "#0f172a", size: 4, pts: densify(rect(0.12, 0.66, 0.14, 0.16)) },
    { color: "#0f172a", size: 4, pts: densify(rect(0.43, 0.66, 0.14, 0.16)) },
    { color: "#0f172a", size: 4, pts: densify(rect(0.74, 0.66, 0.14, 0.16)) },
    { color: "#16a34a", size: 3, pts: densify([0.46, 0.37, 0.19, 0.66]) },
    { color: "#16a34a", size: 3, pts: densify([0.5, 0.375, 0.5, 0.66]) },
    { color: "#16a34a", size: 3, pts: densify([0.54, 0.37, 0.81, 0.66]) },
    { color: "#dc2626", size: 6, pts: densify([0.84, 0.12, 0.87, 0.18, 0.94, 0.06], 8) },
  ];
}

/**
 * Timeline, in 100 ms ticks: presents the lesson, switches to the whiteboard
 * and draws the diagram stroke by stroke, lets students draw for a while,
 * then goes back to presenting. Repeats every two and a half minutes.
 */
function teacherScript(lesson?: { title: string; body: string } | null) {
  const shapes = diagram();
  const TEACHER = "simulated-teacher";
  const ids = shapes.map(() => uid("stk"));
  const board = 150; // whiteboard from 15 s
  const drawEnd = board + 20 + shapes.length * 25;
  const cycle = 1500;
  return (tick: number): ((s: StageState) => StageState) | null => {
    const t = tick % cycle;
    if (t === 0) return (s) => (lesson ? { ...s, mode: "presentation", presentation: lesson } : { ...s, mode: "video" });
    if (t === board) return (s) => ({ ...s, mode: "whiteboard", presentation: undefined, pages: [[]], page: 0, drawers: "none" });
    if (t > board + 20 && t <= drawEnd) {
      const i = Math.floor((t - board - 21) / 25);
      const shape = shapes[i];
      if (!shape) return null;
      const progress = Math.min(1, ((t - board - 21) % 25) / 18 + 0.06);
      const n = Math.max(2, Math.round((shape.pts.length / 2) * progress));
      const stroke: Stroke = { id: ids[i]!, by: TEACHER, color: shape.color, size: shape.size, pts: shape.pts.slice(0, n * 2) };
      return (s) => ({ ...s, pages: [upsert(s.pages[0] ?? [], stroke)] });
    }
    if (t === drawEnd + 30) return (s) => ({ ...s, drawers: "all" });
    if (t === drawEnd + 330) return (s) => ({ ...s, drawers: "none" });
    if (t === drawEnd + 380) return (s) => (lesson ? { ...s, mode: "presentation", presentation: lesson } : { ...s, mode: "video" });
    return null;
  };
}

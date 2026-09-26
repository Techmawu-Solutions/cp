"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { uid } from "@/lib/helpers";

/**
 * Classroom engine for the prototype. It stands in for the video provider's
 * room state (participants, chat, hands, polls, reactions) and simulates
 * classmates so a single browser can demo the full experience. The shape of
 * the state mirrors what a LiveKit room + data channel would provide.
 */

export type ClassRole = "host" | "student" | "observer";

export interface Participant {
  id: string; // user id
  studentId?: string;
  name: string;
  color: string;
  role: ClassRole;
  isSelf: boolean;
  joinedAt: string;
  leftAt?: string;
  present: boolean;
  admitted: boolean;
  micOn: boolean;
  camOn: boolean;
  handRaised: boolean;
  speaking: boolean;
  removed?: boolean;
}

export interface ChatMsg {
  id: string;
  authorId: string;
  name: string;
  text: string;
  at: string;
  system?: boolean;
  announcement?: boolean;
}

export interface Poll {
  id: string;
  question: string;
  options: string[];
  votes: Record<string, number>;
  open: boolean;
  correct?: number;
}

export interface Reaction {
  id: string;
  emoji: string;
  name: string;
}

export interface RosterEntry {
  userId: string;
  studentId: string;
  name: string;
  color: string;
}

const CHAT_LINES = [
  "Good morning Sir 👋",
  "Good morning everyone",
  "Sir, can you please repeat that part?",
  "I can hear you clearly",
  "Please can you zoom in a little?",
  "Is this in the textbook?",
  "Understood, thank you",
  "Will this come in the quiz?",
  "My network is a bit slow today",
  "Sir, what is the difference between a switch and a router?",
  "Can we get the slides after class?",
  "👍",
  "That makes sense now",
  "Please explain the example again",
  "So a LAN is only inside one building?",
];

const REACTIONS = ["👍", "👏", "😂", "❤️", "🎉", "🤔"];

export function useClassroom({
  self,
  host,
  roster,
  selfRole,
  waitingRoomDefault,
  topic,
  controls = { allowVideo: true, allowUnmute: true },
  removedIds = [],
}: {
  self: { userId: string; name: string; color: string; studentId?: string };
  host: { userId: string; name: string; color: string };
  roster: RosterEntry[];
  selfRole: ClassRole;
  waitingRoomDefault: boolean;
  topic: string;
  /** What members may do (host-controlled). */
  controls?: { allowVideo: boolean; allowUnmute: boolean };
  /** Members removed by the host, who stay out until let back in. */
  removedIds?: string[];
}) {
  const [participants, setParticipants] = useState<Participant[]>(() => {
    const now = new Date().toISOString();
    const me: Participant = { id: self.userId, studentId: self.studentId, name: self.name, color: self.color, role: selfRole, isSelf: true, joinedAt: now, present: true, admitted: true, micOn: selfRole === "host", camOn: selfRole === "host", handRaised: false, speaking: false };
    // When the viewer isn't the host, the teacher is simulated and already in the room.
    const teacher: Participant | null = selfRole !== "host" ? { id: host.userId, name: host.name, color: host.color, role: "host", isSelf: false, joinedAt: now, present: true, admitted: true, micOn: true, camOn: true, handRaised: false, speaking: true } : null;
    return teacher ? [teacher, me] : [me];
  });
  const [chat, setChat] = useState<ChatMsg[]>(() => [{ id: uid("m"), authorId: "system", name: "System", text: `Class started: ${topic}. This session is being recorded.`, at: new Date().toISOString(), system: true }]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [locked, setLocked] = useState(false);
  const [waitingRoom, setWaitingRoom] = useState(waitingRoomDefault);
  const waitingRoomRef = useRef(waitingRoom);
  useEffect(() => {
    waitingRoomRef.current = waitingRoom;
  }, [waitingRoom]);
  const [unreadChat, setUnreadChat] = useState(0);
  const chatOpenRef = useRef(false);
  const tick = useRef(0);
  // Latest state for the simulation timer, which runs outside React's render cycle.
  const psRef = useRef(participants);
  const pollsRef = useRef(polls);
  const controlsRef = useRef(controls);
  const removedRef = useRef(removedIds);
  useEffect(() => {
    psRef.current = participants;
    pollsRef.current = polls;
    controlsRef.current = controls;
    removedRef.current = removedIds;
  }, [participants, polls, controls, removedIds]);

  const pushChat = useCallback((m: Omit<ChatMsg, "id" | "at">) => {
    setChat((c) => [...c.slice(-199), { ...m, id: uid("m"), at: new Date().toISOString() }]);
    if (!chatOpenRef.current && m.authorId !== self.userId) setUnreadChat((n) => n + 1);
  }, [self.userId]);

  const react = useCallback((emoji: string, name: string) => {
    const id = uid("r");
    setReactions((r) => [...r, { id, emoji, name }]);
    setTimeout(() => setReactions((r) => r.filter((x) => x.id !== id)), 3200);
  }, []);

  // --------------------------------------------------------------- simulation loop
  useEffect(() => {
    const timer = setInterval(() => {
      tick.current++;
      const t = tick.current;
      const now = new Date().toISOString();
      setParticipants((ps) => {
        let next = ps.map((p) => (p.isSelf ? p : { ...p, speaking: p.role === "host" ? Math.random() < 0.7 : p.micOn && Math.random() < 0.08 }));
        const joinedIds = new Set(next.map((p) => p.id));
        const pending = roster.filter((r) => !joinedIds.has(r.userId) && r.userId !== self.userId && !removedRef.current.includes(r.userId));
        const { allowVideo, allowUnmute } = controlsRef.current;
        // Most of the class arrives in the first minute; stragglers trickle in.
        const joinChance = t < 20 ? 0.85 : 0.12;
        if (!locked && pending.length && Math.random() < joinChance) {
          const count = t < 20 ? Math.min(pending.length, 1 + Math.floor(Math.random() * 3)) : 1;
          const arrivals = [...pending].sort(() => Math.random() - 0.5).slice(0, count);
          next = [...next, ...arrivals.map((r) => ({ id: r.userId, studentId: r.studentId, name: r.name, color: r.color, role: "student" as const, isSelf: false, joinedAt: now, present: true, admitted: !waitingRoom, micOn: false, camOn: allowVideo && Math.random() < 0.35, handRaised: false, speaking: false }))];
        }
        // Occasional drop-outs and hand raises.
        next = next.map((p) => {
          if (p.isSelf || p.role === "host" || !p.present || p.removed) return p;
          if (Math.random() < 0.004) return { ...p, present: false, leftAt: now, speaking: false };
          if (!p.handRaised && Math.random() < 0.006) return { ...p, handRaised: true };
          // Members unmute to speak and switch cameras on and off — only when the host allows it.
          if (!p.micOn && allowUnmute && Math.random() < 0.01) return { ...p, micOn: true };
          if (p.micOn && Math.random() < 0.05) return { ...p, micOn: false, speaking: false };
          if (!p.camOn && allowVideo && Math.random() < 0.006) return { ...p, camOn: true };
          if (p.camOn && !allowVideo) return { ...p, camOn: false };
          return p;
        });
        return next;
      });

      const classmates = psRef.current.filter((p) => !p.isSelf && p.role === "student" && p.present && p.admitted);
      const pick = () => classmates[Math.floor(Math.random() * classmates.length)];
      if (classmates.length && Math.random() < 0.18) {
        const who = pick()!;
        pushChat({ authorId: who.id, name: who.name, text: CHAT_LINES[Math.floor(Math.random() * CHAT_LINES.length)]! });
      }
      if (classmates.length && Math.random() < 0.05) react(REACTIONS[Math.floor(Math.random() * REACTIONS.length)]!, pick()!.name);
      // Simulated classmates answer open polls; votes are decided here, outside the state updater.
      const decided: Record<string, Record<string, number>> = {};
      for (const pl of pollsRef.current.filter((x) => x.open)) {
        decided[pl.id] = {};
        classmates.filter((p) => pl.votes[p.id] === undefined && Math.random() < 0.35).forEach((p) => {
          decided[pl.id]![p.id] = pl.correct !== undefined && Math.random() < 0.65 ? pl.correct : Math.floor(Math.random() * pl.options.length);
        });
      }
      if (Object.values(decided).some((v) => Object.keys(v).length)) setPolls((pls) => pls.map((pl) => (decided[pl.id] ? { ...pl, votes: { ...pl.votes, ...decided[pl.id] } } : pl)));
      // A simulated teacher runs the class for student viewers.
      if (selfRole !== "host") {
        if (t === 3) pushChat({ authorId: host.userId, name: host.name, text: `Welcome everyone! Today: ${topic}. Use the ✋ button if you have a question.` });
        if (t === 30) {
          setPolls((p) => (p.length ? p : [{ id: uid("poll"), question: "Which device connects different networks together?", options: ["Switch", "Router", "Hub", "Modem"], votes: {}, open: true, correct: 1 }]));
          pushChat({ authorId: "system", name: "System", text: `${host.name} started a poll.`, system: true });
        }
      }
    }, 1500);
    return () => clearInterval(timer);
  }, [roster, self.userId, selfRole, host.userId, host.name, topic, locked, waitingRoom, pushChat, react]);

  // --------------------------------------------------------------- actions
  const update = useCallback((id: string, patch: Partial<Participant>) => setParticipants((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p))), []);
  const actions = useMemo(
    () => ({
      setSelf: (patch: Partial<Participant>) => update(self.userId, patch),
      sendChat: (text: string) => pushChat({ authorId: self.userId, name: self.name, text }),
      announce: (text: string) => pushChat({ authorId: self.userId, name: self.name, text, announcement: true }),
      react: (emoji: string) => react(emoji, self.name),
      mute: (id: string) => update(id, { micOn: false, speaking: false }),
      /** Mutes every member; the host is muted too only when `includeSelf`. */
      muteAll: (includeSelf = false) => setParticipants((ps) => ps.map((p) => (p.isSelf && !includeSelf ? p : p.role === "host" && !p.isSelf ? p : { ...p, micOn: false, speaking: false }))),
      disableCamera: (id: string) => update(id, { camOn: false }),
      /** Turns off every member's camera (not the host's). */
      stopAllVideo: () => setParticipants((ps) => ps.map((p) => (p.role === "host" ? p : { ...p, camOn: false }))),
      lowerHand: (id: string) => update(id, { handRaised: false }),
      lowerAllHands: () => setParticipants((ps) => ps.map((p) => ({ ...p, handRaised: false }))),
      remove: (id: string) => {
        setParticipants((ps) => ps.map((p) => (p.id === id ? { ...p, present: false, removed: true, handRaised: false, micOn: false, camOn: false, speaking: false, leftAt: new Date().toISOString() } : p)));
      },
      /** Lets a removed member back; they rejoin (through the waiting room if it's on) when they next try. */
      allowBack: (id: string) => {
        update(id, { removed: false });
        // Simulated members rejoin a few seconds later.
        setTimeout(() => setParticipants((ps) => ps.map((p) => (p.id === id && !p.removed && !p.present ? { ...p, present: true, admitted: !waitingRoomRef.current, leftAt: undefined } : p))), 2500 + Math.random() * 2500);
      },
      admit: (id: string) => update(id, { admitted: true }),
      admitAll: () => setParticipants((ps) => ps.map((p) => ({ ...p, admitted: true }))),
      setLocked,
      setWaitingRoom,
      createPoll: (question: string, options: string[]) => setPolls((p) => [...p.map((x) => ({ ...x, open: false })), { id: uid("poll"), question, options, votes: {}, open: true }]),
      closePoll: (id: string) => setPolls((p) => p.map((x) => (x.id === id ? { ...x, open: false } : x))),
      vote: (pollId: string, option: number) => setPolls((p) => p.map((x) => (x.id === pollId ? { ...x, votes: { ...x.votes, [self.userId]: option } } : x))),
      setChatOpen: (open: boolean) => {
        chatOpenRef.current = open;
        if (open) setUnreadChat(0);
      },
    }),
    [update, pushChat, react, self.userId, self.name],
  );

  /** Join/leave times for attendance (spec §40). */
  const attendance = useCallback(() => {
    const end = new Date().toISOString();
    return participants.filter((p) => p.studentId && p.admitted).map((p) => ({ studentId: p.studentId!, joinedAt: p.joinedAt, leftAt: p.leftAt ?? end }));
  }, [participants]);

  const inRoom = participants.filter((p) => p.present && p.admitted);
  const waiting = participants.filter((p) => p.present && !p.admitted);
  return { participants, inRoom, waiting, chat, polls, reactions, locked, waitingRoom, unreadChat, attendance, ...actions };
}

export type ClassroomApi = ReturnType<typeof useClassroom>;

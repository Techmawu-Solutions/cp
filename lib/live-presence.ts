"use client";

import { useEffect, useEffectEvent } from "react";

/**
 * One live-class session per person (spec §32): if someone joins a class they
 * are already in on another device or browser, they're warned first, and
 * joining closes the older session.
 *
 * In production the live video provider enforces this — a second connection
 * with the same identity replaces the first (LiveKit disconnects the older one)
 * — across devices and browsers. The prototype does the same between tabs of
 * one browser over a BroadcastChannel.
 */
type Msg = { k: "who"; userId: string; from: string } | { k: "here"; userId: string; from: string; device: string; since: string } | { k: "takeover"; userId: string; from: string; device: string };

/** This tab's own id, so a session never answers or closes itself. */
const TAB = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Math.random());
const channelFor = (liveId: string) => (typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel(`classproject-presence:${liveId}`));

/** "Chrome on Windows", "Safari on iPhone"… */
export function deviceLabel(): string {
  if (typeof navigator === "undefined") return "another device";
  const ua = navigator.userAgent;
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "a browser";
  const os = /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Mac OS X/.test(ua) ? "Mac" : /Linux/.test(ua) ? "Linux" : "a device";
  return `${browser} on ${os}`;
}

export interface OtherSession {
  device: string;
  since: string;
}

/** Asks whether this person is already in the class somewhere else. Resolves null if not. */
export function findOtherSession(liveId: string, userId: string, waitMs = 600): Promise<OtherSession | null> {
  const ch = channelFor(liveId);
  if (!ch) return Promise.resolve(null);
  return new Promise((resolve) => {
    const done = (v: OtherSession | null) => {
      clearTimeout(timer);
      ch.close();
      resolve(v);
    };
    const timer = setTimeout(() => done(null), waitMs);
    ch.onmessage = (e: MessageEvent<Msg>) => {
      const m = e.data;
      if (m.k === "here" && m.userId === userId && m.from !== TAB) done({ device: m.device, since: m.since });
    };
    ch.postMessage({ k: "who", userId, from: TAB } satisfies Msg);
  });
}

/**
 * For a session inside the class room: answers "who is here", tells any
 * older session of the same person to close as this one starts, and closes
 * this one (via `onReplaced`) when the person joins from somewhere else.
 */
export function useRoomPresence(liveId: string, userId: string, since: string, onReplaced: (device: string) => void) {
  const replaced = useEffectEvent(onReplaced);
  useEffect(() => {
    const ch = channelFor(liveId);
    if (!ch) return;
    const device = deviceLabel();
    ch.onmessage = (e: MessageEvent<Msg>) => {
      const m = e.data;
      if (m.userId !== userId || m.from === TAB) return;
      if (m.k === "who") ch.postMessage({ k: "here", userId, from: TAB, device, since } satisfies Msg);
      else if (m.k === "takeover") replaced(m.device);
    };
    // Joining here closes any older session of the same person.
    ch.postMessage({ k: "takeover", userId, from: TAB, device } satisfies Msg);
    return () => ch.close();
  }, [liveId, userId, since]);
}

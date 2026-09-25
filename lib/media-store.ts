"use client";

/**
 * Keeps the local camera/microphone stream alive between the pre-class lobby
 * and the classroom, so the browser doesn't prompt for permission twice.
 * Production video (and recording) is handled by the video provider, e.g.
 * LiveKit (spec §66–67); this only drives the local preview.
 */
let localStream: MediaStream | null = null;

export async function acquireLocalMedia(opts: { video: boolean; audio: boolean }): Promise<MediaStream | null> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return null;
  if (localStream && localStream.active) return localStream;
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: opts.video ? { width: 1280, height: 720 } : false, audio: opts.audio });
    return localStream;
  } catch {
    return null;
  }
}

export function currentLocalMedia(): MediaStream | null {
  return localStream && localStream.active ? localStream : null;
}

export function setTrackEnabled(kind: "audio" | "video", enabled: boolean) {
  localStream?.getTracks().filter((t) => t.kind === kind).forEach((t) => (t.enabled = enabled));
}

export function releaseLocalMedia() {
  localStream?.getTracks().forEach((t) => t.stop());
  localStream = null;
}

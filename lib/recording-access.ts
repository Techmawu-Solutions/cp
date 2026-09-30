"use client";

import { useCurrentUser } from "@/lib/session";
import { useStore } from "@/lib/store";
import type { ID } from "@/lib/types";

/**
 * Who may download a live class recording (spec section 34.2). Recordings are
 * watch-only by default for students and teachers:
 * - students — only if their school allows student downloads;
 * - teachers — if the school allows teachers to download, or an
 *   administrator allowed that teacher, or their role has
 *   "Download class recordings";
 * - administrators — through that role permission (school and platform
 *   administrators have it by default).
 */
export function useCanDownloadRecording(schoolId: ID | null | undefined): boolean {
  const me = useCurrentUser();
  const school = useStore((s) => s.schools.find((x) => x.id === schoolId));
  const teacher = useStore((s) => (me ? s.teachers.find((t) => t.userId === me.user.id && t.schoolId === schoolId) : undefined));
  if (!me) return false;
  if (me.portal === "student") return !!school?.contentProtection?.recordingDownloads;
  if (me.can("live_classes.download_recordings")) return true;
  if (me.portal === "teacher") return !!school?.contentProtection?.teacherRecordingDownloads || !!teacher?.canDownloadRecordings;
  return false;
}

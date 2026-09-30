"use client";

import { plannedEnd } from "@/lib/actions";
import { uid } from "@/lib/helpers";
import { useStore } from "@/lib/store";
import type { GuardianAlertSettings, ID, SmsMessage } from "@/lib/types";

/**
 * Guardian SMS alerts for Vacation Classes (spec section 49.1.8).
 *
 * While a live class is on, a student's parent or guardian gets one text if:
 *  - the student still hasn't joined `lateAfterMinutes` after the class started, or
 *  - the student left and has stayed away `awayMinutes`, while the class still had
 *    more than `awayMinutes` to run (a brief drop-out or leaving at the very end isn't texted).
 * At most one text of each kind per student per class; nothing during a break;
 * nothing for someone the teacher removed. In production a server job does this
 * from the video provider's join/leave webhooks, so it runs even if the teacher's
 * device goes offline; the prototype runs it from the teacher's classroom.
 */

export const DEFAULT_GUARDIAN_ALERTS: GuardianAlertSettings = { enabled: true, lateAfterMinutes: 10, awayMinutes: 5 };

export interface RoomPresence {
  studentId: ID;
  /** Has entered the room or its waiting room. */
  joined: boolean;
  present: boolean;
  leftAt?: string;
  removed?: boolean;
}

const PHONE_RE = /^\+?[\d\s-]{9,16}$/;
/** "4:05 PM" */
const clock = (ms: number) => new Date(ms).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

/** Checks the room and queues any guardian texts that are due. Returns the texts sent now. */
export function checkGuardianAlerts(liveId: ID, presence: RoomPresence[], now = Date.now()): SmsMessage[] {
  const s = useStore.getState();
  const live = s.liveSessions.find((l) => l.id === liveId);
  if (!live || live.status !== "live" || live.pausedAt) return [];
  const school = s.schools.find((x) => x.id === live.schoolId);
  if (school?.kind !== "vacation") return [];
  const settings = school.guardianAlerts ?? DEFAULT_GUARDIAN_ALERTS;
  if (!settings.enabled) return [];

  const started = Date.parse(live.startedAt ?? live.scheduledAt);
  const end = plannedEnd(live, now);
  if (now >= end) return [];
  const subject = s.subjects.find((x) => x.id === live.subjectId)?.name ?? "live";
  const already = new Set(s.smsMessages.filter((m) => m.liveSessionId === liveId).map((m) => `${m.studentId}:${m.kind}`));
  const byStudent = new Map(presence.map((p) => [p.studentId, p]));
  const roster = s.enrollments.filter((e) => e.classId === live.classId && e.subjectId === live.subjectId).map((e) => s.students.find((x) => x.id === e.studentId)).filter((x) => !!x && x.status === "active");
  const sentAt = new Date(now).toISOString();
  const out: SmsMessage[] = [];

  for (const st of roster) {
    if (!st || !PHONE_RE.test(st.guardianPhone ?? "")) continue;
    const p = byStudent.get(st.id);
    const send = (kind: SmsMessage["kind"], body: string) => {
      if (already.has(`${st.id}:${kind}`)) return;
      out.push({ id: uid("sms"), schoolId: live.schoolId, studentId: st.id, liveSessionId: liveId, kind, to: st.guardianPhone, body, sentAt, status: "sent" });
    };
    if (!p?.joined) {
      if (now - started >= settings.lateAfterMinutes * 60_000)
        send("live_absent", `${school.name}: ${st.firstName} has not joined today's ${subject} live class, which started at ${clock(started)}. Please remind them to join.`);
      continue;
    }
    if (p.present || p.removed || !p.leftAt) continue;
    const left = Date.parse(p.leftAt);
    if (now - left >= settings.awayMinutes * 60_000 && end - left > settings.awayMinutes * 60_000)
      send("live_left_early", `${school.name}: ${st.firstName} left today's ${subject} live class at ${clock(left)}, before it ends at ${clock(end)}, and has not rejoined.`);
  }

  if (out.length) {
    s.insertMany("smsMessages", out);
    s.audit({ schoolId: live.schoolId, action: "Guardian SMS alerts sent", target: `${live.title}: ${out.length} text${out.length > 1 ? "s" : ""}`, category: "live" });
  }
  return out;
}

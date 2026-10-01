import type { DB } from "@/lib/data/seed";
import type { ID } from "@/lib/types";

/**
 * Closed academic sessions are read-only for everyone (spec section 6.5) —
 * teachers, school administrators and the Super Administrator alike. Every
 * write to the store passes through `closedSessionWrite`, so a screen that
 * forgets to hide a button still can't change a closed session. The Laravel
 * API enforces the same rule on the server.
 *
 * The one exception is finishing work that was already under way when the
 * session closed: a live class that is running ends normally, with its
 * attendance and recording. Those writes run inside `completing()`.
 */

export const SESSION_CLOSED_MESSAGE = "This academic session is closed. Its records can't be changed.";

type Row = Record<string, unknown> & { id?: string };
type Lookup = (key: string, id: unknown) => Row | undefined;

/**
 * Collections whose records belong to an academic session — directly through
 * `sessionId`, or through the record they hang off.
 */
const SESSION_OF: Partial<Record<keyof DB, (x: Row, find: Lookup) => ID | undefined>> = {
  programmes: (x) => x.sessionId as ID,
  classes: (x) => x.sessionId as ID,
  subjects: (x) => x.sessionId as ID,
  teachingAssignments: (x) => x.sessionId as ID,
  placements: (x) => x.sessionId as ID,
  enrollments: (x) => x.sessionId as ID,
  courses: (x) => x.sessionId as ID,
  assessments: (x) => x.sessionId as ID,
  liveSessions: (x) => x.sessionId as ID,
  recordings: (x) => x.sessionId as ID,
  attendance: (x) => x.sessionId as ID,
  forumThreads: (x) => x.sessionId as ID,
  announcements: (x) => x.sessionId as ID,
  events: (x) => x.sessionId as ID,
  vacationPrices: (x) => x.sessionId as ID,
  vacationBundles: (x) => x.sessionId as ID,
  vacationRegistrations: (x) => x.sessionId as ID,
  modules: (x, find) => find("courses", x.courseId)?.sessionId as ID | undefined,
  contents: (x, find) => find("courses", x.courseId)?.sessionId as ID | undefined,
  scormAttempts: (x, find) => find("courses", x.courseId)?.sessionId as ID | undefined,
  submissions: (x, find) => find("assessments", x.assessmentId)?.sessionId as ID | undefined,
  forumPosts: (x, find) => find("forumThreads", x.threadId)?.sessionId as ID | undefined,
  progress: (x, find) => {
    const content = find("contents", x.contentId);
    return content ? (find("courses", content.courseId)?.sessionId as ID | undefined) : undefined;
  },
};

/** Fields that record someone reading or watching, not a change to the record. */
const BOOKKEEPING: Partial<Record<keyof DB, string[]>> = {
  recordings: ["views"],
  forumThreads: ["readBy"],
};

const rows = (db: Partial<DB>, key: keyof DB) => db[key] as unknown as Row[] | undefined;

/** Lesson progress has no id of its own. */
const keyOf = (key: keyof DB, x: Row) => (key === "progress" ? `${x.studentId}:${x.contentId}` : (x.id as string));

let completionDepth = 0;

/** Runs `fn` as the completion of work already under way, which may still write to a session that has since closed. */
export function completing<T>(fn: () => T): T {
  completionDepth++;
  try {
    return fn();
  } finally {
    completionDepth--;
  }
}

export function closedSessionIds(db: Pick<DB, "academicSessions">): Set<ID> {
  return new Set(db.academicSessions.filter((s) => s.status === "closed").map((s) => s.id));
}

export function isSessionClosed(db: Pick<DB, "academicSessions">, sessionId: ID | null | undefined): boolean {
  return !!sessionId && db.academicSessions.some((s) => s.id === sessionId && s.status === "closed");
}

/** True when `after` changes nothing in `before` beyond the given bookkeeping fields (a copy with equal fields is no change). */
function unchanged(before: Row, after: Row, bookkeeping: string[] = []): boolean {
  if (before === after) return true;
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const k of keys) if (!bookkeeping.includes(k) && before[k] !== after[k]) return false;
  return true;
}

/**
 * The first record a write would add, change or remove in a closed session,
 * or null when the write is allowed. Sessions count as closed by their status
 * *before* the write, so closing a session and its last records in one step
 * is allowed, and a closed session can't be reopened.
 */
export function closedSessionWrite(prev: DB, patch: Partial<DB>): { collection: keyof DB; sessionId: ID } | null {
  if (completionDepth > 0) return null;
  const closed = closedSessionIds(prev);
  if (closed.size === 0) return null;

  if (patch.academicSessions && patch.academicSessions !== prev.academicSessions) {
    const next = new Map(patch.academicSessions.map((s) => [s.id, s]));
    for (const s of prev.academicSessions) {
      const after = next.get(s.id);
      if (closed.has(s.id) && (!after || !unchanged(s as unknown as Row, after as unknown as Row))) return { collection: "academicSessions", sessionId: s.id };
    }
  }

  // Parents are looked up in the state after the write too, so a record added with its parent in one step resolves.
  const find: Lookup = (key, id) => {
    const k = key as keyof DB;
    return (rows(patch, k) ?? rows(prev, k) ?? []).find((r) => r.id === id) ?? rows(prev, k)?.find((r) => r.id === id);
  };

  for (const key of Object.keys(patch) as (keyof DB)[]) {
    const sessionOf = SESSION_OF[key];
    const after = rows(patch, key);
    const before = rows(prev, key) ?? [];
    if (!sessionOf || !after || after === before) continue;
    const old = new Map(before.map((x) => [keyOf(key, x), x]));
    const check = (x: Row) => {
      const sessionId = sessionOf(x, find);
      return sessionId && closed.has(sessionId) ? { collection: key, sessionId } : null;
    };
    for (const x of after) {
      const was = old.get(keyOf(key, x));
      old.delete(keyOf(key, x));
      if (was && unchanged(was, x, BOOKKEEPING[key])) continue;
      const hit = (was && check(was)) || check(x);
      if (hit) return hit;
    }
    // Whatever is left was removed.
    for (const x of old.values()) {
      const hit = check(x);
      if (hit) return hit;
    }
  }
  return null;
}

"use client";

import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { useAcademicSession, useCurrentUser, useTenant, type CurrentUser } from "@/lib/session";
import { uid } from "@/lib/helpers";
import type { Course, ForumThread, ID, User } from "@/lib/types";
import type { DB } from "@/lib/data/seed";

// ------------------------------------------------------------------ messaging (spec §41.2)

/**
 * Who the current user may message. Messaging never crosses schools:
 * students ↔ their own teachers; teachers ↔ their students and school staff;
 * admins ↔ school staff. Platform users can message school administrators.
 */
export function messageableUsers(db: DB, me: CurrentUser, workspaceId: ID | null = me.user.schoolId): User[] {
  const u = me.user;
  const staffRoleIds = new Set(["role_school_admin", "role_teacher"]);
  if (!workspaceId) return db.users.filter((x) => x.roleId === "role_school_admin" && x.status !== "disabled");
  // Members of the workspace: home-school users plus anyone with a student/teacher record there (e.g. Vacation Classes).
  const memberIds = new Set([...db.students.filter((s) => s.schoolId === workspaceId).map((s) => s.userId), ...db.teachers.filter((t) => t.schoolId === workspaceId).map((t) => t.userId)]);
  const sameSchool = db.users.filter((x) => (x.schoolId === workspaceId || memberIds.has(x.id)) && x.id !== u.id && x.status !== "disabled");
  const activeSession = db.academicSessions.find((s) => s.schoolId === workspaceId && s.status === "active")?.id;
  if (me.portal === "student") {
    const student = db.students.find((s) => s.userId === u.id && s.schoolId === workspaceId);
    const subjects = db.enrollments.filter((e) => e.studentId === student?.id && e.sessionId === activeSession);
    const teacherIds = new Set(db.courses.filter((c) => subjects.some((e) => e.classId === c.classId && e.subjectId === c.subjectId)).map((c) => c.teacherId));
    const teacherUserIds = new Set(db.teachers.filter((t) => teacherIds.has(t.id)).map((t) => t.userId));
    return sameSchool.filter((x) => teacherUserIds.has(x.id));
  }
  if (me.portal === "teacher") {
    const teacher = db.teachers.find((t) => t.userId === u.id && t.schoolId === workspaceId);
    const myCourses = db.courses.filter((c) => c.teacherId === teacher?.id && c.sessionId === activeSession);
    const studentIds = new Set(db.enrollments.filter((e) => myCourses.some((c) => c.classId === e.classId && c.subjectId === e.subjectId)).map((e) => e.studentId));
    const studentUserIds = new Set(db.students.filter((s) => studentIds.has(s.id)).map((s) => s.userId));
    return sameSchool.filter((x) => studentUserIds.has(x.id) || staffRoleIds.has(x.roleId));
  }
  return sameSchool.filter((x) => staffRoleIds.has(x.roleId));
}

export function useMyConversations() {
  const me = useCurrentUser();
  const conversations = useStore((s) => s.conversations);
  const messages = useStore((s) => s.messages);
  const users = useStore((s) => s.users);
  return useMemo(() => {
    if (!me) return [];
    return conversations
      .filter((c) => c.participantIds.includes(me.user.id))
      .map((c) => {
        const msgs = messages.filter((m) => m.conversationId === c.id).sort((a, b) => a.sentAt.localeCompare(b.sentAt));
        const others = users.filter((u) => c.participantIds.includes(u.id) && u.id !== me.user.id);
        return { conversation: c, messages: msgs, last: msgs[msgs.length - 1], others, unread: msgs.filter((m) => !m.readBy.includes(me.user.id)).length };
      })
      .sort((a, b) => b.conversation.lastMessageAt.localeCompare(a.conversation.lastMessageAt));
  }, [me, conversations, messages, users]);
}

export function sendMessage(conversationId: ID, senderId: ID, body: string) {
  const s = useStore.getState();
  const now = new Date().toISOString();
  s.insert("messages", { id: uid("msg"), conversationId, senderId, body: body.trim(), sentAt: now, readBy: [senderId] });
  s.update("conversations", conversationId, { lastMessageAt: now });
}

/** Returns an existing 1:1 conversation or creates one. */
export function openConversation(me: User, other: User): ID {
  const s = useStore.getState();
  const existing = s.conversations.find((c) => c.participantIds.length === 2 && c.participantIds.includes(me.id) && c.participantIds.includes(other.id));
  if (existing) return existing.id;
  const id = uid("cnv");
  const now = new Date().toISOString();
  s.insert("conversations", { id, schoolId: me.schoolId ?? other.schoolId, participantIds: [me.id, other.id], createdAt: now, lastMessageAt: now });
  return id;
}

export function markConversationRead(conversationId: ID, userId: ID) {
  useStore.getState().mutate((db) => ({
    messages: db.messages.map((m) => (m.conversationId === conversationId && !m.readBy.includes(userId) ? { ...m, readBy: [...m.readBy, userId] } : m)),
  }));
}

// ------------------------------------------------------------------ forums (spec §41.3)

export type ForumRole = "moderator" | "member" | "observer";

/**
 * Forums the current user can open, scoped to the selected academic session.
 * Students: only courses they are registered for (their class × subject).
 * Teachers: courses they teach (moderator). School admins: every course (observer + moderation).
 */
export function useMyForums() {
  const me = useCurrentUser();
  const { schoolId } = useTenant();
  const { sessionId } = useAcademicSession(schoolId);
  const db = useStore();
  return useMemo(() => {
    if (!me || !schoolId || !sessionId) return [];
    const courses = db.courses.filter((c) => c.schoolId === schoolId && c.sessionId === sessionId);
    let mine: { course: Course; role: ForumRole }[] = [];
    if (me.portal === "student") {
      const student = db.students.find((s) => s.userId === me.user.id && s.schoolId === schoolId);
      const enrolled = new Set(db.enrollments.filter((e) => e.studentId === student?.id && e.sessionId === sessionId).map((e) => `${e.classId}:${e.subjectId}`));
      mine = courses.filter((c) => enrolled.has(`${c.classId}:${c.subjectId}`)).map((course) => ({ course, role: "member" as const }));
    } else if (me.portal === "teacher") {
      const teacher = db.teachers.find((t) => t.userId === me.user.id && t.schoolId === schoolId);
      mine =courses.filter((c) => c.teacherId === teacher?.id).map((course) => ({ course, role: "moderator" as const }));
    } else {
      mine = courses.map((course) => ({ course, role: "observer" as const }));
    }
    return mine.map(({ course, role }) => {
      const threads = db.forumThreads.filter((t) => t.courseId === course.id);
      const posts = db.forumPosts.filter((p) => threads.some((t) => t.id === p.threadId));
      const unread = threads.filter((t) => !t.readBy.includes(me.user.id)).length;
      const lastActivity = threads.reduce<string | null>((acc, t) => (!acc || t.lastActivityAt > acc ? t.lastActivityAt : acc), null);
      return {
        course,
        role,
        subject: db.subjects.find((x) => x.id === course.subjectId),
        cls: db.classes.find((x) => x.id === course.classId),
        threads: threads.length,
        posts: posts.length + threads.length,
        unread,
        lastActivity,
      };
    });
  }, [me, schoolId, sessionId, db]);
}

/** Forum access check for a single course — the rule every forum screen enforces. */
export function forumRoleFor(db: DB & { actingSchoolId?: ID | null }, me: CurrentUser | null, course: Course | undefined): ForumRole | null {
  if (!me || !course) return null;
  if (me.portal === "super-admin") return db.actingSchoolId === course.schoolId ? "observer" : null;
  if (me.portal === "teacher") return db.teachers.find((t) => t.userId === me.user.id && t.schoolId === course.schoolId)?.id === course.teacherId ? "moderator" : null;
  if (me.portal === "student") {
    const student = db.students.find((s) => s.userId === me.user.id && s.schoolId === course.schoolId);
    return db.enrollments.some((e) => e.studentId === student?.id && e.classId === course.classId && e.subjectId === course.subjectId && e.sessionId === course.sessionId) ? "member" : null;
  }
  if (me.user.schoolId !== course.schoolId) return null;
  return me.can("courses.view") ? "observer" : null;
}

export function createThread(course: Course, authorId: ID, input: { title: string; body: string; isQuestion: boolean }): ForumThread {
  const s = useStore.getState();
  const now = new Date().toISOString();
  const thread: ForumThread = { id: uid("thr"), courseId: course.id, schoolId: course.schoolId, sessionId: course.sessionId, authorId, title: input.title.trim(), body: input.body.trim(), createdAt: now, lastActivityAt: now, pinned: false, locked: false, isQuestion: input.isQuestion, readBy: [authorId] };
  s.insert("forumThreads", thread);
  return thread;
}

export function replyToThread(thread: ForumThread, authorId: ID, body: string) {
  const s = useStore.getState();
  const now = new Date().toISOString();
  s.insert("forumPosts", { id: uid("post"), threadId: thread.id, authorId, body: body.trim(), createdAt: now });
  // Everyone else sees the thread as unread again.
  s.update("forumThreads", thread.id, { lastActivityAt: now, readBy: [authorId] });
  const author = s.users.find((u) => u.id === thread.authorId);
  if (author && author.id !== authorId) {
    const course = s.courses.find((c) => c.id === thread.courseId);
    s.notify({ userId: author.id, schoolId: thread.schoolId, kind: "announcement", title: "New reply in forum", body: `${s.users.find((u) => u.id === authorId)?.name} replied to "${thread.title}" (${course?.title}).`, href: `/forums/${thread.courseId}/${thread.id}` });
  }
}

export function markThreadRead(thread: ForumThread, userId: ID) {
  if (thread.readBy.includes(userId)) return;
  useStore.getState().update("forumThreads", thread.id, { readBy: [...thread.readBy, userId] });
}

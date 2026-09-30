"use client";

import { useStore } from "@/lib/store";
import type { DB } from "@/lib/data/seed";
import type { ID, Student } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * A student's username for display: their school username (WAEC prefix) when
 * the school has issued one, otherwise their platform username (spec section 10.1).
 */
export function studentUsername(db: Pick<DB, "users" | "students">, student: Pick<Student, "userId" | "schoolUsername"> | undefined): string | undefined {
  if (!student) return undefined;
  return student.schoolUsername ?? db.users.find((u) => u.id === student.userId)?.username;
}

/** Username for a user account, if that user is a student (else undefined). */
export function usernameForUser(db: Pick<DB, "users" | "students">, userId: ID | undefined, schoolId?: ID | null): string | undefined {
  if (!userId) return undefined;
  const user = db.users.find((u) => u.id === userId);
  if (!user || user.roleId !== "role_student") return undefined;
  const records = db.students.filter((s) => s.userId === userId);
  const record = records.find((s) => s.schoolId === schoolId && s.schoolUsername) ?? records.find((s) => s.schoolUsername);
  return record?.schoolUsername ?? user.username;
}

export function useStudentUsername(student: Pick<Student, "userId" | "schoolUsername"> | undefined) {
  const users = useStore((s) => s.users);
  return studentUsername({ users, students: [] }, student);
}

function Username({ value, className }: { value?: string; className?: string }) {
  if (!value) return null;
  return <span className={cn("block truncate font-mono text-[11px] leading-tight font-normal text-muted-foreground", className)}>{value}</span>;
}

/**
 * Student name with their username underneath — used wherever a student's
 * name is shown (spec section 10.1).
 */
export function StudentName({ student, name, className, nameClassName, usernameClassName }: { student: Student | undefined; name?: React.ReactNode; className?: string; nameClassName?: string; usernameClassName?: string }) {
  const username = useStudentUsername(student);
  if (!student) return <span className={className}>{name ?? "—"}</span>;
  return (
    <span className={cn("inline-block min-w-0 leading-tight", className)}>
      <span className={cn("block truncate font-medium", nameClassName)}>{name ?? `${student.firstName} ${student.lastName}`}</span>
      <Username value={username} className={usernameClassName} />
    </span>
  );
}

/**
 * A user's name, with their username underneath when the user is a student
 * (forums, messages, live class participants…).
 */
export function PersonName({ userId, name, schoolId, className, nameClassName, usernameClassName }: { userId: ID | undefined; name: React.ReactNode; schoolId?: ID | null; className?: string; nameClassName?: string; usernameClassName?: string }) {
  const users = useStore((s) => s.users);
  const students = useStore((s) => s.students);
  const username = usernameForUser({ users, students }, userId, schoolId);
  return (
    <span className={cn("inline-block min-w-0 leading-tight", className)}>
      <span className={cn("block truncate", nameClassName)}>{name}</span>
      <Username value={username} className={usernameClassName} />
    </span>
  );
}

/** Just the username line, for places where the name sits inside a sentence. */
export function StudentUsernameLine({ student, className }: { student: Student | undefined; className?: string }) {
  const username = useStudentUsername(student);
  return <Username value={username} className={className} />;
}

/** A user's username if they are a student, for inline text ("Name · username · 2h ago"). */
export function usePersonUsername(userId: ID | undefined, schoolId?: ID | null) {
  const users = useStore((s) => s.users);
  const students = useStore((s) => s.students);
  return usernameForUser({ users, students }, userId, schoolId);
}

/** Inline username (" · 0010712-0042-26") after a name, when the user is a student. */
export function InlineUsername({ userId, schoolId, className }: { userId: ID | undefined; schoolId?: ID | null; className?: string }) {
  const username = usePersonUsername(userId, schoolId);
  if (!username) return null;
  return <span className={cn("font-mono text-[11px] text-muted-foreground", className)}> · {username}</span>;
}

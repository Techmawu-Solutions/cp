"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { UsersRound } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { StatusBadge } from "@/components/common/status-badge";
import { UserAvatar } from "@/components/common/user-avatar";
import { RequirePermission } from "@/components/layout/app-shell";
import { RELATIONSHIP_LABEL } from "@/lib/actions";
import { fmtAgo } from "@/lib/helpers";
import { studentName, useTenant } from "@/lib/session";
import { useStore } from "@/lib/store";

/** School administrator: every parent account and the students it follows (spec section 22.3). */
export default function ParentsPage() {
  return (
    <RequirePermission perm="guardians.view">
      <Parents />
    </RequirePermission>
  );
}

function Parents() {
  const { school } = useTenant();
  const links = useStore((s) => s.guardianLinks);
  const users = useStore((s) => s.users);
  const students = useStore((s) => s.students);
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const mine = links.filter((l) => l.schoolId === school?.id);
    const byParent = new Map<string, typeof mine>();
    mine.forEach((l) => byParent.set(l.guardianUserId, [...(byParent.get(l.guardianUserId) ?? []), l]));
    return [...byParent.entries()]
      .map(([userId, ls]) => ({ user: users.find((u) => u.id === userId)!, links: ls.map((l) => ({ link: l, student: students.find((s) => s.id === l.studentId)! })).filter((x) => x.student) }))
      .filter((r) => r.user)
      .filter((r) => !q.trim() || [r.user.name, r.user.email, ...r.links.map((x) => studentName(x.student))].some((t) => t.toLowerCase().includes(q.trim().toLowerCase())))
      .sort((a, b) => a.user.name.localeCompare(b.user.name));
  }, [links, users, students, school, q]);

  if (!school?.parentAccess)
    return <EmptyState icon={UsersRound} title="Parent access is off" description="The platform administrator turns parent access on per school. Ask them if parents at your school should follow their children." className="mt-10" />;

  return (
    <>
      <PageHeader title="Parents & Guardians" description="Parents follow their children's progress, grades, work and live-class attendance. Add a parent from the student's page." />
      <Card>
        <CardContent className="space-y-3">
          <Input placeholder="Search parents or students" value={q} onChange={(e) => setQ(e.target.value)} className="sm:max-w-sm" />
          {rows.length === 0 ? (
            <EmptyState icon={UsersRound} title="No parents yet" description="Open a student and choose Add under Parents & guardians." className="border-0" />
          ) : (
            <>
            {/* Phones: one row per parent; the four-column table needs more width than a phone has. */}
            <ul className="divide-y sm:hidden">
              {rows.map(({ user, links: ls }) => (
                <li key={user.id} className="flex items-start gap-3 py-3">
                  <UserAvatar name={user.name} color={user.avatarColor} size="sm" className="shrink-0" />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-start gap-2">
                      <p className="min-w-0 flex-1 font-medium">{user.name}</p>
                      <StatusBadge status={user.status} className="shrink-0" />
                    </div>
                    <p className="text-xs break-all text-muted-foreground">
                      {user.email}
                      {user.phone && ` · ${user.phone}`}
                    </p>
                    {ls.map(({ link, student }) => (
                      <p key={link.id} className="text-sm">
                        <Link href={`/school/students/${student.id}`} className="text-primary hover:underline">
                          {studentName(student)}
                        </Link>{" "}
                        <span className="text-xs text-muted-foreground">· {RELATIONSHIP_LABEL[link.relationship]}</span>
                      </p>
                    ))}
                    <p className="text-xs text-muted-foreground">Last active: {user.lastActive ? fmtAgo(user.lastActive) : "Never signed in"}</p>
                  </div>
                </li>
              ))}
            </ul>
            <Table className="hidden sm:table">
              <TableHeader>
                <TableRow>
                  <TableHead>Parent</TableHead>
                  <TableHead>Children</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(({ user, links: ls }) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <UserAvatar name={user.name} color={user.avatarColor} size="sm" />
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.email}{user.phone && ` · ${user.phone}`}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {ls.map(({ link, student }) => (
                        <p key={link.id}>
                          <Link href={`/school/students/${student.id}`} className="text-primary hover:underline">
                            {studentName(student)}
                          </Link>{" "}
                          <span className="text-xs text-muted-foreground">· {RELATIONSHIP_LABEL[link.relationship]}</span>
                        </p>
                      ))}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={user.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">{user.lastActive ? fmtAgo(user.lastActive) : "Never signed in"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
}

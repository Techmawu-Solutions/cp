"use client";

import { Suspense } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { UrlTabs } from "@/components/common/url-tabs";
import { SessionBanner, useSessionEditable } from "@/components/academic/session-banner";
import { AttendanceRegister } from "@/components/classroom/attendance-register";
import { useTeacherData } from "@/lib/teacher";

/** Teacher: My Classes — the classes taught, plus the register for form classes. */
export default function TeacherClassesPage() {
  const t = useTeacherData();
  const editable = useSessionEditable();
  const { d } = t;
  const classIds = [...new Set(t.courses.map((c) => c.classId))];
  return (
    <>
      <PageHeader title="My Classes" description={`Classes you teach in ${d.session.label}${t.formClasses.length ? ` · class teacher of ${t.formClasses.map((c) => c.name).join(", ")}` : ""}.`} />
      <SessionBanner />
      <Suspense>
        <UrlTabs tabs={[{ value: "classes", label: "Classes" }, ...(t.formClasses.length ? [{ value: "register", label: "Class register" }] : [])]}>
          {(tab) =>
            tab === "register" ? (
              <AttendanceRegister classes={t.formClasses} editable={editable} />
            ) : classIds.length === 0 ? (
              <EmptyState title="No classes assigned" />
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {classIds.map((cid) => {
                  const cls = d.byId.class.get(cid)!;
                  const mine = t.courses.filter((c) => c.classId === cid);
                  return (
                    <Card key={cid}>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          {cls.name} {cls.classTeacherId === t.teacher?.id && <Badge variant="secondary">Form class</Badge>}
                        </CardTitle>
                        <CardDescription>
                          {d.byId.programme.get(cls.programmeId)?.name} · {d.placements.filter((p) => p.classId === cid).length} students
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-1.5">
                        {mine.map((c) => (
                          <Link key={c.id} href={`/teacher/courses/${c.id}`} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm hover:bg-muted">
                            <span className="flex items-center gap-2">
                              <span className="size-2 rounded-full" style={{ background: d.byId.subject.get(c.subjectId)?.color }} />
                              {d.byId.subject.get(c.subjectId)?.name}
                            </span>
                            <span className="text-xs text-muted-foreground">{t.studentsOf(c.id).length} students</span>
                          </Link>
                        ))}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )
          }
        </UrlTabs>
      </Suspense>
    </>
  );
}

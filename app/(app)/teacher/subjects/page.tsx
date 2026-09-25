"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { SessionBanner } from "@/components/academic/session-banner";
import { useTeacherData } from "@/lib/teacher";

/** Teacher: My Subjects — each subject/class pair is a course workspace (spec §29). */
export default function TeacherSubjectsPage() {
  const t = useTeacherData();
  const { d } = t;
  const bySubject = new Map<string, typeof t.courses>();
  t.courses.forEach((c) => bySubject.set(c.subjectId, [...(bySubject.get(c.subjectId) ?? []), c]));
  return (
    <>
      <PageHeader title="My Subjects" description={`Subjects you teach in ${d.session.label}.`} />
      <SessionBanner />
      {t.courses.length === 0 && <EmptyState title="No subjects assigned" description="Your school administrator assigns subjects to teachers." />}
      <div className="space-y-6">
        {[...bySubject.entries()].map(([subjectId, courses]) => {
          const subject = d.byId.subject.get(subjectId);
          return (
            <section key={subjectId}>
              <h2 className="mb-2 flex items-center gap-2 font-semibold">
                <span className="size-3 rounded-full" style={{ background: subject?.color }} /> {subject?.name}
                <span className="text-sm font-normal text-muted-foreground">· {courses.length} classes</span>
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {courses.map((c) => {
                  const items = d.contents.filter((x) => x.courseId === c.id);
                  const published = items.filter((x) => x.published).length;
                  return (
                    <Link key={c.id} href={`/teacher/courses/${c.id}`}>
                      <Card className="h-full transition-shadow hover:shadow-md hover:ring-primary/30">
                        <CardContent className="space-y-3">
                          <div>
                            <p className="font-semibold">
                              {subject?.name} — {d.byId.class.get(c.classId)?.name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {t.studentsOf(c.id).length} Students · {d.modules.filter((m) => m.courseId === c.id).length} modules · {d.assessments.filter((a) => a.courseId === c.id).length} assessments
                            </p>
                          </div>
                          <div>
                            <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                              <span>Published content</span>
                              <span>
                                {published}/{items.length}
                              </span>
                            </div>
                            <Progress value={items.length ? (published / items.length) * 100 : 0} />
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}

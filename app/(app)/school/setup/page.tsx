"use client";

import Link from "next/link";
import { CheckCircle2, Circle, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/common/page-header";
import { LinkButton } from "@/components/common/link-button";
import { useSchoolData } from "@/lib/queries";
import { cn } from "@/lib/utils";

/** School setup workflow (spec §62), with live completion state. */
export default function SetupPage() {
  const d = useSchoolData();
  const placed = new Set(d.placements.map((p) => p.studentId));
  const steps = [
    { title: "Create academic year", done: d.session.years.length > 0, detail: `${d.session.years.length} academic years`, href: "/school/academic-sessions" },
    { title: "Create academic session", done: !!d.session.active, detail: d.session.active ? `Active: ${d.session.label}` : "No active session", href: "/school/academic-sessions" },
    { title: "Create programmes", done: d.programmes.length > 0, detail: `${d.programmes.length} programmes`, href: "/school/programmes" },
    { title: "Create classes", done: d.classes.length > 0, detail: `${d.classes.length} classes`, href: "/school/classes" },
    { title: "Create subjects", done: d.subjects.length > 0, detail: `${d.subjects.length} subjects`, href: "/school/subjects" },
    { title: "Create teachers", done: d.teachers.length > 0, detail: `${d.teachers.length} teachers`, href: "/school/teachers" },
    { title: "Import students", done: d.allStudents.length > 0, detail: `${d.allStudents.length} students`, href: "/school/students/import" },
    { title: "Assign students to classes", done: d.students.length > 0 && d.students.every((s) => placed.has(s.id)), detail: `${placed.size} of ${d.students.length} placed`, href: "/school/students" },
    { title: "Assign teachers to subjects", done: d.teachingAssignments.length > 0, detail: `${d.teachingAssignments.length} class-subject assignments`, href: "/school/subjects" },
    { title: "Register students for subjects", done: d.enrollments.length > 0, detail: `${d.enrollments.length} registrations`, href: "/school/enrolments" },
    { title: "Begin teaching", done: d.contents.length > 0 || d.liveSessions.length > 0, detail: `${d.courses.length} courses ready for teachers`, href: "/school/courses" },
  ];
  const done = steps.filter((s) => s.done).length;
  const next = steps.find((s) => !s.done);

  return (
    <>
      <PageHeader title="Setup Guide" description={`Get ${d.school?.shortName ?? "your school"} ready for ${d.session.label}. Steps complete automatically as you work.`} />
      <Card className="mb-4">
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex-1">
            <p className="font-medium">
              {done} of {steps.length} steps complete
            </p>
            <Progress value={(done / steps.length) * 100} className="mt-2" />
          </div>
          {next && (
            <LinkButton href={next.href}>
              Next: {next.title} <ArrowRight />
            </LinkButton>
          )}
        </CardContent>
      </Card>
      <ol className="relative space-y-2">
        {steps.map((s, i) => (
          <li key={s.title}>
            <Link href={s.href} className={cn("flex items-center gap-4 rounded-xl border bg-card p-4 transition-colors hover:border-primary/40", s === next && "border-primary ring-2 ring-primary/15")}>
              {s.done ? <CheckCircle2 className="size-6 shrink-0 text-emerald-600" /> : <Circle className="size-6 shrink-0 text-muted-foreground" />}
              <span className="w-6 text-sm text-muted-foreground tabular-nums">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className={cn("font-medium", s.done && "text-muted-foreground")}>{s.title}</p>
                <p className="text-xs text-muted-foreground">{s.detail}</p>
              </div>
              <ArrowRight className="size-4 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ol>
    </>
  );
}

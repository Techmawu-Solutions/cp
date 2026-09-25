"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/common/page-header";
import { DataTable } from "@/components/tables/data-table";
import { SessionBanner } from "@/components/academic/session-banner";
import { RequirePermission } from "@/components/layout/app-shell";
import { useSchoolData } from "@/lib/queries";
import { teacherName } from "@/lib/session";

export default function SchoolCoursesPage() {
  const d = useSchoolData();
  const router = useRouter();
  const count = (id: string, key: "modules" | "contents" | "assessments") => (d[key] as { courseId: string }[]).filter((x) => x.courseId === id).length;
  return (
    <RequirePermission perm="courses.view">
      <PageHeader title="Courses" description={`Every subject taught to every class in ${d.session.label}. A course is created automatically when a teacher is assigned.`} breadcrumbs={[{ label: "Courses" }]} />
      <SessionBanner />
      <DataTable
        rows={d.courses}
        search={(c) => c.title}
        onRowClick={(c) => router.push(`/school/courses/${c.id}`)}
        initialSort={{ key: "title", dir: "asc" }}
        filters={[
          { key: "class", label: "Classes", options: d.classes.map((c) => ({ value: c.id, label: c.name })), predicate: (c, v) => c.classId === v },
          { key: "subject", label: "Subjects", options: d.subjects.map((s) => ({ value: s.id, label: s.name })), predicate: (c, v) => c.subjectId === v },
          { key: "teacher", label: "Teachers", options: d.teachers.map((t) => ({ value: t.id, label: `${t.title} ${t.lastName}` })), predicate: (c, v) => c.teacherId === v },
        ]}
        columns={[
          { key: "title", header: "Course", sort: (c) => c.title, cell: (c) => (<span className="flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ background: d.byId.subject.get(c.subjectId)?.color }} /><span className="font-medium">{c.title}</span></span>) },
          { key: "teacher", header: "Teacher", sort: (c) => teacherName(d.byId.teacher.get(c.teacherId)), cell: (c) => teacherName(d.byId.teacher.get(c.teacherId)) },
          { key: "students", header: "Students", sort: (c) => d.enrollments.filter((e) => e.classId === c.classId && e.subjectId === c.subjectId).length, cell: (c) => d.enrollments.filter((e) => e.classId === c.classId && e.subjectId === c.subjectId).length, className: "tabular-nums" },
          { key: "modules", header: "Modules", sort: (c) => count(c.id, "modules"), cell: (c) => count(c.id, "modules"), className: "tabular-nums" },
          { key: "items", header: "Content", sort: (c) => count(c.id, "contents"), cell: (c) => count(c.id, "contents"), className: "tabular-nums" },
          { key: "asm", header: "Assessments", sort: (c) => count(c.id, "assessments"), cell: (c) => count(c.id, "assessments"), className: "tabular-nums" },
        ]}
      />
    </RequirePermission>
  );
}

"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { AssessmentBuilder, type BuilderValues } from "@/components/assessment/assessment-builder";
import { useSessionEditable } from "@/components/academic/session-banner";
import { useSchoolData } from "@/lib/queries";
import { useMyTeacher } from "@/lib/session";
import { useStore } from "@/lib/store";
import { publishAssessment } from "@/lib/actions";
import { uid } from "@/lib/helpers";
import type { Assessment } from "@/lib/types";

export default function NewAssessmentPage() {
  return (
    <Suspense>
      <Builder />
    </Suspense>
  );
}

/** Assignment / Quiz / Assessment builders (spec §64 screens 29–31). */
function Builder() {
  const params = useSearchParams();
  const router = useRouter();
  const d = useSchoolData();
  const teacher = useMyTeacher();
  const editable = useSessionEditable();
  const myCourses = d.courses.filter((c) => c.teacherId === teacher?.id);
  const editing = params.get("edit") ? d.byId.assessment.get(params.get("edit")!) : undefined;
  const type = (params.get("type") as Assessment["type"]) ?? "assignment";
  const courseParam = params.get("course");
  // Default due date: a week from when the builder opened, end of day.
  const [defaultDue] = useState(() => {
    const due = new Date(Date.now() + 7 * 86_400_000);
    due.setHours(23, 59, 0, 0);
    return due.toISOString();
  });

  if (!teacher) return <EmptyState title="Only teachers can create assessments" className="mt-8" />;
  if (!editable) return <EmptyState title="This session is closed" description="Switch to the active session to create assessments." className="mt-8" />;
  if (myCourses.length === 0) return <EmptyState title="You have no courses this session" className="mt-8" />;

  const initial: BuilderValues = editing
    ? { courseId: editing.courseId, title: editing.title, description: editing.description, type: editing.type, totalMarks: editing.totalMarks, durationMinutes: editing.durationMinutes, dueDate: editing.dueDate, questions: editing.questions }
    : { courseId: courseParam && myCourses.some((c) => c.id === courseParam) ? courseParam : myCourses.length === 1 ? myCourses[0]!.id : "", title: "", description: "", type, totalMarks: type === "quiz" ? 10 : type === "test" ? 50 : 20, durationMinutes: type === "quiz" ? 15 : type === "test" || type === "examination" ? 60 : undefined, dueDate: defaultDue, questions: [] };
  const label = { assignment: "Assignment", quiz: "Quiz", test: "Assessment", project: "Project", examination: "Examination" }[initial.type];

  return (
    <>
      <PageHeader title={editing ? `Edit ${editing.title}` : `Create ${label}`} breadcrumbs={[{ label: "Assessments", href: "/teacher/assessments" }, { label: editing ? "Edit" : "Create" }]} />
      <AssessmentBuilder
        key={editing?.id ?? type}
        courses={myCourses}
        initial={initial}
        lockedCourse={!!editing}
        sessionLabel={d.session.label}
        onCancel={() => router.back()}
        onSave={(v, publish) => {
          const st = useStore.getState();
          const course = d.byId.course.get(v.courseId)!;
          const status: Assessment["status"] = publish ? "published" : "draft";
          let saved: Assessment;
          if (editing) {
            saved = { ...editing, ...v, status };
            st.update("assessments", editing.id, { ...v, status });
          } else {
            saved = { id: uid("asm"), schoolId: course.schoolId, sessionId: course.sessionId, subjectId: course.subjectId, classId: course.classId, teacherId: course.teacherId, status, createdAt: new Date().toISOString(), ...v };
            st.insert("assessments", saved);
            st.audit({ schoolId: course.schoolId, action: "Assessment created", target: `${v.title} (${course.title})`, category: "assessment" });
          }
          if (publish) publishAssessment(saved);
          toast.success(publish ? "Published — students notified" : "Saved as draft");
          router.push(`/teacher/assessments/${saved.id}`);
        }}
      />
    </>
  );
}

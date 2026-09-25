"use client";

import { useParams } from "next/navigation";
import { RequirePermission } from "@/components/layout/app-shell";
import { CourseWorkspace } from "@/components/course/course-workspace";

export default function SchoolCoursePage() {
  const { id } = useParams<{ id: string }>();
  return (
    <RequirePermission perm="courses.view">
      <CourseWorkspace courseId={id} base="/school" />
    </RequirePermission>
  );
}

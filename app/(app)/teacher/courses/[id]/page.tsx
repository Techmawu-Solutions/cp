"use client";

import { useParams } from "next/navigation";
import { CourseWorkspace } from "@/components/course/course-workspace";

export default function TeacherCoursePage() {
  const { id } = useParams<{ id: string }>();
  return <CourseWorkspace courseId={id} base="/teacher" />;
}

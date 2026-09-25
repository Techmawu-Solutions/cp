"use client";

import { useParams } from "next/navigation";
import { AssessmentDetail } from "@/components/assessment/assessment-detail";

export default function TeacherAssessmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  return <AssessmentDetail id={id} base="/teacher" />;
}

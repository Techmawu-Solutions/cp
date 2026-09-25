"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/common/page-header";
import { SessionBanner } from "@/components/academic/session-banner";
import { StudentCourseGrid } from "@/components/course/student-course-grid";
import { useStudentData } from "@/lib/student";

export default function StudentLearningPage() {
  const s = useStudentData();
  return (
    <>
      <PageHeader title="Learning" description="Pick up where you left off in any subject." />
      <SessionBanner />
      <Card className="mb-4">
        <CardContent className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">Overall progress</span>
          <Progress value={s.overall} className="flex-1" />
          <span className="font-semibold tabular-nums">{s.overall.toFixed(0)}%</span>
        </CardContent>
      </Card>
      <StudentCourseGrid showContinue />
    </>
  );
}

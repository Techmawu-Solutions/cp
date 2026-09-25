"use client";

import { useState } from "react";
import { PageHeader } from "@/components/common/page-header";
import { AppSelect } from "@/components/common/app-select";
import { EmptyState } from "@/components/common/empty-state";
import { LinkButton } from "@/components/common/link-button";
import { ModuleList } from "@/components/course/module-list";
import { SessionBanner, useSessionEditable } from "@/components/academic/session-banner";
import { useTeacherData } from "@/lib/teacher";

/** Content Builder / Module Builder (spec §64 screens 27–28). */
export default function TeacherContentPage() {
  const t = useTeacherData();
  const editable = useSessionEditable();
  const [courseId, setCourseId] = useState("");
  const course = t.courses.find((c) => c.id === courseId) ?? t.courses[0];
  return (
    <>
      <PageHeader
        title="Content"
        description="Build modules and add lessons, videos, documents and external resources."
        actions={course && <LinkButton variant="outline" href={`/teacher/courses/${course.id}`}>Open course workspace</LinkButton>}
      />
      <SessionBanner />
      {!course ? (
        <EmptyState title="No courses assigned" />
      ) : (
        <>
          <AppSelect className="mb-4 sm:w-80" value={course.id} onChange={setCourseId} options={t.courses.map((c) => ({ value: c.id, label: c.title }))} />
          <ModuleList key={course.id} course={course} mode={editable ? "edit" : "view"} itemHref={(it) => `/teacher/courses/${course.id}/items/${it.id}`} />
        </>
      )}
    </>
  );
}

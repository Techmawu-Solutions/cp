"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { ContentViewer } from "@/components/course/content-viewer";
import { useStudentData } from "@/lib/student";
import { useStore } from "@/lib/store";

/** Lesson Viewer (spec §64 screen 37). */
export default function StudentLessonPage() {
  const { id, itemId } = useParams<{ id: string; itemId: string }>();
  const s = useStudentData();
  const course = s.courses.find((c) => c.id === id);
  const items = course ? s.itemsOf(course.id) : [];
  const idx = items.findIndex((i) => i.id === itemId);
  const item = items[idx];
  const studentId = s.student?.id;
  const completed = !!item && s.done.has(item.id);

  // Reading-type content counts as complete once opened; videos when they finish or are marked.
  useEffect(() => {
    if (item && studentId && !completed && ["link", "pdf", "ebook", "presentation", "file"].includes(item.type)) useStore.getState().completeContent(studentId, item.id);
  }, [item, studentId, completed]);

  if (!course || !item) return <EmptyState title="Lesson not available" description="It may be unpublished or belong to a subject you're not registered for." className="mt-8" />;
  const href = (i: { id: string }) => `/student/courses/${course.id}/lessons/${i.id}`;
  return (
    <>
      <PageHeader breadcrumbs={[{ label: course.title, href: `/student/courses/${course.id}` }, { label: `${idx + 1} of ${items.length}` }]} title="" className="mb-2" />
      <ContentViewer
        item={item}
        prev={items[idx - 1]}
        next={items[idx + 1]}
        hrefFor={href}
        completed={completed}
        onComplete={() => {
          if (!studentId || completed) return;
          useStore.getState().completeContent(studentId, item.id);
          toast.success("Marked as complete");
        }}
      />
    </>
  );
}

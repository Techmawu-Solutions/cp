"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { EmptyState } from "@/components/common/empty-state";
import { LinkButton } from "@/components/common/link-button";
import { ContentViewer } from "@/components/course/content-viewer";
import { useLearnCourse } from "@/components/learn/use-learn-course";
import { useStore } from "@/lib/store";
import { sectionPrefix, sectionTerm } from "@/lib/helpers";

/** One piece of course content in the learning area, with previous / next through the course. */
export default function LearnItemPage() {
  const { courseId, itemId } = useParams<{ courseId: string; itemId: string }>();
  const c = useLearnCourse(courseId);
  const idx = c?.items.findIndex((i) => i.id === itemId) ?? -1;
  const item = c?.items[idx];
  const studentId = c?.preview ? undefined : c?.student?.id;
  const completed = !!item && !!c?.done.has(item.id);

  // Reading-type content counts as complete once opened; videos when they finish or are marked.
  useEffect(() => {
    if (item && studentId && !completed && ["link", "pdf", "ebook", "presentation", "file"].includes(item.type)) useStore.getState().completeContent(studentId, item.id);
  }, [item, studentId, completed]);

  if (!c) return null;
  if (!item) return <EmptyState title="This item isn't available" description="It may have been hidden or moved by your teacher." action={<LinkButton href={`/learn/${courseId}`}>Back to course</LinkButton>} className="mt-8" />;
  const section = c.sections.find((m) => m.id === item.moduleId);
  const prefix = section ? sectionPrefix(sectionTerm(c.course), c.sections.indexOf(section), section.title) : null;

  return (
    <>
      <p className="mb-3 text-xs text-muted-foreground">
        {prefix && `${prefix} · `}
        {section?.title} · Item {idx + 1} of {c.items.length}
      </p>
      <ContentViewer
        item={item}
        prev={c.items[idx - 1]}
        next={c.items[idx + 1]}
        hrefFor={(i) => `/learn/${courseId}/${i.id}`}
        completed={completed}
        protect={!c.preview}
        onComplete={
          studentId
            ? () => {
                if (completed) return;
                useStore.getState().completeContent(studentId, item.id);
                toast.success("Marked as complete");
              }
            : undefined
        }
      />
    </>
  );
}

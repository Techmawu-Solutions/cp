"use client";

import { useParams } from "next/navigation";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { ContentViewer } from "@/components/course/content-viewer";
import { ScormResults } from "@/components/course/scorm-results";
import { LessonOutcomes } from "@/components/course/lesson-outcomes";
import { InteractiveVideoResults } from "@/components/interactive-video/interactive-video-results";
import { parseVideoUrl } from "@/lib/interactive-video/engine";
import { isLesson } from "@/lib/outcomes";
import { useStore } from "@/lib/store";
import { useSchoolData } from "@/lib/queries";

export function StaffItemPage({ base }: { base: "/teacher" | "/school" }) {
  const { id, itemId } = useParams<{ id: string; itemId: string }>();
  const d = useSchoolData();
  const modules = useStore((s) => s.modules);
  const contents = useStore((s) => s.contents);
  const course = d.byId.course.get(id);
  const item = contents.find((c) => c.id === itemId && c.courseId === id);
  if (!course || !item) return <EmptyState title="Content not found" />;
  const ordered = modules
    .filter((m) => m.courseId === id)
    .sort((a, b) => a.order - b.order)
    .flatMap((m) => contents.filter((c) => c.moduleId === m.id).sort((a, b) => a.order - b.order));
  const idx = ordered.findIndex((c) => c.id === itemId);
  const href = (i: { id: string }) => `${base}/courses/${id}/items/${i.id}`;
  return (
    <>
      <PageHeader breadcrumbs={[{ label: course.title, href: `${base}/courses/${id}?tab=content` }, { label: modules.find((m) => m.id === item.moduleId)?.title ?? "Module" }, { label: item.title }]} title="" className="mb-2" />
      <ContentViewer item={item} prev={ordered[idx - 1]} next={ordered[idx + 1]} hrefFor={href} />
      {item.type === "scorm" && item.scorm && <ScormResults item={item} />}
      {item.type === "video" && item.url && parseVideoUrl(item.url) && (
        <div className="mx-auto mt-6 max-w-4xl">
          <InteractiveVideoResults item={item} editHref={`${href(item)}/interactive`} />
        </div>
      )}
      {isLesson(item) && <LessonOutcomes item={item} />}
    </>
  );
}

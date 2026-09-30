import { levelCode, subjectCode } from "@/lib/mooc";
import type { ContentItem, CourseModule, LibraryMaterial, LibraryTopic, SchoolClass, Subject } from "@/lib/types";

/**
 * The ClassProject library (spec section 25.3): shared learning materials by
 * subject and level. Every class at a level that takes the subject sees the
 * published topics inside its own course, after the teacher's sections, so
 * the materials feel part of the class rather than a separate site.
 */

export const LIBRARY_LEVELS: { code: string; label: string; stage: "Basic School" | "JHS" | "SHS" }[] = [
  ...[1, 2, 3, 4, 5, 6].map((n) => ({ code: `BASIC${n}`, label: `Basic ${n}`, stage: "Basic School" as const })),
  ...[1, 2, 3].map((n) => ({ code: `JHS${n}`, label: `JHS ${n}`, stage: "JHS" as const })),
  ...[1, 2, 3].map((n) => ({ code: `SHS${n}`, label: `SHS ${n}`, stage: "SHS" as const })),
];

export const levelLabel = (code: string) => LIBRARY_LEVELS.find((l) => l.code === code)?.label ?? code;

/** The library's (subject, level) key for a class taking a subject, or null if the level isn't recognised. */
export function libraryKey(subject: Pick<Subject, "catalogueId" | "code"> | undefined, cls: Pick<SchoolClass, "level" | "name"> | undefined) {
  if (!subject || !cls) return null;
  const level = levelCode(cls.level) ?? levelCode(cls.name);
  return level ? { subjectCode: subjectCode(subject), level } : null;
}

/** Id prefix for library sections in a course, so they never collide with the course's own sections. */
export const LIBRARY_SECTION_PREFIX = "lib:";
export const isLibrarySection = (moduleId: string) => moduleId.startsWith(LIBRARY_SECTION_PREFIX);

/**
 * The published library topics and materials for a class, shaped as course
 * sections and items so the learning area shows them like the rest of the course.
 */
export function librarySectionsFor(
  key: { subjectCode: string; level: string } | null,
  courseId: string,
  topics: LibraryTopic[],
  materials: LibraryMaterial[],
): { sections: CourseModule[]; itemsBySection: Map<string, ContentItem[]> } {
  const sections: CourseModule[] = [];
  const itemsBySection = new Map<string, ContentItem[]>();
  if (!key) return { sections, itemsBySection };
  const own = topics.filter((t) => t.published && t.subjectCode === key.subjectCode && t.level === key.level).sort((a, b) => a.order - b.order);
  own.forEach((t, i) => {
    const moduleId = `${LIBRARY_SECTION_PREFIX}${t.id}`;
    const items = materials
      .filter((m) => m.topicId === t.id && m.published)
      .sort((a, b) => a.order - b.order)
      .map<ContentItem>((m) => ({ id: m.id, moduleId, courseId, type: m.type, title: m.title, description: m.description, body: m.body, url: m.url, fileName: m.fileName, fileSize: m.fileSize, durationMinutes: m.durationMinutes, order: m.order, published: true, createdAt: m.createdAt }));
    if (!items.length) return;
    sections.push({ id: moduleId, courseId, title: t.title, description: t.description, order: 10_000 + i, published: true });
    itemsBySection.set(moduleId, items);
  });
  return { sections, itemsBySection };
}

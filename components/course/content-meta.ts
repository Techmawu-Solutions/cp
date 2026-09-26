import { BookText, ClipboardCheck, CircleHelp, Download, FileText, Link2, NotebookPen, Presentation, Radio, Video, FileVideo, BookOpen } from "lucide-react";
import type { ContentType } from "@/lib/types";

/** Content types (spec §26). */
export const CONTENT_META: Record<ContentType, { label: string; icon: typeof BookText; color: string }> = {
  text: { label: "Text lesson", icon: BookText, color: "text-blue-600 dark:text-blue-400" },
  video: { label: "Video", icon: Video, color: "text-rose-600 dark:text-rose-400" },
  pdf: { label: "PDF", icon: FileText, color: "text-red-600 dark:text-red-400" },
  ebook: { label: "E-book", icon: BookOpen, color: "text-amber-700 dark:text-amber-400" },
  presentation: { label: "Presentation", icon: Presentation, color: "text-orange-600 dark:text-orange-400" },
  assignment: { label: "Assignment", icon: NotebookPen, color: "text-violet-600 dark:text-violet-400" },
  quiz: { label: "Quiz", icon: CircleHelp, color: "text-purple-600 dark:text-purple-400" },
  assessment: { label: "Assessment", icon: ClipboardCheck, color: "text-indigo-600 dark:text-indigo-400" },
  link: { label: "External link", icon: Link2, color: "text-teal-600 dark:text-teal-400" },
  file: { label: "File", icon: Download, color: "text-slate-600 dark:text-slate-400" },
  live: { label: "Live class", icon: Radio, color: "text-red-600 dark:text-red-400" },
  recording: { label: "Recorded class", icon: FileVideo, color: "text-sky-600 dark:text-sky-400" },
};

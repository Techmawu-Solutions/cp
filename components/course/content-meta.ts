import { BookText, ClipboardCheck, CircleHelp, File, FileImage, FileSpreadsheet, FileText, FileType, Link2, NotebookPen, Presentation, Radio, Video, FileVideo, Package } from "lucide-react";
import { documentKind } from "@/lib/document-kind";
import type { ContentItem, ContentType } from "@/lib/types";

/** Content types (spec section 26). */
export const CONTENT_META: Record<ContentType, { label: string; icon: typeof BookText; color: string }> = {
  text: { label: "Text lesson", icon: BookText, color: "text-blue-600 dark:text-blue-400" },
  video: { label: "Video", icon: Video, color: "text-rose-600 dark:text-rose-400" },
  document: { label: "Document", icon: FileText, color: "text-red-600 dark:text-red-400" },
  assignment: { label: "Assignment", icon: NotebookPen, color: "text-violet-600 dark:text-violet-400" },
  quiz: { label: "Quiz", icon: CircleHelp, color: "text-purple-600 dark:text-purple-400" },
  assessment: { label: "Assessment", icon: ClipboardCheck, color: "text-indigo-600 dark:text-indigo-400" },
  link: { label: "External link", icon: Link2, color: "text-teal-600 dark:text-teal-400" },
  live: { label: "Live class", icon: Radio, color: "text-red-600 dark:text-red-400" },
  recording: { label: "Recorded class", icon: FileVideo, color: "text-sky-600 dark:text-sky-400" },
  scorm: { label: "SCORM package", icon: Package, color: "text-emerald-600 dark:text-emerald-400" },
};

type Meta = (typeof CONTENT_META)[ContentType];

/** How each kind of document is labelled; the kind comes from the file (lib/document-kind.ts). */
const DOCUMENT_META: Record<ReturnType<typeof documentKind>, Meta> = {
  pdf: { label: "PDF", icon: FileText, color: "text-red-600 dark:text-red-400" },
  docx: { label: "Word document", icon: FileType, color: "text-blue-700 dark:text-blue-400" },
  pptx: { label: "Slides", icon: Presentation, color: "text-orange-600 dark:text-orange-400" },
  sheet: { label: "Spreadsheet", icon: FileSpreadsheet, color: "text-emerald-700 dark:text-emerald-400" },
  csv: { label: "Spreadsheet", icon: FileSpreadsheet, color: "text-emerald-700 dark:text-emerald-400" },
  image: { label: "Image", icon: FileImage, color: "text-sky-600 dark:text-sky-400" },
  text: { label: "Text file", icon: FileText, color: "text-slate-600 dark:text-slate-400" },
  unsupported: { label: "Document", icon: File, color: "text-slate-600 dark:text-slate-400" },
};

/** An item's label and icon: for documents, the kind of file (PDF, Slides, Word document…). */
export function contentMeta(item: Pick<ContentItem, "type"> & Partial<Pick<ContentItem, "fileName" | "url">>): Meta {
  if (item.type !== "document") return CONTENT_META[item.type];
  return DOCUMENT_META[documentKind(item.fileName || item.url || "")];
}

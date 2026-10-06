/**
 * What kind of document a file is, from its name. The in-platform viewer
 * (components/media/document-viewer.tsx) shows each kind; uploads accept only
 * these (spec section 26). Slides (.pptx) are converted to PDF on upload in
 * production; the prototype asks for a PDF copy.
 */
export type DocumentKind = "pdf" | "docx" | "pptx" | "sheet" | "csv" | "image" | "text" | "unsupported";

export function documentKind(name: string): DocumentKind {
  const ext = name.toLowerCase().split("?")[0]!.split(".").pop() ?? "";
  if (ext === "pdf") return "pdf";
  if (ext === "docx") return "docx";
  if (ext === "pptx") return "pptx";
  if (ext === "xlsx") return "sheet";
  if (ext === "csv") return "csv";
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) return "image";
  if (["txt", "md"].includes(ext)) return "text";
  return "unsupported";
}

/** The file picker's accept list: every format the viewer can show. */
export const DOCUMENT_ACCEPT = ".pdf,.docx,.pptx,.xlsx,.csv,.png,.jpg,.jpeg,.gif,.webp,.svg,.txt,.md";

"use client";

import { useRef, useState } from "react";
import { BookText, FileText, FileUp, ImageIcon, Loader2, MonitorUp, Presentation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { imageBackground, openPdf, pdfBackgrounds } from "@/components/classroom/pdf-import";
import { cn } from "@/lib/utils";
import type { PageBackground } from "@/lib/types";

export interface CourseFile {
  title: string;
  url: string;
  fileName: string;
}

type Picked = { name: string; kind: "pdf"; doc: Awaited<ReturnType<typeof openPdf>>; pages: number } | { name: string; kind: "image"; source: Blob | string };

const isPdf = (name: string) => /\.pdf$/i.test(name);
const isImage = (name: string) => /\.(png|jpe?g|gif|webp)$/i.test(name);

export interface CourseLesson {
  id: string;
  title: string;
  body: string;
}

/**
 * Put a PDF or picture on the whiteboard to write on it (spec section 32): upload a
 * file or pick a PDF from the course; choose pages and how portrait pages fit.
 *
 * In "present" mode (spec section 32.2) it is the Present picker: a lesson from the
 * course, a course document, or a PDF/picture from the computer — shown to the
 * class straight away on the board, where the teacher can write on it, point
 * with the laser and everyone can zoom.
 */
export function DocImportDialog({
  open,
  onOpenChange,
  courseFiles,
  onImport,
  mode = "annotate",
  lessons = [],
  onPresentLesson,
  onShareScreen,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  courseFiles: CourseFile[];
  onImport: (backgrounds: PageBackground[], keepPrivate: boolean) => void;
  mode?: "annotate" | "present";
  lessons?: CourseLesson[];
  onPresentLesson?: (lesson: CourseLesson) => void;
  onShareScreen?: () => void;
}) {
  const presenting = mode === "present";
  const [picked, setPicked] = useState<Picked | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [from, setFrom] = useState("1");
  const [to, setTo] = useState("1");
  // Presenting shows whole pages to the class at once; annotating defaults to private halves.
  const [split, setSplit] = useState(!presenting);
  const [keepPrivate, setKeepPrivate] = useState(!presenting);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const reset = () => {
    setPicked(null);
    setError(null);
    setProgress(null);
    setLoading(null);
  };

  const pick = async (name: string, source: Blob | string) => {
    setError(null);
    if (isImage(name) || (source instanceof Blob && source.type.startsWith("image/"))) {
      setPicked({ name, kind: "image", source });
      return;
    }
    if (!isPdf(name) && !(source instanceof Blob && source.type === "application/pdf")) {
      setError("Choose a PDF or a picture (PNG, JPG, GIF or WebP).");
      return;
    }
    setLoading(`Opening ${name}…`);
    try {
      const doc = await openPdf(typeof source === "string" ? source : await source.arrayBuffer());
      setPicked({ name, kind: "pdf", doc, pages: doc.numPages });
      setFrom("1");
      setTo(String(Math.min(doc.numPages, 20)));
    } catch {
      setError(`${name} couldn't be opened as a PDF.`);
    } finally {
      setLoading(null);
    }
  };

  const range = picked?.kind === "pdf" ? { a: Number(from), b: Number(to) } : null;
  const rangeProblem = picked?.kind === "pdf" && range ? (!range.a || !range.b ? "Enter the pages to use." : range.a < 1 || range.b > picked.pages || range.a > range.b ? `Choose pages between 1 and ${picked.pages}.` : range.b - range.a + 1 > 40 ? "Up to 40 pages at a time." : null) : null;

  const run = async () => {
    if (!picked || rangeProblem) return;
    setLoading("Preparing pages…");
    try {
      const backgrounds =
        picked.kind === "pdf"
          ? await pdfBackgrounds(picked.doc, { from: range!.a, to: range!.b, split, name: picked.name, onProgress: (done, total) => setProgress({ done, total }) })
          : [await imageBackground(picked.source, picked.name)];
      onImport(backgrounds, keepPrivate);
      onOpenChange(false);
      reset();
    } catch {
      setError("Something went wrong preparing the pages. Try again or choose another file.");
      setLoading(null);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {presenting ? <Presentation className="size-5" /> : <FileUp className="size-5" />} {presenting ? "Present" : "Write on a PDF or picture"}
          </DialogTitle>
          <DialogDescription>
            {presenting
              ? "Choose what to show the class. It opens on the board: turn pages, write and highlight on it, point with the laser, and everyone can zoom in."
              : "Each PDF page becomes a whiteboard page you can write, highlight and draw on. The document stays underneath — the eraser only removes your writing."}
          </DialogDescription>
        </DialogHeader>

        {!picked ? (
          <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
            {presenting && lessons.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">A lesson from this course</p>
                <ul className="max-h-40 space-y-1 overflow-y-auto">
                  {lessons.map((l) => (
                    <li key={l.id}>
                      <button
                        type="button"
                        onClick={() => {
                          onPresentLesson?.(l);
                          onOpenChange(false);
                        }}
                        className="flex w-full items-center gap-2 rounded-md border px-2.5 py-2 text-left text-sm hover:bg-muted"
                      >
                        <BookText className="size-4 shrink-0 text-blue-600" />
                        <span className="min-w-0 flex-1 truncate">{l.title}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">Text lesson</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <button type="button" onClick={() => input.current?.click()} disabled={!!loading} className="flex w-full flex-col items-center gap-1.5 rounded-xl border-2 border-dashed p-6 text-sm hover:bg-muted/50">
              {loading ? <Loader2 className="size-6 animate-spin text-muted-foreground" /> : <FileUp className="size-6 text-muted-foreground" />}
              <span className="font-medium">{loading ?? (presenting ? "Choose a file from your computer" : "Upload a PDF or picture")}</span>
              <span className="text-xs text-muted-foreground">PDF, JPG, PNG, GIF or WebP — e.g. slides saved as PDF, a worksheet, past question or photo of a textbook page</span>
            </button>
            <input
              ref={input}
              type="file"
              accept="application/pdf,.pdf,image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void pick(f.name, f);
                e.target.value = "";
              }}
            />
            {courseFiles.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">{presenting ? "A document from this course" : "Or use a document from this course"}</p>
                <ul className="max-h-48 space-y-1 overflow-y-auto">
                  {courseFiles.map((f) => (
                    <li key={f.url}>
                      <button type="button" disabled={!!loading} onClick={() => void pick(f.fileName, f.url)} className="flex w-full items-center gap-2 rounded-md border px-2.5 py-2 text-left text-sm hover:bg-muted">
                        {isPdf(f.fileName) ? <FileText className="size-4 shrink-0 text-red-600" /> : <ImageIcon className="size-4 shrink-0 text-blue-600" />}
                        <span className="min-w-0 flex-1 truncate">{f.title}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">{f.fileName}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {presenting && (
              <div className="rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
                <p>
                  <span className="font-medium text-foreground">PowerPoint, Word or Excel?</span> Save or export it as PDF first (File → Save as → PDF) to present it here with page turning, pen and laser — or share your screen to show it in its own app.
                </p>
                {onShareScreen && (
                  <Button
                    size="xs"
                    variant="outline"
                    className="mt-2"
                    onClick={() => {
                      onOpenChange(false);
                      onShareScreen();
                    }}
                  >
                    <MonitorUp /> Share my screen instead
                  </Button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-2">
              {picked.kind === "pdf" ? <FileText className="size-4 text-red-600" /> : <ImageIcon className="size-4 text-blue-600" />}
              <span className="min-w-0 flex-1 truncate font-medium">{picked.name}</span>
              {picked.kind === "pdf" && <span className="text-xs text-muted-foreground">{picked.pages} pages</span>}
              <Button size="xs" variant="ghost" onClick={reset} disabled={!!loading}>
                Change
              </Button>
            </div>
            {picked.kind === "pdf" && (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <span>Pages</span>
                  <Input numeric="integer" value={from} onChange={(e) => setFrom(e.target.value)} className="w-16" aria-label="From page" />
                  <span>to</span>
                  <Input numeric="integer" value={to} onChange={(e) => setTo(e.target.value)} className="w-16" aria-label="To page" />
                  <Button size="xs" variant="ghost" onClick={() => (setFrom("1"), setTo(String(Math.min(picked.pages, 40))))}>
                    All
                  </Button>
                </div>
                {rangeProblem && <p className="text-xs text-destructive">{rangeProblem}</p>}
                <div>
                  <p className="mb-1.5">Portrait (tall) pages</p>
                  <div className="grid grid-cols-2 gap-1 rounded-md bg-muted p-0.5 text-xs">
                    {(
                      [
                        [true, "Top and bottom halves", "Bigger and easier to write on"],
                        [false, "Whole page", "The full page on one board"],
                      ] as const
                    ).map(([v, label, hint]) => (
                      <button key={label} type="button" onClick={() => setSplit(v)} className={cn("rounded px-2 py-1.5 text-left", split === v ? "bg-background shadow-sm" : "text-muted-foreground")} aria-pressed={split === v}>
                        <span className="block font-medium">{label}</span>
                        <span className="block text-[11px] text-muted-foreground">{hint}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
            <label className="flex items-start gap-2">
              <Checkbox checked={keepPrivate} onCheckedChange={(c) => setKeepPrivate(!!c)} className="mt-0.5" />
              <span>
                Keep the new pages private <span className="block text-xs text-muted-foreground">Students stay on the page they see now until you show one — useful to prepare before revealing.</span>
              </span>
            </label>
            {progress && (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" /> Preparing page {progress.done} of {progress.total}…
              </p>
            )}
          </div>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!picked || !!rangeProblem || !!loading} onClick={() => void run()}>
            {loading && picked ? <Loader2 className="animate-spin" /> : presenting ? <Presentation /> : <FileUp />} {presenting ? "Present" : "Put on the board"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

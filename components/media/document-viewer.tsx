"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Download, FileWarning, Loader2, Maximize, Minimize, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Kind = "pdf" | "docx" | "pptx" | "sheet" | "csv" | "image" | "text" | "unsupported";

export function documentKind(name: string): Kind {
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

/**
 * In-platform document viewer: PDFs (rendered page by page with pdf.js),
 * Word and Excel files, images and text all open inside
 * ClassProject instead of the browser's viewer or a download. Downloading is
 * offered only when `allowDownload` is set; pages are drawn as images, so
 * students can't save or copy them from the viewer.
 */
export function DocumentViewer({ url, fileName, allowDownload, className }: { url: string; fileName: string; allowDownload?: boolean; className?: string }) {
  const kind = documentKind(fileName || url);
  const frame = useRef<HTMLDivElement>(null);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const on = () => setFullscreen(document.fullscreenElement === frame.current);
    document.addEventListener("fullscreenchange", on);
    return () => document.removeEventListener("fullscreenchange", on);
  }, []);

  const toggleFullscreen = () => (document.fullscreenElement ? document.exitFullscreen() : frame.current?.requestFullscreen?.());
  const download = allowDownload ? (
    <a href={url} download={fileName} className="inline-flex h-7 shrink-0 items-center gap-1 rounded-md px-2 text-xs font-medium hover:bg-muted" aria-label="Download" title="Download">
      <Download className="size-3.5" /> <span className="hidden sm:inline">Download</span>
    </a>
  ) : null;
  const extras = (
    <>
      {download}
      <Button type="button" variant="ghost" size="icon-xs" onClick={toggleFullscreen} aria-label={fullscreen ? "Exit full screen" : "Full screen"} title={fullscreen ? "Exit full screen" : "Full screen"}>
        {fullscreen ? <Minimize /> : <Maximize />}
      </Button>
    </>
  );

  return (
    <div
      ref={frame}
      className={cn("flex flex-col overflow-hidden rounded-xl border bg-muted/40", fullscreen ? "h-dvh rounded-none" : "h-[78vh]", className)}
      onContextMenu={(e) => !allowDownload && e.preventDefault()}
    >
      {kind === "pdf" ? (
        <PdfView url={url} extras={extras} />
      ) : (
        <>
          <div className="flex h-10 shrink-0 items-center gap-2 border-b bg-card px-3 text-sm">
            <span className="min-w-0 flex-1 truncate font-medium">{fileName}</span>
            {extras}
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            {kind === "docx" && <DocxView url={url} />}
            {kind === "pptx" && <PptxView canDownload={!!allowDownload} />}
            {(kind === "sheet" || kind === "csv") && <SheetView url={url} csv={kind === "csv"} />}
            {kind === "image" && (
              // eslint-disable-next-line @next/next/no-img-element -- user-uploaded file
              <img src={url} alt={fileName} draggable={false} className="mx-auto max-h-full max-w-full object-contain p-4" />
            )}
            {kind === "text" && <TextView url={url} />}
            {kind === "unsupported" && <Unsupported fileName={fileName} canDownload={!!allowDownload} />}
          </div>
        </>
      )}
    </div>
  );
}

function Loading() {
  return (
    <div className="flex h-full min-h-40 items-center justify-center text-muted-foreground">
      <Loader2 className="size-6 animate-spin" />
    </div>
  );
}

function Failed({ message }: { message: string }) {
  return (
    <div className="flex h-full min-h-40 flex-col items-center justify-center gap-2 p-6 text-center text-sm text-muted-foreground">
      <FileWarning className="size-8" />
      {message}
    </div>
  );
}

function Unsupported({ fileName, canDownload }: { fileName: string; canDownload: boolean }) {
  return <Failed message={`${fileName} can't be previewed in the browser.${canDownload ? " Use Download to open it on your device." : " Ask your teacher to upload it as a PDF."}`} />;
}

/** Loads a file as bytes, tracking loading and error state. */
function useFileBytes(url: string) {
  const [state, setState] = useState<{ url: string; data?: ArrayBuffer; error?: boolean }>({ url });
  useEffect(() => {
    let live = true;
    fetch(url)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
      .then((data) => live && setState({ url, data }))
      .catch(() => live && setState({ url, error: true }));
    return () => {
      live = false;
    };
  }, [url]);
  return state.url === url ? state : { url };
}

// ---------------------------------------------------------------- PDF

type PdfDoc = import("pdfjs-dist").PDFDocumentProxy;

function PdfView({ url, extras }: { url: string; extras: React.ReactNode }) {
  const [doc, setDoc] = useState<{ url: string; pdf?: PdfDoc; error?: boolean }>({ url });
  const [zoom, setZoom] = useState(1);
  const [page, setPage] = useState(1);
  const scroller = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    let live = true;
    let loaded: PdfDoc | undefined;
    (async () => {
      try {
        // The legacy build supports older phone browsers still common among students.
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url).toString();
        loaded = await pdfjs.getDocument({ url }).promise;
        if (live) setDoc({ url, pdf: loaded });
      } catch {
        if (live) setDoc({ url, error: true });
      }
    })();
    return () => {
      live = false;
      void loaded?.loadingTask.destroy();
    };
  }, [url]);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pdf = doc.url === url ? doc.pdf : undefined;
  const pages = pdf?.numPages ?? 0;
  const goTo = (n: number) => {
    const target = scroller.current?.querySelector(`[data-page="${n}"]`);
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top;
    const nodes = [...el.querySelectorAll<HTMLElement>("[data-page]")];
    const current = nodes.find((n) => n.getBoundingClientRect().bottom > top + 40);
    if (current) setPage(Number(current.dataset.page));
  };

  return (
    <>
      <div className="flex h-10 shrink-0 items-center gap-1 overflow-x-auto border-b bg-card px-2 text-sm [scrollbar-width:none]">
        <Button type="button" variant="ghost" size="icon-xs" disabled={page <= 1} onClick={() => goTo(page - 1)} aria-label="Previous page">
          <ChevronLeft />
        </Button>
        <span className="min-w-12 shrink-0 text-center text-xs tabular-nums sm:min-w-16">{pages ? `${page} / ${pages}` : "…"}</span>
        <Button type="button" variant="ghost" size="icon-xs" disabled={page >= pages} onClick={() => goTo(page + 1)} aria-label="Next page">
          <ChevronRight />
        </Button>
        <span className="mx-1 h-5 w-px bg-border" />
        <Button type="button" variant="ghost" size="icon-xs" disabled={zoom <= 0.5} onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))} aria-label="Zoom out">
          <ZoomOut />
        </Button>
        <button type="button" className="min-w-11 shrink-0 rounded px-1 text-xs tabular-nums hover:bg-muted" onClick={() => setZoom(1)} title="Fit to width">
          {Math.round(zoom * 100)}%
        </button>
        <Button type="button" variant="ghost" size="icon-xs" disabled={zoom >= 3} onClick={() => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))} aria-label="Zoom in">
          <ZoomIn />
        </Button>
        <span className="flex-1" />
        {extras}
      </div>
      <div ref={scroller} onScroll={onScroll} className="min-h-0 flex-1 overflow-auto">
        {doc.url === url && doc.error ? (
          <Failed message="This PDF couldn't be opened." />
        ) : !pdf || !width ? (
          <Loading />
        ) : (
          <div className="flex flex-col items-center gap-3 p-3">
            {Array.from({ length: pages }, (_, i) => (
              <PdfPage key={i} pdf={pdf} n={i + 1} width={Math.max(200, (width - 24) * zoom)} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

/** One PDF page, rendered to a canvas when it scrolls near the viewport. */
function PdfPage({ pdf, n, width }: { pdf: PdfDoc; n: number; width: number }) {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [ratio, setRatio] = useState(1.414);
  const [visible, setVisible] = useState(n <= 2);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e?.isIntersecting && setVisible(true), { rootMargin: "600px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    let task: { cancel: () => void } | undefined;
    let live = true;
    (async () => {
      const page = await pdf.getPage(n);
      const base = page.getViewport({ scale: 1 });
      if (!live) return;
      setRatio(base.height / base.width);
      const dpr = window.devicePixelRatio || 1;
      const viewport = page.getViewport({ scale: (width / base.width) * dpr });
      const c = canvas.current;
      if (!c) return;
      c.width = viewport.width;
      c.height = viewport.height;
      const t = page.render({ canvas: c, viewport });
      task = t;
      await t.promise.catch(() => {});
    })();
    return () => {
      live = false;
      task?.cancel();
    };
  }, [pdf, n, width, visible]);

  return (
    <div ref={box} data-page={n} className="bg-white shadow-sm" style={{ width, height: width * ratio }}>
      <canvas ref={canvas} className="block size-full select-none" aria-label={`Page ${n}`} />
    </div>
  );
}

// ---------------------------------------------------------------- Office & text

function DocxView({ url }: { url: string }) {
  const file = useFileBytes(url);
  const body = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!file.data || !body.current) return;
    const el = body.current;
    import("docx-preview")
      .then(({ renderAsync }) => renderAsync(file.data, el, undefined, { inWrapper: true, ignoreLastRenderedPageBreak: true, className: "docx" }))
      .catch(() => setError(true));
    return () => {
      el.innerHTML = "";
    };
  }, [file.data]);
  if (file.error || error) return <Failed message="This Word document couldn't be opened." />;
  return (
    <>
      {!file.data && <Loading />}
      <div ref={body} className="docx-host select-none [&_.docx-wrapper]:bg-transparent [&_.docx-wrapper]:p-4" />
    </>
  );
}

/** PowerPoint files are converted to PDF when uploaded in production; the prototype can't convert them in the browser. */
function PptxView({ canDownload }: { canDownload: boolean }) {
  return <Failed message={`Presentations open here once they're converted to PDF, which production does automatically on upload. In this demo, upload slides as a PDF (File → Save as PDF in PowerPoint).${canDownload ? " You can still download the original." : ""}`} />;
}

function SheetView({ url, csv }: { url: string; csv: boolean }) {
  const file = useFileBytes(url);
  const [sheets, setSheets] = useState<{ name: string; rows: string[][] }[] | null>(null);
  const [active, setActive] = useState(0);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!file.data) return;
    const data = file.data;
    (async () => {
      if (csv) {
        const Papa = (await import("papaparse")).default;
        const parsed = Papa.parse<string[]>(new TextDecoder().decode(data), { skipEmptyLines: true });
        setSheets([{ name: "Sheet 1", rows: parsed.data }]);
      } else {
        const { default: readXlsxFile } = await import("read-excel-file/browser");
        const all = await readXlsxFile(new Blob([data]));
        setSheets(all.map((s) => ({ name: s.sheet, rows: s.data.map((r) => r.map((c) => (c == null ? "" : c instanceof Date ? c.toLocaleDateString() : String(c)))) })));
      }
    })().catch(() => setError(true));
  }, [file.data, csv]);
  if (file.error || error) return <Failed message="This spreadsheet couldn't be opened." />;
  if (!sheets) return <Loading />;
  const sheet = sheets[active] ?? sheets[0];
  return (
    <div className="flex h-full flex-col">
      {sheets.length > 1 && (
        <div className="flex shrink-0 gap-1 overflow-x-auto border-b bg-card px-2 py-1">
          {sheets.map((s, i) => (
            <button key={s.name} type="button" onClick={() => setActive(i)} className={cn("rounded px-2 py-1 text-xs whitespace-nowrap", i === active ? "bg-primary/10 font-medium text-primary" : "hover:bg-muted")}>
              {s.name}
            </button>
          ))}
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-auto bg-card">
        <table className="border-collapse text-xs">
          <tbody>
            {sheet?.rows.map((r, i) => (
              <tr key={i} className={i === 0 ? "bg-muted font-medium" : undefined}>
                <td className="sticky left-0 border bg-muted px-2 text-right text-muted-foreground tabular-nums">{i + 1}</td>
                {r.map((c, j) => (
                  <td key={j} className="border px-2 py-1 whitespace-nowrap">
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TextView({ url }: { url: string }) {
  const file = useFileBytes(url);
  if (file.error) return <Failed message="This file couldn't be opened." />;
  if (!file.data) return <Loading />;
  return <pre className="p-4 font-mono text-sm whitespace-pre-wrap">{new TextDecoder().decode(file.data)}</pre>;
}

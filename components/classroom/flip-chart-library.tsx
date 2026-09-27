"use client";

import { useState } from "react";
import { BookPlus, Copy, FileDown, MoreVertical, NotebookPen, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { AppSelect } from "@/components/common/app-select";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { PageThumb } from "@/components/classroom/page-thumb";
import { downloadFlipChartPdf, flipChartImages } from "@/components/classroom/flip-chart-files";
import { addBoardImagesToCourse, duplicateFlipChart } from "@/lib/actions";
import { useStore } from "@/lib/store";
import { fmtAgo } from "@/lib/helpers";
import type { Course, FlipChart } from "@/lib/types";

/**
 * A teacher's saved flip charts (spec §32): look through the pages, rename,
 * duplicate, download as PDF, add to a course or delete. They're opened in a
 * live class from the whiteboard's Flip chart menu.
 */
export function FlipChartLibrary({ courses }: { courses: Course[] }) {
  const userId = useStore((s) => s.userId);
  const all = useStore((s) => s.flipCharts);
  const subjects = useStore((s) => s.subjects);
  const classes = useStore((s) => s.classes);
  const charts = all.filter((f) => f.ownerUserId === userId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const [viewing, setViewing] = useState<FlipChart | null>(null);
  const [renaming, setRenaming] = useState<FlipChart | null>(null);
  const [toCourse, setToCourse] = useState<FlipChart | null>(null);
  const [deleting, setDeleting] = useState<FlipChart | null>(null);

  if (charts.length === 0)
    return <EmptyState icon={NotebookPen} title="No saved flip charts yet" description="In a live class, open the whiteboard and choose Flip chart → Save. Saved flip charts can be opened again in any class, added to a course or downloaded as PDF." />;

  return (
    <>
      <p className="mb-3 text-sm text-muted-foreground">Whiteboard pages you&apos;ve saved. Open one in a live class from the whiteboard&apos;s <strong>Flip chart</strong> menu — the pages stay editable.</p>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {charts.map((c) => (
          <Card key={c.id} className="overflow-hidden pt-0">
            <button type="button" onClick={() => setViewing(c)} className="block border-b" aria-label={`View ${c.title}`}>
              <PageThumb strokes={c.pages[0]?.strokes ?? []} background={c.pages[0]?.background} />
            </button>
            <CardContent className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{c.title}</p>
                <p className="text-xs text-muted-foreground">
                  {c.pages.length} page{c.pages.length === 1 ? "" : "s"} · {subjects.find((x) => x.id === c.subjectId)?.name ?? "No subject"} · saved {fmtAgo(c.updatedAt)}
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button size="icon-sm" variant="ghost" aria-label={`Actions for ${c.title}`} />}>
                  <MoreVertical />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem onClick={() => setViewing(c)}>
                    <NotebookPen /> View pages
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setRenaming(c)}>
                    <Pencil /> Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => (duplicateFlipChart(c.id), toast.success(`Copied “${c.title}”`))}>
                    <Copy /> Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void downloadFlipChartPdf(c.pages, c.title).then((n) => toast.success(`Downloaded ${n} page${n === 1 ? "" : "s"} as PDF`))}>
                    <FileDown /> Download as PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setToCourse(c)}>
                    <BookPlus /> Add to a course…
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={() => setDeleting(c)}>
                    <Trash2 /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardContent>
          </Card>
        ))}
      </div>

      {viewing && (
        <Dialog open onOpenChange={(o) => !o && setViewing(null)}>
          <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>{viewing.title}</DialogTitle>
              <DialogDescription>
                {viewing.pages.length} page{viewing.pages.length === 1 ? "" : "s"}. Open it in a live class from the whiteboard to present or keep editing.
              </DialogDescription>
            </DialogHeader>
            <div className="grid max-h-[65dvh] gap-3 overflow-y-auto sm:grid-cols-2">
              {viewing.pages.map((p, i) => (
                <figure key={p.id} className="overflow-hidden rounded-lg border">
                  <PageThumb strokes={p.strokes} background={p.background} />
                  <figcaption className="border-t px-2 py-1 text-xs text-muted-foreground">Page {i + 1}</figcaption>
                </figure>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {renaming && <RenameDialog chart={renaming} onClose={() => setRenaming(null)} />}
      {toCourse && <AddToCourseDialog chart={toCourse} courses={courses} label={(c) => `${classes.find((x) => x.id === c.classId)?.name ?? ""} — ${subjects.find((x) => x.id === c.subjectId)?.name ?? c.title}`} onClose={() => setToCourse(null)} />}
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete “${deleting?.title}”?`}
        description="The saved flip chart is removed. Pages already added to courses stay there."
        destructive
        confirmLabel="Delete"
        onConfirm={() => {
          if (deleting) useStore.getState().remove("flipCharts", deleting.id);
          toast.message("Flip chart deleted");
          setDeleting(null);
        }}
      />
    </>
  );
}

function RenameDialog({ chart, onClose }: { chart: FlipChart; onClose: () => void }) {
  const [title, setTitle] = useState(chart.title);
  const save = () => {
    if (!title.trim()) return;
    useStore.getState().update("flipCharts", chart.id, { title: title.trim(), updatedAt: new Date().toISOString() });
    onClose();
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Rename flip chart</DialogTitle>
        </DialogHeader>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus onKeyDown={(e) => e.key === "Enter" && save()} aria-label="Name" />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!title.trim()} onClick={save}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddToCourseDialog({ chart, courses, label, onClose }: { chart: FlipChart; courses: Course[]; label: (c: Course) => string; onClose: () => void }) {
  const [courseId, setCourseId] = useState(courses.find((c) => c.subjectId === chart.subjectId)?.id ?? courses[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add “{chart.title}” to a course</DialogTitle>
          <DialogDescription>Each page is added as an image to the course&apos;s latest section, for students to look back at.</DialogDescription>
        </DialogHeader>
        {courses.length ? <AppSelect value={courseId} onChange={setCourseId} options={courses.map((c) => ({ value: c.id, label: label(c) }))} aria-label="Course" /> : <p className="text-sm text-muted-foreground">You don&apos;t teach any courses this session.</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!courseId || busy}
            onClick={async () => {
              setBusy(true);
              const images = await flipChartImages(chart.pages);
              const n = addBoardImagesToCourse(courseId, chart.title, images);
              toast.success(`${n} page${n === 1 ? "" : "s"} added to the course`);
              onClose();
            }}
          >
            <BookPlus /> Add to course
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState } from "react";
import { BookPlus, ChevronDown, FileDown, FolderOpen, NotebookPen, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { PageThumb } from "@/components/classroom/page-thumb";
import { useStore } from "@/lib/store";
import { fmtAgo } from "@/lib/helpers";
import { cn } from "@/lib/utils";
import type { BoardPage, FlipChart } from "@/lib/types";

export interface FlipChartActions {
  /** The saved flip chart this board came from, if any. */
  chart: { id: string; title: string } | null;
  pages: BoardPage[];
  defaultTitle: string;
  onSave: (title: string, asNew: boolean) => void;
  onOpen: (chart: FlipChart, opts: { replace: boolean; keepPrivate: boolean }) => void;
  onAddToCourse: () => void;
  onDownloadPdf: () => void;
}

/**
 * The whiteboard's Flip chart menu (spec §32): save the pages for reuse,
 * open a saved flip chart, add the pages to the course now, or download a PDF.
 */
export function FlipChartMenu({ actions }: { actions: FlipChartActions }) {
  const [saving, setSaving] = useState(false);
  const [opening, setOpening] = useState(false);
  const hasContent = actions.pages.some((p) => p.strokes.length > 0);
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-1 rounded-md px-1.5 py-1 text-xs outline-none hover:bg-slate-700" aria-label="Flip chart" title="Save, open or download the flip chart">
          <NotebookPen className="size-4" /> <span className="max-w-28 truncate max-sm:hidden">{actions.chart?.title ?? "Flip chart"}</span> <ChevronDown className="size-3" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuGroup>
            <DropdownMenuLabel>{actions.chart ? `Flip chart: ${actions.chart.title}` : "Flip chart"}</DropdownMenuLabel>
            <DropdownMenuItem disabled={!hasContent} onClick={() => setSaving(true)}>
              <Save /> {actions.chart ? "Save changes…" : "Save flip chart…"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setOpening(true)}>
              <FolderOpen /> Open a saved flip chart…
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled={!hasContent} onClick={actions.onAddToCourse}>
            <BookPlus /> Add pages to the course now
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!hasContent} onClick={actions.onDownloadPdf}>
            <FileDown /> Download as PDF
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {saving && <SaveDialog actions={actions} onClose={() => setSaving(false)} />}
      {opening && <OpenDialog actions={actions} onClose={() => setOpening(false)} />}
    </>
  );
}

function SaveDialog({ actions, onClose }: { actions: FlipChartActions; onClose: () => void }) {
  const [title, setTitle] = useState(actions.chart?.title ?? actions.defaultTitle);
  const pages = actions.pages.filter((p) => p.strokes.length > 0).length;
  const save = (asNew: boolean) => {
    if (!title.trim()) return;
    actions.onSave(title, asNew);
    onClose();
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{actions.chart ? "Save changes to your flip chart" : "Save flip chart"}</DialogTitle>
          <DialogDescription>
            Keeps all {pages} page{pages === 1 ? "" : "s"} (private ones included) as editable pages in <strong>Live Classes → Flip charts</strong>, so you can open them in another class and carry on. Empty pages aren&apos;t saved.
          </DialogDescription>
        </DialogHeader>
        <label className="space-y-1.5 text-sm">
          <span className="font-medium">Name</span>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus onKeyDown={(e) => e.key === "Enter" && save(false)} />
        </label>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {actions.chart && (
            <Button variant="outline" disabled={!title.trim()} onClick={() => save(true)}>
              Save as new
            </Button>
          )}
          <Button disabled={!title.trim()} onClick={() => save(false)}>
            <Save /> {actions.chart ? "Save changes" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OpenDialog({ actions, onClose }: { actions: FlipChartActions; onClose: () => void }) {
  const userId = useStore((s) => s.userId);
  const all = useStore((s) => s.flipCharts);
  const subjects = useStore((s) => s.subjects);
  const charts = all.filter((f) => f.ownerUserId === userId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const [picked, setPicked] = useState<string | null>(charts[0]?.id ?? null);
  const boardHasContent = actions.pages.some((p) => p.strokes.length > 0);
  const [replace, setReplace] = useState(!boardHasContent);
  const [keepPrivate, setKeepPrivate] = useState(true);
  const chart = charts.find((c) => c.id === picked);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Open a saved flip chart</DialogTitle>
          <DialogDescription>Bring back pages you saved before — they stay editable.</DialogDescription>
        </DialogHeader>
        {charts.length === 0 ? (
          <p className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">You haven&apos;t saved any flip charts yet. Use Flip chart → Save to keep this board for later.</p>
        ) : (
          <div className="grid max-h-80 gap-2 overflow-y-auto sm:grid-cols-2">
            {charts.map((c) => (
              <button key={c.id} type="button" onClick={() => setPicked(c.id)} className={cn("flex items-center gap-3 rounded-lg border p-2 text-left transition-colors", picked === c.id ? "border-primary bg-primary/5 ring-2 ring-primary/30" : "hover:bg-muted")} aria-pressed={picked === c.id}>
                <div className="w-24 shrink-0 overflow-hidden rounded border">
                  <PageThumb strokes={c.pages[0]?.strokes ?? []} />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium">{c.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.pages.length} page{c.pages.length === 1 ? "" : "s"} · {subjects.find((x) => x.id === c.subjectId)?.name ?? "No subject"}
                  </p>
                  <p className="text-xs text-muted-foreground">Saved {fmtAgo(c.updatedAt)}</p>
                </div>
              </button>
            ))}
          </div>
        )}
        {chart && (
          <div className="space-y-2 rounded-lg bg-muted/50 p-3 text-sm">
            {boardHasContent && (
              <div className="grid grid-cols-2 gap-1 rounded-md bg-muted p-0.5 text-xs">
                {(
                  [
                    [false, "Add its pages after this page"],
                    [true, "Replace this board"],
                  ] as const
                ).map(([r, label]) => (
                  <button key={label} type="button" onClick={() => setReplace(r)} className={cn("rounded px-2 py-1.5", replace === r ? "bg-background font-medium shadow-sm" : "text-muted-foreground")} aria-pressed={replace === r}>
                    {label}
                  </button>
                ))}
              </div>
            )}
            {!replace && (
              <label className="flex items-start gap-2">
                <Checkbox checked={keepPrivate} onCheckedChange={(c) => setKeepPrivate(!!c)} className="mt-0.5" />
                <span>
                  Keep the new pages private <span className="block text-xs text-muted-foreground">Students stay on the page they see now until you show a page.</span>
                </span>
              </label>
            )}
            {replace && <p className="text-xs text-muted-foreground">Students will see page 1 of “{chart.title}”. {boardHasContent ? "Save this board first if you want to keep it." : ""}</p>}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!chart}
            onClick={() => {
              if (!chart) return;
              actions.onOpen(chart, { replace, keepPrivate: !replace && keepPrivate });
              onClose();
            }}
          >
            <FolderOpen /> Open
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

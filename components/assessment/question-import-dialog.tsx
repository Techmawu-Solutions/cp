"use client";

import { useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Loader2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { exportCsv, exportExcel } from "@/components/tables/export-button";
import { parseFile } from "@/components/tables/import-wizard";
import { QUESTION_IMPORT_COLUMNS, QUESTION_TEMPLATE_ROWS, rowsToQuestions, type ImportedQuestion } from "@/lib/question-import";
import { questionLabel } from "@/lib/questions";
import { uid } from "@/lib/helpers";
import type { Question } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Imports questions of every type from a CSV or Excel file into the assessment builder. */
export function QuestionImportDialog({ open, onOpenChange, onImport }: { open: boolean; onOpenChange: (o: boolean) => void; onImport: (qs: Question[]) => void }) {
  const [file, setFile] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ImportedQuestion[]>([]);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const valid = parsed.filter((p) => p.question && p.errors.length === 0);
  const invalid = parsed.length - valid.length;

  const reset = () => (setFile(null), setParsed([]));
  const load = async (f: File) => {
    if (!/\.(csv|xlsx)$/i.test(f.name)) return toast.error("Choose a .csv or .xlsx file");
    setBusy(true);
    try {
      const rows = await parseFile(f);
      if (rows.length === 0) return toast.error("That file has no question rows");
      if (!("type" in rows[0]!) || !("question" in rows[0]!)) return toast.error("The file needs “type” and “question” columns — download the template to see the format");
      setFile(f.name);
      setParsed(rowsToQuestions(rows, () => uid("q")));
    } catch {
      toast.error("Couldn't read that file");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (onOpenChange(o), !o && reset())}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Import questions</DialogTitle>
          <DialogDescription>Upload a CSV or Excel file with one question per row. All question types are supported, including drag &amp; drop.</DialogDescription>
        </DialogHeader>

        {!file ? (
          <div className="space-y-4">
            <label
              onDragOver={(e) => (e.preventDefault(), setDragging(true))}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const f = e.dataTransfer.files[0];
                if (f) void load(f);
              }}
              className={cn("flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center hover:bg-muted/50", dragging && "border-primary bg-primary/5")}
            >
              {busy ? <Loader2 className="size-8 animate-spin text-primary" /> : <UploadCloud className="size-8 text-primary" />}
              <span className="font-medium">Drop a file here or browse</span>
              <span className="text-xs text-muted-foreground">.csv or .xlsx — columns: {QUESTION_IMPORT_COLUMNS.join(", ")}</span>
              <input ref={input} type="file" accept=".csv,.xlsx" className="hidden" onChange={(e) => e.target.files?.[0] && load(e.target.files[0])} />
            </label>
            <div className="rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
              <p className="mb-1 font-medium text-foreground">How to fill the file</p>
              <ul className="list-disc space-y-0.5 pl-4">
                <li>
                  <b>type</b>: mcq, multi_select, true_false, fill_blank, numeric, matching, ordering, drag_words, short_answer, long_answer, essay or file.
                </li>
                <li>
                  <b>options</b>, separated by <code>|</code>: the choices; ordering items in the correct order; matching pairs as <code>term=match</code>; extra wrong words for drag_words.
                </li>
                <li>
                  <b>answer</b>: a letter such as <code>B</code> (or <code>A,C</code> for multi_select), true/false, the text (use <code>|</code> for alternatives), a number, or the word for each blank separated by <code>|</code>.
                </li>
                <li>
                  Mark gaps in fill_blank and drag_words questions with <code>______</code>. The template has an example of every type.
                </li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <FileSpreadsheet className="size-4 text-primary" /> <span className="font-medium">{file}</span>
              <span className="text-muted-foreground">
                · {valid.length} ready{invalid > 0 && <>, {invalid} with problems (skipped)</>}
              </span>
              <Button size="xs" variant="ghost" className="ml-auto" onClick={reset}>
                Choose another file
              </Button>
            </div>
            <div className="max-h-[45vh] divide-y overflow-y-auto rounded-lg border">
              {parsed.map((p) => (
                <div key={p.row} className={cn("flex items-start gap-3 px-3 py-2 text-sm", p.errors.length > 0 && "bg-red-500/5")}>
                  {p.errors.length === 0 ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" /> : <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-600" />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate">{p.question?.prompt || <em className="text-muted-foreground">No question text</em>}</p>
                    <p className="text-xs text-muted-foreground">
                      Row {p.row}
                      {p.question && (
                        <>
                          {" "}
                          · {questionLabel(p.question.type)} · {p.question.marks} marks
                        </>
                      )}
                    </p>
                    {p.errors.length > 0 && <p className="text-xs text-red-700 dark:text-red-400">{p.errors.join(" · ")}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter className="sm:justify-between">
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" />}>
              <Download /> Download template
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => exportExcel("question-import-template", QUESTION_IMPORT_COLUMNS, QUESTION_TEMPLATE_ROWS)}>Excel (.xlsx)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportCsv("question-import-template", QUESTION_IMPORT_COLUMNS, QUESTION_TEMPLATE_ROWS)}>CSV</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            disabled={valid.length === 0}
            onClick={() => {
              onImport(valid.map((p) => p.question!));
              toast.success(`${valid.length} question${valid.length === 1 ? "" : "s"} imported${invalid ? ` · ${invalid} skipped` : ""}`);
              onOpenChange(false);
              reset();
            }}
          >
            Import {valid.length > 0 ? valid.length : ""} question{valid.length === 1 ? "" : "s"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

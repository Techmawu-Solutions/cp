"use client";

import { useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Loader2, UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

export interface ImportIssue {
  field: string;
  message: string;
  /** "warning" is shown but doesn't block the row from importing. */
  kind?: "error" | "duplicate" | "warning";
}

const STEPS = ["Upload file", "Validate & preview", "Confirm import"];

const normalizeHeader = (h: string) =>
  h
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");

/** Reads the first sheet of an .xlsx, or a .csv, into rows keyed by snake_case headers. */
export async function parseFile(file: File): Promise<Record<string, string>[]> {
  if (/\.xlsx$/i.test(file.name)) {
    const { default: readXlsxFile } = await import("read-excel-file/browser");
    const sheets = await readXlsxFile(file);
    const data = sheets[0]?.data ?? [];
    const [header, ...body] = data;
    if (!header) return [];
    const keys = header.map((h) => normalizeHeader(String(h ?? "")));
    return body
      .filter((r) => r.some((c) => c != null && String(c).trim() !== ""))
      .map((r) => Object.fromEntries(keys.map((k, i) => [k, r[i] == null ? "" : r[i] instanceof Date ? (r[i] as Date).toISOString().slice(0, 10) : String(r[i]).trim()])));
  }
  const text = await file.text();
  const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true, transformHeader: normalizeHeader });
  return parsed.data.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, (v ?? "").trim()])));
}

/**
 * Bulk import flow (spec §23): Upload → Validate → Preview → Identify errors →
 * Confirm → Create. Rows with errors can be skipped so a mostly-good file
 * doesn't block the whole import.
 */
export function ImportWizard<T extends Record<string, string>>({
  columns,
  requiredColumns,
  validate,
  previewColumns,
  onConfirm,
  entityLabel,
  renderStatus,
  extraOptions,
  aliases,
  prepare,
}: {
  columns: string[];
  requiredColumns: string[];
  validate: (rows: T[]) => ImportIssue[][];
  previewColumns: { key: string; label: string }[];
  onConfirm: (rows: T[]) => void;
  entityLabel: string;
  renderStatus: (issues: ImportIssue[]) => React.ReactNode;
  extraOptions?: React.ReactNode;
  /** Other header names accepted for a column, in snake_case (e.g. jhs_index_number ← bece_index_number). */
  aliases?: Record<string, string[]>;
  /** Adds derived fields to each row (shown in the preview) after headers are matched. */
  prepare?: (row: T) => T;
}) {
  const [step, setStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<T[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [skipInvalid, setSkipInvalid] = useState(true);
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const issues = useMemo(() => validate(rows), [rows, validate]);
  const blocking = (list: ImportIssue[]) => list.some((i) => i.kind !== "warning");
  const invalidCount = issues.filter(blocking).length;
  const warningCount = issues.filter((l) => !blocking(l) && l.length > 0).length;
  const validRows = rows.filter((_, i) => !blocking(issues[i]!));
  const summary = useMemo(() => {
    const counts = new Map<string, number>();
    issues.forEach((list) => list.filter((i) => i.kind !== "warning").forEach((i) => counts.set(i.message, (counts.get(i.message) ?? 0) + 1)));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [issues]);

  const handleFile = async (f: File) => {
    setError(null);
    if (!/\.(csv|xlsx)$/i.test(f.name)) return setError("Upload a .csv or .xlsx file.");
    if (f.size > 5 * 1024 * 1024) return setError("Files must be 5 MB or smaller.");
    setBusy(true);
    try {
      const raw = await parseFile(f);
      if (raw.length === 0) throw new Error("The file has no data rows.");
      const rename = new Map(Object.entries(aliases ?? {}).flatMap(([col, alts]) => alts.map((a) => [a, col] as const)));
      const parsed = raw.map((r) => {
        const row = Object.fromEntries(Object.entries(r).map(([k, v]) => [rename.has(k) && !(rename.get(k)! in r) ? rename.get(k)! : k, v])) as T;
        return prepare ? prepare(row) : row;
      });
      const headers = Object.keys(parsed[0]!);
      const missing = requiredColumns.filter((c) => !headers.includes(c));
      if (missing.length) throw new Error(`Missing required column${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}. Download the template to see the expected format.`);
      setFile(f);
      setRows(parsed as T[]);
      setStep(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't read that file.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <ol className="flex flex-wrap items-center gap-2 text-sm">
        {STEPS.map((s, i) => (
          <li key={s} className="flex items-center gap-2">
            <span className={cn("flex size-6 items-center justify-center rounded-full border text-xs", i < step && "border-primary bg-primary text-primary-foreground", i === step && "border-primary text-primary")}>{i + 1}</span>
            <span className={cn(i === step ? "font-medium" : "text-muted-foreground")}>{s}</span>
            {i < STEPS.length - 1 && <span className="mx-1 h-px w-6 bg-border" />}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <Card>
          <CardContent>
            <div
              onDragOver={(e) => (e.preventDefault(), setDragging(true))}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const f = e.dataTransfer.files[0];
                if (f) handleFile(f);
              }}
              className={cn("flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-14 text-center transition-colors", dragging && "border-primary bg-accent/40")}
            >
              {busy ? <Loader2 className="size-8 animate-spin text-primary" /> : <UploadCloud className="size-10 text-muted-foreground" />}
              <p className="mt-3 font-medium">Drag and drop a CSV or Excel file</p>
              <p className="text-sm text-muted-foreground">or</p>
              <Button className="mt-2" variant="outline" onClick={() => input.current?.click()} disabled={busy}>
                Choose file
              </Button>
              <input ref={input} type="file" accept=".csv,.xlsx" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
              <p className="mt-4 text-xs text-muted-foreground">
                Columns: {columns.join(", ")} · required: {requiredColumns.join(", ")}
              </p>
            </div>
            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertTriangle />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {step >= 1 && file && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="size-4" /> {file.name}
              </CardTitle>
              <CardDescription>
                {rows.length} records · {validRows.length} ready · {invalidCount} need attention
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {invalidCount > 0 ? (
                <Alert className="border-amber-500/40 bg-amber-500/5">
                  <AlertTriangle className="text-amber-600" />
                  <AlertTitle>{invalidCount} records require attention</AlertTitle>
                  <AlertDescription>
                    <ul className="mt-1 space-y-0.5">
                      {summary.map(([msg, n]) => (
                        <li key={msg}>
                          {n} × {msg.toLowerCase()}
                        </li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="border-emerald-500/40 bg-emerald-500/5">
                  <CheckCircle2 className="text-emerald-600" />
                  <AlertTitle>All {rows.length} records passed validation</AlertTitle>
                  {warningCount > 0 && <AlertDescription>{warningCount} records have missing details that will be collected later.</AlertDescription>}
                </Alert>
              )}
              <div className="max-h-[420px] overflow-auto rounded-lg border">
                <Table>
                  <TableHeader className="sticky top-0 bg-card">
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      {previewColumns.map((c) => (
                        <TableHead key={c.key}>{c.label}</TableHead>
                      ))}
                      <TableHead>Status</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r, i) => {
                      const rowIssues = issues[i]!;
                      return (
                        <TableRow key={i} className={cn(blocking(rowIssues) && "bg-red-500/5")}>
                          <TableCell className="text-muted-foreground tabular-nums">{i + 2}</TableCell>
                          {previewColumns.map((c) => (
                            <TableCell key={c.key} className={cn(rowIssues.some((x) => x.field === c.key && x.kind !== "warning") && "font-medium text-red-600 dark:text-red-400")}>
                              {r[c.key] || <span className="text-muted-foreground italic">empty</span>}
                            </TableCell>
                          ))}
                          <TableCell>{renderStatus(rowIssues)}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon-xs" aria-label="Remove row" onClick={() => setRows(rows.filter((_, j) => j !== i))}>
                              <X />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              {extraOptions}
              {invalidCount > 0 && (
                <label className="flex items-center justify-between gap-4 rounded-lg border p-3 text-sm">
                  <span>
                    Skip the {invalidCount} records with errors and import the rest
                    <span className="block text-xs text-muted-foreground">Turn off to fix the file and re-upload instead.</span>
                  </span>
                  <Switch checked={skipInvalid} onCheckedChange={setSkipInvalid} />
                </label>
              )}
            </CardContent>
          </Card>
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => {
                setStep(0);
                setFile(null);
                setRows([]);
              }}
            >
              Upload a different file
            </Button>
            <Button disabled={validRows.length === 0 || (invalidCount > 0 && !skipInvalid)} onClick={() => (setStep(2), onConfirm(validRows))}>
              Import {validRows.length} {entityLabel}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

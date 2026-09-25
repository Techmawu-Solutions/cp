"use client";

import { Download, FileSpreadsheet, FileText, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { downloadBlob, toCsv } from "@/lib/helpers";

type Cell = string | number | null | undefined;

export async function exportExcel(filename: string, header: string[], rows: Cell[][]) {
  const { default: writeXlsxFile } = await import("write-excel-file/browser");
  const data = [
    header.map((h) => ({ value: h, fontWeight: "bold" as const })),
    ...rows.map((r) => r.map((c) => (c == null ? null : { value: c }))),
  ];
  const blob = await writeXlsxFile(data).toBlob();
  downloadBlob(blob, `${filename}.xlsx`);
}

export function exportCsv(filename: string, header: string[], rows: Cell[][]) {
  downloadBlob(new Blob([toCsv([header, ...rows])], { type: "text/csv;charset=utf-8" }), `${filename}.csv`);
}

/** Export menu for tables (spec §38: Export Excel / Export CSV / Print). */
export function ExportButton({
  filename,
  header,
  rows,
  onExported,
  print = false,
  label = "Export",
}: {
  filename: string;
  header: string[];
  rows: () => Cell[][];
  onExported?: (format: "excel" | "csv") => void;
  print?: boolean;
  label?: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" />}>
        <Download data-icon="inline-start" />
        {label}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem
          onClick={async () => {
            try {
              await exportExcel(filename, header, rows());
              onExported?.("excel");
              toast.success("Excel file downloaded");
            } catch (e) {
              console.error(e);
              toast.error("Excel export failed — try CSV instead.");
            }
          }}
        >
          <FileSpreadsheet /> Export Excel
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            exportCsv(filename, header, rows());
            onExported?.("csv");
            toast.success("CSV file downloaded");
          }}
        >
          <FileText /> Export CSV
        </DropdownMenuItem>
        {print && (
          <DropdownMenuItem onClick={() => window.print()}>
            <Printer /> Print
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

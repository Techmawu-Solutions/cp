"use client";

import { boardImage } from "@/components/classroom/board-paint";
import { prepareBoardMath } from "@/components/classroom/board-math";
import { imagesToPdf } from "@/lib/pdf-images";
import { downloadBlob } from "@/lib/helpers";
import type { BoardPage } from "@/lib/types";

/** Flip chart pages as images, formulas included (spec §32). Empty pages are skipped. */
export async function flipChartImages(pages: BoardPage[]): Promise<string[]> {
  const used = pages.filter((p) => p.strokes.length > 0);
  await prepareBoardMath(used.flatMap((p) => p.strokes));
  return used.map((p) => boardImage(p.strokes));
}

/** Downloads a flip chart as a PDF, one page per whiteboard page. */
export async function downloadFlipChartPdf(pages: BoardPage[], title: string) {
  const used = pages.filter((p) => p.strokes.length > 0);
  await prepareBoardMath(used.flatMap((p) => p.strokes));
  const width = 1600;
  const height = Math.round((width * 9) / 16);
  const pdf = imagesToPdf(used.map((p) => ({ jpeg: boardImage(p.strokes, width, "image/jpeg"), width, height })));
  downloadBlob(pdf, `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "flip-chart"}.pdf`);
  return used.length;
}

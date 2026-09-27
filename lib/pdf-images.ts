/**
 * A PDF with one image per page (spec §32: download a flip chart). Pages are
 * JPEG data URLs, each placed full-page on a landscape page of the same
 * shape. Written by hand — a handful of PDF objects — so no PDF library is
 * needed.
 */
export function imagesToPdf(pages: { jpeg: string; width: number; height: number }[]): Blob {
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let length = 0;
  const push = (part: string | Uint8Array) => {
    const bytes = typeof part === "string" ? enc.encode(part) : part;
    chunks.push(bytes);
    length += bytes.length;
  };
  const obj = (n: number, body: () => void) => {
    offsets[n] = length;
    push(`${n} 0 obj\n`);
    body();
    push("\nendobj\n");
  };

  push("%PDF-1.4\n%âãÏÓ\n");
  // Objects: 1 catalog, 2 page tree, then per page: page, content stream, image.
  const pageW = 842; // A4 landscape width in points; height follows each image's shape
  const kids = pages.map((_, i) => `${3 + i * 3} 0 R`).join(" ");
  obj(1, () => push("<< /Type /Catalog /Pages 2 0 R >>"));
  obj(2, () => push(`<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`));
  pages.forEach((p, i) => {
    const n = 3 + i * 3;
    const h = Math.round((pageW * p.height) / p.width);
    const jpeg = Uint8Array.from(atob(p.jpeg.split(",")[1] ?? ""), (c) => c.charCodeAt(0));
    const content = `q ${pageW} 0 0 ${h} 0 0 cm /Im${i} Do Q`;
    obj(n, () => push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${h}] /Resources << /XObject << /Im${i} ${n + 2} 0 R >> >> /Contents ${n + 1} 0 R >>`));
    obj(n + 1, () => push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`));
    obj(n + 2, () => {
      push(`<< /Type /XObject /Subtype /Image /Width ${p.width} /Height ${p.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`);
      push(jpeg);
      push("\nendstream");
    });
  });
  const count = 3 + pages.length * 3;
  const xref = length;
  push(`xref\n0 ${count}\n0000000000 65535 f \n`);
  for (let n = 1; n < count; n++) push(`${String(offsets[n]).padStart(10, "0")} 00000 n \n`);
  push(`trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(chunks as BlobPart[], { type: "application/pdf" });
}

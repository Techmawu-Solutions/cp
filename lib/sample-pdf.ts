/**
 * Builds a small, valid PDF from plain text. Used to stand in for files that
 * seeded demo records only name (e.g. a student's submitted report), so
 * "Open" shows a real document in the prototype.
 */

// Helvetica in PDFs covers Latin-1; swap the typographic characters we use for ASCII.
const clean = (s: string) =>
  s
    .replace(/[—–]/g, "-")
    .replace(/[·•]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/…/g, "...")
    .replace(/[^\x20-\x7e]/g, "")
    .replace(/[\\()]/g, (c) => `\\${c}`);

function wrap(text: string, width: number): string[] {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const word of para.split(/\s+/).filter(Boolean)) {
      if ((line + " " + word).trim().length > width) {
        out.push(line);
        line = word;
      } else line = (line + " " + word).trim();
    }
    out.push(line);
  }
  return out;
}

export interface PdfBlock {
  text: string;
  size?: number;
  bold?: boolean;
  gapBefore?: number;
}

export function makePdf(blocks: PdfBlock[]): Blob {
  // A4 portrait, 56pt margins. One page is plenty for a sample.
  const ops: string[] = ["BT"];
  let y = 790;
  for (const b of blocks) {
    const size = b.size ?? 11;
    const lead = size * 1.45;
    y -= b.gapBefore ?? 0;
    for (const line of wrap(b.text, Math.floor(980 / size))) {
      if (y < 60) break;
      ops.push(`/${b.bold ? "F2" : "F1"} ${size} Tf 1 0 0 1 56 ${y.toFixed(1)} Tm (${clean(line)}) Tj`);
      y -= lead;
    }
  }
  ops.push("ET");
  const stream = ops.join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((o, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([pdf], { type: "application/pdf" });
}

/** A plausible student submission for a seeded assignment that has no real file. */
export function sampleSubmissionPdf(input: { student: string; className?: string; school?: string; title: string; description?: string; submittedAt: string; fileName: string }): Blob {
  const hardware = /hardware/i.test(input.title);
  const body = hardware
    ? [
        { text: "1. Introduction", bold: true, gapBefore: 8 },
        { text: "Our school computer lab has about thirty desktop computers, two printers and a projector. This report describes the hardware we use, grouped into input, processing, output and storage devices." },
        { text: "2. Input devices", bold: true, gapBefore: 8 },
        { text: "Every computer has a keyboard and a mouse. The teacher's computer also has a webcam and a microphone for live classes, and there is one flatbed scanner for scanning documents." },
        { text: "3. Processing devices", bold: true, gapBefore: 8 },
        { text: "Each system unit contains a CPU (Intel Core i3), 8 GB of RAM and a motherboard. The CPU carries out instructions, while RAM holds the programs and data in use. A graphics card is built into the motherboard." },
        { text: "4. Output devices", bold: true, gapBefore: 8 },
        { text: "Output devices are the monitors, the two laser printers, the projector and the speakers. The projector lets the teacher show the screen to the whole class." },
        { text: "5. Storage devices", bold: true, gapBefore: 8 },
        { text: "Each computer has a 500 GB hard disk drive. Students save work on flash drives, and the school keeps backups on an external hard drive and in cloud storage." },
        { text: "6. Conclusion", bold: true, gapBefore: 8 },
        { text: "The lab has all four types of hardware needed for learning ICT. More RAM and solid-state drives would make the computers faster." },
      ]
    : [
        { text: "Answer", bold: true, gapBefore: 8 },
        { text: input.description ?? "Student's written answer." },
        { text: "This is the student's response to the task set by the teacher, submitted through the platform." },
      ];
  return makePdf([
    { text: input.title, size: 18, bold: true },
    { text: [input.student, input.className, input.school].filter(Boolean).join(" - "), size: 11, gapBefore: 4 },
    { text: `Submitted ${new Date(input.submittedAt).toLocaleString("en-GB", { dateStyle: "long", timeStyle: "short" })} - ${input.fileName}`, size: 9 },
    ...body,
    { text: "Prototype sample document: seeded demo submissions only store a file name, so this page is generated to show how a submitted file opens.", size: 8, gapBefore: 24 },
  ]);
}

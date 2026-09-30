import type { LibraryMaterial, LibraryTopic } from "@/lib/types";

/**
 * Demo content for the ClassProject library (spec section 25.3): shared
 * learning materials by subject and level, published by the Super Administrator.
 */

type M = Omit<LibraryMaterial, "id" | "topicId" | "order" | "published" | "createdAt">;
type T = { subjectCode: string; level: string; title: string; description: string; materials: M[] };

const TOPICS: T[] = [
  {
    subjectCode: "MATH",
    level: "SHS1",
    title: "Number bases",
    description: "Counting in bases other than ten — the maths behind computers and WASSCE questions.",
    materials: [
      { type: "text", title: "What is a number base?", description: "Place value in base 10, base 2 and base 5.", durationMinutes: 12, body: "## Place value\nIn base ten each place is worth ten times the one to its right: ones, tens, hundreds.\n\nIn **base two** each place is worth two times the one to its right: ones, twos, fours, eights.\n\n## Converting to base ten\n- Write the place values under the digits.\n- Multiply each digit by its place value.\n- Add them up: 1011₂ = 8 + 0 + 2 + 1 = **11**.\n\n## Try it\nConvert 234₅ to base ten. (Answer: 2×25 + 3×5 + 4 = **69**.)" },
      { type: "video", title: "Converting between bases (video)", description: "Worked examples, 9 minutes.", url: "https://www.youtube.com/watch?v=FFDMzbrEXaE", durationMinutes: 9 },
      { type: "text", title: "Practice set: bases", description: "Ten WASSCE-style questions with answers at the end.", durationMinutes: 20, body: "## Questions\n- Convert 110101₂ to base ten.\n- Convert 45 to base two.\n- Find x if 23ₓ = 13.\n- Add 101₂ + 111₂.\n\n## Answers\n- 53\n- 101101₂\n- x = 5\n- 1100₂" },
    ],
  },
  {
    subjectCode: "MATH",
    level: "SHS1",
    title: "Sets and Venn diagrams",
    description: "Describing groups, and solving problems with two and three sets.",
    materials: [
      { type: "text", title: "Sets, subsets and the universal set", description: "Notation you'll use all year.", durationMinutes: 10, body: "## Notation\n- **∈** means \"is an element of\".\n- **A ∪ B** is everything in A or B.\n- **A ∩ B** is everything in both.\n- **A′** is everything not in A.\n\n## Example\nIn a class of 40, 25 take French and 18 take Twi; 7 take both. How many take neither? 40 − (25 + 18 − 7) = **4**." },
      { type: "pdf", title: "Venn diagram worksheet", description: "Printable worksheet with worked answers.", url: "/samples/course-outline.pdf", fileName: "venn-diagram-worksheet.pdf", fileSize: 48_000 },
    ],
  },
  {
    subjectCode: "ICT",
    level: "SHS1",
    title: "Parts of a computer",
    description: "Input, output, processing and storage — with the devices you use every day.",
    materials: [
      { type: "pdf", title: "Parts of a computer (illustrated notes)", description: "Labelled diagrams of every part.", url: "/samples/parts-of-a-computer.pdf", fileName: "parts-of-a-computer.pdf", fileSize: 80_000 },
      { type: "pdf", title: "Hardware worksheet", description: "Label the parts and match each to its job.", url: "/samples/hardware-worksheet.pdf", fileName: "hardware-worksheet.pdf", fileSize: 52_000 },
      { type: "text", title: "Input or output?", description: "A quick sorting activity.", durationMinutes: 8, body: "## Sort these devices\n- Keyboard — **input**\n- Printer — **output**\n- Touchscreen — **both**\n- Microphone — **input**\n- Speaker — **output**\n\nWhy is a touchscreen both? It shows you information *and* takes your taps." },
    ],
  },
  {
    subjectCode: "ICT",
    level: "SHS1",
    title: "Spreadsheets",
    description: "Formulas, functions and charts for everyday problems.",
    materials: [
      { type: "pdf", title: "Spreadsheet exercises", description: "Five exercises, from a shopping list to a class grade sheet.", url: "/samples/spreadsheet-exercises.pdf", fileName: "spreadsheet-exercises.pdf", fileSize: 48_000 },
      { type: "link", title: "Try it: free online spreadsheet", description: "Practise in your browser — no install.", url: "https://www.onlyoffice.com/" },
    ],
  },
  {
    subjectCode: "ENG",
    level: "SHS1",
    title: "Writing a formal letter",
    description: "Layout, tone and the phrases examiners look for.",
    materials: [
      { type: "text", title: "The layout of a formal letter", description: "Address, date, salutation, body, close.", durationMinutes: 10, body: "## Layout\n- Your address (top right) and the date below it.\n- The recipient's title and address (left).\n- **Dear Sir/Madam** or **Dear Mr Owusu**.\n- A heading that says what the letter is about.\n- Three to five paragraphs: purpose, details, request.\n- **Yours faithfully** (Sir/Madam) or **Yours sincerely** (named person).\n\n## Tone\nPolite, clear, no slang, no contractions." },
      { type: "text", title: "Model letter: requesting a school lab", description: "A graded example with the examiner's comments.", durationMinutes: 8, body: "## The task\nWrite to your District Director asking for a science laboratory for your school.\n\n## Why this scores well\n- The purpose is in the first sentence.\n- Each paragraph has one point, with evidence (\"120 students share one bench\").\n- It ends with a clear, polite request." },
    ],
  },
  {
    subjectCode: "ISCI",
    level: "SHS1",
    title: "Laboratory safety",
    description: "Rules and symbols before any practical work.",
    materials: [
      { type: "file", title: "Lab safety rules", description: "Word document to print and keep.", url: "/samples/lab-safety-rules.docx", fileName: "lab-safety-rules.docx", fileSize: 12_000 },
      { type: "text", title: "Hazard symbols", description: "What each symbol means and what to do.", durationMinutes: 6, body: "## Common symbols\n- **Flammable** — keep away from flames.\n- **Corrosive** — wear gloves and goggles.\n- **Toxic** — never taste; wash hands after.\n- **Irritant** — avoid skin contact." },
    ],
  },
  {
    subjectCode: "MATH",
    level: "SHS3",
    title: "WASSCE revision: past questions",
    description: "Past questions by topic, with worked solutions.",
    materials: [
      { type: "pdf", title: "Past questions booklet", description: "Algebra, geometry and statistics.", url: "/samples/wassce-ict-past-questions.pdf", fileName: "wassce-past-questions.pdf", fileSize: 68_000 },
      { type: "text", title: "Exam technique", description: "How to use the 2½ hours.", durationMinutes: 7, body: "## Before you start\nRead the whole paper in the first five minutes and tick the questions you can do best.\n\n## While writing\n- Show every step — method marks add up.\n- Leave a question you're stuck on and come back.\n- Keep ten minutes to check units and signs." },
    ],
  },
];

export function seedLibrary(at: (days: number, hour?: number) => string, createdBy?: string): { topics: LibraryTopic[]; materials: LibraryMaterial[] } {
  const topics: LibraryTopic[] = [];
  const materials: LibraryMaterial[] = [];
  const orderIn = new Map<string, number>();
  TOPICS.forEach((t, ti) => {
    const key = `${t.subjectCode}:${t.level}`;
    const order = orderIn.get(key) ?? 0;
    orderIn.set(key, order + 1);
    const id = `libt_${t.subjectCode.toLowerCase()}_${t.level.toLowerCase()}_${order}`;
    topics.push({ id, subjectCode: t.subjectCode, level: t.level, title: t.title, description: t.description, order, published: true, createdAt: at(-20 + ti) });
    t.materials.forEach((m, mi) => materials.push({ ...m, id: `libm_${id.slice(5)}_${mi}`, topicId: id, order: mi, published: true, createdAt: at(-20 + ti), createdBy }));
  });
  return { topics, materials };
}

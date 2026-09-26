/**
 * Curriculum content used to seed ICT courses with realistic lessons (spec §25).
 * Lesson bodies use a tiny markdown subset rendered by <RichText/>:
 * "## heading", "- bullet", blank-line paragraphs, **bold**.
 */
import type { Question } from "@/lib/types";

export interface SeedItem {
  type: "text" | "video" | "pdf" | "link" | "presentation" | "file";
  title: string;
  description: string;
  body?: string;
  url?: string;
  fileName?: string;
  fileSize?: number;
  durationMinutes?: number;
}

export interface SeedModule {
  title: string;
  description: string;
  items: SeedItem[];
}

export const SAMPLE_VIDEO_URL = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";

export const ICT_CURRICULUM: Record<string, SeedModule[]> = {
  "SHS 1": [
    {
      title: "Module 1 — Introduction to ICT",
      description: "What ICT is, where we use it, and how it shapes society.",
      items: [
        {
          type: "text",
          title: "What is ICT?",
          description: "Definitions and everyday examples.",
          durationMinutes: 15,
          body: `## What is ICT?

Information and Communication Technology (ICT) refers to all the technologies used to **create, store, process, transmit and share information**. It includes computers, mobile phones, the internet, radio, television and the software that runs on them.

## ICT in everyday life

- **Education** — e-learning platforms, virtual classrooms and digital libraries
- **Banking** — mobile money, ATMs and online banking
- **Health** — electronic patient records and telemedicine
- **Agriculture** — weather alerts and market price information by SMS
- **Government** — Ghana Card registration, e-passports and online tax filing

## Why ICT matters

ICT makes it faster and cheaper to share information. A student in Bolgatanga can join the same live lesson as a student in Accra, and a farmer in Techiman can check cocoa prices without travelling to the market.`,
        },
        {
          type: "video",
          title: "ICT around us (video)",
          description: "Short introductory clip.",
          url: SAMPLE_VIDEO_URL,
          durationMinutes: 6,
        },
        {
          type: "link",
          title: "Information and communications technology — Wikipedia",
          description: "Background reading on the history of ICT.",
          url: "https://en.wikipedia.org/wiki/Information_and_communications_technology",
        },
        {
          type: "file",
          title: "Computer lab safety rules",
          description: "Read before your first practical lesson.",
          fileName: "lab-safety-rules.docx",
          url: "/samples/lab-safety-rules.docx",
          fileSize: 9_186,
        },
      ],
    },
    {
      title: "Module 2 — Computer Hardware",
      description: "The physical components of a computer system.",
      items: [
        {
          type: "text",
          title: "Input, processing, output and storage",
          description: "The IPOS model of a computer.",
          durationMinutes: 20,
          body: `## The IPOS cycle

Every computer system follows the same basic cycle:

- **Input** — data enters the computer (keyboard, mouse, scanner, microphone)
- **Processing** — the CPU carries out instructions on the data
- **Output** — results are presented (monitor, printer, speakers)
- **Storage** — data is kept for later use (hard disk, SSD, flash drive)

## The Central Processing Unit

The CPU is often called the "brain" of the computer. It has three main parts: the **Control Unit**, the **Arithmetic and Logic Unit (ALU)** and **registers**.

## Memory

**RAM** is temporary working memory — its contents are lost when the power goes off. **ROM** holds permanent instructions used to start the computer.`,
        },
        {
          type: "presentation",
          title: "Parts of a computer (slides)",
          description: "Teacher's slide deck from class.",
          fileName: "parts-of-a-computer.pdf",
          url: "/samples/parts-of-a-computer.pdf",
          fileSize: 79_510,
        },
        {
          type: "pdf",
          title: "Hardware worksheet",
          description: "Label the components and answer the questions.",
          fileName: "hardware-worksheet.pdf",
          url: "/samples/hardware-worksheet.pdf",
          fileSize: 50_330,
        },
      ],
    },
    {
      title: "Module 3 — Computer Software",
      description: "System software, application software and utilities.",
      items: [
        {
          type: "text",
          title: "System vs application software",
          description: "How software is classified.",
          durationMinutes: 18,
          body: `## Two families of software

**System software** manages the computer itself. The most important piece of system software is the **operating system** — for example Windows, macOS, Linux and Android.

**Application software** helps users carry out specific tasks:

- Word processors — Microsoft Word, Google Docs
- Spreadsheets — Microsoft Excel, LibreOffice Calc
- Presentation software — PowerPoint, Google Slides
- Web browsers — Chrome, Firefox, Edge

## Utility programs

Utilities keep the computer healthy: antivirus software, disk cleanup, backup tools and file compression tools.`,
        },
        {
          type: "link",
          title: "Operating system — Wikipedia",
          description: "Further reading on operating systems.",
          url: "https://en.wikipedia.org/wiki/Operating_system",
        },
      ],
    },
    {
      title: "Module 4 — Networking",
      description: "How computers connect and share resources.",
      items: [
        {
          type: "text",
          title: "Introduction to Networking",
          description: "LANs, WANs and the internet.",
          durationMinutes: 20,
          body: `## What is a network?

A computer network is two or more computers connected together to **share resources** such as files, printers and an internet connection.

## Types of networks

- **PAN** — Personal Area Network, e.g. a phone connected to wireless earbuds
- **LAN** — Local Area Network, e.g. the school computer lab
- **MAN** — Metropolitan Area Network, covering a city
- **WAN** — Wide Area Network; the internet is the largest WAN

## Network devices

Routers, switches, access points and modems each play a role in moving data from one device to another.`,
        },
        {
          type: "video",
          title: "How the internet works (video)",
          description: "Recorded explainer.",
          url: SAMPLE_VIDEO_URL,
          durationMinutes: 8,
        },
        {
          type: "link",
          title: "Computer network — Wikipedia",
          description: "Reference article.",
          url: "https://en.wikipedia.org/wiki/Computer_network",
        },
      ],
    },
  ],
  "SHS 2": [
    {
      title: "Module 1 — Spreadsheets",
      description: "Formulas, functions and charts.",
      items: [
        {
          type: "text",
          title: "Working with formulas",
          description: "SUM, AVERAGE and cell references.",
          durationMinutes: 20,
          body: `## Formulas

Every formula starts with an equals sign. **=A1+B1** adds two cells; **=SUM(A1:A10)** adds a range.

## Absolute references

Use **$** to lock a reference when copying a formula: **=$B$1*A2**.`,
        },
        {
          type: "pdf",
          title: "Spreadsheet exercises",
          description: "Practice file for the lab.",
          fileName: "spreadsheet-exercises.pdf",
          url: "/samples/spreadsheet-exercises.pdf",
          fileSize: 47_125,
        },
      ],
    },
    {
      title: "Module 2 — Databases",
      description: "Tables, records and queries.",
      items: [
        {
          type: "text",
          title: "Tables, fields and records",
          description: "Relational database basics.",
          durationMinutes: 18,
          body: `## Database basics

A **table** stores data about one kind of thing. Each **row** is a record and each **column** is a field. A **primary key** uniquely identifies every record.`,
        },
      ],
    },
    {
      title: "Module 3 — Web Technologies",
      description: "HTML, CSS and how websites work.",
      items: [
        {
          type: "text",
          title: "Your first web page",
          description: "HTML structure.",
          durationMinutes: 25,
          body: `## HTML

HTML describes the structure of a page using **tags** such as headings, paragraphs and links. CSS controls how it looks.`,
        },
        {
          type: "link",
          title: "HTML basics — MDN",
          description: "Mozilla's beginner guide.",
          url: "https://developer.mozilla.org/en-US/docs/Learn/Getting_started_with_the_web/HTML_basics",
        },
      ],
    },
  ],
  "SHS 3": [
    {
      title: "Module 1 — Cyber Security",
      description: "Staying safe online.",
      items: [
        {
          type: "text",
          title: "Threats and safeguards",
          description: "Malware, phishing and strong passwords.",
          durationMinutes: 20,
          body: `## Common threats

- **Malware** — viruses, worms and ransomware
- **Phishing** — fake messages that trick you into revealing passwords or MoMo PINs

## Safeguards

Use long passphrases, enable two-factor authentication and never share one-time codes.`,
        },
      ],
    },
    {
      title: "Module 2 — WASSCE Revision",
      description: "Past questions and exam technique.",
      items: [
        {
          type: "pdf",
          title: "WASSCE ICT past questions (2019–2024)",
          description: "Objective and theory questions.",
          fileName: "wassce-ict-past-questions.pdf",
          url: "/samples/wassce-ict-past-questions.pdf",
          fileSize: 66_939,
        },
      ],
    },
  ],
};

export function genericModules(subject: string): SeedModule[] {
  return [
    {
      title: `Unit 1 — Foundations of ${subject}`,
      description: `Key ideas and vocabulary for ${subject}.`,
      items: [
        {
          type: "text",
          title: `Course introduction`,
          description: "Scope of the course, expectations and assessment plan.",
          durationMinutes: 10,
          body: `## Welcome to ${subject}

This course follows the GES curriculum for the semester. You will be assessed through **assignments (20%)**, **quizzes (10%)** and **tests (70%)**.

- Read each lesson before class
- Submit assignments before the due date
- Join live classes on time`,
        },
        {
          type: "pdf",
          title: `${subject} course outline`,
          description: "Topics covered this semester.",
          fileName: `${subject.toLowerCase().replace(/[^a-z]+/g, "-")}-outline.pdf`,
          url: "/samples/course-outline.pdf",
          fileSize: 47_336,
        },
      ],
    },
    {
      title: `Unit 2 — Core Concepts`,
      description: "Worked examples and practice.",
      items: [
        {
          type: "text",
          title: "Worked examples",
          description: "Step-by-step solutions.",
          durationMinutes: 20,
          body: `## Worked examples

Study each example carefully and attempt the practice questions at the end of the unit before the next live class.`,
        },
      ],
    },
  ];
}

/** Auto-markable questions for the seeded ICT quiz (spec §37). */
export const ICT_QUIZ_QUESTIONS = [
  {
    type: "mcq" as const,
    prompt: "Which of the following is system software?",
    options: ["Microsoft Word", "Windows 11", "Google Chrome", "Excel"],
    answer: "1",
    marks: 2,
  },
  {
    type: "mcq" as const,
    prompt: "Which program would you use to calculate student averages?",
    options: ["Spreadsheet", "Web browser", "Antivirus", "Media player"],
    answer: "0",
    marks: 2,
  },
  {
    type: "true_false" as const,
    prompt: "Antivirus software is an example of a utility program.",
    answer: "true",
    marks: 2,
  },
  {
    type: "fill_blank" as const,
    prompt: "The software that manages all hardware and other software is called the ______ system.",
    answer: "operating",
    marks: 2,
  },
  {
    type: "short_answer" as const,
    prompt: "Name one example of presentation software.",
    marks: 2,
  },
];

/** One question of each interactive type, for the seeded "Quiz 3" (spec §37). */
export const ICT_INTERACTIVE_QUESTIONS: Omit<Question, "id">[] = [
  { type: "multi_select", prompt: "Which of these are input devices?", options: ["Keyboard", "Monitor", "Scanner", "Printer", "Microphone"], answers: ["0", "2", "4"], marks: 2 },
  { type: "ordering", prompt: "Put the stages of the information processing cycle in order.", options: ["Input", "Processing", "Storage", "Output"], marks: 2 },
  { type: "matching", prompt: "Match each component to what it does.", pairs: [{ left: "CPU", right: "Carries out instructions" }, { left: "RAM", right: "Holds data being used right now" }, { left: "Hard disk", right: "Keeps files when the power is off" }], marks: 3 },
  { type: "drag_words", prompt: "A ______ is 8 bits, and 1024 bytes make a ______.", answers: ["byte", "kilobyte"], distractors: ["nibble", "megabyte"], marks: 2 },
  { type: "numeric", prompt: "How many bits are in 4 bytes?", answer: "32", tolerance: 0, marks: 1 },
  { type: "fill_blank", prompt: "The brain of the computer is the ______.", answer: "CPU|central processing unit|processor", marks: 2 },
];

/** Core Mathematics quiz written with LaTeX maths ($…$ inline, $$…$$ display). */
export const MATH_QUIZ_QUESTIONS: Omit<Question, "id">[] = [
  { type: "mcq", prompt: "Solve for $x$: $$\\frac{2x + 3}{5} = 3$$", options: ["$x = 6$", "$x = 3$", "$x = 9$", "$x = \\frac{12}{5}$"], answer: "0", marks: 2 },
  { type: "mcq", prompt: "Simplify $\\sqrt{50} + \\sqrt{18}$.", options: ["$8\\sqrt{2}$", "$\\sqrt{68}$", "$5\\sqrt{2} + 2\\sqrt{3}$", "$15\\sqrt{2}$"], answer: "0", marks: 2 },
  { type: "multi_select", prompt: "Which of these are equal to $2^{6}$?", options: ["$64$", "$(2^{3})^{2}$", "$2^{3} \\times 2^{2}$", "$4^{3}$", "$\\frac{2^{8}}{2^{2}}$"], answers: ["0", "1", "3", "4"], marks: 2 },
  { type: "numeric", prompt: "Find the angle $x$ in triangle $ABC$ below, in degrees.", image: "/samples/triangle.svg", imageAlt: "Triangle ABC with angles of 47 degrees at A and 68 degrees at B; the angle at C is marked x.", answer: "65", tolerance: 0, marks: 2 },
  { type: "mcq", prompt: "Which of these shapes is a regular hexagon?", options: ["", "", "", ""], optionImages: ["/samples/shapes/pentagon.svg", "/samples/shapes/hexagon.svg", "/samples/shapes/octagon.svg", "/samples/shapes/square.svg"], answer: "1", marks: 2 },
  { type: "true_false", prompt: "For all real $a$ and $b$: $(a + b)^2 = a^2 + b^2$.", answer: "false", marks: 1 },
  { type: "matching", prompt: "Match each expression to its value when $x = 3$.", pairs: [{ left: "$x^2 - 1$", right: "$8$" }, { left: "$\\frac{x + 9}{2}$", right: "$6$" }, { left: "$\\sqrt{x + 13}$", right: "$4$" }], marks: 3 },
  { type: "ordering", prompt: "Arrange from smallest to largest.", options: ["$\\frac{1}{3}$", "$0.4$", "$\\frac{1}{2}$", "$\\sqrt{0.36} = 0.6$"], marks: 2 },
];

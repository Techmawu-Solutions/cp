import { AUTHORED, type LessonDef } from "@/lib/data/authored";
import type { Activity, Course, CourseModule, Lesson, Objective } from "@/lib/types";

/**
 * The course catalogue. Five flagship courses are fully authored (lib/data/
 * authored.ts). The rest carry real metadata and outlines with placeholder
 * lesson content, marked as such — enough to browse, enrol and see the
 * structure. Slugs match ClassProject's partner catalogue (cp lib/mooc.ts), so
 * links from ClassProject land on real pages here.
 */

interface Meta {
  slug: string;
  title: string;
  subtitle?: string;
  provider: string;
  instructor: string;
  subjects: string[];
  topic: string;
  schoolLevels?: [string, string];
  level: Course["level"];
  hours: number;
  summary: string;
  outline: string[];
  skills?: string[];
  free?: boolean;
  priceGhs?: number;
  exam?: "WASSCE" | "BECE";
  minAge?: number;
  secondaryFriendly?: boolean;
  masteryRate?: number;
  learners?: number;
  languages?: string[];
}

const META: Meta[] = [
  // Flagships (authored)
  { slug: "spreadsheets-that-think", title: "Spreadsheets That Think", subtitle: "Formulas, functions, clean data and honest charts", provider: "Ghana Tech Lab", instructor: "Efua Asante", subjects: ["ICT", "FACC", "BMGT"], topic: "spreadsheets", schoolLevels: ["SHS1", "SHS3"], level: "beginner", hours: 5, summary: "Formulas, charts and budgets in spreadsheets — skills every job asks for.", outline: [], skills: ["sheet-formulas", "sheet-functions", "sheet-cleaning", "sheet-charts"], masteryRate: 71, learners: 18420 },
  { slug: "statistics-in-everyday-life", title: "Statistics in Everyday Life", subtitle: "Averages, spread, and numbers that mislead", provider: "Ashesi University", instructor: "Dr. Kwame Mensah", subjects: ["MATH", "EMATH", "ECON"], topic: "statistics", schoolLevels: ["SHS1", "SHS3"], level: "beginner", hours: 5, summary: "Averages, spread and charts with real Ghanaian data — and how numbers can mislead.", outline: [], skills: ["stats-averages", "stats-spread", "stats-critical", "data-story"], masteryRate: 66, learners: 12975 },
  { slug: "sql-for-data-analysis", title: "SQL for Data Analysis", subtitle: "Ask databases the questions that matter", provider: "ClassProject Open", instructor: "Yaa Boateng", subjects: ["ICT", "COMP"], topic: "SQL", schoolLevels: ["SHS2", "SHS3"], level: "intermediate", hours: 7, summary: "SELECT, WHERE, GROUP BY and JOIN on real fare, school and health datasets.", outline: [], skills: ["sql-select", "sql-filter", "sql-aggregate", "sql-joins"], secondaryFriendly: false, minAge: 16, masteryRate: 63, learners: 9310 },
  { slug: "quadratic-functions-made-visual", title: "Quadratic Functions, Made Visual", subtitle: "See what a, b and c do — then solve real problems", provider: "KNUST Mathematics", instructor: "Dr. Abena Owusu", subjects: ["EMATH", "MATH"], topic: "quadratic functions", schoolLevels: ["SHS1", "SHS3"], level: "intermediate", hours: 6, summary: "See what a, b and c do to a parabola, then solve real problems with graphs and the formula.", outline: [], skills: ["quad-graphs", "quad-square", "quad-formula", "quad-word"], exam: "WASSCE", masteryRate: 58, learners: 24160 },
  { slug: "python-for-beginners", title: "Python for Beginners", subtitle: "Your first programs — on a phone or a laptop", provider: "ClassProject Open", instructor: "Kojo Mensah", subjects: ["ICT", "COMP"], topic: "programming", schoolLevels: ["JHS2", "SHS3"], level: "beginner", hours: 8, summary: "Write your first programs on a phone or laptop — games, quizzes and calculators.", outline: [], skills: ["py-variables", "py-decisions", "py-loops", "py-functions"], masteryRate: 69, learners: 41280 },

  // Career course (outline only)
  { slug: "data-storytelling", title: "Data Storytelling", subtitle: "From analysis to a decision", provider: "Ashesi University", instructor: "Dr. Kwame Mensah", subjects: ["ENG", "ECON"], topic: "data storytelling", level: "intermediate", hours: 4, summary: "Turn an analysis into a one-page brief and a five-minute talk that changes a decision.", outline: ["Know your audience", "Lead with the finding", "One chart that proves it", "Presenting with confidence"], skills: ["data-story"], free: false, priceGhs: 60, secondaryFriendly: false, minAge: 16, masteryRate: 61, learners: 4120 },

  // Secondary-friendly catalogue shared with ClassProject (outline only)
  { slug: "wassce-core-maths-sprint", title: "WASSCE Core Maths Sprint", provider: "ClassProject Open", instructor: "Mr. Samuel Adjei", subjects: ["MATH"], topic: "exam practice", schoolLevels: ["SHS2", "SHS3"], level: "intermediate", hours: 12, summary: "Past-question practice by topic with worked solutions and a spaced-review plan up to exam day.", outline: ["Number & numeration", "Algebra", "Geometry & mensuration", "Statistics & probability"], exam: "WASSCE" },
  { slug: "fractions-to-percentages", title: "From Fractions to Percentages", provider: "Accra Maths Circle", instructor: "Ms. Gifty Tetteh", subjects: ["MATH"], topic: "fractions and percentages", schoolLevels: ["JHS1", "SHS1"], level: "beginner", hours: 4, summary: "Build confidence with fractions, decimals and percentages using market-day examples.", outline: ["Equivalent fractions", "Decimals", "Percentages", "Profit and loss"], exam: "BECE" },
  { slug: "calculus-first-steps", title: "Calculus: First Steps", provider: "University of Ghana", instructor: "Prof. Yaw Ofori", subjects: ["EMATH"], topic: "differentiation", schoolLevels: ["SHS2", "SHS3"], level: "advanced", hours: 10, summary: "Limits, rates of change and derivatives — the ideas behind them, not just the rules.", outline: ["Rates of change", "Limits", "Derivatives", "Applications"] },
  { slug: "forces-and-motion-labs", title: "Forces and Motion — Virtual Labs", provider: "KNUST Physics", instructor: "Dr. Nana Addo", subjects: ["PHY", "ISCI"], topic: "forces and motion", schoolLevels: ["SHS1", "SHS3"], level: "intermediate", hours: 7, summary: "Run virtual experiments on speed, acceleration and Newton's laws, then explain what you saw.", outline: ["Speed and velocity", "Acceleration", "Newton's laws", "Momentum"], exam: "WASSCE" },
  { slug: "electricity-at-home", title: "Electricity at Home", provider: "ClassProject Open", instructor: "Mr. Kofi Darko", subjects: ["PHY", "AE", "ISCI"], topic: "circuits", schoolLevels: ["JHS3", "SHS3"], level: "beginner", hours: 4, summary: "Current, voltage and resistance through the wiring in your own house — safely.", outline: ["Circuits", "Ohm's law", "Power and bills", "Safety"] },
  { slug: "chemistry-of-the-kitchen", title: "The Chemistry of the Kitchen", provider: "University of Cape Coast", instructor: "Dr. Esi Quaye", subjects: ["CHEM", "ISCI", "FN"], topic: "reactions", schoolLevels: ["SHS1", "SHS3"], level: "beginner", hours: 5, summary: "Acids, bases and reactions you can see while cooking.", outline: ["Acids and bases", "Reactions", "Mixtures", "Food chemistry"] },
  { slug: "organic-chemistry-essentials", title: "Organic Chemistry Essentials", provider: "KNUST Chemistry", instructor: "Dr. Kwabena Frimpong", subjects: ["CHEM"], topic: "organic chemistry", schoolLevels: ["SHS2", "SHS3"], level: "advanced", hours: 9, summary: "Hydrocarbons, functional groups and naming — with 3D models you can turn.", outline: ["Hydrocarbons", "Functional groups", "Naming", "Reactions"], exam: "WASSCE" },
  { slug: "cells-genes-and-you", title: "Cells, Genes and You", provider: "Noguchi Memorial Institute", instructor: "Dr. Akosua Sarpong", subjects: ["BIO", "ISCI"], topic: "cells and genetics", schoolLevels: ["SHS1", "SHS3"], level: "intermediate", hours: 6, summary: "From cells to DNA to inheritance — with malaria and sickle-cell as case studies.", outline: ["Cells", "DNA", "Inheritance", "Health case studies"] },
  { slug: "climate-and-ecosystems", title: "Climate and Ecosystems of West Africa", provider: "University of Ghana", instructor: "Dr. Selorm Agbeko", subjects: ["BIO", "GEOG", "GAGRIC"], topic: "ecosystems", schoolLevels: ["JHS2", "SHS3"], level: "beginner", hours: 5, summary: "Savannah, forest and coast: how climate shapes life and farming.", outline: ["Ecosystems", "Climate", "Human impact", "Adapting"] },
  { slug: "how-the-internet-works", title: "How the Internet Works", provider: "ClassProject Open", instructor: "Yaa Boateng", subjects: ["ICT"], topic: "networks", schoolLevels: ["JHS1", "SHS3"], level: "beginner", hours: 3, summary: "Packets, addresses and staying safe online.", outline: ["Packets", "Addresses", "The web", "Online safety"] },
  { slug: "intro-to-ai", title: "Introduction to Artificial Intelligence", provider: "Ashesi University", instructor: "Dr. Elikem Kpodo", subjects: ["COMP", "ICT"], topic: "artificial intelligence", schoolLevels: ["SHS2", "SHS3"], level: "intermediate", hours: 6, summary: "What AI can and can't do, how it learns from data, and how to use it responsibly.", outline: ["What is AI?", "Learning from data", "Using AI tools well", "AI and society"] },
  { slug: "writing-that-works", title: "Writing That Works", provider: "University of Cape Coast", instructor: "Mrs. Comfort Ansah", subjects: ["ENG", "LIT"], topic: "essay writing", schoolLevels: ["JHS2", "SHS3"], level: "intermediate", hours: 6, summary: "Plan, draft and edit essays and letters that examiners — and employers — want to read.", outline: ["Planning", "Paragraphs", "Letters and reports", "Editing"], exam: "WASSCE" },
  { slug: "reading-african-literature", title: "Reading African Literature", provider: "University of Ghana", instructor: "Prof. Adwoa Annan", subjects: ["LIT", "ENG"], topic: "literature", schoolLevels: ["SHS1", "SHS3"], level: "intermediate", hours: 7, summary: "Achebe, Aidoo, Ngũgĩ and more — themes, context and how to write about them.", outline: ["Novel", "Drama", "Poetry", "Writing about texts"] },
  { slug: "french-for-everyday", title: "French for Everyday Conversations", provider: "Alliance Française Accra", instructor: "Mme. Awa Diallo", subjects: ["FRE"], topic: "conversation", schoolLevels: ["JHS1", "SHS3"], level: "beginner", hours: 8, summary: "Speak French at the market, on the phone and with neighbours across the border.", outline: ["Greetings", "Shopping", "Travel", "Phone calls"], languages: ["French", "English"] },
  { slug: "ghana-history-independence", title: "Ghana: The Road to Independence", provider: "University of Ghana", instructor: "Dr. Kofi Boateng", subjects: ["HIST", "SOC", "GOV"], topic: "independence", schoolLevels: ["JHS2", "SHS3"], level: "beginner", hours: 4, summary: "The people, events and ideas that led to 6 March 1957.", outline: ["Colonial Gold Coast", "Nationalism", "1948 and after", "Independence"] },
  { slug: "how-government-works", title: "How Government Works", provider: "Ghana Institute of Journalism", instructor: "Ms. Naa Lartey", subjects: ["GOV", "SOC"], topic: "government", schoolLevels: ["SHS1", "SHS3"], level: "beginner", hours: 4, summary: "The constitution, elections and your rights as a citizen.", outline: ["The constitution", "Arms of government", "Elections", "Citizenship"] },
  { slug: "money-and-markets", title: "Money and Markets", provider: "Ashesi University", instructor: "Dr. Kwesi Amoah", subjects: ["ECON", "BMGT"], topic: "markets", schoolLevels: ["SHS1", "SHS3"], level: "beginner", hours: 5, summary: "Demand, supply and prices — explained with trotro fares and cedi exchange rates.", outline: ["Demand and supply", "Prices", "Money", "Inflation"] },
  { slug: "bookkeeping-basics", title: "Bookkeeping Basics", provider: "ICAG Academy", instructor: "Mr. Isaac Opoku", subjects: ["FACC", "CACC", "BMGT"], topic: "bookkeeping", schoolLevels: ["SHS1", "SHS3"], level: "beginner", hours: 6, summary: "Double entry, ledgers and trial balance — then keep the books for a small shop.", outline: ["Double entry", "Ledgers", "Trial balance", "A shop's books"], exam: "WASSCE" },
  { slug: "start-a-small-business", title: "Start a Small Business", provider: "Ghana Enterprise Agency", instructor: "Mrs. Beatrice Asamoah", subjects: ["BMGT", "ECON", "SOC"], topic: "entrepreneurship", schoolLevels: ["SHS2", "SHS3"], level: "beginner", hours: 5, summary: "From idea to first customers — with a business plan you can actually use.", outline: ["Ideas", "Customers", "Costs and pricing", "Your plan"] },
  { slug: "design-thinking-for-creatives", title: "Design Thinking for Creatives", provider: "KNUST College of Art", instructor: "Mr. Edem Ametepe", subjects: ["GD", "GKA", "PM"], topic: "design process", schoolLevels: ["SHS1", "SHS3"], level: "beginner", hours: 4, summary: "Solve problems like a designer: research, sketch, test, improve.", outline: ["Empathise", "Ideate", "Prototype", "Critique"] },
  { slug: "smart-farming", title: "Smart Farming", provider: "University for Development Studies", instructor: "Dr. Mawuli Kpodo", subjects: ["GAGRIC", "CROP", "ANH"], topic: "modern agriculture", schoolLevels: ["SHS1", "SHS3"], level: "beginner", hours: 6, summary: "Soil, water and data — farming methods that raise yields.", outline: ["Soil health", "Irrigation", "Pests", "Farm records"] },
  { slug: "technical-drawing-cad", title: "From Technical Drawing to CAD", provider: "Accra Technical University", instructor: "Mr. Felix Baah", subjects: ["TD", "BC"], topic: "CAD", schoolLevels: ["SHS1", "SHS3"], level: "intermediate", hours: 8, summary: "Move from paper drawings to free CAD software on a laptop.", outline: ["Projections", "Dimensions", "CAD basics", "A house plan"] },
  { slug: "nutrition-for-life", title: "Nutrition for Life", provider: "University of Ghana", instructor: "Dr. Priscilla Yeboah", subjects: ["FN", "MIL", "BIO"], topic: "nutrition", schoolLevels: ["JHS2", "SHS3"], level: "beginner", hours: 4, summary: "Balanced diets on a budget, food safety and healthy habits.", outline: ["Nutrients", "Balanced diets", "Food safety", "Meal planning"] },
  { slug: "study-skills-that-stick", title: "Study Skills That Stick", provider: "ClassProject Open", instructor: "Ms. Enyonam Dzifa", subjects: [], topic: "study skills", schoolLevels: ["JHS1", "SHS3"], level: "beginner", hours: 2, summary: "Spaced practice, self-testing and planning — how to learn more in less time.", outline: ["How memory works", "Self-testing", "Spacing", "Planning revision"], skills: ["learn-study"] },
];

const SECONDS_PER_LINE = 14;

function videoFrom(id: string, title: string, slides: { title: string; points: string[] }[], lines: string[], skills: string[], objectives: string[], videoQuestion?: string, examples?: string[]): Activity {
  const transcript = lines.map((text, i) => ({ t: i * SECONDS_PER_LINE, text }));
  const per = Math.max(1, Math.ceil(lines.length / slides.length));
  const chapters = slides.map((s, i) => ({ t: i * per * SECONDS_PER_LINE, title: s.title }));
  return {
    id,
    kind: "video",
    title,
    minutes: Math.max(2, Math.round((lines.length * SECONDS_PER_LINE) / 60)),
    objectives,
    skills,
    transcript,
    chapters,
    slides,
    examples,
    // Pause roughly two-thirds of the way through.
    videoQuestion: videoQuestion ? { at: Math.floor(lines.length * 0.66) * SECONDS_PER_LINE, itemId: videoQuestion } : undefined,
  };
}

function authoredLesson(slug: string, n: number, def: LessonDef): { lesson: Lesson; objective: Objective } {
  const oid = `${slug}.o${n}`;
  const base = `${slug}.l${n}`;
  return {
    objective: { id: oid, text: def.objective.text, bloom: def.objective.bloom, skills: [def.skill] },
    lesson: {
      id: base,
      title: def.title,
      concepts: def.concepts,
      activities: [
        videoFrom(`${base}.video`, `Watch: ${def.title}`, def.slides, def.transcript, [def.skill], [oid], def.videoQuestion, def.examples),
        { id: `${base}.read`, kind: "reading", title: `Read: ${def.title}`, minutes: 4, objectives: [oid], skills: [def.skill], body: def.body, examples: def.examples },
        { id: `${base}.practice`, kind: "practice", title: `Practise: ${def.title}`, minutes: 6, objectives: [oid], skills: [def.skill], itemIds: def.items },
      ],
    },
  };
}

function outlineLesson(meta: Meta, n: number, topic: string): { lesson: Lesson; objective: Objective } {
  const base = `${meta.slug}.l${n}`;
  const oid = `${meta.slug}.o${n}`;
  const lines = [
    `Welcome to "${topic}".`,
    meta.summary,
    `In this lesson we look at ${topic.toLowerCase()} step by step, with examples from everyday life in Ghana.`,
    "Pause the video whenever you want to try an example yourself.",
    "When you're done, read the notes and check your understanding.",
  ];
  return {
    objective: { id: oid, text: `Understand “${topic}” and apply it to an everyday example.`, bloom: "understand", skills: meta.skills ?? [] },
    lesson: {
      id: base,
      title: topic,
      concepts: [topic],
      activities: [
        videoFrom(`${base}.video`, `Watch: ${topic}`, [{ title: topic, points: [meta.summary] }], lines, meta.skills ?? [], [oid]),
        {
          id: `${base}.read`,
          kind: "reading",
          title: `Read: ${topic}`,
          minutes: 4,
          objectives: [oid],
          skills: meta.skills ?? [],
          body: `## ${topic}\n${meta.summary}\n\n*Sample course: in this prototype only the outline of this course is written. The five flagship courses (Spreadsheets That Think, Statistics in Everyday Life, SQL for Data Analysis, Quadratic Functions Made Visual and Python for Beginners) have full lessons, practice and mastery checks.*`,
        },
      ],
    },
  };
}

function build(meta: Meta): Course {
  const authored = AUTHORED.find((a) => a.slug === meta.slug);
  const objectives: Objective[] = [];
  let modules: CourseModule[];
  if (authored) {
    let n = 0;
    modules = authored.modules.map((m, mi) => ({
      id: `${meta.slug}.m${mi + 1}`,
      title: m.title,
      lessons: m.lessons.map((l) => {
        n += 1;
        const built = authoredLesson(meta.slug, n, l);
        objectives.push(built.objective);
        return built.lesson;
      }),
    }));
    // The mastery check: two items per skill, the gate for the certificate (FR-CR-4).
    const checkItems = authored.modules.flatMap((m) => m.lessons.flatMap((l) => l.items.slice(1, 3)));
    modules.push({
      id: `${meta.slug}.m${modules.length + 1}`,
      title: "Show what you can do",
      lessons: [
        {
          id: `${meta.slug}.check`,
          title: "Mastery check",
          concepts: [],
          activities: [{ id: `${meta.slug}.check.assessment`, kind: "mastery_check", title: "Mastery check", minutes: 15, objectives: objectives.map((o) => o.id), skills: meta.skills ?? [], itemIds: checkItems }],
        },
      ],
    });
  } else {
    const lessons = meta.outline.map((t, i) => outlineLesson(meta, i + 1, t));
    lessons.forEach((l) => objectives.push(l.objective));
    const half = Math.ceil(lessons.length / 2);
    modules = [
      { id: `${meta.slug}.m1`, title: "Foundations", lessons: lessons.slice(0, half).map((l) => l.lesson) },
      { id: `${meta.slug}.m2`, title: "Going further", lessons: lessons.slice(half).map((l) => l.lesson) },
    ].filter((m) => m.lessons.length);
  }
  return {
    slug: meta.slug,
    title: meta.title,
    subtitle: meta.subtitle ?? meta.summary,
    provider: meta.provider,
    instructor: meta.instructor,
    level: meta.level,
    hours: meta.hours,
    weeks: Math.max(2, Math.ceil(meta.hours / 2)),
    free: meta.free ?? true,
    priceGhs: meta.priceGhs,
    offline: true,
    sizeMb: Math.round(meta.hours * 38),
    languages: meta.languages ?? ["English"],
    subjects: meta.subjects,
    topic: meta.topic,
    schoolLevels: meta.schoolLevels,
    minAge: meta.minAge ?? 13,
    secondaryFriendly: meta.secondaryFriendly ?? true,
    exam: meta.exam,
    skills: meta.skills ?? [],
    objectives,
    prerequisites: meta.level === "beginner" ? "None — start here." : meta.level === "intermediate" ? "Comfortable with the basics of the subject. Take the readiness check if unsure." : "Solid foundations in the subject.",
    assessment: authored ? ["Practice with hints after every lesson", "In-video questions", "Mastery check (70% to pass)"] : ["Short checks after each lesson"],
    credential: authored ? `cert-${meta.slug}` : undefined,
    lastUpdated: "2026-09-12",
    version: authored ? "1.3.0" : "1.0.0",
    accessibility: { captions: true, transcripts: true, screenReaderTested: !!authored, audioOnly: true },
    summary: meta.summary,
    modules,
    masteryRate: meta.masteryRate ?? 55 + (meta.slug.length % 20),
    learners: meta.learners ?? 1500 + meta.slug.length * 173,
    authored: !!authored,
  };
}

export const COURSES: Course[] = META.map(build);
export const courseBySlug = new Map(COURSES.map((c) => [c.slug, c]));

/** Every activity in a course, in order. */
export const activitiesOf = (course: Course): Activity[] => course.modules.flatMap((m) => m.lessons.flatMap((l) => l.activities));

/** Finds an activity with its lesson and module. */
export function findActivity(course: Course, activityId: string) {
  for (const m of course.modules)
    for (const l of m.lessons)
      for (const a of l.activities) if (a.id === activityId) return { module: m, lesson: l, activity: a };
  return null;
}

/** The course an activity id belongs to (ids start with the course slug). */
export const courseOfActivity = (activityId: string) => courseBySlug.get(activityId.split(".")[0]!);

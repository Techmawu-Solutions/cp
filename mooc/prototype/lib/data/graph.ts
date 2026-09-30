import type { Career, Competency, CredentialDef, Project, Skill } from "@/lib/types";

/**
 * The competency graph (spec section 15): skills (atomic, with prerequisites),
 * competencies that group them, careers that require competencies, and the
 * projects and credentials that prove them.
 */

const S = (id: string, name: string, domain: string, description: string, prereqs: string[] = []): Skill => ({ id, name, domain, description, prereqs });

export const SKILLS: Skill[] = [
  // Spreadsheets
  S("sheet-formulas", "Spreadsheet formulas", "Data tools", "Write formulas with cell references that update when the data changes."),
  S("sheet-functions", "SUM, AVERAGE, IF and lookups", "Data tools", "Use built-in functions to total, average, decide and look things up.", ["sheet-formulas"]),
  S("sheet-charts", "Charts from data", "Data tools", "Choose and build the right chart for a question.", ["sheet-functions"]),
  S("sheet-cleaning", "Cleaning messy data", "Data tools", "Find and fix blanks, duplicates, typos and inconsistent units.", ["sheet-formulas"]),
  // SQL
  S("sql-select", "Selecting columns (SELECT)", "Data querying", "Ask a database for exactly the columns you need."),
  S("sql-filter", "Filtering rows (WHERE)", "Data querying", "Keep only the rows that match conditions.", ["sql-select"]),
  S("sql-aggregate", "Grouping and totals (GROUP BY)", "Data querying", "Summarise rows into totals, counts and averages per group.", ["sql-filter"]),
  S("sql-joins", "Joining tables", "Data querying", "Combine related tables with JOIN.", ["sql-filter"]),
  // Statistics
  S("stats-averages", "Mean, median and mode", "Data reasoning", "Pick the right average for the data and explain it."),
  S("stats-spread", "Range and spread", "Data reasoning", "Describe how spread out data is, not just its middle.", ["stats-averages"]),
  S("stats-critical", "Reading charts critically", "Data reasoning", "Spot charts and numbers that mislead.", ["stats-averages"]),
  // Communication
  S("data-story", "Telling a story with data", "Data communication", "Turn an analysis into a clear message for a real audience.", ["stats-averages", "sheet-charts"]),
  // Python
  S("py-variables", "Variables and data types", "Programming", "Store and change numbers, text and lists in Python."),
  S("py-decisions", "Decisions with if/else", "Programming", "Make programs choose what to do.", ["py-variables"]),
  S("py-loops", "Loops", "Programming", "Repeat work with for and while loops.", ["py-decisions"]),
  S("py-functions", "Functions", "Programming", "Package reusable steps into functions.", ["py-loops"]),
  // Mathematics (Ghana SHS Elective Mathematics)
  S("quad-graphs", "Graphs of quadratic functions", "Mathematics", "Read and sketch y = ax² + bx + c and explain what a, b and c do."),
  S("quad-square", "Completing the square", "Mathematics", "Rewrite a quadratic to find its turning point.", ["quad-graphs"]),
  S("quad-formula", "The quadratic formula", "Mathematics", "Solve any quadratic equation with the formula.", ["quad-square"]),
  S("quad-word", "Quadratic word problems", "Mathematics", "Model real situations with quadratics and interpret the answer.", ["quad-formula"]),
  // Learning to learn
  S("learn-study", "Learning how to learn", "Study skills", "Use self-testing, spacing and planning to remember more."),
];

export const COMPETENCIES: Competency[] = [
  { id: "data-tools", name: "Work with data in spreadsheets", skills: ["sheet-formulas", "sheet-functions", "sheet-cleaning", "sheet-charts"] },
  { id: "data-querying", name: "Query data with SQL", skills: ["sql-select", "sql-filter", "sql-aggregate", "sql-joins"] },
  { id: "data-reasoning", name: "Reason with statistics", skills: ["stats-averages", "stats-spread", "stats-critical"] },
  { id: "data-communication", name: "Communicate findings", skills: ["data-story", "sheet-charts"] },
  { id: "programming-foundations", name: "Programming foundations (Python)", skills: ["py-variables", "py-decisions", "py-loops", "py-functions"] },
  { id: "algebra-quadratics", name: "Quadratic functions (SHS Elective Maths)", skills: ["quad-graphs", "quad-square", "quad-formula", "quad-word"] },
  { id: "learning-to-learn", name: "Learning to learn", skills: ["learn-study"] },
];

export const CAREERS: Career[] = [
  {
    id: "data-analyst",
    name: "Data Analyst",
    tagline: "Turn raw numbers into decisions",
    description: "Data analysts clean, query and summarise data, then explain what it means to the people who have to act on it — in banks, telcos, NGOs, hospitals and government.",
    competencies: ["data-tools", "data-querying", "data-reasoning", "data-communication"],
    courses: ["spreadsheets-that-think", "statistics-in-everyday-life", "sql-for-data-analysis", "data-storytelling"],
    projects: ["trotro-fares"],
    credential: "cred-data-analysis",
    roles: ["Junior data analyst", "Reporting analyst", "M&E officer", "Business intelligence assistant"],
  },
  {
    id: "software-developer",
    name: "Software Developer",
    tagline: "Build the tools people use every day",
    description: "Developers design, write and test programs. Start with programming foundations in Python, then build and ship small projects.",
    competencies: ["programming-foundations"],
    courses: ["python-for-beginners", "how-the-internet-works", "intro-to-ai"],
    projects: ["py-quiz-app"],
    credential: "badge-python",
    roles: ["Junior developer (with further study)", "Automation assistant", "Tech support with scripting"],
  },
];

export const PROJECTS: Project[] = [
  {
    id: "trotro-fares",
    title: "What does a trotro ride really cost?",
    career: "data-analyst",
    brief:
      "Accra commuters say fares went up again — but by how much, on which routes, and who is hit hardest? You have a messy dataset of 1,200 fare observations collected by students across 18 routes over six months. Clean it, analyse it and brief a local assembly member in one page.",
    requirements: [
      "Clean the data: fix route-name typos, remove duplicates, convert pesewas to cedis.",
      "Calculate the median fare per route and the change over six months.",
      "Find the three routes with the biggest increases — and check they're not just outliers.",
      "Make one chart that an assembly member would understand in five seconds.",
      "Write a one-page brief with your recommendation.",
    ],
    resources: ["trotro-fares-2026.csv (1,200 rows)", "Route map of Accra", "Brief template"],
    milestones: ["Cleaned dataset", "Analysis (medians and changes)", "Chart", "One-page brief"],
    rubric: [
      { id: "clean", title: "Data cleaning", skill: "sheet-cleaning", max: 4, levels: ["Missing", "Partial", "Mostly clean", "Clean and documented"] },
      { id: "query", title: "Grouping and totals", skill: "sql-aggregate", max: 4, levels: ["Missing", "Some errors", "Correct", "Correct and efficient"] },
      { id: "stats", title: "Choice of average", skill: "stats-averages", max: 4, levels: ["Missing", "Mean used on skewed data", "Median used", "Median used and justified"] },
      { id: "chart", title: "Chart", skill: "sheet-charts", max: 4, levels: ["Missing", "Hard to read", "Clear", "Clear and honest"] },
      { id: "story", title: "Brief and recommendation", skill: "data-story", max: 4, levels: ["Missing", "Unclear", "Clear", "Clear and persuasive"] },
    ],
  },
  {
    id: "py-quiz-app",
    title: "Build a quiz game in Python",
    career: "software-developer",
    courseSlug: "python-for-beginners",
    brief: "Build a text quiz game that asks questions from a list, keeps score, and tells the player how they did. Then add one feature of your own.",
    requirements: ["Store at least 5 questions in a list", "Use a loop to ask each question", "Use if/else to mark answers", "Put the scoring in a function", "Add one feature of your own"],
    resources: ["Starter file quiz.py", "Python cheat sheet"],
    milestones: ["Questions list", "Loop and marking", "Score function", "Your own feature"],
    rubric: [
      { id: "vars", title: "Data in variables and lists", skill: "py-variables", max: 4, levels: ["Missing", "Partial", "Correct", "Correct and tidy"] },
      { id: "ifs", title: "Marking with if/else", skill: "py-decisions", max: 4, levels: ["Missing", "Some errors", "Correct", "Handles edge cases"] },
      { id: "loop", title: "Loop through questions", skill: "py-loops", max: 4, levels: ["Missing", "Partial", "Correct", "Correct and flexible"] },
      { id: "func", title: "Score function", skill: "py-functions", max: 4, levels: ["Missing", "Partial", "Correct", "Reusable and documented"] },
    ],
  },
];

export const CREDENTIALS: CredentialDef[] = [
  {
    id: "cred-data-analysis",
    name: "Data Analysis Competency",
    kind: "competency",
    issuer: "ClassProject Open · with Ashesi University",
    description: "Verifies that the holder can clean, query, summarise and communicate data — shown through assessed skills and a peer- and instructor-reviewed project.",
    criteria: [
      { kind: "skill_state", skill: "sheet-functions", min: "applied" },
      { kind: "skill_state", skill: "sql-aggregate", min: "applied" },
      { kind: "skill_state", skill: "stats-averages", min: "applied" },
      { kind: "skill_state", skill: "data-story", min: "applied" },
      { kind: "project", projectId: "trotro-fares" },
    ],
    skills: ["sheet-cleaning", "sheet-functions", "sheet-charts", "sql-aggregate", "stats-averages", "data-story"],
  },
  {
    id: "badge-python",
    name: "Python Foundations",
    kind: "badge",
    issuer: "ClassProject Open",
    description: "Verifies Python foundations: variables, decisions, loops and functions — shown in a mastery check and a reviewed project.",
    criteria: [
      { kind: "mastery_check", courseSlug: "python-for-beginners", minPct: 70 },
      { kind: "project", projectId: "py-quiz-app" },
    ],
    skills: ["py-variables", "py-decisions", "py-loops", "py-functions"],
  },
  {
    id: "cert-spreadsheets-that-think",
    name: "Certificate: Spreadsheets That Think",
    kind: "certificate",
    issuer: "Ghana Tech Lab · on ClassProject Open",
    description: "Awarded for passing the course's mastery check (70% or more). Watching lessons alone never earns a certificate.",
    criteria: [{ kind: "mastery_check", courseSlug: "spreadsheets-that-think", minPct: 70 }],
    skills: ["sheet-formulas", "sheet-functions", "sheet-charts", "sheet-cleaning"],
  },
  {
    id: "cert-statistics-in-everyday-life",
    name: "Certificate: Statistics in Everyday Life",
    kind: "certificate",
    issuer: "Ashesi University · on ClassProject Open",
    description: "Awarded for passing the course's mastery check (70% or more).",
    criteria: [{ kind: "mastery_check", courseSlug: "statistics-in-everyday-life", minPct: 70 }],
    skills: ["stats-averages", "stats-spread", "stats-critical"],
  },
  {
    id: "cert-sql-for-data-analysis",
    name: "Certificate: SQL for Data Analysis",
    kind: "certificate",
    issuer: "ClassProject Open",
    description: "Awarded for passing the course's mastery check (70% or more).",
    criteria: [{ kind: "mastery_check", courseSlug: "sql-for-data-analysis", minPct: 70 }],
    skills: ["sql-select", "sql-filter", "sql-aggregate", "sql-joins"],
  },
  {
    id: "cert-quadratic-functions-made-visual",
    name: "Certificate: Quadratic Functions, Made Visual",
    kind: "certificate",
    issuer: "KNUST Mathematics · on ClassProject Open",
    description: "Awarded for passing the course's mastery check (70% or more).",
    criteria: [{ kind: "mastery_check", courseSlug: "quadratic-functions-made-visual", minPct: 70 }],
    skills: ["quad-graphs", "quad-square", "quad-formula", "quad-word"],
  },
  {
    id: "cert-python-for-beginners",
    name: "Certificate: Python for Beginners",
    kind: "certificate",
    issuer: "ClassProject Open",
    description: "Awarded for passing the course's mastery check (70% or more).",
    criteria: [{ kind: "mastery_check", courseSlug: "python-for-beginners", minPct: 70 }],
    skills: ["py-variables", "py-decisions", "py-loops", "py-functions"],
  },
];

export const skillById = new Map(SKILLS.map((s) => [s.id, s]));
export const careerById = new Map(CAREERS.map((c) => [c.id, c]));
export const projectById = new Map(PROJECTS.map((p) => [p.id, p]));
export const credentialById = new Map(CREDENTIALS.map((c) => [c.id, c]));
export const skillName = (id: string) => skillById.get(id)?.name ?? id;

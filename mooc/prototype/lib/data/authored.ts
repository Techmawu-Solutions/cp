import type { Bloom } from "@/lib/types";

/**
 * Fully authored lesson content for the five flagship courses. Each lesson
 * teaches one skill through a video (simulated: slides + timed transcript),
 * a reading, and practice from the item bank.
 */
export interface LessonDef {
  title: string;
  skill: string;
  objective: { text: string; bloom: Bloom };
  concepts: string[];
  slides: { title: string; points: string[] }[];
  transcript: string[];
  body: string;
  examples: string[];
  items: string[];
  /** Item the video pauses on. */
  videoQuestion?: string;
}

export interface AuthoredCourse {
  slug: string;
  modules: { title: string; lessons: LessonDef[] }[];
}

export const AUTHORED: AuthoredCourse[] = [
  {
    slug: "spreadsheets-that-think",
    modules: [
      {
        title: "Formulas and functions",
        lessons: [
          {
            title: "Formulas that update themselves",
            skill: "sheet-formulas",
            objective: { text: "Write formulas with relative and absolute references that update when data changes.", bloom: "apply" },
            concepts: ["Cell references", "Relative vs absolute", "Copying formulas"],
            slides: [
              { title: "A formula starts with =", points: ["=B2*C2 multiplies two cells", "Change B2 → the answer changes", "Typing numbers (=12*4) never updates"] },
              { title: "Relative and absolute", points: ["Copying down shifts B2 → B3", "$F$1 stays fixed", "Use $ for rates and constants"] },
            ],
            transcript: [
              "Welcome. In this lesson we make a spreadsheet do the arithmetic for us.",
              "Every formula starts with an equals sign. Type =B2*C2 and the sheet multiplies whatever is in B2 by whatever is in C2.",
              "Now change the price in B2. The total changes by itself — that's the whole point of using references instead of numbers.",
              "When you copy a formula down a column, its references move with it: B2 becomes B3, then B4. We call these relative references.",
              "Sometimes you want a reference to stay put, like a tax rate in F1. Add dollar signs — $F$1 — and it never moves.",
              "Try it: build a shop receipt where every line uses one formula copied down, and the VAT rate lives in one fixed cell.",
            ],
            body: `## Why formulas beat typed numbers
A formula starts with **=** and refers to cells, so it recalculates when the data changes. \`=B2*C2\` multiplies a price by a quantity; if the price changes tomorrow, the total is right without retyping.

## Relative references
When you copy \`=B2*C2\` down one row it becomes \`=B3*C3\`. The references are **relative** to where the formula sits, which is why one formula can fill a whole column.

## Absolute references
Put **$** in front of the column and row — \`$F$1\` — to lock a reference. Use it for things every row shares, such as a tax rate or an exchange rate.

## Check yourself
- Does every total come from a formula, not a typed number?
- Did you lock the cells that must not move?`,
            examples: [
              "Here's another example: a market seller keeps prices in column B and quantities in column C. =B2*C2 in D2, copied down, gives every line total. If tomatoes go up, only B2 changes.",
              "Another one: converting cedis to dollars. Put the exchange rate in F1 and use =B2/$F$1 in each row. When the rate changes, you update one cell.",
            ],
            items: ["sh1", "sh2", "sh3"],
            videoQuestion: "sh2",
          },
          {
            title: "SUM, AVERAGE and IF",
            skill: "sheet-functions",
            objective: { text: "Use SUM, AVERAGE and IF to total, average and label data.", bloom: "apply" },
            concepts: ["Functions", "Ranges", "Conditions"],
            slides: [
              { title: "Functions do the heavy lifting", points: ["=SUM(B2:B31) totals a range", "=AVERAGE(B2:B31) averages it", "B2:B31 means B2 through B31"] },
              { title: "IF makes decisions", points: ["=IF(test, if-true, if-false)", "=IF(B2>=50,\"Pass\",\"Retake\")", ">= includes the boundary"] },
            ],
            transcript: [
              "Functions are ready-made formulas. SUM adds, AVERAGE averages, COUNT counts.",
              "They work on ranges. B2 colon B31 means every cell from B2 down to B31.",
              "IF lets the sheet decide. Give it a test, then what to show if the test is true and what to show if it's false.",
              "=IF(B2>=50, \"Pass\", \"Retake\") shows Pass for 50 and above. Watch the equals sign in >= — it includes 50.",
              "Put them together and a sheet can total a month of sales and flag every day below target.",
            ],
            body: `## Functions
Functions are built-in formulas: \`SUM\`, \`AVERAGE\`, \`COUNT\`, \`MAX\`, \`MIN\`. They take a **range** such as \`B2:B31\`.

## IF
\`=IF(test, value_if_true, value_if_false)\`. For example \`=IF(B2>=50,"Pass","Retake")\`.

- **>=** means greater than or equal to, so 50 passes.
- Text results go in quotes.

## Lookups
\`XLOOKUP\` (or \`VLOOKUP\`) finds a value in one table and brings back a matching value — for example a route's name from its code.`,
            examples: [
              "Another example: a school canteen tracks daily sales in B2:B31. =SUM(B2:B31) gives the month's total and =AVERAGE(B2:B31) the typical day.",
              "Another: =IF(C2>C1,\"Up\",\"Down\") labels whether a fare rose compared with last month.",
            ],
            items: ["sh4", "sh5", "sh6"],
            videoQuestion: "sh5",
          },
        ],
      },
      {
        title: "From messy data to charts",
        lessons: [
          {
            title: "Cleaning messy data",
            skill: "sheet-cleaning",
            objective: { text: "Find and fix duplicates, inconsistent labels and mixed units before analysing.", bloom: "apply" },
            concepts: ["Duplicates", "Consistent labels", "Units"],
            slides: [
              { title: "Real data is messy", points: ["Typos split one group into many", "Duplicates count twice", "Mixed units break every average"] },
              { title: "A cleaning checklist", points: ["Trim spaces, fix case", "Remove duplicate rows", "Convert to one unit"] },
            ],
            transcript: [
              "Nearly all real data arrives messy. Cleaning it is most of an analyst's job.",
              "Look at these route names: Madina-Circle, madina - circle, Madina–Circle with a space. A computer sees three different routes.",
              "Standardise labels first: trim spaces, fix capitals and hyphens so they match exactly.",
              "Next, duplicates. If the same row appears three times, it's counted three times. Keep one.",
              "Finally, units. Some fares are in pesewas, some in cedis. Convert everything to one unit before you calculate anything.",
            ],
            body: `## The three usual problems
1. **Inconsistent labels** — "Madina-Circle" vs "madina - circle". Use TRIM, PROPER or Find & Replace so every label matches.
2. **Duplicates** — the same response entered twice. Use *Remove duplicates* and keep a note of how many you removed.
3. **Mixed units** — 850 (pesewas) and 8.50 (cedis). Pick one unit and convert.

## Document what you did
Keep a short cleaning log. Anyone checking your work — including you next month — needs to know what changed.`,
            examples: [
              "Another example: a survey has \"Female\", \"F\" and \"female\". Standardise to one value before counting.",
              "Another: temperatures recorded in °C and °F in one column — convert all to °C before averaging.",
            ],
            items: ["sh7", "sh8", "sh9"],
          },
          {
            title: "The right chart for the question",
            skill: "sheet-charts",
            objective: { text: "Choose and build an honest chart that answers a specific question.", bloom: "evaluate" },
            concepts: ["Chart choice", "Baselines", "Sorting"],
            slides: [
              { title: "Start from the question", points: ["Change over time → line", "Compare categories → sorted bar", "Parts of a whole → (rarely) pie"] },
              { title: "Keep it honest", points: ["Bars start at zero", "Label axes and units", "One message per chart"] },
            ],
            transcript: [
              "A chart should answer one question at a glance. So start with the question, not the chart type.",
              "How did a fare change over the year? That's change over time — use a line.",
              "Which route is most expensive? That's comparing categories — use bars, sorted from highest to lowest.",
              "Watch the axis. If bars start at eight cedis instead of zero, a tiny difference looks enormous.",
              "Label your axes, say the units, and give the chart a title that states the finding.",
            ],
            body: `## Match the chart to the question
| Question | Chart |
|---|---|
| How did it change over time? | Line |
| Which is biggest? | Sorted bar |
| How are two numbers related? | Scatter |

## Honest charts
- **Bars start at zero.** A truncated axis exaggerates differences.
- **Titles state the finding:** "Madina fares rose 40% since March", not "Fares chart".`,
            examples: [
              "Another example: to show rainfall across 12 months use a line or columns in month order — not a pie.",
              "Another: comparing exam pass rates across 10 schools — sorted horizontal bars make the ranking readable.",
            ],
            items: ["sh10", "sh11", "sh12"],
            videoQuestion: "sh11",
          },
        ],
      },
    ],
  },
  {
    slug: "statistics-in-everyday-life",
    modules: [
      {
        title: "Describing data",
        lessons: [
          {
            title: "Which average?",
            skill: "stats-averages",
            objective: { text: "Choose between mean, median and mode and justify the choice.", bloom: "evaluate" },
            concepts: ["Mean", "Median", "Mode", "Outliers"],
            slides: [
              { title: "Three averages", points: ["Mean: total ÷ count", "Median: the middle value", "Mode: the most common"] },
              { title: "Outliers change the mean", points: ["5, 5, 6, 6, 40 → mean 12.4", "Median stays 6", "Skewed data → use the median"] },
            ],
            transcript: [
              "\"Average\" can mean three different things, and choosing the wrong one misleads people.",
              "The mean adds everything up and divides by how many there are.",
              "The median sorts the values and takes the middle one. The mode is the value that appears most often.",
              "Here are five trotro fares: 5, 5, 6, 6 — and 40, because someone took a taxi. The mean is 12.40. Nobody paid that.",
              "The median is 6, which describes a typical ride. When data has extreme values, prefer the median.",
            ],
            body: `## Mean, median, mode
- **Mean** = total ÷ count. Uses every value, so extreme values pull it.
- **Median** = the middle of the sorted values. Resists outliers.
- **Mode** = the most common value. Useful for categories ("most common route").

## Which one?
Incomes, prices and fares are usually **skewed** — a few very large values. Report the **median** and say why.`,
            examples: [
              "Another example: salaries in a small company are 1,200, 1,300, 1,400 and 25,000 (the owner). The median (1,350) describes staff pay far better than the mean (7,225).",
              "Another: shoe sizes sold in a shop — the mode tells the owner which size to stock most.",
            ],
            items: ["st1", "st2", "st3"],
            videoQuestion: "st1",
          },
          {
            title: "Spread: the part averages hide",
            skill: "stats-spread",
            objective: { text: "Describe the spread of data using range and interquartile range.", bloom: "understand" },
            concepts: ["Range", "Interquartile range", "Variation"],
            slides: [
              { title: "Same middle, different story", points: ["Route A: 6–8 cedis", "Route B: 3–15 cedis", "Both have median 7"] },
              { title: "Measures of spread", points: ["Range = max − min", "IQR = middle 50%", "IQR ignores outliers"] },
            ],
            transcript: [
              "Two routes both have a median fare of seven cedis. Are they the same? Not at all.",
              "On route A fares go from six to eight. On route B they swing from three to fifteen.",
              "The range — largest minus smallest — captures that. But one strange value can blow the range up.",
              "The interquartile range looks at the middle half of the data, so outliers barely move it.",
              "Always report a middle and a spread together.",
            ],
            body: `## Range
**Range = largest − smallest.** Quick, but one outlier changes it completely.

## Interquartile range (IQR)
Sort the data, split it into quarters, and take **upper quartile − lower quartile**. It describes the middle 50% and ignores extremes.

## Why it matters
A commuter cares whether a route is **predictable**. Same median, bigger spread = less predictable.`,
            examples: [
              "Another example: two classes both average 60% in a test, but one ranges 55–65 and the other 20–95. The second class needs very different support.",
              "Another: rainfall with the same yearly average but huge monthly spread means more flood and drought risk.",
            ],
            items: ["st4", "st5", "st6"],
          },
        ],
      },
      {
        title: "Thinking critically and telling the story",
        lessons: [
          {
            title: "Charts and claims that mislead",
            skill: "stats-critical",
            objective: { text: "Identify misleading charts, small samples and correlation-causation errors.", bloom: "analyse" },
            concepts: ["Sample size", "Cherry-picking", "Correlation vs causation"],
            slides: [
              { title: "Questions to ask", points: ["How many were measured?", "Is it representative?", "Could something else explain it?"] },
              { title: "Classic traps", points: ["Tiny or biased samples", "One cherry-picked example", "Correlation ≠ causation"] },
            ],
            transcript: [
              "Numbers sound convincing. That's exactly why we need to question them.",
              "\"Fares up 200 percent!\" — from one route that went from one cedi to three. One example is not the whole city.",
              "\"Ghanaians prefer trotros\" — from twelve people. Too small, and probably not representative.",
              "Ice-cream sales and drownings rise together. Does ice cream cause drowning? No. Hot weather drives both.",
              "Before you believe or share a number, ask: how many, who, and what else could explain it?",
            ],
            body: `## Three questions for any claim
1. **How many?** Small samples swing wildly.
2. **Who?** Was the sample representative, or picked to make a point?
3. **What else?** A third factor may explain a relationship.

## Correlation is not causation
Two things moving together doesn't mean one causes the other. Look for a common cause.`,
            examples: [
              "Another example: \"Students who own laptops score higher\" — family income may explain both.",
              "Another: a chart of one week's exchange rate can't show a long-term trend.",
            ],
            items: ["st7", "st8", "st9"],
            videoQuestion: "st8",
          },
          {
            title: "From numbers to a message",
            skill: "data-story",
            objective: { text: "Write a clear, evidence-backed recommendation for a decision-maker.", bloom: "create" },
            concepts: ["Lead with the finding", "Audience", "Checking surprises"],
            slides: [
              { title: "Lead with the answer", points: ["Finding + recommendation first", "Then the evidence", "Then the method (briefly)"] },
              { title: "Make it specific", points: ["Numbers, not adjectives", "Compare to something", "One chart that proves it"] },
            ],
            transcript: [
              "An analysis nobody understands changes nothing. The last step is the message.",
              "Busy decision-makers read the first two lines. Put your finding and recommendation there.",
              "Be specific: \"Fares on three routes rose forty percent in six months — twice the city average.\"",
              "Then give one chart that proves it, and a short note on how you worked it out.",
              "And if a finding surprises you, check your data again before you present it.",
            ],
            body: `## Structure of a one-page brief
1. **Finding** — one sentence, with a number.
2. **Recommendation** — what should happen.
3. **Evidence** — one chart, two or three facts.
4. **Method** — how you got the numbers, briefly.

## Before you send it
If a result surprises you, **recheck** cleaning, units and calculations. Surprises are often errors.`,
            examples: [
              "Another example: \"Clinic waiting times doubled on Mondays (median 94 min vs 45). Recommendation: add one nurse on Monday mornings.\"",
              "Another: \"Girls' science pass rate rose from 41% to 58% after the lab upgrade — extend it to two more schools.\"",
            ],
            items: ["st10", "st11", "st12"],
          },
        ],
      },
    ],
  },
  {
    slug: "sql-for-data-analysis",
    modules: [
      {
        title: "Asking a database questions",
        lessons: [
          {
            title: "SELECT: choosing columns",
            skill: "sql-select",
            objective: { text: "Write SELECT queries that return the needed columns.", bloom: "apply" },
            concepts: ["Tables", "Columns", "DISTINCT"],
            slides: [
              { title: "SELECT … FROM …", points: ["SELECT route, fare FROM fares;", "* means every column", "End with a semicolon"] },
              { title: "DISTINCT", points: ["Removes repeated values", "SELECT DISTINCT route FROM fares;"] },
            ],
            transcript: [
              "A database stores data in tables — rows and columns, like a spreadsheet that can hold millions of rows.",
              "To ask for data you write a query. SELECT says which columns, FROM says which table.",
              "SELECT route, fare FROM fares returns just those two columns.",
              "SELECT star returns every column — handy for a quick look, wasteful in real reports.",
              "Add DISTINCT to see each value only once: SELECT DISTINCT route FROM fares lists every route.",
            ],
            body: `## Your first query
\`\`\`
SELECT route, fare
FROM fares;
\`\`\`
- **SELECT** lists the columns you want.
- **FROM** names the table.
- \`*\` means all columns.

## DISTINCT
\`SELECT DISTINCT route FROM fares;\` lists each route once.`,
            examples: ["Another example: SELECT name, region FROM schools; lists every school's name and region.", "Another: SELECT DISTINCT region FROM schools; shows which regions appear in the table."],
            items: ["sq1", "sq2", "sq3"],
          },
          {
            title: "WHERE: filtering rows",
            skill: "sql-filter",
            objective: { text: "Filter rows with WHERE, AND, OR and LIKE.", bloom: "apply" },
            concepts: ["Conditions", "AND / OR", "Patterns"],
            slides: [
              { title: "WHERE keeps matching rows", points: ["WHERE fare > 10", "Text in single quotes", "WHERE comes after FROM"] },
              { title: "Combining conditions", points: ["AND: both true", "OR: either true", "LIKE 'Kaneshie%' for patterns"] },
            ],
            transcript: [
              "Most questions need only some rows. WHERE keeps the rows that match a condition.",
              "SELECT star FROM fares WHERE fare greater than ten returns only the expensive rides.",
              "Combine conditions with AND when both must be true, OR when either will do.",
              "For text patterns use LIKE with a percent sign: route LIKE 'Kaneshie%' finds every route starting with Kaneshie.",
            ],
            body: `## WHERE
\`\`\`
SELECT * FROM fares
WHERE route = 'Madina' AND month = 6;
\`\`\`
- **AND** — both conditions must hold.
- **OR** — either one.
- **LIKE 'Kaneshie%'** — text that starts with Kaneshie (\`%\` = anything).`,
            examples: ["Another example: SELECT * FROM students WHERE region = 'Ashanti' AND year = 2;", "Another: WHERE name LIKE '%SHS' finds names ending in SHS."],
            items: ["sq4", "sq5", "sq6"],
            videoQuestion: "sq5",
          },
        ],
      },
      {
        title: "Summaries and joins",
        lessons: [
          {
            title: "GROUP BY: totals per group",
            skill: "sql-aggregate",
            objective: { text: "Summarise data per group with GROUP BY, COUNT, AVG and HAVING.", bloom: "apply" },
            concepts: ["Aggregates", "Groups", "HAVING"],
            slides: [
              { title: "One row per group", points: ["GROUP BY route", "AVG(fare), COUNT(*), SUM(…)", "Each group is summarised"] },
              { title: "Filter groups with HAVING", points: ["WHERE filters rows first", "HAVING filters groups after", "HAVING COUNT(*) > 50"] },
            ],
            transcript: [
              "Analysts rarely want every row. They want summaries: the average fare per route, the number of trips per month.",
              "GROUP BY route makes one group per route. Then AVG of fare works inside each group.",
              "COUNT star counts rows in each group — how many observations per route.",
              "To keep only some groups, use HAVING, which runs after grouping. WHERE runs before.",
              "SELECT route, COUNT(*) FROM fares GROUP BY route HAVING COUNT(*) > 50 keeps well-measured routes only.",
            ],
            body: `## Aggregates per group
\`\`\`
SELECT route, AVG(fare) AS avg_fare, COUNT(*) AS trips
FROM fares
GROUP BY route
HAVING COUNT(*) > 50;
\`\`\`
- **GROUP BY** makes groups.
- **AVG, COUNT, SUM, MIN, MAX** summarise each group.
- **HAVING** filters groups; **WHERE** filters rows before grouping.`,
            examples: ["Another example: SELECT region, COUNT(*) FROM schools GROUP BY region; counts schools per region.", "Another: SELECT class, AVG(score) FROM results GROUP BY class HAVING AVG(score) < 50; finds classes needing support."],
            items: ["sq7", "sq8", "sq9"],
            videoQuestion: "sq7",
          },
          {
            title: "JOIN: combining tables",
            skill: "sql-joins",
            objective: { text: "Combine related tables with INNER and LEFT JOIN.", bloom: "apply" },
            concepts: ["Keys", "INNER JOIN", "LEFT JOIN"],
            slides: [
              { title: "Tables relate through keys", points: ["routes.id is a primary key", "fares.route_id is a foreign key", "JOIN … ON matches them"] },
              { title: "Which join?", points: ["INNER: only matches", "LEFT: every left row", "Unmatched → NULL"] },
            ],
            transcript: [
              "Real databases split data across tables. Fares store a route_id; the routes table stores each route's name.",
              "route_id in fares is a foreign key — it points at the id in routes.",
              "JOIN routes ON fares.route_id equals routes.id puts the name next to every fare.",
              "An inner join drops fares whose route is missing. A left join keeps every fare and fills the gaps with NULL.",
            ],
            body: `## JOIN
\`\`\`
SELECT f.fare, r.name
FROM fares f
JOIN routes r ON f.route_id = r.id;
\`\`\`
- **Primary key**: the unique id of a row (\`routes.id\`).
- **Foreign key**: a column pointing to another table's key (\`fares.route_id\`).
- **INNER JOIN** keeps matches only; **LEFT JOIN** keeps every left row.`,
            examples: ["Another example: students JOIN classes ON students.class_id = classes.id shows each student's class name.", "Another: a LEFT JOIN of schools to inspections shows schools never inspected (NULL dates)."],
            items: ["sq10", "sq11", "sq12"],
          },
        ],
      },
    ],
  },
  {
    slug: "quadratic-functions-made-visual",
    modules: [
      {
        title: "Seeing quadratics",
        lessons: [
          {
            title: "What a, b and c do",
            skill: "quad-graphs",
            objective: { text: "Describe how a, b and c change the graph of y = ax² + bx + c.", bloom: "understand" },
            concepts: ["Parabola", "y-intercept", "Direction of opening"],
            slides: [
              { title: "The parabola", points: ["y = ax² + bx + c", "a > 0 opens up (∪)", "a < 0 opens down (∩)"] },
              { title: "Reading the graph", points: ["c is the y-intercept", "0, 1 or 2 x-intercepts", "Symmetric about the turning point"] },
            ],
            transcript: [
              "Every quadratic graph is a parabola — the path of a ball thrown in the air.",
              "The sign of a decides the shape. Positive a opens upwards like a cup; negative a opens downwards like a hill.",
              "c is where the graph crosses the y-axis, because at x equals zero only c is left.",
              "A parabola can miss the x-axis, touch it once, or cross it twice. Those crossings are the solutions of ax² + bx + c = 0.",
            ],
            body: `## The shape
- **a > 0** → opens upwards (∪), has a minimum.
- **a < 0** → opens downwards (∩), has a maximum.
- Bigger **|a|** → narrower curve.

## Where it meets the axes
- **y-intercept = c** (put x = 0).
- **x-intercepts**: 0, 1 or 2 — the roots of the equation.`,
            examples: ["Another example: y = 2x² − 3 opens upwards, is narrower than y = x², and crosses the y-axis at −3.", "Another: y = −x² + 4 is a hill with its top at (0, 4) and crosses the x-axis at −2 and 2."],
            items: ["qu1", "qu2", "qu3"],
            videoQuestion: "qu1",
          },
          {
            title: "Completing the square",
            skill: "quad-square",
            objective: { text: "Rewrite a quadratic by completing the square to find its turning point.", bloom: "apply" },
            concepts: ["Perfect squares", "Turning point", "Vertex form"],
            slides: [
              { title: "The method", points: ["Halve b", "Square it, add and subtract", "x² + 6x + 5 = (x + 3)² − 4"] },
              { title: "Read the turning point", points: ["y = (x − h)² + k", "Turning point (h, k)", "(x + 3)² − 4 → (−3, −4)"] },
            ],
            transcript: [
              "Completing the square rewrites a quadratic so its turning point jumps out at you.",
              "Take x² + 6x + 5. Halve the six to get three. (x + 3)² gives x² + 6x + 9.",
              "We have five, not nine, so subtract four: (x + 3)² − 4.",
              "In the form (x − h)² + k the turning point is (h, k). Here that's minus three, minus four.",
            ],
            body: `## Steps (a = 1)
1. Halve **b** → p.
2. Write **(x + p)²**, which expands to x² + bx + p².
3. Fix the constant: **(x + p)² + (c − p²)**.

## Turning point
In **y = (x − h)² + k** the turning point is **(h, k)** — the smallest value of a square is 0.`,
            examples: ["Another example: x² − 4x + 1 = (x − 2)² − 3, so the turning point is (2, −3).", "Another: x² + 10x = (x + 5)² − 25, turning point (−5, −25)."],
            items: ["qu4", "qu5", "qu6"],
          },
        ],
      },
      {
        title: "Solving and applying",
        lessons: [
          {
            title: "The quadratic formula",
            skill: "quad-formula",
            objective: { text: "Solve quadratic equations with the formula and interpret the discriminant.", bloom: "apply" },
            concepts: ["Formula", "Discriminant", "Number of roots"],
            slides: [
              { title: "x = (−b ± √(b² − 4ac)) / 2a", points: ["Works for every quadratic", "Identify a, b, c carefully", "Watch the signs"] },
              { title: "The discriminant b² − 4ac", points: ["> 0: two roots", "= 0: one root", "< 0: no real roots"] },
            ],
            transcript: [
              "When factorising is hard, the quadratic formula always works.",
              "x equals minus b, plus or minus the square root of b² minus 4ac, all over 2a.",
              "The part under the square root, b² − 4ac, is the discriminant. It tells you how many roots to expect.",
              "For x² − 5x + 6: a is 1, b is −5, c is 6. The discriminant is 25 minus 24, which is 1. So x is 5 plus or minus 1, over 2: three or two.",
            ],
            body: `## The formula
**x = (−b ± √(b² − 4ac)) / 2a**

## The discriminant
| b² − 4ac | Roots |
|---|---|
| > 0 | two real roots |
| = 0 | one (repeated) root |
| < 0 | no real roots |

Always write down **a, b and c with their signs** before substituting.`,
            examples: ["Another example: 2x² + 3x − 2 = 0 → discriminant 9 + 16 = 25 → x = (−3 ± 5)/4 → 0.5 or −2.", "Another: x² + 2x + 5 = 0 has discriminant 4 − 20 = −16, so the parabola never meets the x-axis."],
            items: ["qu7", "qu8", "qu9"],
            videoQuestion: "qu8",
          },
          {
            title: "Quadratics in real life",
            skill: "quad-word",
            objective: { text: "Model real situations with quadratics and interpret solutions in context.", bloom: "apply" },
            concepts: ["Modelling", "Maximum/minimum", "Rejecting solutions"],
            slides: [
              { title: "Projectiles", points: ["h = 20t − 5t²", "Top at t = −b/2a = 2", "Max height 20 m"] },
              { title: "Check the context", points: ["Lengths can't be negative", "Time starts at 0", "Answer the question asked"] },
            ],
            transcript: [
              "Quadratics describe thrown balls, areas, and profits. Let's use one.",
              "A ball's height is h = 20t − 5t². The top of the path is the turning point, at t equals minus b over 2a, which is 2 seconds.",
              "Put t = 2 back in: 40 minus 20 is 20 metres. That's the maximum height.",
              "When you solve a real problem, check each answer against the situation. A length of minus three metres gets rejected.",
            ],
            body: `## Modelling steps
1. Write the quadratic from the situation.
2. Solve, or find the turning point with **t = −b/2a**.
3. **Interpret**: units, sensible values, and the question actually asked.

## Rejecting solutions
Negative lengths, negative times or impossible quantities are discarded.`,
            examples: ["Another example: a farmer has 40 m of fence for a rectangle against a wall. Area = x(40 − 2x) is largest at x = 10 m.", "Another: profit P = −2n² + 80n peaks at n = 20 items."],
            items: ["qu10", "qu11", "qu12"],
          },
        ],
      },
    ],
  },
  {
    slug: "python-for-beginners",
    modules: [
      {
        title: "Programs that remember and decide",
        lessons: [
          {
            title: "Variables, text and lists",
            skill: "py-variables",
            objective: { text: "Store and update numbers, text and lists in variables.", bloom: "apply" },
            concepts: ["Variables", "Types", "Lists"],
            slides: [
              { title: "Variables", points: ["fare = 7", "fare = fare + 2 → 9", "name = \"Ama\""] },
              { title: "Lists", points: ["cities = [\"Accra\", \"Kumasi\"]", "len(cities) → 2", "cities[0] → \"Accra\""] },
            ],
            transcript: [
              "A variable is a named box that holds a value. fare = 7 puts seven in a box called fare.",
              "fare = fare + 2 looks odd, but Python works out the right side first — nine — and puts it back in the box.",
              "Text goes in quotes: name = \"Ama\".",
              "A list holds many values in square brackets. len tells you how many there are, and cities[0] gives the first.",
            ],
            body: `## Variables
\`\`\`
fare = 7
fare = fare + 2   # now 9
name = "Ama"
\`\`\`

## Lists
\`\`\`
cities = ["Accra", "Kumasi", "Tamale"]
len(cities)   # 3
cities[0]     # "Accra"
\`\`\``,
            examples: ["Another example: scores = [72, 85, 64]; print(len(scores)) prints 3.", "Another: total = 0 then total = total + 5 makes total 5."],
            items: ["py1", "py2", "py3"],
          },
          {
            title: "Decisions with if/else",
            skill: "py-decisions",
            objective: { text: "Write programs that choose between actions with if/elif/else.", bloom: "apply" },
            concepts: ["Conditions", "Comparison", "Indentation"],
            slides: [
              { title: "if / else", points: ["if score >= 50:", "    print(\"Pass\")", "else: print(\"Try again\")"] },
              { title: "= vs ==", points: ["= stores a value", "== compares", "13 <= age <= 17"] },
            ],
            transcript: [
              "Programs become useful when they make decisions.",
              "if score is greater than or equal to fifty, print Pass. Otherwise — else — print Try again.",
              "Indentation matters in Python: the indented lines belong to the if.",
              "One trap: a single equals stores a value. Double equals asks whether two things are equal.",
            ],
            body: `## if / elif / else
\`\`\`
if score >= 70:
    print("Distinction")
elif score >= 50:
    print("Pass")
else:
    print("Try again")
\`\`\`
- **Indentation** shows which lines belong to each branch.
- **=** stores; **==** compares.`,
            examples: ["Another example: if balance < fare: print(\"Top up your card\").", "Another: if 13 <= age <= 17: print(\"Guardian consent needed\")."],
            items: ["py4", "py5", "py6"],
            videoQuestion: "py4",
          },
        ],
      },
      {
        title: "Repeating and organising",
        lessons: [
          {
            title: "Loops",
            skill: "py-loops",
            objective: { text: "Repeat work with for and while loops.", bloom: "apply" },
            concepts: ["for", "range", "while"],
            slides: [
              { title: "for loops", points: ["for i in range(4): → 0,1,2,3", "for n in [2,4,6]:", "Great for known repeats"] },
              { title: "while loops", points: ["while answer != \"yes\":", "Repeat until something changes", "Make sure it can stop!"] },
            ],
            transcript: [
              "Loops repeat work so you don't have to.",
              "for i in range four runs four times, with i taking 0, 1, 2 and 3.",
              "You can loop over a list too, adding each number to a running total.",
              "When you don't know how many repeats you need — keep asking until the answer is right — use a while loop.",
            ],
            body: `## for
\`\`\`
total = 0
for n in [2, 4, 6]:
    total = total + n   # 12
\`\`\`

## while
\`\`\`
answer = ""
while answer != "yes":
    answer = input("Ready? ")
\`\`\``,
            examples: ["Another example: for city in cities: print(city) prints every city on its own line.", "Another: while lives > 0: keeps a game running until lives run out."],
            items: ["py7", "py8", "py9"],
          },
          {
            title: "Functions",
            skill: "py-functions",
            objective: { text: "Write and call functions that take inputs and return results.", bloom: "apply" },
            concepts: ["def", "Parameters", "return"],
            slides: [
              { title: "def and return", points: ["def double(x):", "    return x * 2", "double(7) → 14"] },
              { title: "Why functions?", points: ["Reuse the same steps", "Test in one place", "No return → None"] },
            ],
            transcript: [
              "A function packages steps under a name so you can reuse them.",
              "def double of x, return x times 2. Call double of 7 and you get 14.",
              "Functions make programs easier to test and change — fix a bug once, and it's fixed everywhere.",
              "If a function has no return statement, Python gives back None.",
            ],
            body: `## Defining and calling
\`\`\`
def score_message(score):
    if score >= 50:
        return "Pass"
    return "Try again"

print(score_message(64))   # Pass
\`\`\`
- **Parameters** are the inputs.
- **return** sends a result back. Without it, you get **None**.`,
            examples: ["Another example: def area(w, h): return w * h — area(3, 4) is 12.", "Another: def greet(name): return \"Hello \" + name."],
            items: ["py10", "py11", "py12"],
          },
        ],
      },
    ],
  },
];

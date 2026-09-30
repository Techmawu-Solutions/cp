import type { Item } from "@/lib/types";

/**
 * Item bank (spec section 14): instructor-authored practice and mastery-check items,
 * each tagged with one skill, a difficulty, a hint ladder (nudge → strategy →
 * worked step) and the lesson that teaches it — which the tutor cites.
 */

type Hints = [string, string, string];
const src = (courseSlug: string, lesson: number) => ({ courseSlug, activityId: `${courseSlug}.l${lesson}.read` });

const mcq = (id: string, skill: string, stem: string, options: string[], answer: number, hints: Hints, explanation: string, difficulty: 1 | 2 | 3, source: Item["source"]): Item => ({ id, skill, type: "mcq", stem, options, answer: String(answer), hints, explanation, difficulty, source });
const num = (id: string, skill: string, stem: string, answer: number, hints: Hints, explanation: string, difficulty: 1 | 2 | 3, source: Item["source"], tolerance = 0): Item => ({ id, skill, type: "numeric", stem, answer: String(answer), tolerance, hints, explanation, difficulty, source });

const SH = "spreadsheets-that-think";
const ST = "statistics-in-everyday-life";
const SQ = "sql-for-data-analysis";
const QU = "quadratic-functions-made-visual";
const PY = "python-for-beginners";

export const ITEMS: Item[] = [
  // ---------------------------------------------------------------- spreadsheets
  mcq("sh1", "sheet-formulas", "Cell B2 holds a price and C2 a quantity. Which formula gives the total and still works when you change the price?", ["=12*4", "=B2*C2", "=B2+C2", "B2*C2"], 1,
    ["Which option uses the cells, not the numbers inside them?", "A formula starts with = and refers to cells so it updates.", "Price × quantity, written with references: =B2*C2."], "=B2*C2 multiplies the cells, so it updates when either value changes. \"B2*C2\" without = is just text.", 1, src(SH, 1)),
  mcq("sh2", "sheet-formulas", "You copy =B2*C2 from row 2 down to row 3. What does the copy become?", ["=B2*C2", "=B3*C3", "=B3*C2", "=C3*D3"], 1,
    ["Relative references move with the formula.", "Copying down one row adds 1 to each row number.", "B2→B3 and C2→C3, so =B3*C3."], "Relative references shift when copied, which is why one formula can fill a whole column.", 2, src(SH, 1)),
  mcq("sh3", "sheet-formulas", "Which reference stays fixed on the tax rate in F1 when the formula is copied down?", ["F1", "$F$1", "F$", "#F1"], 1,
    ["You need an absolute reference.", "The dollar sign locks a column or row.", "$F$1 locks both column F and row 1."], "$F$1 is absolute: copying the formula never changes it.", 2, src(SH, 1)),
  mcq("sh4", "sheet-functions", "Which function gives the average of B2 to B31?", ["=SUM(B2:B31)", "=AVERAGE(B2:B31)", "=MEAN(B2,B31)", "=COUNT(B2:B31)"], 1,
    ["Look for the function whose name says what you want.", "B2:B31 is a range; you want its average.", "=AVERAGE(B2:B31)."], "AVERAGE adds the values in the range and divides by how many there are.", 1, src(SH, 2)),
  mcq("sh5", "sheet-functions", "=IF(B2>=50, \"Pass\", \"Retake\") — what does it show when B2 is 50?", ["Pass", "Retake", "An error", "50"], 0,
    [">= means \"greater than or equal to\".", "Is 50 greater than or equal to 50?", "Yes — so the first result, \"Pass\"."], "50 >= 50 is true, so IF returns its first value.", 1, src(SH, 2)),
  num("sh6", "sheet-functions", "=SUM(B2:B4) where B2=12, B3=7.5, B4=0.5. What is the result?", 20,
    ["SUM adds every value in the range.", "12 + 7.5 + 0.5", "= 20"], "SUM adds 12, 7.5 and 0.5 to get 20.", 1, src(SH, 2)),
  mcq("sh7", "sheet-cleaning", "Route names include \"Madina-Circle\", \"madina - circle\" and \"Madina–Circle \". What should you do first?", ["Delete two of them", "Standardise them to one spelling", "Average them", "Leave them — the chart will merge them"], 1,
    ["Would a computer see these as the same route?", "Inconsistent labels split one group into many.", "Standardise: trim spaces, fix case and hyphens so they match."], "Unless labels match exactly, totals per route will be split and wrong.", 1, src(SH, 3)),
  mcq("sh8", "sheet-cleaning", "Fares are recorded as 850 (pesewas) in some rows and 8.50 (cedis) in others. Best fix?", ["Delete the pesewa rows", "Convert everything to cedis", "Use the median to hide it", "Nothing — it evens out"], 1,
    ["Can you compare numbers in different units?", "Choose one unit and convert the others.", "850 pesewas ÷ 100 = GH₵8.50, so convert to cedis."], "Mixed units make every average meaningless; convert to one unit.", 2, src(SH, 3)),
  mcq("sh9", "sheet-cleaning", "The same survey response appears three times. What is it called and what do you do?", ["An outlier — keep it", "A duplicate — remove the extra copies", "A blank — fill it", "A formula — copy it"], 1,
    ["It's the same row repeated.", "Repeated rows count one response several times.", "Duplicates: keep one, remove the rest."], "Duplicates inflate counts and bias averages.", 1, src(SH, 3)),
  mcq("sh10", "sheet-charts", "You want to show how one route's fare changed month by month. Which chart?", ["Pie chart", "Line chart", "Scatter of random routes", "Table only"], 1,
    ["The question is about change over time.", "Which chart joins points in time order?", "A line chart."], "Line charts show change over time; pies show parts of a whole.", 1, src(SH, 4)),
  mcq("sh11", "sheet-charts", "A bar chart's y-axis starts at GH₵8.00 instead of 0. What's the risk?", ["None", "Small differences look huge", "Bars disappear", "It hides the title"], 1,
    ["Compare bar heights with and without a zero baseline.", "Truncated axes exaggerate differences.", "A 10-pesewa change can look like doubling."], "Bars should start at zero so their lengths are honest.", 2, src(SH, 4)),
  mcq("sh12", "sheet-charts", "Which chart compares the median fare across 18 routes most clearly?", ["Sorted bar chart", "Pie chart", "Line chart", "3D pie chart"], 0,
    ["You are comparing categories, not time.", "Sorting makes ranking obvious.", "A bar chart sorted from highest to lowest."], "Sorted bars make comparisons across many categories easy.", 2, src(SH, 4)),

  // ---------------------------------------------------------------- statistics
  mcq("st1", "stats-averages", "Five fares: 5, 5, 6, 6, 40 (a taxi slipped in). Which average best describes a typical fare?", ["Mean (12.4)", "Median (6)", "Mode (5 and 6)", "Maximum (40)"], 1,
    ["One value is very different from the rest.", "Which average ignores extreme values?", "The median: sort and take the middle — 6."], "The median resists outliers; the mean is dragged up to 12.4 by the taxi fare.", 2, src(ST, 1)),
  num("st2", "stats-averages", "What is the mean of 4, 6, 8 and 10?", 7,
    ["Mean = total ÷ how many.", "4 + 6 + 8 + 10 = 28", "28 ÷ 4 = 7"], "Add them (28) and divide by the count (4): 7.", 1, src(ST, 1)),
  num("st3", "stats-averages", "What is the median of 3, 9, 4, 7, 10?", 7,
    ["Sort the numbers first.", "3, 4, 7, 9, 10 — take the middle one.", "The middle of five values is the 3rd: 7."], "Sorted: 3, 4, 7, 9, 10. The middle value is 7.", 1, src(ST, 1)),
  num("st4", "stats-spread", "Fares on a route: 6, 7, 7, 8, 12. What is the range?", 6,
    ["Range = largest − smallest.", "Largest 12, smallest 6.", "12 − 6 = 6"], "The range is the gap between the biggest and smallest values.", 1, src(ST, 2)),
  mcq("st5", "stats-spread", "Two routes both have a median fare of GH₵7. Route A: 6–8. Route B: 3–15. What can you say?", ["They're the same", "Route B's fares are much less predictable", "Route A is more expensive", "Route B is cheaper"], 1,
    ["Same middle, different spread.", "A wider range means more variation.", "Route B varies far more — less predictable for commuters."], "Averages alone hide variation; spread tells you how predictable something is.", 2, src(ST, 2)),
  mcq("st6", "stats-spread", "Which measure of spread is least affected by one extreme value?", ["Range", "Interquartile range", "Maximum", "Sum"], 1,
    ["The range uses the most extreme values.", "The IQR uses the middle half of the data.", "Interquartile range."], "The IQR looks at the middle 50%, so outliers barely move it.", 3, src(ST, 2)),
  mcq("st7", "stats-critical", "A headline says \"Fares up 200%!\" based on one route going from GH₵1 to GH₵3. What should you ask first?", ["Is it true for most routes?", "What colour is the chart?", "Who drew it?", "Nothing — 200% is 200%"], 0,
    ["Is one route representative?", "Think about sample size and cherry-picking.", "Check whether it holds across routes before generalising."], "One cherry-picked example can't describe all fares.", 2, src(ST, 3)),
  mcq("st8", "stats-critical", "A chart shows ice-cream sales and drownings rising together. Which is most likely?", ["Ice cream causes drowning", "Hot weather drives both", "Drowning causes ice-cream sales", "It's a typo"], 1,
    ["Correlation isn't causation.", "Is there a third factor behind both?", "Hot weather increases both swimming and ice-cream buying."], "A hidden common cause (hot weather) explains the pattern.", 2, src(ST, 3)),
  mcq("st9", "stats-critical", "A survey of 12 people claims \"Ghanaians prefer tro-tros\". The main weakness?", ["Too few people, likely not representative", "Too many questions", "It uses percentages", "No chart"], 0,
    ["How many people answered?", "Could 12 people represent a country?", "The sample is tiny and probably not representative."], "Small, unrepresentative samples can't support national claims.", 1, src(ST, 3)),
  mcq("st10", "data-story", "You're briefing an assembly member with 5 minutes. What goes first?", ["Your main finding and recommendation", "Your data-cleaning steps", "Every chart you made", "A definition of the median"], 0,
    ["What does a busy decision-maker need?", "Lead with the answer, then the evidence.", "Main finding + recommendation first."], "Put the conclusion first; supporting evidence follows.", 1, src(ST, 4)),
  mcq("st11", "data-story", "Which sentence is the clearest message?", ["Data was analysed across variables.", "Fares on 3 routes rose 40% in six months — more than twice the city average.", "There are some changes in fares.", "See chart 7."], 1,
    ["Which one says something specific?", "Good messages have numbers and comparison.", "The second: specific, quantified, compared."], "Specific, quantified and compared is what makes a message stick.", 1, src(ST, 4)),
  mcq("st12", "data-story", "Your finding surprises you. What should you do before presenting it?", ["Present it immediately", "Check the data and method again", "Remove it", "Round it up"], 1,
    ["Surprises are often errors.", "Recheck cleaning, units and calculations.", "Verify before you present."], "Surprising results deserve a second check — often they are data errors.", 2, src(ST, 4)),

  // ---------------------------------------------------------------- SQL
  mcq("sq1", "sql-select", "Which query returns only the route and fare columns from table fares?", ["SELECT * FROM fares;", "SELECT route, fare FROM fares;", "GET route, fare;", "SELECT fares FROM route, fare;"], 1,
    ["SELECT lists the columns, FROM names the table.", "You want two columns from one table.", "SELECT route, fare FROM fares;"], "SELECT picks columns; * would return every column.", 1, src(SQ, 1)),
  mcq("sq2", "sql-select", "What does SELECT * mean?", ["The first column", "Every column", "Only numbers", "Count the rows"], 1,
    ["* is a wildcard.", "Wildcard for columns means…", "All columns."], "* returns every column of the table.", 1, src(SQ, 1)),
  mcq("sq3", "sql-select", "Which query lists each route once?", ["SELECT route FROM fares;", "SELECT DISTINCT route FROM fares;", "SELECT ONCE route FROM fares;", "SELECT route, route FROM fares;"], 1,
    ["Duplicates come back by default.", "One keyword removes duplicates.", "SELECT DISTINCT route FROM fares;"], "DISTINCT removes repeated values from the result.", 2, src(SQ, 1)),
  mcq("sq4", "sql-filter", "Which query returns fares above GH₵10?", ["SELECT * FROM fares WHERE fare > 10;", "SELECT * FROM fares IF fare > 10;", "SELECT * WHERE fare > 10 FROM fares;", "SELECT fare > 10 FROM fares;"], 0,
    ["Filtering rows uses one keyword.", "WHERE comes after FROM.", "SELECT * FROM fares WHERE fare > 10;"], "WHERE filters rows and comes after FROM.", 1, src(SQ, 2)),
  mcq("sq5", "sql-filter", "Rows for the Madina route in June: which condition?", ["route = 'Madina' OR month = 6", "route = 'Madina' AND month = 6", "route + month = 'Madina6'", "route LIKE month"], 1,
    ["Both conditions must be true.", "AND needs both; OR needs either.", "route = 'Madina' AND month = 6"], "AND keeps rows that meet both conditions.", 2, src(SQ, 2)),
  mcq("sq6", "sql-filter", "Which finds routes whose name starts with \"Kaneshie\"?", ["WHERE route = 'Kaneshie'", "WHERE route LIKE 'Kaneshie%'", "WHERE route STARTS 'Kaneshie'", "WHERE route IN 'Kaneshie'"], 1,
    ["You need a pattern, not an exact match.", "% matches any characters.", "LIKE 'Kaneshie%'"], "LIKE with % matches text patterns.", 2, src(SQ, 2)),
  mcq("sq7", "sql-aggregate", "Average fare per route?", ["SELECT route, AVG(fare) FROM fares GROUP BY route;", "SELECT AVG(fare) FROM fares;", "SELECT route, fare FROM fares ORDER BY route;", "SELECT route, SUM(route) FROM fares;"], 0,
    ["You want one row per route.", "GROUP BY makes groups; AVG summarises each.", "SELECT route, AVG(fare) FROM fares GROUP BY route;"], "GROUP BY forms one group per route; AVG runs within each group.", 2, src(SQ, 3)),
  mcq("sq8", "sql-aggregate", "How many observations per route?", ["SELECT route, COUNT(*) FROM fares GROUP BY route;", "SELECT COUNT(route) FROM fares;", "SELECT route FROM fares COUNT;", "SELECT SUM(*) FROM fares;"], 0,
    ["Counting rows uses COUNT.", "Per route means GROUP BY route.", "SELECT route, COUNT(*) … GROUP BY route;"], "COUNT(*) counts rows in each group.", 1, src(SQ, 3)),
  mcq("sq9", "sql-aggregate", "Only routes with more than 50 observations — which clause filters groups?", ["WHERE", "HAVING", "ORDER BY", "LIMIT"], 1,
    ["WHERE filters rows before grouping.", "Another clause filters after grouping.", "HAVING COUNT(*) > 50"], "HAVING filters groups after aggregation.", 3, src(SQ, 3)),
  mcq("sq10", "sql-joins", "fares has route_id; routes has id and name. How do you show fares with route names?", ["SELECT * FROM fares, names;", "SELECT f.fare, r.name FROM fares f JOIN routes r ON f.route_id = r.id;", "SELECT fare, name FROM fares WHERE routes;", "JOIN fares TO routes;"], 1,
    ["Match the key in one table to the key in the other.", "JOIN … ON tells SQL how rows relate.", "JOIN routes r ON f.route_id = r.id"], "JOIN combines rows where route_id matches id.", 2, src(SQ, 4)),
  mcq("sq11", "sql-joins", "An inner join drops fares with no matching route. Which join keeps every fare?", ["INNER JOIN", "LEFT JOIN (fares on the left)", "CROSS JOIN", "SELF JOIN"], 1,
    ["Which side must you keep all rows from?", "LEFT JOIN keeps all rows of the left table.", "fares LEFT JOIN routes."], "LEFT JOIN keeps unmatched left rows, with NULLs for the right side.", 3, src(SQ, 4)),
  mcq("sq12", "sql-joins", "What is route_id in the fares table called?", ["A primary key", "A foreign key", "An index", "An aggregate"], 1,
    ["It points at a row in another table.", "Keys that reference another table have a name.", "Foreign key."], "A foreign key refers to the primary key of another table.", 2, src(SQ, 4)),

  // ---------------------------------------------------------------- quadratics
  mcq("qu1", "quad-graphs", "In y = ax² + bx + c, what happens when a is negative?", ["The parabola opens downwards", "It becomes a straight line", "It moves right", "Nothing"], 0,
    ["Try a = −1: y = −x².", "Large x gives large negative y.", "It opens downwards (a ∩ shape)."], "Negative a flips the parabola so it opens downwards.", 1, src(QU, 1)),
  num("qu2", "quad-graphs", "Where does y = x² + 3x + 5 cross the y-axis? (give y)", 5,
    ["The y-axis is where x = 0.", "Put x = 0 into the equation.", "y = 0 + 0 + 5 = 5"], "At x = 0 only c remains, so the intercept is c = 5.", 1, src(QU, 1)),
  mcq("qu3", "quad-graphs", "How many x-intercepts can a parabola have?", ["Only 2", "0, 1 or 2", "Always 1", "Any number"], 1,
    ["Picture a parabola above, touching, or crossing the x-axis.", "It can miss, touch or cross.", "0, 1 or 2."], "Depending on position it misses, touches or crosses the x-axis.", 2, src(QU, 1)),
  mcq("qu4", "quad-square", "x² + 6x + 5 written as (x + p)² + q is…", ["(x + 3)² − 4", "(x + 6)² + 5", "(x + 3)² + 5", "(x − 3)² − 4"], 0,
    ["Halve the x-coefficient: 6 ÷ 2 = 3.", "(x + 3)² = x² + 6x + 9, so adjust the constant.", "x² + 6x + 5 = (x + 3)² − 9 + 5 = (x + 3)² − 4"], "Halve b, square it, and correct the constant: (x + 3)² − 4.", 2, src(QU, 2)),
  num("qu5", "quad-square", "The turning point of y = (x − 2)² + 7 has y-value…", 7,
    ["A square is never negative.", "The smallest (x − 2)² can be is 0.", "Then y = 0 + 7 = 7."], "The minimum occurs when (x − 2)² = 0, giving y = 7 at x = 2.", 2, src(QU, 2)),
  num("qu6", "quad-square", "The turning point of y = (x + 4)² − 1 has x-value…", -4,
    ["When is (x + 4)² smallest?", "(x + 4)² = 0 when x + 4 = 0.", "x = −4"], "The square is zero at x = −4, the turning point.", 2, src(QU, 2)),
  num("qu7", "quad-formula", "For x² − 5x + 6 = 0, what is the discriminant b² − 4ac?", 1,
    ["a = 1, b = −5, c = 6.", "b² = 25, 4ac = 24.", "25 − 24 = 1"], "b² − 4ac = 25 − 24 = 1 (positive, so two real roots).", 1, src(QU, 3)),
  num("qu8", "quad-formula", "Solve x² − 5x + 6 = 0. What is the larger root?", 3,
    ["Use x = (5 ± √1) ÷ 2.", "(5 + 1) ÷ 2 or (5 − 1) ÷ 2.", "3 and 2 — the larger is 3."], "x = (5 ± 1)/2 gives 3 and 2.", 2, src(QU, 3)),
  mcq("qu9", "quad-formula", "If b² − 4ac < 0, the equation has…", ["Two real roots", "One real root", "No real roots", "Infinite roots"], 2,
    ["What is √ of a negative number in real numbers?", "The formula needs √(b² − 4ac).", "No real roots."], "A negative discriminant means the parabola never meets the x-axis.", 2, src(QU, 3)),
  num("qu10", "quad-word", "A ball's height is h = 20t − 5t². At what time t (seconds) is it highest?", 2,
    ["The top is the turning point.", "For at² + bt: t = −b ÷ 2a with a = −5, b = 20.", "t = −20 ÷ (−10) = 2"], "The maximum is at t = −b/2a = 2 seconds.", 3, src(QU, 4)),
  num("qu11", "quad-word", "Same ball: h = 20t − 5t². What is the maximum height in metres?", 20,
    ["Use t = 2 from the turning point.", "h = 20(2) − 5(2²).", "40 − 20 = 20"], "At t = 2, h = 40 − 20 = 20 m.", 3, src(QU, 4)),
  mcq("qu12", "quad-word", "A solution to a length problem comes out as x = −3 or x = 8. Which do you keep?", ["−3", "8", "Both", "Neither"], 1,
    ["Can a length be negative?", "Check each answer against the real situation.", "Keep 8; reject −3."], "Real-world context rules out negative lengths.", 1, src(QU, 4)),

  // ---------------------------------------------------------------- Python
  mcq("py1", "py-variables", "After fare = 7 then fare = fare + 2, what is fare?", ["7", "2", "9", "fare + 2"], 2,
    ["The right side is worked out first.", "fare + 2 = 7 + 2.", "fare becomes 9."], "Assignment evaluates the right side (9) and stores it.", 1, src(PY, 1)),
  mcq("py2", "py-variables", "Which is a list in Python?", ["\"Accra, Kumasi\"", "[\"Accra\", \"Kumasi\"]", "(Accra, Kumasi)", "{Accra}"], 1,
    ["Lists use a particular kind of bracket.", "Square brackets make a list.", "[\"Accra\", \"Kumasi\"]"], "Square brackets create a list of items.", 1, src(PY, 1)),
  mcq("py3", "py-variables", "What does len([4, 8, 15]) return?", ["3", "27", "15", "4"], 0,
    ["len counts something.", "It counts items, not their total.", "Three items: 3."], "len returns the number of items: 3.", 1, src(PY, 1)),
  mcq("py4", "py-decisions", "score = 45. What prints?\nif score >= 50:\n    print(\"Pass\")\nelse:\n    print(\"Try again\")", ["Pass", "Try again", "Nothing", "An error"], 1,
    ["Is 45 >= 50?", "False goes to the else branch.", "Try again."], "45 >= 50 is False, so the else branch runs.", 1, src(PY, 2)),
  mcq("py5", "py-decisions", "Which checks that age is between 13 and 17 inclusive?", ["if 13 <= age <= 17:", "if age = 13 to 17:", "if age > 13 and age < 17:", "if age in 13-17:"], 0,
    ["Inclusive means 13 and 17 count.", "Python allows chained comparisons.", "13 <= age <= 17"], "Chained <= includes both ends.", 2, src(PY, 2)),
  mcq("py6", "py-decisions", "What is the difference between = and ==?", ["None", "= stores a value; == compares", "== stores; = compares", "= is for text only"], 1,
    ["One assigns, one asks a question.", "Comparisons return True or False.", "= assigns, == compares."], "= puts a value in a variable; == tests whether two values are equal.", 1, src(PY, 2)),
  num("py7", "py-loops", "How many times does print run?\nfor i in range(4):\n    print(i)", 4,
    ["range(4) produces some numbers.", "0, 1, 2, 3", "4 times."], "range(4) gives 0, 1, 2, 3 — four iterations.", 1, src(PY, 3)),
  num("py8", "py-loops", "total = 0\nfor n in [2, 4, 6]:\n    total = total + n\nWhat is total?", 12,
    ["The loop adds each number.", "0 + 2 + 4 + 6", "12"], "Each pass adds n: 2 + 4 + 6 = 12.", 2, src(PY, 3)),
  mcq("py9", "py-loops", "Which loop is best for \"keep asking until the answer is right\"?", ["for loop over a list", "while loop", "No loop", "range(10)"], 1,
    ["You don't know how many tries it will take.", "Loop while a condition holds.", "A while loop."], "while repeats until a condition changes — unknown number of repeats.", 2, src(PY, 3)),
  mcq("py10", "py-functions", "def double(x):\n    return x * 2\nWhat is double(7)?", ["7", "14", "x * 2", "None"], 1,
    ["The function returns something.", "x is 7 inside the function.", "7 × 2 = 14"], "The function returns x * 2 = 14.", 1, src(PY, 4)),
  mcq("py11", "py-functions", "Why put scoring in a function?", ["It runs faster", "So it can be reused and tested in one place", "Python requires it", "To hide it"], 1,
    ["Think about using it more than once.", "Functions package steps with a name.", "Reuse and one place to fix bugs."], "Functions make code reusable and easier to test and change.", 1, src(PY, 4)),
  mcq("py12", "py-functions", "A function has no return statement. What does calling it give back?", ["0", "None", "An error", "The last variable"], 1,
    ["Python always returns something.", "It has a special \"nothing\" value.", "None"], "Without return, Python functions return None.", 2, src(PY, 4)),
];

export const itemById = new Map(ITEMS.map((i) => [i.id, i]));
export const itemsForSkill = (skill: string) => ITEMS.filter((i) => i.skill === skill);

/** Checks a learner's answer. */
export function isCorrect(item: Item, answer: string): boolean {
  if (item.type === "numeric") {
    const v = Number(answer.replace(/[^\d.\-]/g, ""));
    return answer.trim() !== "" && !Number.isNaN(v) && Math.abs(v - Number(item.answer)) <= (item.tolerance ?? 0);
  }
  return answer === item.answer;
}

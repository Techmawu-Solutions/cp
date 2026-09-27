/**
 * Graph maths for the whiteboard plotter (spec §32): a small, safe parser for
 * expressions in x (no eval), coordinate parsing, and axis helpers.
 *
 * Supports numbers, x, + - * / ^, brackets, implicit multiplication (2x,
 * 3(x+1), (x+1)(x-1), 2sin(x)), constants pi and e, and sin cos tan asin acos
 * atan sqrt abs ln log exp floor ceil round. "y =" or "f(x) =" in front is
 * ignored.
 */

type Node = (x: number) => number;

const FNS: Record<string, (v: number) => number> = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  sqrt: Math.sqrt,
  abs: Math.abs,
  ln: Math.log,
  log: Math.log10,
  exp: Math.exp,
  floor: Math.floor,
  ceil: Math.ceil,
  round: Math.round,
};

type Tok = { t: "num"; v: number } | { t: "id"; v: string } | { t: "op"; v: string };

function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i]!;
    if (/\s/.test(c)) {
      i++;
    } else if (/[\d.]/.test(c)) {
      const m = /^\d*\.?\d+(?:e[+-]?\d+)?|^\d+\.?/i.exec(src.slice(i))!;
      out.push({ t: "num", v: Number(m[0]) });
      i += m[0].length;
    } else if (/[a-zπ]/i.test(c)) {
      const m = /^(?:π|[a-z]+)/i.exec(src.slice(i))!;
      const word = m[0].toLowerCase();
      // Split runs like "xsin" or "pix" into known names and single letters.
      let w = word;
      while (w) {
        const name = ["asin", "acos", "atan", "sqrt", "floor", "ceil", "round", "sin", "cos", "tan", "abs", "exp", "log", "ln", "pi", "π", "x", "e"].find((n) => w.startsWith(n));
        if (!name) throw new Error(`Unknown name “${w}”`);
        out.push({ t: "id", v: name === "π" ? "pi" : name });
        w = w.slice(name.length);
      }
      i += m[0].length;
    } else if ("+-*/^()×÷·−".includes(c)) {
      out.push({ t: "op", v: c === "×" || c === "·" ? "*" : c === "÷" ? "/" : c === "−" ? "-" : c });
      i++;
    } else throw new Error(`Unexpected “${c}”`);
  }
  return out;
}

/** Compiles an expression in x. Throws with a readable message when it can't. */
export function compileExpression(input: string): Node {
  const src = input
    .trim()
    .replace(/^(?:y|f\s*\(\s*x\s*\))\s*=/i, "")
    .replace(/²/g, "^2")
    .replace(/³/g, "^3");
  if (!src.trim()) throw new Error("Enter an expression, e.g. 2x + 1");
  const toks = tokenize(src);
  let p = 0;
  const peek = () => toks[p];
  const isOp = (v: string) => peek()?.t === "op" && peek()!.v === v;

  // expr := term (("+"|"-") term)*
  const expr = (): Node => {
    let left = term();
    while (isOp("+") || isOp("-")) {
      const op = toks[p++]!.v;
      const a = left;
      const b = term();
      left = op === "+" ? (x) => a(x) + b(x) : (x) => a(x) - b(x);
    }
    return left;
  };
  // term := unary (("*"|"/"| implicit) unary)*
  const startsFactor = () => {
    const t = peek();
    return !!t && (t.t === "num" || t.t === "id" || (t.t === "op" && t.v === "("));
  };
  const term = (): Node => {
    let left = unary();
    for (;;) {
      if (isOp("*") || isOp("/")) {
        const op = toks[p++]!.v;
        const a = left;
        const b = unary();
        left = op === "*" ? (x) => a(x) * b(x) : (x) => a(x) / b(x);
      } else if (startsFactor()) {
        const a = left;
        const b = power();
        left = (x) => a(x) * b(x);
      } else return left;
    }
  };
  // unary := ("-"|"+") unary | power
  const unary = (): Node => {
    if (isOp("-")) {
      p++;
      const a = unary();
      return (x) => -a(x);
    }
    if (isOp("+")) {
      p++;
      return unary();
    }
    return power();
  };
  // power := atom ("^" unary)?   (right-associative)
  const power = (): Node => {
    const base = atom();
    if (isOp("^")) {
      p++;
      const ex = unary();
      return (x) => Math.pow(base(x), ex(x));
    }
    return base;
  };
  const atom = (): Node => {
    const t = toks[p++];
    if (!t) throw new Error("The expression ends too soon");
    if (t.t === "num") return () => t.v;
    if (t.t === "op" && t.v === "(") {
      const inner = expr();
      if (!isOp(")")) throw new Error("A bracket isn't closed");
      p++;
      return inner;
    }
    if (t.t === "id") {
      if (t.v === "x") return (x) => x;
      if (t.v === "pi") return () => Math.PI;
      if (t.v === "e") return () => Math.E;
      const fn = FNS[t.v]!;
      // Functions take a bracketed argument, or the next factor: sin x, sin 2x.
      const arg = isOp("(") ? atom() : power();
      return (x) => fn(arg(x));
    }
    throw new Error(`Unexpected “${t.v}”`);
  };

  const node = expr();
  if (p < toks.length) throw new Error(`Unexpected “${(toks[p] as { v: string | number }).v}”`);
  return node;
}

/** Problem with an expression, or null if it compiles. */
export function expressionProblem(input: string): string | null {
  try {
    compileExpression(input);
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : "That expression can't be read";
  }
}

/**
 * Coordinates from text: "(1, 2) (3, 4)", "1,2; 3,4" or one "x, y" (or
 * "x y") pair per line.
 */
export function parsePoints(input: string): { points: [number, number][]; problem: string | null } {
  const text = input.trim();
  if (!text) return { points: [], problem: "Enter at least one point, e.g. (1, 2)" };
  const pairs = text.includes("(") ? [...text.matchAll(/\(([^)]*)\)/g)].map((m) => m[1]!) : text.split(/[;\n]+/);
  const points: [number, number][] = [];
  for (const raw of pairs) {
    const nums = raw
      .trim()
      .split(/[\s,]+/)
      .filter(Boolean)
      .map((v) => Number(v.replace("−", "-")));
    if (nums.length === 0) continue;
    if (nums.length !== 2 || nums.some((n) => !Number.isFinite(n))) return { points, problem: `“${raw.trim()}” isn't an x, y pair` };
    points.push([nums[0]!, nums[1]!]);
  }
  return { points, problem: points.length ? null : "Enter at least one point, e.g. (1, 2)" };
}

/** A "nice" tick step (1, 2 or 5 × 10^n) giving about `target` ticks across the span. */
export function niceStep(span: number, target = 8): number {
  const raw = span / target;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / mag;
  return (n < 1.5 ? 1 : n < 3.5 ? 2 : n < 7.5 ? 5 : 10) * mag;
}

export const fmtTick = (v: number) => {
  const r = Math.round(v * 1e6) / 1e6;
  return Math.abs(r) >= 1e5 || (Math.abs(r) < 1e-3 && r !== 0) ? r.toExponential(1) : String(r);
};

export type GraphSeries = { type: "fn"; expr: string; color: string } | { type: "points"; points: [number, number][]; color: string; join: boolean; labels: boolean };

/** A graph on the whiteboard: axes, range and what's plotted. Drawn fresh at any size. */
export interface GraphSpec {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  grid: boolean;
  series: GraphSeries[];
}

/** Axis ranges that fit the plotted points and functions, rounded to tidy values and including 0 when it's close. */
export function autoRange(series: GraphSeries[]): Pick<GraphSpec, "xMin" | "xMax" | "yMin" | "yMax"> {
  const pts = series.flatMap((s) => (s.type === "points" ? s.points : []));
  let xMin = pts.length ? Math.min(...pts.map((p) => p[0])) : -10;
  let xMax = pts.length ? Math.max(...pts.map((p) => p[0])) : 10;
  if (xMin === xMax) [xMin, xMax] = [xMin - 5, xMax + 5];
  const withZero = (lo: number, hi: number): [number, number] => (lo > 0 && lo <= (hi - lo) * 0.6 ? [0, hi] : hi < 0 && -hi <= (hi - lo) * 0.6 ? [lo, 0] : [lo, hi]);
  [xMin, xMax] = withZero(xMin, xMax);
  const xPad = pts.length ? (xMax - xMin) * 0.08 : 0;
  xMin -= xPad;
  xMax += xPad;

  const ys = pts.map((p) => p[1]);
  for (const s of series) {
    if (s.type !== "fn") continue;
    try {
      const f = compileExpression(s.expr);
      const vals: number[] = [];
      for (let i = 0; i <= 200; i++) {
        const v = f(xMin + ((xMax - xMin) * i) / 200);
        if (Number.isFinite(v)) vals.push(v);
      }
      // Ignore the extreme 2% at each end so asymptotes (1/x, tan x) don't flatten the rest.
      vals.sort((a, b) => a - b);
      const cut = Math.floor(vals.length * 0.02);
      ys.push(...vals.slice(cut, vals.length - cut));
    } catch {
      /* invalid expressions are reported by the form */
    }
  }
  let yMin = ys.length ? Math.min(...ys) : -10;
  let yMax = ys.length ? Math.max(...ys) : 10;
  if (yMin === yMax) [yMin, yMax] = [yMin - 5, yMax + 5];
  [yMin, yMax] = withZero(yMin, yMax);
  const yPad = (yMax - yMin) * 0.1;
  yMin -= yPad;
  yMax += yPad;

  const sx = niceStep(xMax - xMin, 10);
  const sy = niceStep(yMax - yMin, 8);
  const tidy = (v: number) => Math.round(v * 1e9) / 1e9;
  return { xMin: tidy(Math.floor(xMin / sx) * sx), xMax: tidy(Math.ceil(xMax / sx) * sx), yMin: tidy(Math.floor(yMin / sy) * sy), yMax: tidy(Math.ceil(yMax / sy) * sy) };
}

/** How a series is labelled in the graph's key. */
export const seriesLabel = (s: GraphSeries) => (s.type === "fn" ? `y = ${s.expr.trim().replace(/^(?:y|f\s*\(\s*x\s*\))\s*=\s*/i, "")}` : s.points.length === 1 ? `(${fmtTick(s.points[0]![0])}, ${fmtTick(s.points[0]![1])})` : `${s.points.length} points`);

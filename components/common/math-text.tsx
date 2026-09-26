import { Fragment, useMemo } from "react";
import katex from "katex";
import { cn } from "@/lib/utils";

type Segment = { kind: "text" | "inline" | "display"; value: string };

/**
 * Splits text into plain text and LaTeX maths:
 * - `$…$` or `\(…\)` for maths within a sentence, `$$…$$` or `\[…\]` for a centred equation
 * - a `$` only opens maths when followed by a non-space, and only closes it after a
 *   non-space and not before a digit — so prices ("$5 and $10") and spreadsheet
 *   references ("=$B$1") stay plain text; `\$` is always a literal dollar sign.
 */
export function splitMath(text: string): Segment[] {
  const out: Segment[] = [];
  let buf = "";
  const flush = () => {
    if (buf) out.push({ kind: "text", value: buf });
    buf = "";
  };
  let i = 0;
  while (i < text.length) {
    const rest = text.slice(i);
    if (rest.startsWith("\\$")) {
      buf += "$";
      i += 2;
      continue;
    }
    const delimited = (open: string, close: string, kind: Segment["kind"]) => {
      if (!rest.startsWith(open)) return false;
      const end = text.indexOf(close, i + open.length);
      if (end === -1) return false;
      const value = text.slice(i + open.length, end).trim();
      if (!value) return false;
      flush();
      out.push({ kind, value });
      i = end + close.length;
      return true;
    };
    if (delimited("$$", "$$", "display") || delimited("\\[", "\\]", "display") || delimited("\\(", "\\)", "inline")) continue;
    if (text[i] === "$" && text[i + 1] && !/\s/.test(text[i + 1]!)) {
      let j = i + 1;
      let end = -1;
      while ((j = text.indexOf("$", j)) !== -1) {
        const before = text[j - 1]!;
        const after = text[j + 1];
        if (before !== "\\" && !/\s/.test(before) && !(after && /\d/.test(after))) {
          end = j;
          break;
        }
        j++;
      }
      if (end > i + 1) {
        flush();
        out.push({ kind: "inline", value: text.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }
    buf += text[i];
    i++;
  }
  flush();
  return out;
}

export const hasMath = (text: string | undefined) => !!text && splitMath(text).some((s) => s.kind !== "text");

function render(tex: string, display: boolean) {
  return katex.renderToString(tex, { displayMode: display, throwOnError: false, strict: "ignore", trust: false, output: "htmlAndMathml" });
}

/**
 * Text with LaTeX maths rendered by KaTeX. Invalid LaTeX is shown in red
 * rather than breaking the page; screen readers get MathML.
 */
export function MathText({ text, className }: { text: string; className?: string }) {
  const parts = useMemo(() => splitMath(text), [text]);
  if (parts.length === 1 && parts[0]!.kind === "text") return className ? <span className={className}>{text}</span> : <>{text}</>;
  return (
    <span className={cn("math-text", className)}>
      {parts.map((p, i) =>
        p.kind === "text" ? (
          <Fragment key={i}>{p.value}</Fragment>
        ) : (
          <span key={i} className={p.kind === "display" ? "math-display" : "math-inline"} dangerouslySetInnerHTML={{ __html: render(p.value, p.kind === "display") }} />
        ),
      )}
    </span>
  );
}

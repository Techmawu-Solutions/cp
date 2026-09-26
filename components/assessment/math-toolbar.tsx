"use client";

import { Sigma } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MathText } from "@/components/common/math-text";

/** Common LaTeX snippets; `▢` marks where the cursor lands after inserting. */
const GROUPS: { title: string; items: { tex: string; show?: string }[] }[] = [
  {
    title: "Structures",
    items: [{ tex: "\\frac{▢}{}", show: "\\frac{a}{b}" }, { tex: "^{▢}", show: "x^{n}" }, { tex: "_{▢}", show: "x_{1}" }, { tex: "\\sqrt{▢}", show: "\\sqrt{x}" }, { tex: "\\sqrt[▢]{}", show: "\\sqrt[n]{x}" }, { tex: "\\overline{▢}", show: "\\overline{AB}" }, { tex: "\\vec{▢}", show: "\\vec{v}" }, { tex: "|▢|", show: "|x|" }],
  },
  {
    title: "Operators",
    items: [{ tex: "\\times" }, { tex: "\\div" }, { tex: "\\pm" }, { tex: "\\cdot" }, { tex: "\\leq" }, { tex: "\\geq" }, { tex: "\\neq" }, { tex: "\\approx" }, { tex: "\\propto" }, { tex: "\\infty" }],
  },
  {
    title: "Greek & geometry",
    items: [{ tex: "\\pi" }, { tex: "\\theta" }, { tex: "\\alpha" }, { tex: "\\beta" }, { tex: "\\Delta" }, { tex: "\\lambda" }, { tex: "\\mu" }, { tex: "\\Omega" }, { tex: "^\\circ", show: "90^\\circ" }, { tex: "\\angle", show: "\\angle ABC" }, { tex: "\\triangle" }, { tex: "\\parallel" }, { tex: "\\perp" }],
  },
  {
    title: "Functions & calculus",
    items: [{ tex: "\\sin▢", show: "\\sin\\theta" }, { tex: "\\cos▢", show: "\\cos\\theta" }, { tex: "\\tan▢", show: "\\tan\\theta" }, { tex: "\\log_{▢}", show: "\\log_{b}x" }, { tex: "\\ln▢", show: "\\ln x" }, { tex: "\\sum_{i=1}^{n}▢", show: "\\sum_{i=1}^{n}" }, { tex: "\\int_{▢}^{}", show: "\\int_{a}^{b}" }, { tex: "\\lim_{x \\to ▢}", show: "\\lim_{x\\to a}" }, { tex: "\\frac{dy}{dx}" }],
  },
  {
    title: "Sets, logic & chemistry",
    items: [{ tex: "\\in" }, { tex: "\\cup" }, { tex: "\\cap" }, { tex: "\\subseteq" }, { tex: "\\emptyset" }, { tex: "\\Rightarrow" }, { tex: "\\rightarrow" }, { tex: "\\rightleftharpoons" }, { tex: "\\text{H}_2\\text{O}", show: "\\text{H}_2\\text{O}" }, { tex: "\\begin{pmatrix} ▢ & \\\\  & \\end{pmatrix}", show: "\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}" }],
  },
];

/** Inserts text into a React-controlled input/textarea at the cursor and fires onChange. */
function insertInto(el: HTMLInputElement | HTMLTextAreaElement, snippet: string) {
  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? start;
  const before = el.value.slice(0, start);
  // Inside $…$ already (an odd number of unescaped $ before the cursor)? Insert raw LaTeX; otherwise wrap it.
  const inside = (before.replace(/\\\$/g, "").match(/\$/g) ?? []).length % 2 === 1;
  const selected = el.value.slice(start, end);
  let body = snippet.replace("▢", selected || "▢");
  if (!inside) body = `$${body}$`;
  const caret = body.indexOf("▢");
  body = body.replace("▢", "");
  const next = before + body + el.value.slice(end);
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value")!.set!.call(el, next);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  const pos = before.length + (caret === -1 ? body.length : caret);
  el.focus();
  el.setSelectionRange(pos, pos);
}

/**
 * "Maths" button for the question editor: common LaTeX snippets inserted into
 * whichever field of the question was focused last.
 */
export function MathToolbar({ target }: { target: () => HTMLInputElement | HTMLTextAreaElement | null }) {
  return (
    <Popover>
      <PopoverTrigger render={<Button type="button" variant="ghost" size="xs" title="Insert maths (LaTeX)" />}>
        <Sigma /> Maths
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(26rem,calc(100vw-1rem))] gap-3 p-3">
        <p className="text-xs text-muted-foreground">
          Click where the maths goes in the question or an option, then pick a symbol. Or type LaTeX between dollar signs, e.g. <code className="rounded bg-muted px-1">$x^2 + 1$</code>; use <code className="rounded bg-muted px-1">$$…$$</code> for a centred equation.
        </p>
        {GROUPS.map((g) => (
          <div key={g.title}>
            <p className="mb-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{g.title}</p>
            <div className="flex flex-wrap gap-1">
              {g.items.map((it) => (
                <button
                  key={it.tex}
                  type="button"
                  // Keep focus (and the cursor) in the field being edited.
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    const el = target();
                    if (el) insertInto(el, it.tex);
                  }}
                  className="flex h-9 min-w-9 items-center justify-center rounded-md border bg-card px-2 text-sm hover:bg-muted"
                  title={it.tex.replace("▢", "")}
                >
                  <MathText text={`$${it.show ?? it.tex.replace(/▢/g, "")}$`} />
                </button>
              ))}
            </div>
          </div>
        ))}
      </PopoverContent>
    </Popover>
  );
}

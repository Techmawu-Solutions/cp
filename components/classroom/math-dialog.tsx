"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Sigma } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { renderMath, type MathAsset } from "@/components/classroom/board-math";
import { cn } from "@/lib/utils";

/** Buttons that insert LaTeX at the cursor; "|" marks where the cursor goes. */
const PALETTE: { label: string; tex: string; title: string }[] = [
  { label: "a/b", tex: "\\frac{|}{}", title: "Fraction" },
  { label: "√", tex: "\\sqrt{|}", title: "Square root" },
  { label: "ⁿ√", tex: "\\sqrt[n]{|}", title: "nth root" },
  { label: "x²", tex: "^{|}", title: "Power" },
  { label: "x₁", tex: "_{|}", title: "Subscript" },
  { label: "±", tex: "\\pm ", title: "Plus or minus" },
  { label: "×", tex: "\\times ", title: "Times" },
  { label: "÷", tex: "\\div ", title: "Divide" },
  { label: "≠", tex: "\\neq ", title: "Not equal" },
  { label: "≤", tex: "\\le ", title: "Less or equal" },
  { label: "≥", tex: "\\ge ", title: "Greater or equal" },
  { label: "≈", tex: "\\approx ", title: "Approximately" },
  { label: "∞", tex: "\\infty ", title: "Infinity" },
  { label: "π", tex: "\\pi ", title: "Pi" },
  { label: "θ", tex: "\\theta ", title: "Theta" },
  { label: "α", tex: "\\alpha ", title: "Alpha" },
  { label: "β", tex: "\\beta ", title: "Beta" },
  { label: "λ", tex: "\\lambda ", title: "Lambda" },
  { label: "μ", tex: "\\mu ", title: "Mu" },
  { label: "Ω", tex: "\\Omega ", title: "Omega (ohms)" },
  { label: "Δ", tex: "\\Delta ", title: "Delta (change in)" },
  { label: "∑", tex: "\\sum_{i=1}^{n} |", title: "Sum" },
  { label: "∫", tex: "\\int_{a}^{b} | \\, dx", title: "Integral" },
  { label: "lim", tex: "\\lim_{x \\to |} ", title: "Limit" },
  { label: "→", tex: "\\rightarrow ", title: "Arrow" },
  { label: "v⃗", tex: "\\vec{|}", title: "Vector" },
  { label: "°", tex: "^{\\circ}", title: "Degrees" },
  { label: "( )", tex: "\\left( | \\right)", title: "Brackets that grow" },
  { label: "[ ]", tex: "\\begin{pmatrix} | & \\\\  & \\end{pmatrix}", title: "Matrix" },
];

const EXAMPLES: { group: string; items: { label: string; tex: string }[] }[] = [
  {
    group: "Maths",
    items: [
      { label: "Quadratic formula", tex: "x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}" },
      { label: "Pythagoras", tex: "a^2 + b^2 = c^2" },
      { label: "Area of a circle", tex: "A = \\pi r^2" },
      { label: "Sum of series", tex: "\\sum_{k=1}^{n} k = \\frac{n(n+1)}{2}" },
      { label: "Integral", tex: "\\int_0^1 x^2 \\, dx = \\frac{1}{3}" },
      { label: "Simultaneous", tex: "\\begin{cases} 2x + y = 7 \\\\ x - y = 2 \\end{cases}" },
    ],
  },
  {
    group: "Physics",
    items: [
      { label: "Newton's 2nd law", tex: "\\vec{F} = m\\vec{a}" },
      { label: "Motion", tex: "s = ut + \\tfrac{1}{2}at^2" },
      { label: "Energy", tex: "E = mc^2" },
      { label: "Ohm's law", tex: "V = IR" },
      { label: "Gravitation", tex: "F = G\\frac{m_1 m_2}{r^2}" },
      { label: "Waves", tex: "v = f\\lambda" },
    ],
  },
  {
    group: "Chemistry",
    items: [
      { label: "Water", tex: "\\ce{2H2 + O2 -> 2H2O}" },
      { label: "Equilibrium", tex: "\\ce{N2 + 3H2 <=> 2NH3}" },
      { label: "Ions", tex: "\\ce{NaCl -> Na+ + Cl-}" },
    ],
  },
];

/**
 * Write an equation or formula in LaTeX (spec §32): symbol buttons and
 * ready-made maths, physics and chemistry formulas, with a live preview of
 * exactly what goes on the board.
 */
export function MathDialog({ open, onOpenChange, onInsert, color }: { open: boolean; onOpenChange: (o: boolean) => void; onInsert: (tex: string) => void; color: string }) {
  const [tex, setTex] = useState("");
  const [preview, setPreview] = useState<{ tex: string; asset: MathAsset } | null>(null);
  const area = useRef<HTMLTextAreaElement>(null);

  // Re-render the preview shortly after typing stops.
  useEffect(() => {
    if (!tex.trim()) return;
    let live = true;
    const t = setTimeout(() => {
      void renderMath(tex, color).then((asset) => live && setPreview({ tex, asset }));
    }, 250);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [tex, color]);

  const current = tex.trim() && preview?.tex === tex ? preview.asset : null;
  const pending = !!tex.trim() && !current;

  const insertSnippet = (snippet: string) => {
    const el = area.current;
    const start = el?.selectionStart ?? tex.length;
    const end = el?.selectionEnd ?? tex.length;
    const [before, after = ""] = snippet.split("|");
    const next = tex.slice(0, start) + before + tex.slice(start, end) + after + tex.slice(end);
    setTex(next);
    requestAnimationFrame(() => {
      el?.focus();
      const pos = start + before!.length + (end - start);
      el?.setSelectionRange(pos, pos);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sigma className="size-5" /> Equation or formula
          </DialogTitle>
          <DialogDescription>Type LaTeX, or start from a symbol or a ready-made formula. Chemistry equations use \ce{"{…}"}. It appears on everyone&apos;s board exactly as previewed.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-1">
          {PALETTE.map((p) => (
            <button key={p.title} type="button" onClick={() => insertSnippet(p.tex)} title={p.title} aria-label={p.title} className="min-w-8 rounded-md border px-1.5 py-1 font-serif text-sm hover:bg-muted">
              {p.label}
            </button>
          ))}
        </div>

        <Textarea ref={area} value={tex} onChange={(e) => setTex(e.target.value)} rows={3} placeholder={"x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}"} className="font-mono text-sm" aria-label="LaTeX" autoFocus />

        <div className={cn("flex min-h-24 items-center justify-center overflow-auto rounded-lg border bg-white p-3", current?.error && "border-destructive")} aria-live="polite">
          {!tex.trim() ? (
            <p className="text-sm text-muted-foreground">The preview appears here.</p>
          ) : pending ? (
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- generated SVG preview
            <img src={current!.url} alt={tex} style={{ height: Math.min(160, current!.hEx * 14) }} className="max-w-full" />
          )}
        </div>
        {current?.error && <p className="-mt-2 text-xs text-destructive">{current.error}</p>}

        <div className="space-y-2">
          {EXAMPLES.map((g) => (
            <div key={g.group} className="flex flex-wrap items-center gap-1.5">
              <span className="w-20 shrink-0 text-xs text-muted-foreground">{g.group}</span>
              {g.items.map((e) => (
                <button key={e.label} type="button" onClick={() => setTex(e.tex)} className="rounded-full border px-2 py-0.5 text-xs hover:bg-muted">
                  {e.label}
                </button>
              ))}
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!current || !!current.error}
            onClick={() => {
              onInsert(tex.trim());
              onOpenChange(false);
              setTex("");
            }}
          >
            <Sigma /> Put on the board
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

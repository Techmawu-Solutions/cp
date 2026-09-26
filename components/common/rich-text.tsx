import { Fragment } from "react";
import { MathText } from "@/components/common/math-text";

/** Renders the small markdown subset used by lesson bodies: ## headings, - lists, **bold**, paragraphs, and LaTeX maths ($…$, $$…$$). */
export function RichText({ text }: { text: string }) {
  const blocks = text.trim().split(/\n\s*\n/);
  return (
    <div className="prose-lesson">
      {blocks.map((block, i) => {
        const lines = block.split("\n");
        if (block.startsWith("## ")) return <h2 key={i}>{inline(block.slice(3))}</h2>;
        if (lines.every((l) => l.trim().startsWith("- ")))
          return (
            <ul key={i}>
              {lines.map((l, j) => (
                <li key={j}>{inline(l.trim().slice(2))}</li>
              ))}
            </ul>
          );
        return <p key={i}>{inline(block)}</p>;
      })}
    </div>
  );
}

function inline(s: string) {
  return s.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i}>
        <MathText text={part.slice(2, -2)} />
      </strong>
    ) : (
      <Fragment key={i}>
        <MathText text={part} />
      </Fragment>
    ),
  );
}

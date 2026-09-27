"use client";

import { useEffect, useRef } from "react";
import { paintStrokes } from "@/components/classroom/board-paint";
import type { PageBackground, Stroke } from "@/lib/types";

/** A small live picture of a page. */
export function PageThumb({ strokes, background }: { strokes: Stroke[]; background?: PageBackground }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const draw = () => paintStrokes(c.getContext("2d")!, strokes, c.width, c.height, draw, background);
    draw();
  }, [strokes, background]);
  return <canvas ref={ref} width={224} height={126} className="block aspect-video w-full bg-white" />;
}

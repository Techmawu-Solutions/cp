"use client";

import { useState } from "react";
import { Maximize2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * An image in a question or answer. Tapping it opens it full size, so small
 * diagrams stay readable on phones.
 */
export function ZoomableImage({ src, alt, className, cornerOnly }: { src: string; alt?: string; className?: string; cornerOnly?: boolean }) {
  const [open, setOpen] = useState(false);
  const zoom = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(true);
  };
  const dialog = (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[95dvh] w-auto max-w-[95vw] p-2 sm:max-w-[95vw]">
        <DialogTitle className="sr-only">{alt || "Image"}</DialogTitle>
        {/* eslint-disable-next-line @next/next/no-img-element -- uploaded question image */}
        <img src={src} alt={alt ?? ""} className="max-h-[88dvh] max-w-full object-contain" />
      </DialogContent>
    </Dialog>
  );
  // Inside a clickable answer card: the picture itself selects the answer; only the corner button enlarges it.
  if (cornerOnly)
    return (
      <span className={cn("relative block overflow-hidden rounded-lg border bg-white", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element -- uploaded answer image */}
        <img src={src} alt={alt ?? ""} className="mx-auto block max-h-40 max-w-full object-contain" draggable={false} />
        {/* Not a <button>: a label passes clicks to its first button, which would make tapping the picture enlarge it instead of choosing the answer. */}
        <span
          role="button"
          tabIndex={0}
          onClick={zoom}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setOpen(true))}
          className="absolute right-1.5 bottom-1.5 cursor-zoom-in rounded-md bg-black/55 p-1 text-white hover:bg-black/75 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          aria-label="Enlarge picture"
        >
          <Maximize2 className="size-3.5" />
        </span>
        {dialog}
      </span>
    );
  return (
    <>
      <button
        type="button"
        onClick={zoom}
        className={cn("group relative inline-block max-w-full overflow-hidden rounded-lg border bg-white", className)}
        aria-label={`Enlarge image${alt ? `: ${alt}` : ""}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- uploaded question image (data/storage URL) */}
        <img src={src} alt={alt ?? ""} className="block max-h-72 max-w-full object-contain" draggable={false} />
        <span className="absolute right-1.5 bottom-1.5 rounded-md bg-black/55 p-1 text-white opacity-80 group-hover:opacity-100">
          <Maximize2 className="size-3.5" />
        </span>
      </button>
      {dialog}
    </>
  );
}

import type { BoardPage } from "@/lib/types";

/** A page worth keeping: it has writing on it, or a document/picture to write on. */
export const pageHasContent = (p: BoardPage) => p.strokes.length > 0 || !!p.background;

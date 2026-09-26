"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowDown, ArrowUp, GripVertical, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { shuffled, splitBlanks } from "@/lib/questions";
import { cn } from "@/lib/utils";

/**
 * Drag-and-drop answers for matching, ordering and drag-words questions.
 * Built on pointer events so it works with a mouse and on touchscreens, and
 * every drag also has a tap alternative: tap a chip to pick it up, then tap
 * where it goes (keyboard: Enter on the chip, then Enter on the slot).
 */
function useDragDrop(onDrop: (item: string, target: string | null) => void) {
  const [ghost, setGhost] = useState<{ label: React.ReactNode; x: number; y: number; w: number } | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const start = useRef<{ item: string; x: number; y: number; w: number; moved: boolean } | null>(null);

  const targetAt = (x: number, y: number) => document.elementFromPoint(x, y)?.closest("[data-drop]")?.getAttribute("data-drop") ?? null;

  const chip = (item: string, label: React.ReactNode) => ({
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
      if (e.button !== 0) return;
      start.current = { item, x: e.clientX, y: e.clientY, w: e.currentTarget.getBoundingClientRect().width, moved: false };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
      const s = start.current;
      if (!s || s.item !== item) return;
      if (!s.moved && Math.hypot(e.clientX - s.x, e.clientY - s.y) < 6) return;
      s.moved = true;
      setGhost({ label, x: e.clientX, y: e.clientY, w: s.w });
      setOver(targetAt(e.clientX, e.clientY));
    },
    onPointerUp: (e: React.PointerEvent<HTMLElement>) => {
      const s = start.current;
      start.current = null;
      if (!s || s.item !== item) return;
      if (s.moved) {
        setGhost(null);
        setOver(null);
        setPicked(null);
        onDrop(item, targetAt(e.clientX, e.clientY));
      } else setPicked((p) => (p === item ? null : item));
    },
    onPointerCancel: () => {
      start.current = null;
      setGhost(null);
      setOver(null);
    },
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setPicked((p) => (p === item ? null : item));
      }
    },
    "aria-pressed": picked === item,
    style: { touchAction: "none" } as React.CSSProperties,
  });

  /** Drop the picked-up chip on a slot (tap / keyboard path). */
  const place = (target: string | null) => {
    if (!picked) return false;
    onDrop(picked, target);
    setPicked(null);
    return true;
  };

  const overlay =
    ghost &&
    createPortal(
      <div className="pointer-events-none fixed z-[100] -translate-x-1/2 -translate-y-1/2 rotate-2 opacity-90" style={{ left: ghost.x, top: ghost.y, width: ghost.w }}>
        <div className={chipClass(true)}>{ghost.label}</div>
      </div>,
      document.body,
    );

  return { chip, place, picked, over, overlay };
}

const chipClass = (active = false) =>
  cn(
    "inline-flex min-h-9 cursor-grab items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-sm font-medium shadow-xs select-none active:cursor-grabbing",
    active && "border-primary bg-primary/10 ring-2 ring-primary/40",
  );

function Hint({ picked }: { picked: boolean }) {
  return <p className="text-xs text-muted-foreground">{picked ? "Now tap where it goes." : "Drag an item into place, or tap it and then tap where it goes."}</p>;
}

/** Matching: drag each answer onto the term it belongs to. Value: { left: right }. */
export function MatchingInput({ id, pairs, value, onChange, disabled }: { id: string; pairs: { left: string; right: string }[]; value: Record<string, string>; onChange: (v: Record<string, string>) => void; disabled?: boolean }) {
  const rights = shuffled(
    pairs.map((p) => p.right),
    id,
  );
  // Chip ids are indices into `rights` so duplicate texts stay distinct.
  const placedIdx = new Set(Object.values(value).map((r) => rights.indexOf(r)));
  const drop = (item: string, target: string | null) => {
    const right = rights[Number(item)]!;
    const next = Object.fromEntries(Object.entries(value).filter(([, r]) => r !== right));
    if (target && target !== "bank") next[target] = right;
    onChange(next);
  };
  const dnd = useDragDrop(drop);
  const bank = rights.map((r, i) => ({ r, i })).filter(({ i }) => !placedIdx.has(i));

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {pairs.map((p) => {
          const placed = value[p.left];
          return (
            <div key={p.left} className="grid grid-cols-1 items-center gap-2 sm:grid-cols-2">
              <span className="text-sm font-medium">{p.left}</span>
              <div
                data-drop={p.left}
                role="button"
                tabIndex={disabled ? -1 : 0}
                aria-label={`Answer for ${p.left}${placed ? `: ${placed}` : ""}`}
                onClick={() => !disabled && dnd.place(p.left)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && !disabled && (e.preventDefault(), dnd.place(p.left))}
                className={cn("flex min-h-11 items-center gap-2 rounded-lg border-2 border-dashed px-2 py-1 transition-colors", dnd.over === p.left && "border-primary bg-primary/5", dnd.picked && !placed && "border-primary/50")}
              >
                {placed ? (
                  <span {...(disabled ? {} : dnd.chip(String(rights.indexOf(placed)), placed))} tabIndex={disabled ? -1 : 0} role="button" className={chipClass(dnd.picked === String(rights.indexOf(placed)))}>
                    {placed}
                    {!disabled && (
                      <button
                        type="button"
                        className="-mr-1 rounded p-0.5 text-muted-foreground hover:text-foreground"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => (e.stopPropagation(), drop(String(rights.indexOf(placed)), null))}
                        aria-label={`Remove ${placed}`}
                      >
                        <X className="size-3.5" />
                      </button>
                    )}
                  </span>
                ) : (
                  <span className="px-1 text-xs text-muted-foreground">Drop the match here</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {!disabled && (
        <div data-drop="bank" className={cn("rounded-xl bg-muted/60 p-3", dnd.over === "bank" && "ring-2 ring-primary/40")}>
          <div className="flex min-h-9 flex-wrap gap-2">
            {bank.map(({ r, i }) => (
              <span key={i} {...dnd.chip(String(i), r)} tabIndex={0} role="button" className={chipClass(dnd.picked === String(i))}>
                <GripVertical className="size-3.5 text-muted-foreground" /> {r}
              </span>
            ))}
            {bank.length === 0 && <span className="text-xs text-muted-foreground">All matched — drag a match back here to change it.</span>}
          </div>
          {bank.length > 0 && (
            <div className="mt-2">
              <Hint picked={!!dnd.picked} />
            </div>
          )}
        </div>
      )}
      {dnd.overlay}
    </div>
  );
}

/** Ordering: drag the items into the right sequence. Value: option indices in the student's order. */
export function OrderingInput({ id, items, value, onChange, disabled }: { id: string; items: string[]; value: number[] | null; onChange: (v: number[]) => void; disabled?: boolean }) {
  const order = value && value.length === items.length ? value : shuffled(
    items.map((_, i) => i),
    id,
  );
  const move = (from: number, to: number) => {
    if (to < 0 || to >= order.length || from === to) return;
    const next = [...order];
    const [x] = next.splice(from, 1);
    next.splice(to, 0, x!);
    onChange(next);
  };
  const dnd = useDragDrop((item, target) => {
    if (target == null) return;
    move(order.indexOf(Number(item)), order.indexOf(Number(target)));
  });

  return (
    <div className="space-y-2">
      <ol className="space-y-2">
        {order.map((idx, pos) => (
          <li
            key={idx}
            data-drop={String(idx)}
            onClick={() => !disabled && dnd.place(String(idx))}
            className={cn("flex items-center gap-2 rounded-lg border bg-card p-1.5 pl-2 transition-colors", dnd.over === String(idx) && "border-primary bg-primary/5", dnd.picked === String(idx) && "ring-2 ring-primary/40")}
          >
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold tabular-nums">{pos + 1}</span>
            {disabled ? (
              <span className="flex-1 text-sm">{items[idx]}</span>
            ) : (
              <span {...dnd.chip(String(idx), items[idx])} tabIndex={0} role="button" aria-label={`Move ${items[idx]}`} className="flex min-h-8 flex-1 cursor-grab items-center gap-2 text-sm select-none active:cursor-grabbing">
                <GripVertical className="size-4 shrink-0 text-muted-foreground" /> {items[idx]}
              </span>
            )}
            {!disabled && (
              <span className="flex shrink-0">
                <Button type="button" size="icon-xs" variant="ghost" disabled={pos === 0} onClick={(e) => (e.stopPropagation(), move(pos, pos - 1))} aria-label={`Move ${items[idx]} up`}>
                  <ArrowUp />
                </Button>
                <Button type="button" size="icon-xs" variant="ghost" disabled={pos === order.length - 1} onClick={(e) => (e.stopPropagation(), move(pos, pos + 1))} aria-label={`Move ${items[idx]} down`}>
                  <ArrowDown />
                </Button>
              </span>
            )}
          </li>
        ))}
      </ol>
      {!disabled && <p className="text-xs text-muted-foreground">{dnd.picked ? "Now tap the position to move it to." : "Drag items by the handle, tap one and then tap its new position, or use the arrows."}</p>}
      {dnd.overlay}
    </div>
  );
}

/** Drag words into the blanks in a sentence. Value: the word in each blank (null = empty). */
export function DragWordsInput({ prompt, bank, value, onChange, disabled }: { prompt: string; bank: string[]; value: (string | null)[]; onChange: (v: (string | null)[]) => void; disabled?: boolean }) {
  const parts = splitBlanks(prompt);
  const blanks = parts.length - 1;
  // Which bank chip (by index) sits in each blank; repeated words map to distinct chips.
  const taken = new Set<number>();
  const slots: (number | null)[] = Array.from({ length: blanks }, (_, i) => {
    const w = value[i];
    const k = w == null ? -1 : bank.findIndex((b, kk) => b === w && !taken.has(kk));
    if (k === -1) return null;
    taken.add(k);
    return k;
  });
  const drop = (item: string, target: string | null) => {
    const k = Number(item);
    const next = slots.map((s) => (s === k ? null : s));
    if (target != null && target !== "bank") next[Number(target)] = k;
    onChange(next.map((s) => (s == null ? null : bank[s]!)));
  };
  const dnd = useDragDrop(drop);

  return (
    <div className="space-y-3">
      <p className="text-base leading-10">
        {parts.map((part, i) => (
          <span key={i}>
            {part}
            {i < blanks && (
              <span
                data-drop={String(i)}
                role="button"
                tabIndex={disabled ? -1 : 0}
                aria-label={`Blank ${i + 1}${slots[i] != null ? `: ${bank[slots[i]!]}` : ""}`}
                onClick={() => !disabled && dnd.place(String(i))}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && !disabled && (e.preventDefault(), dnd.place(String(i)))}
                className={cn("mx-1 inline-flex min-w-24 items-center justify-center rounded-lg border-2 border-dashed px-1 align-middle leading-normal", dnd.over === String(i) && "border-primary bg-primary/5", dnd.picked && slots[i] == null && "border-primary/50")}
              >
                {slots[i] != null ? (
                  <span {...(disabled ? {} : dnd.chip(String(slots[i]), bank[slots[i]!]))} tabIndex={disabled ? -1 : 0} role="button" className={cn(chipClass(dnd.picked === String(slots[i])), "my-0.5 min-h-7 py-0.5")}>
                    {bank[slots[i]!]}
                  </span>
                ) : (
                  <span className="px-2 py-1 text-xs text-muted-foreground">{i + 1}</span>
                )}
              </span>
            )}
          </span>
        ))}
      </p>
      {!disabled && (
        <div data-drop="bank" className={cn("rounded-xl bg-muted/60 p-3", dnd.over === "bank" && "ring-2 ring-primary/40")}>
          <div className="flex min-h-9 flex-wrap gap-2">
            {bank.map((w, k) =>
              taken.has(k) ? null : (
                <span key={k} {...dnd.chip(String(k), w)} tabIndex={0} role="button" className={chipClass(dnd.picked === String(k))}>
                  {w}
                </span>
              ),
            )}
          </div>
          <div className="mt-2">
            <Hint picked={!!dnd.picked} />
          </div>
        </div>
      )}
      {dnd.overlay}
    </div>
  );
}

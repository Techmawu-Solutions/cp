"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Pointer-based drag and drop that works with a mouse and on touchscreens.
 * Spread `chip(id, label)` on anything draggable and put `data-drop="<id>"`
 * on drop targets; `onDrop(item, target)` gets the target under the pointer
 * (null when dropped elsewhere). A tap without moving "picks up" the item
 * instead, and `place(target)` drops the picked item — the tap and keyboard
 * alternative to dragging. Render `overlay` once to show the dragged ghost.
 */
export function useDragDrop(onDrop: (item: string, target: string | null) => void, ghostClassName?: string) {
  const [ghost, setGhost] = useState<{ label: React.ReactNode; x: number; y: number; w: number } | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const start = useRef<{ item: string; x: number; y: number; w: number; moved: boolean } | null>(null);
  // Auto-scroll while dragging near the top or bottom edge, so items can travel further than one screen.
  const scroll = useRef<{ el: Element; y: number; timer: number } | null>(null);
  const stopScroll = () => {
    if (scroll.current) clearInterval(scroll.current.timer);
    scroll.current = null;
  };
  const autoScroll = (from: Element, y: number) => {
    if (!scroll.current) {
      let el: Element | null = from.parentElement;
      while (el && !(el.scrollHeight > el.clientHeight && /(auto|scroll)/.test(getComputedStyle(el).overflowY))) el = el.parentElement;
      const target = el ?? document.scrollingElement ?? document.documentElement;
      scroll.current = {
        el: target,
        y,
        timer: window.setInterval(() => {
          const s = scroll.current;
          if (!s) return;
          const box = s.el === document.scrollingElement ? { top: 0, bottom: window.innerHeight } : s.el.getBoundingClientRect();
          const edge = 70;
          const d = s.y < box.top + edge ? -Math.ceil((box.top + edge - s.y) / 4) : s.y > box.bottom - edge ? Math.ceil((s.y - (box.bottom - edge)) / 4) : 0;
          if (d) s.el.scrollBy(0, d);
        }, 16),
      };
    }
    scroll.current.y = y;
  };

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
      autoScroll(e.currentTarget, e.clientY);
      setGhost({ label, x: e.clientX, y: e.clientY, w: s.w });
      setOver(targetAt(e.clientX, e.clientY));
    },
    onPointerUp: (e: React.PointerEvent<HTMLElement>) => {
      const s = start.current;
      start.current = null;
      stopScroll();
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
      stopScroll();
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
        <div className={ghostClassName ?? "rounded-lg border bg-card px-3 py-2 text-sm font-medium shadow-lg ring-2 ring-primary/40"}>{ghost.label}</div>
      </div>,
      document.body,
    );

  return { chip, place, picked, over, overlay };
}

"use client";

import { useEffect, useState } from "react";

/**
 * Current time as state, refreshed on an interval. Components that compare
 * against "now" (is a class startable, is work overdue) stay pure during
 * render and still update as time passes.
 */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

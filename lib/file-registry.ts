"use client";

import { useEffect, useState } from "react";
import { del, get, set } from "idb-keyval";

/**
 * Uploaded files in the prototype are kept in this browser: an object URL for
 * the current tab, plus the file itself in IndexedDB so it still opens after a
 * reload. Only metadata lives in the demo database. In production the file
 * goes to S3-compatible storage and the record stores its URL (spec §66).
 */
const registry = new Map<string, string>();
const key = (id: string) => `upload:${id}`;

export function registerUpload(id: string, file: Blob): string {
  const url = URL.createObjectURL(file);
  registry.set(id, url);
  void set(key(id), file).catch(() => {});
  return url;
}

/** The file's URL if it is already loaded in this tab. */
export function uploadedUrl(id: string): string | undefined {
  return registry.get(id);
}

/** Loads a stored upload (e.g. after a reload). */
export async function loadUpload(id: string): Promise<string | undefined> {
  const cached = registry.get(id);
  if (cached) return cached;
  try {
    const blob = await get<Blob>(key(id));
    if (!(blob instanceof Blob)) return undefined;
    const url = URL.createObjectURL(blob);
    registry.set(id, url);
    return url;
  } catch {
    return undefined;
  }
}

export function forgetUpload(id: string) {
  const url = registry.get(id);
  if (url) URL.revokeObjectURL(url);
  registry.delete(id);
  void del(key(id)).catch(() => {});
}

/** URL of an uploaded file, loading it from browser storage after a reload. */
export function useUploadUrl(id: string): string | undefined {
  const [url, setUrl] = useState<{ id: string; url?: string }>(() => ({ id, url: registry.get(id) }));
  useEffect(() => {
    let live = true;
    void loadUpload(id).then((u) => live && setUrl({ id, url: u }));
    return () => {
      live = false;
    };
  }, [id]);
  return url.id === id ? url.url : registry.get(id);
}

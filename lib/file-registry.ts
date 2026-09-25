"use client";

/**
 * Uploaded files in the prototype live only in this tab as object URLs; only
 * their metadata is persisted. In production the file goes to S3-compatible
 * storage and the record stores its URL (spec §66).
 */
const registry = new Map<string, string>();

export function registerUpload(contentId: string, file: File): string {
  const url = URL.createObjectURL(file);
  registry.set(contentId, url);
  return url;
}

export function uploadedUrl(contentId: string): string | undefined {
  return registry.get(contentId);
}

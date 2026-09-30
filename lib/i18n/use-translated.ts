"use client";

import { useSyncExternalStore } from "react";
import { languageVersion, subscribeLanguage, translateDocument } from "@/lib/i18n/dom-translator";

/** A whole text (e.g. a Markdown lesson) in the current interface language; re-renders when the language changes. */
export function useTranslated(text: string): string {
  useSyncExternalStore(subscribeLanguage, languageVersion, () => 0);
  return translateDocument(text);
}

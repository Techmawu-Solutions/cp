"use client";

import { useEffect } from "react";
import { getLang, loadDict, onLangChange, type Lang } from "@/lib/i18n";
import { applyDictionary } from "@/lib/i18n/dom-translator";

/** Applies the saved interface language to every page and follows changes from the language switcher. */
export function I18nRuntime() {
  useEffect(() => {
    let seq = 0;
    const apply = async (lang: Lang) => {
      const mine = ++seq;
      const dict = lang === "en" ? null : await loadDict(lang);
      if (mine !== seq) return; // a newer choice arrived while this one loaded
      document.documentElement.lang = lang;
      applyDictionary(dict, lang);
    };
    void apply(getLang());
    return onLangChange((l) => void apply(l));
  }, []);
  return null;
}

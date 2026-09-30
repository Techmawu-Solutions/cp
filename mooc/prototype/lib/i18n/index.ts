// Interface language. The UI is written in English; a runtime translator swaps
// the rendered English for the chosen language after React paints, so no
// component has to change. See "Interface language" in the Open spec.
// User content (names, course titles, messages, lesson text) is never in the
// dictionaries, so it stays as written.

export const LANGUAGES = [
  { code: "en", label: "English", short: "EN" },
  { code: "fr", label: "Français", short: "FR" },
  { code: "pt", label: "Português", short: "PT" },
  { code: "es", label: "Español", short: "ES" },
] as const;

export type Lang = (typeof LANGUAGES)[number]["code"];
export type Dict = Record<string, string>;

const STORAGE_KEY = "classproject-open-lang";
const EVENT = "classproject-lang-change";

export function isLang(v: unknown): v is Lang {
  return LANGUAGES.some((l) => l.code === v);
}

export function getLang(): Lang {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (isLang(v)) return v;
  } catch {}
  return "en";
}

export function setLang(lang: Lang) {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {}
  window.dispatchEvent(new CustomEvent(EVENT, { detail: lang }));
}

export function onLangChange(fn: (lang: Lang) => void) {
  const handler = (e: Event) => fn((e as CustomEvent<Lang>).detail);
  const storage = (e: StorageEvent) => e.key === STORAGE_KEY && fn(getLang());
  window.addEventListener(EVENT, handler);
  window.addEventListener("storage", storage);
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener("storage", storage);
  };
}

export async function loadDict(lang: Lang): Promise<Dict> {
  switch (lang) {
    case "fr":
      return (await import("./dict/fr.json")).default as Dict;
    case "pt":
      return (await import("./dict/pt.json")).default as Dict;
    case "es":
      return (await import("./dict/es.json")).default as Dict;
    default:
      return {};
  }
}

import type { Dict, Lang } from "@/lib/i18n";

// Translates rendered English in place. Text nodes are rewritten through
// nodeValue (React keeps its own reference to the node and simply overwrites
// it on the next render, which the observer then translates again), and a few
// attributes are swapped the same way. The original English is remembered so
// switching back to English restores every node exactly.
//
// Lookup order for a piece of text:
//   1. exact phrase ("Save changes")
//   2. words around a number ("12 students", "Page 3")
//   3. a template with {0} slots, from template literals in the source ("Messages ({0} unread)");
//      each slot's value is itself translated when it is a known phrase or a date
//   4. dates and relative times ("30 Sep 2026, 1:52 PM", "about 2 hours ago"), localised with Intl

const ATTRS = ["placeholder", "title", "aria-label", "alt"] as const;
const SKIP = "script,style,noscript,code,pre,textarea,.katex,[contenteditable],[data-no-translate]";

type Rec = { orig: string; applied: string };
const texts = new WeakMap<Text, Rec>();
const attrs = new WeakMap<Element, Map<string, Rec>>();

// Development aid: English that reached the screen without a translation. Inspect with window.__i18nMisses.
const misses = new Set<string>();
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") (window as unknown as { __i18nMisses: Set<string> }).__i18nMisses = misses;

type Template = { re: RegExp; anchor: string; out: string; slots: number; loose: boolean; fixed: number };
type Compiled = { lang: Lang; phrases: Dict; templates: Template[]; months: Map<string, string>; days: Map<string, string>; rtf: Intl.RelativeTimeFormat; dateWords: RegExp };

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function compile(dict: Dict, lang: Lang): Compiled {
  const phrases: Dict = {};
  const templates: Template[] = [];
  for (const [k, v] of Object.entries(dict)) {
    if (!/\{\d+\}/.test(k)) {
      phrases[k] = v;
      continue;
    }
    const parts = k.split(/(\{\d+\})/);
    const statics = parts.filter((p) => !/^\{\d+\}$/.test(p));
    const anchor = statics.reduce((a, b) => (b.trim().length > a.length ? b.trim() : a), "");
    const order: number[] = [];
    const re = new RegExp(
      "^" +
        parts
          .map((p) => {
            const m = p.match(/^\{(\d+)\}$/);
            if (!m) return escape(p);
            order.push(Number(m[1]));
            return "(.+?)";
          })
          .join("") +
        "$",
    );
    // Remember which capture group feeds which slot number.
    const out = v.replace(/\{(\d+)\}/g, (_, n) => `{${order.indexOf(Number(n))}}`);
    // "{0}, {1}" or "{0} min" carry almost no fixed English, so they only count when every slot is itself translated.
    const loose = statics.join("").replace(/[^A-Za-z]/g, "").length < 3;
    templates.push({ re, anchor, out, slots: order.length, loose, fixed: statics.join("").trim().length });
  }
  // Most specific first: more fixed text means a safer match ("{0} of {1} classes" before "{0} classes").
  templates.sort((a, b) => b.fixed - a.fixed);

  const months = new Map<string, string>();
  const days = new Map<string, string>();
  const long = (o: Intl.DateTimeFormatOptions, d: Date) => new Intl.DateTimeFormat(lang, o).format(d);
  for (let m = 0; m < 12; m++) {
    const d = new Date(2026, m, 15);
    const en = new Intl.DateTimeFormat("en", { month: "long" }).format(d);
    months.set(en, long({ month: "long" }, d));
    const short = long({ month: "short" }, d);
    months.set(en.slice(0, 3), short);
    if (en === "September") months.set("Sept", short);
  }
  for (let i = 0; i < 7; i++) {
    const d = new Date(2026, 0, 4 + i); // 4 Jan 2026 is a Sunday
    const en = new Intl.DateTimeFormat("en", { weekday: "long" }).format(d);
    days.set(en, long({ weekday: "long" }, d));
    days.set(en.slice(0, 3), long({ weekday: "short" }, d));
  }
  const dateWords = new RegExp([...months.values(), ...days.values()].sort((a, b) => b.length - a.length).map(escape).join("|"), "g");
  return { lang, phrases, templates, months, days, rtf: new Intl.RelativeTimeFormat(lang, { numeric: "auto" }), dateWords };
}

const UNITS = "second|minute|hour|day|week|month|year";
const RELATIVE = new RegExp(String.raw`^(in )?(?:about |over |almost |less than )?(a|an|\d+) (${UNITS})s?( ago)?$`);

function translateDate(key: string, c: Compiled): string | null {
  const rel = key.match(RELATIVE);
  if (rel && (rel[1] || rel[4])) {
    const n = rel[2] === "a" || rel[2] === "an" ? 1 : Number(rel[2]);
    return c.rtf.format(rel[4] ? -n : n, rel[3] as Intl.RelativeTimeFormatUnit);
  }
  if (/^less than a minute ago$/.test(key)) return c.rtf.format(0, "minute");
  let changed = false;
  const out = key.replace(/\b[A-Z][a-z]{2,8}\b/g, (w) => {
    const hit = c.months.get(w) ?? c.days.get(w);
    if (hit) changed = true;
    return hit ?? w;
  });
  // Only whole dates: once month and day names are swapped nothing English may remain.
  if (changed && !/[A-Za-z]{2,}/.test(out.replace(c.dateWords, " ").replace(/\b(AM|PM)\b/g, ""))) return out;
  return null;
}

const NUM = String.raw`[\d][\d.,:%/]*`;
const LEADING = new RegExp(String.raw`^(${NUM}\s*[×x]?\s*)(.+)$`);
const TRAILING = new RegExp(String.raw`^(.+?)(\s*[:(]?\s*${NUM}\)?)$`);

function lookup(key: string, c: Compiled, depth = 0): string | null {
  const hit = c.phrases[key];
  if (hit !== undefined) return hit;
  const l = key.match(LEADING);
  if (l && c.phrases[l[2]] !== undefined) return l[1] + c.phrases[l[2]];
  const t = key.match(TRAILING);
  if (t && c.phrases[t[1]] !== undefined) return c.phrases[t[1]] + t[2];
  const date = translateDate(key, c);
  if (date) return date;
  if (depth > 1) return null;
  // "(Certificate: Statistics in Everyday Life)": translate what's inside the brackets.
  const inner = key.match(/^\((.+)\)([.,;:]?)$/);
  if (inner) {
    const t = lookup(inner[1], c, depth + 1);
    if (t !== null) return `(${t})${inner[2]}`;
  }
  // Lists joined in code ("Mean, median and mode, Charts from data", "A · B · C" or "A → B → C"): translate item by item,
  // but only when every item is known (acronyms such as ICT pass through), so nothing ends up half-translated.
  if (depth === 0 && /( · |, | → )/.test(key)) {
    const parts = key.split(/( · |, | → )/);
    const out = parts.map((p, i) => (i % 2 ? p : (lookup(p.trim(), c, 1) ?? (/^[A-Z&]{2,6}$/.test(p.trim()) || !/[A-Za-z]{2}/.test(p) ? p : null))));
    if (out.every((x) => x !== null) && out.some((x, i) => x !== parts[i])) return out.join("");
  }
  for (const tpl of c.templates) {
    if (tpl.anchor && !key.includes(tpl.anchor)) continue;
    const m = key.match(tpl.re);
    if (!m) continue;
    const found = m.slice(1).map((v) => lookup(v.trim(), c, depth + 1));
    if (tpl.loose && found.some((f, i) => f === null && /[A-Za-z]{2}/.test(m[i + 1]))) continue;
    const vals = found.map((f, i) => f ?? m[i + 1]);
    return tpl.out.replace(/\{(\d+)\}/g, (_, i) => vals[Number(i)] ?? "");
  }
  return null;
}

export function translateString(value: string, c: Compiled): string {
  const key = value.replace(/\s+/g, " ").trim();
  if (!key) return value;
  const found = lookup(key, c);
  if (found === null) {
    if (process.env.NODE_ENV !== "production" && /[A-Za-z]{3}/.test(key)) misses.add(key);
    return value;
  }
  return value.match(/^\s*/)![0] + found + value.match(/\s*$/)![0];
}

function skipped(el: Element | null) {
  return !!el && !!el.closest(SKIP);
}

function doText(node: Text, c: Compiled | null) {
  const cur = node.nodeValue ?? "";
  let rec = texts.get(node);
  if (!rec || cur !== rec.applied) {
    // First sight, or React wrote new English into the node.
    rec = { orig: cur, applied: cur };
    texts.set(node, rec);
  }
  const next = c ? translateString(rec.orig, c) : rec.orig;
  if (next !== cur) {
    rec.applied = next;
    node.nodeValue = next;
  }
}

function doAttrs(el: Element, c: Compiled | null) {
  for (const name of ATTRS) {
    const cur = el.getAttribute(name);
    if (cur === null) continue;
    let map = attrs.get(el);
    let rec = map?.get(name);
    if (!rec || cur !== rec.applied) {
      rec = { orig: cur, applied: cur };
      if (!map) attrs.set(el, (map = new Map()));
      map.set(name, rec);
    }
    const next = c ? translateString(rec.orig, c) : rec.orig;
    if (next !== cur) {
      rec.applied = next;
      el.setAttribute(name, next);
    }
  }
}

function walk(root: Node, c: Compiled | null) {
  if (root.nodeType === Node.TEXT_NODE) {
    if (!skipped(root.parentElement)) doText(root as Text, c);
    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE) return;
  if (skipped(root as Element)) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.nodeType === Node.ELEMENT_NODE && (n as Element).matches(SKIP) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  let n: Node | null = walker.currentNode;
  while (n) {
    if (n.nodeType === Node.TEXT_NODE) doText(n as Text, c);
    else doAttrs(n as Element, c);
    n = walker.nextNode();
  }
}

let observer: MutationObserver | null = null;
let active: Compiled | null = null;

// Whole documents (Markdown lessons) are translated before they render, because once split
// into headings, bold runs and list items they no longer match a dictionary entry.
let version = 0;
const listeners = new Set<() => void>();
export const subscribeLanguage = (fn: () => void) => (listeners.add(fn), () => void listeners.delete(fn));
export const languageVersion = () => version;

/** The active language's version of a whole text, such as a Markdown lesson; the English when there is none. */
export function translateDocument(text: string): string {
  if (!active || !text) return text;
  return active.phrases[text.replace(/\s+/g, " ").trim()] ?? text;
}

/** Apply a language's dictionary to the whole page and keep applying it as the page changes. English (or an empty dictionary) restores the original text. */
export function applyDictionary(dict: Dict | null, lang: Lang) {
  active = dict && lang !== "en" && Object.keys(dict).length ? compile(dict, lang) : null;
  misses.clear();
  version++;
  listeners.forEach((fn) => fn());
  walk(document.body, active);
  if (active && !observer) {
    observer = new MutationObserver((records) => {
      for (const r of records) {
        if (r.type === "characterData") walk(r.target, active);
        else if (r.type === "attributes") {
          if (!skipped(r.target as Element)) doAttrs(r.target as Element, active);
        } else r.addedNodes.forEach((n) => walk(n, active));
      }
    });
    observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: [...ATTRS] });
  } else if (!active && observer) {
    observer.disconnect();
    observer = null;
  }
}

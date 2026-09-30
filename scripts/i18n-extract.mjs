// Extracts user-facing English strings from the source for translation.
// Usage: node scripts/i18n-extract.mjs <appRoot> <outFile>
//        node scripts/i18n-extract.mjs <appRoot> --missing   (lists strings with no entry in <appRoot>/lib/i18n/dict/{fr,pt,es}.json)
// Strings are the dictionary keys: whitespace collapsed, JSX entities decoded. Template literals become
// patterns with {0}, {1}… slots. User content (names, course titles) is never extracted, so it stays as written.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const root = path.resolve(process.argv[2] ?? ".");
const missingMode = process.argv[3] === "--missing";
const out = missingMode ? undefined : process.argv[3];
const require = createRequire(path.join(root, "package.json"));
const ts = require("typescript");

const DIRS = ["app", "components", "lib"];
const SKIP_DIRS = new Set(["node_modules", ".next", "ui", "data", "i18n"]); // shadcn primitives and seed data carry no UI copy (seed = user content)
const ATTRS = new Set(["title", "placeholder", "aria-label", "alt", "label", "description", "hint", "header", "emptyTitle", "emptyDescription", "confirmLabel", "text", "subtitle", "tooltip", "caption"]);
const PROPS = new Set(["label", "title", "description", "header", "hint", "text", "placeholder", "emptyTitle", "emptyDescription", "message", "subtitle", "tagline", "blurb", "detail"]);
const strings = new Set();
// Template literals (`${n} students`) render as one text node, so they are kept as patterns with {0}, {1}… slots.
const templates = new Set();
const NON_UI_ATTRS = new Set(["className", "href", "key", "id", "src", "to", "style", "htmlFor", "name", "value", "download", "type", "role", "data-testid"]);
function templateKey(node) {
  let i = 0;
  let s = node.head.text;
  for (const span of node.templateSpans) s += `{${i++}}` + span.literal.text;
  return s;
}
function uiTemplate(node) {
  for (let p = node.parent; p; p = p.parent) {
    if (ts.isJsxAttribute(p)) return !NON_UI_ATTRS.has(p.name.getText());
    if (ts.isCallExpression(p)) {
      const c = p.expression.getText();
      if (/^(cn|clsx|console\.\w+|router\.\w+|fetch|encodeURIComponent|new Date|Date\.parse|localStorage\.\w+|JSON\.\w+|document\.\w+|require|import|\w+\.(startsWith|endsWith|includes|split|replace|match|test|getItem|setItem|querySelector))$/.test(c)) return false;
    }
    if (ts.isPropertyAssignment(p) && /^(id|key|href|className|slug|url|src|path|email|username|code|publicId)$/.test(p.name.getText().replace(/["']/g, ""))) return false;
    if (ts.isVariableDeclaration(p) && /(id|key|href|url|path|class|slug|file|name)$/i.test(p.name.getText())) return false;
    if (ts.isBlock(p) || ts.isSourceFile(p)) break;
  }
  return true;
}

const looksLikeText = (s) => {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length < 2 || !/[A-Za-z]{2}/.test(t)) return null;
  if (/^[a-z0-9_.:/-]+$/.test(t) && !/\s/.test(t)) return null; // ids, keys, paths, classNames
  if (/^(https?:|\/|#|@|[\w-]+\.(tsx?|js|svg|png|pdf))/.test(t)) return null;
  if (/^[\w-]+(\s[\w-]+)*$/.test(t) && /(^|\s)(flex|grid|text-|bg-|px-|py-|rounded|border|size-|w-|h-|gap-)/.test(t)) return null; // Tailwind classes
  return t;
};

function visit(node, file) {
  if (ts.isJsxText(node)) {
    const t = looksLikeText(node.text);
    if (t) strings.add(t);
  } else if (ts.isJsxAttribute(node) && node.initializer) {
    const name = node.name.getText();
    if (ATTRS.has(name)) {
      const init = node.initializer;
      const lit = ts.isStringLiteral(init) ? init : ts.isJsxExpression(init) && init.expression && (ts.isStringLiteral(init.expression) || ts.isNoSubstitutionTemplateLiteral(init.expression)) ? init.expression : null;
      if (lit) {
        const t = looksLikeText(lit.text);
        if (t) strings.add(t);
      }
    }
  } else if (ts.isPropertyAssignment(node) && (ts.isStringLiteral(node.initializer) || ts.isNoSubstitutionTemplateLiteral(node.initializer))) {
    const name = node.name.getText().replace(/["']/g, "");
    if (PROPS.has(name)) {
      const t = looksLikeText(node.initializer.text);
      if (t) strings.add(t);
    }
  } else if (ts.isCallExpression(node)) {
    const callee = node.expression.getText();
    if (/^toast(\.\w+)?$/.test(callee) || /\bsetErr$|\bsetError$/.test(callee)) {
      for (const a of node.arguments) {
        if (ts.isStringLiteral(a) || ts.isNoSubstitutionTemplateLiteral(a)) {
          const t = looksLikeText(a.text);
          if (t) strings.add(t);
        }
        if (ts.isObjectLiteralExpression(a))
          for (const p of a.properties)
            if (ts.isPropertyAssignment(p) && (ts.isStringLiteral(p.initializer) || ts.isNoSubstitutionTemplateLiteral(p.initializer))) {
              const t = looksLikeText(p.initializer.text);
              if (t) strings.add(t);
            }
      }
    }
  } else if (ts.isConditionalExpression(node) && node.parent && (ts.isJsxExpression(node.parent) || ts.isConditionalExpression(node.parent))) {
    for (const b of [node.whenTrue, node.whenFalse])
      if (ts.isStringLiteral(b) || ts.isNoSubstitutionTemplateLiteral(b)) {
        const t = looksLikeText(b.text);
        if (t) strings.add(t);
      }
  }
  if (ts.isTemplateExpression(node) && uiTemplate(node)) {
    const k = templateKey(node).replace(/\s+/g, " ").trim();
    const words = k.replace(/\{\d+\}/g, " ");
    if (/[A-Za-z]{3}/.test(words) && /\s/.test(k) && !/^(https?:|\/|#|\.|mailto:)/.test(k) && !/(^|\s)(flex|grid|text-|bg-|px-|py-|rounded|border|size-|w-|h-|gap-|hover:|dark:)/.test(k) && !/[=;<>]/.test(k)) templates.add(k);
  }
  ts.forEachChild(node, (n) => visit(n, file));
}

function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!SKIP_DIRS.has(e.name)) walk(p);
    } else if (/\.(tsx|ts)$/.test(e.name) && !e.name.endsWith(".d.ts")) {
      const src = fs.readFileSync(p, "utf8");
      const sf = ts.createSourceFile(p, src, ts.ScriptTarget.Latest, true, e.name.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
      visit(sf, p);
    }
  }
}
for (const d of DIRS) if (fs.existsSync(path.join(root, d))) walk(path.join(root, d));
const list = [...strings].sort((a, b) => a.localeCompare(b));
if (out) fs.writeFileSync(out, JSON.stringify(list, null, 1));
const tlist = [...templates].sort((a, b) => a.localeCompare(b));
if (out) fs.writeFileSync(out.replace(/\.json$/, "") + "-templates.json", JSON.stringify(tlist, null, 1));
console.log(`${tlist.length} templates`);
console.log(`${list.length} strings, ${list.reduce((n, s) => n + s.length, 0)} characters`);
if (missingMode) {
  const decode = (s) => s.replace(/&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
  for (const lang of ["fr", "pt", "es"]) {
    const dict = JSON.parse(fs.readFileSync(path.join(root, "lib/i18n/dict", `${lang}.json`), "utf8"));
    const miss = [...list.map(decode), ...tlist].filter((k) => !(k in dict));
    console.log(`
${lang}: ${miss.length} without a translation`);
    for (const k of miss) console.log(`  ${k}`);
  }
}

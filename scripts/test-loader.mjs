// Lets `node --test` run the prototype's TypeScript logic without a bundler:
// resolves the "@/…" path alias and extensionless imports to .ts files.
// Node strips the types itself (Node 22.18+ / 24). Usage: npm test
import { register } from "node:module";

register(
  "data:text/javascript," +
    encodeURIComponent(`
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
const root = ${JSON.stringify(new URL("../", import.meta.url).href)};
export async function resolve(spec, ctx, next) {
  let url = spec.startsWith("@/") ? new URL(spec.slice(2), root).href : null;
  if (!url && (spec.startsWith("./") || spec.startsWith("../")) && ctx.parentURL?.startsWith("file:")) url = new URL(spec, ctx.parentURL).href;
  if (url && !/\.[cm]?[jt]sx?$/.test(url)) {
    for (const ext of [".ts", ".tsx", "/index.ts"]) if (existsSync(fileURLToPath(url + ext))) return next(url + ext, ctx);
  }
  return next(url ?? spec, ctx);
}
`),
);

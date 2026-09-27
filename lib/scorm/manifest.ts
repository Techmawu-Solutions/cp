/**
 * SCORM package manifest (imsmanifest.xml) reader — SCORM 1.2 and SCORM 2004
 * (2nd–4th edition) (spec §26.2).
 */

export type ScormVersion = "1.2" | "2004";

export interface ScormSco {
  /** Item identifier in the manifest's default organization. */
  id: string;
  title: string;
  /** Launch path inside the package, including any query string / parameters. */
  href: string;
  /** A plain asset (no SCORM API calls): viewing it counts as completed. */
  isAsset?: boolean;
  /** SCORM 1.2 adlcp:masteryscore (0–100). */
  masteryScore?: number;
  /** SCORM 2004 imsss:minNormalizedMeasure (0–1). */
  scaledPassingScore?: number;
  /** SCORM 2004 adlcp:completionThreshold (0–1). */
  completionThreshold?: number;
  /** adlcp:datafromlms / adlcp:dataFromLMS — sent to the SCO as launch data. */
  launchData?: string;
}

export interface ScormManifest {
  version: ScormVersion;
  /** e.g. "SCORM 1.2", "SCORM 2004 4th Edition" */
  versionLabel: string;
  identifier: string;
  title: string;
  scos: ScormSco[];
}

export class ScormPackageError extends Error {}

const local = (el: Element) => el.localName;
const children = (el: Element, name: string) => [...el.children].filter((c) => local(c) === name);
const child = (el: Element, name: string) => children(el, name)[0];
const text = (el: Element | undefined) => el?.textContent?.trim() ?? "";
/** Attribute by local name, ignoring its namespace prefix (adlcp:scormtype, adlcp:scormType…). */
const attr = (el: Element, name: string) => {
  for (const a of el.attributes) if (a.localName.toLowerCase() === name.toLowerCase()) return a.value;
  return undefined;
};

function joinPath(...parts: (string | undefined)[]) {
  const joined = parts.filter(Boolean).join("/").replace(/\/+/g, "/");
  const out: string[] = [];
  for (const seg of joined.split("/")) {
    if (seg === "..") out.pop();
    else if (seg !== ".") out.push(seg);
  }
  return out.join("/").replace(/^\//, "");
}

export function parseManifest(xml: string): ScormManifest {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.getElementsByTagName("parsererror").length) throw new ScormPackageError("imsmanifest.xml isn't valid XML.");
  const root = doc.documentElement;
  if (local(root) !== "manifest") throw new ScormPackageError("imsmanifest.xml has no <manifest> element.");

  const schemaVersion = text(root.getElementsByTagNameNS("*", "schemaversion")[0]);
  const is2004 = /2004|CAM 1\.3/i.test(schemaVersion) || [...root.attributes].some((a) => /adlcp_v1p3|imsss/.test(a.value));
  const version: ScormVersion = is2004 ? "2004" : "1.2";
  const edition = schemaVersion.match(/(\d)(?:rd|th|nd) Edition/i)?.[0];
  const versionLabel = is2004 ? `SCORM 2004${edition ? ` ${edition}` : ""}` : "SCORM 1.2";

  const orgs = child(root, "organizations");
  const resources = child(root, "resources");
  if (!orgs || !resources) throw new ScormPackageError("The manifest has no organizations or resources.");
  const defaultOrgId = attr(orgs, "default");
  const org = children(orgs, "organization").find((o) => attr(o, "identifier") === defaultOrgId) ?? children(orgs, "organization")[0];
  const resBase = attr(resources, "base") ?? "";
  const resById = new Map(children(resources, "resource").map((r) => [attr(r, "identifier") ?? "", r]));

  const scos: ScormSco[] = [];
  const walk = (el: Element) => {
    for (const item of children(el, "item")) {
      const ref = attr(item, "identifierref");
      const res = ref ? resById.get(ref) : undefined;
      if (res && attr(res, "href")) {
        const type = (attr(res, "scormtype") ?? "sco").toLowerCase();
        const params = attr(item, "parameters") ?? "";
        const href = joinPath(resBase, attr(res, "base"), attr(res, "href")) + (params ? (params.startsWith("?") || params.startsWith("#") ? params : `?${params}`) : "");
        const mastery = text(children(item, "masteryscore")[0]);
        const threshold = child(item, "completionThreshold");
        const seq = child(item, "sequencing");
        const objective = seq && child(child(seq, "objectives") ?? seq, "primaryObjective");
        const minMeasure = objective && text(child(objective, "minNormalizedMeasure"));
        const satisfiedByMeasure = objective && attr(objective, "satisfiedByMeasure") === "true";
        scos.push({
          id: attr(item, "identifier") ?? href,
          title: text(child(item, "title")) || href,
          href,
          // Assets (scormtype="asset") make no runtime calls; they are still launched so the course plays.
          isAsset: type === "asset",
          masteryScore: mastery ? Number(mastery) : undefined,
          scaledPassingScore: satisfiedByMeasure && minMeasure ? Number(minMeasure) : undefined,
          completionThreshold: threshold ? Number(attr(threshold, "minProgressMeasure") ?? text(threshold)) || undefined : undefined,
          launchData: text(children(item, "datafromlms")[0] ?? children(item, "dataFromLMS")[0]) || undefined,
        });
      }
      walk(item);
    }
  };
  if (org) walk(org);
  if (!scos.length) throw new ScormPackageError("The package has no launchable lessons (SCOs).");
  return {
    version,
    versionLabel,
    identifier: attr(root, "identifier") ?? "package",
    title: (org && text(child(org, "title"))) || scos[0]!.title,
    scos,
  };
}

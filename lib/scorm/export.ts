"use client";

import { sortInteractions, toQuestion } from "@/lib/interactive-video/engine";
import { strToU8, zipSync } from "fflate";
import { loadUpload } from "@/lib/file-registry";
import { EXPORT_PASS_MARK, quizScoHtml } from "@/lib/scorm/quiz-sco";
import type { Assessment, ContentItem, Course, CourseModule, VideoInteraction } from "@/lib/types";

/**
 * Exports a course as a SCORM package (spec section 26.2) — SCORM 1.2 or SCORM 2004
 * 4th Edition — so its content can be used in any SCORM-conformant LMS. Each
 * section becomes a group and each item a SCO that reports completion (and
 * time) through the standard run-time API. Imported SCORM packages are
 * embedded unchanged as their own resources.
 */
export type ExportVersion = "1.2" | "2004";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]!);
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "item";

/** Minimal version of the platform's lesson markup: ## headings, - bullets, **bold**. */
function lessonHtml(body: string) {
  const lines = body.split("\n");
  const out: string[] = [];
  let list = false;
  for (const raw of lines) {
    const line = esc(raw).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    if (/^\s*[-*] /.test(raw)) {
      if (!list) out.push("<ul>");
      list = true;
      out.push(`<li>${line.replace(/^\s*[-*] /, "")}</li>`);
      continue;
    }
    if (list) {
      out.push("</ul>");
      list = false;
    }
    if (/^###? /.test(raw)) out.push(`<h2>${line.replace(/^#+ /, "")}</h2>`);
    else if (raw.trim()) out.push(`<p>${line}</p>`);
  }
  if (list) out.push("</ul>");
  return out.join("\n");
}

function embedFor(item: ContentItem, fileHref?: string) {
  const url = fileHref ?? item.url ?? "";
  if (item.type === "text") return lessonHtml(item.body ?? "");
  if (item.type === "video") {
    const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{6,})/);
    if (yt) return `<div class="frame"><iframe src="https://www.youtube.com/embed/${yt[1]}" allowfullscreen></iframe></div>`;
    const vimeo = url.match(/vimeo\.com\/(\d+)/);
    if (vimeo) return `<div class="frame"><iframe src="https://player.vimeo.com/video/${vimeo[1]}" allowfullscreen></iframe></div>`;
    return `<video src="${esc(url)}" controls style="width:100%"></video>`;
  }
  if (item.type === "link") return `<p><a href="${esc(url)}" target="_blank" rel="noreferrer">${esc(url)}</a></p><div class="frame"><iframe src="${esc(url)}"></iframe></div>`;
  if (item.type === "document" && url) {
    const isPdf = /\.pdf($|\?)/i.test(item.fileName ?? url);
    return `${isPdf ? `<div class="frame tall"><iframe src="${esc(url)}"></iframe></div>` : ""}<p><a href="${esc(url)}" target="_blank" rel="noreferrer" download>Open ${esc(item.fileName ?? item.title)}</a></p>`;
  }
  if (["assignment", "quiz", "assessment"].includes(item.type)) return `<p class="note">This ${esc(item.type)} is completed on the ClassProject platform, where it is marked and recorded in the gradebook.</p>`;
  if (item.type === "live" || item.type === "recording") return `<p class="note">Live classes and their recordings are available on the ClassProject platform.</p>${url && item.type === "recording" ? `<video src="${esc(url)}" controls style="width:100%"></video>` : ""}`;
  return "";
}

/** Shared run-time wrapper used by every exported SCO: finds the LMS API (1.2 or 2004) and reports completion. */
const WRAPPER_JS = `(function () {
  function find(win, name) { var n = 0; while (win && n++ < 10) { if (win[name]) return win[name]; if (win.parent === win) break; win = win.parent; } return null; }
  var api = find(window, "API_1484_11") || (window.opener && find(window.opener, "API_1484_11"));
  var v2004 = !!api;
  if (!api) api = find(window, "API") || (window.opener && find(window.opener, "API"));
  var start = Date.now(), done = false, ended = false;
  function pad(n, l) { n = String(n); while (n.length < l) n = "0" + n; return n; }
  function time() { var s = (Date.now() - start) / 1000; var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return v2004 ? "PT" + h + "H" + m + "M" + sec.toFixed(2) + "S" : pad(h, 4) + ":" + pad(m, 2) + ":" + pad(sec.toFixed(2), 5); }
  function set(k12, k04, val) { if (!api) return; if (v2004) api.SetValue(k04, val); else api.LMSSetValue(k12, val); }
  function get(k12, k04) { if (!api) return ""; return v2004 ? api.GetValue(k04) : api.LMSGetValue(k12); }
  window.scormComplete = function () {
    if (done || !api) return; done = true;
    set("cmi.core.lesson_status", "cmi.completion_status", "completed");
    if (v2004) api.SetValue("cmi.success_status", "unknown");
    if (v2004) api.Commit(""); else api.LMSCommit("");
    var b = document.getElementById("scorm-done"); if (b) { b.textContent = "Completed ✓"; b.disabled = true; }
  };
  function finish() { if (ended || !api) return; ended = true; set("cmi.core.session_time", "cmi.session_time", time()); if (!done) set("cmi.core.exit", "cmi.exit", "suspend"); if (v2004) api.Terminate(""); else api.LMSFinish(""); }
  window.scormApi = function () { return api; };
  window.scormIs2004 = function () { return v2004; };
  /** Quiz SCOs report their score (0-100) and pass/fail (null = not scored). */
  window.scormResult = function (pct, passed) {
    if (!api) return; done = true;
    if (v2004) {
      api.SetValue("cmi.score.min", "0"); api.SetValue("cmi.score.max", "100"); api.SetValue("cmi.score.raw", String(pct)); api.SetValue("cmi.score.scaled", String(Math.round(pct * 10) / 1000));
      api.SetValue("cmi.completion_status", "completed"); api.SetValue("cmi.success_status", passed == null ? "unknown" : passed ? "passed" : "failed"); api.Commit("");
    } else {
      api.LMSSetValue("cmi.core.score.min", "0"); api.LMSSetValue("cmi.core.score.max", "100"); api.LMSSetValue("cmi.core.score.raw", String(pct));
      api.LMSSetValue("cmi.core.lesson_status", passed == null ? "completed" : passed ? "passed" : "failed"); api.LMSCommit("");
    }
  };
  var isLesson = document.body && document.body.getAttribute("data-kind") === "lesson";
  if (api) {
    if (v2004) api.Initialize(""); else api.LMSInitialize("");
    var st = get("cmi.core.lesson_status", "cmi.completion_status");
    if (st === "completed" || st === "passed") { done = true; var b = document.getElementById("scorm-done"); if (b && isLesson) { b.textContent = "Completed ✓"; b.disabled = true; } }
    else set("cmi.core.lesson_status", "cmi.completion_status", "incomplete");
  } else {
    var n = document.getElementById("scorm-standalone"); if (n) n.hidden = false;
  }
  window.addEventListener("pagehide", finish);
  window.addEventListener("beforeunload", finish);
})();`;

const PAGE_CSS = `body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:860px;margin:0 auto;padding:24px;color:#0f172a;line-height:1.6}
h1{font-size:1.6rem;margin:0 0 4px}.meta{color:#64748b;font-size:.9rem;margin-bottom:20px}.frame{position:relative;padding-top:56.25%;margin:12px 0}.frame.tall{padding-top:120%}
.frame iframe{position:absolute;inset:0;width:100%;height:100%;border:1px solid #e2e8f0;border-radius:8px}.note{background:#f1f5f9;padding:12px 14px;border-radius:8px}
#scorm-done{margin-top:24px;padding:10px 18px;border:0;border-radius:8px;background:#2563eb;color:#fff;font-size:1rem;cursor:pointer}#scorm-done:disabled{background:#16a34a;cursor:default}`;

function scoPage(course: Course, item: ContentItem, body: string) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(item.title)}</title><link rel="stylesheet" href="shared/style.css"></head>
<body data-kind="lesson">
<h1>${esc(item.title)}</h1>
<div class="meta">${esc(course.title)}${item.durationMinutes ? ` · ${item.durationMinutes} min` : ""}</div>
${item.description ? `<p>${esc(item.description)}</p>` : ""}
${body}
<button id="scorm-done" type="button" onclick="scormComplete()">Mark as complete</button>
<p id="scorm-standalone" class="note" hidden>Opened outside an LMS — progress isn't recorded.</p>
<script src="shared/scorm.js"></script>
</body></html>`;
}

type Group = { module: CourseModule; items: { id: string; title: string; resId: string; masteryScore?: number }[] };

function manifestXml(version: ExportVersion, course: Course, groups: Group[], resources: { id: string; href: string; files: string[]; scormType: "sco" | "asset" }[]) {
  const is2004 = version === "2004";
  const t = (s: string) => `<title>${esc(s)}</title>`;
  const orgItems = groups
    .map((g, gi) => `      <item identifier="SEC_${gi + 1}">\n        ${t(g.module.title)}\n${g.items.map((it) => `        <item identifier="ITEM_${it.id}" identifierref="${it.resId}">${t(it.title)}${it.masteryScore != null && !is2004 ? `<adlcp:masteryscore>${it.masteryScore}</adlcp:masteryscore>` : ""}</item>`).join("\n")}\n      </item>`)
    .join("\n");
  const res = resources
    .map((r) => `    <resource identifier="${r.id}" type="webcontent" ${is2004 ? "adlcp:scormType" : "adlcp:scormtype"}="${r.scormType}" href="${esc(r.href)}">\n${r.files.map((f) => `      <file href="${esc(f)}"/>`).join("\n")}\n    </resource>`)
    .join("\n");
  const head = is2004
    ? `<manifest identifier="CP_${course.id}" version="1.0" xmlns="http://www.imsglobal.org/xsd/imscp_v1p1" xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_v1p3" xmlns:adlseq="http://www.adlnet.org/xsd/adlseq_v1p3" xmlns:adlnav="http://www.adlnet.org/xsd/adlnav_v1p3" xmlns:imsss="http://www.imsglobal.org/xsd/imsss" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/imscp_v1p1 imscp_v1p1.xsd http://www.adlnet.org/xsd/adlcp_v1p3 adlcp_v1p3.xsd http://www.adlnet.org/xsd/adlseq_v1p3 adlseq_v1p3.xsd http://www.adlnet.org/xsd/adlnav_v1p3 adlnav_v1p3.xsd http://www.imsglobal.org/xsd/imsss imsss_v1p0.xsd">
  <metadata><schema>ADL SCORM</schema><schemaversion>2004 4th Edition</schemaversion></metadata>`
    : `<manifest identifier="CP_${course.id}" version="1.0" xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2" xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd http://www.imsglobal.org/xsd/imsmd_rootv1p2p1 imsmd_rootv1p2p1.xsd http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
  <metadata><schema>ADL SCORM</schema><schemaversion>1.2</schemaversion></metadata>`;
  return `<?xml version="1.0" encoding="UTF-8"?>
${head}
  <organizations default="ORG_1">
    <organization identifier="ORG_1">
      ${t(course.title)}
${orgItems}
    </organization>
  </organizations>
  <resources>
    <resource identifier="RES_SHARED" type="webcontent" ${is2004 ? "adlcp:scormType" : "adlcp:scormtype"}="asset">
      <file href="shared/scorm.js"/>
      <file href="shared/style.css"/>
    </resource>
${res}
  </resources>
</manifest>
`;
}

/**
 * `videoQuestions` holds each video lesson's published interactive questions
 * (spec section 26.3). They travel as a self-marking quiz SCO straight after
 * the video, since a SCORM player can't stop someone else's video at a moment.
 */
export async function exportCourseAsScorm(course: Course, modules: CourseModule[], contents: ContentItem[], version: ExportVersion, assessments: Assessment[] = [], videoQuestions: Record<string, VideoInteraction[]> = {}): Promise<Blob> {
  const files: Record<string, Uint8Array> = {
    "shared/scorm.js": strToU8(WRAPPER_JS),
    "shared/style.css": strToU8(PAGE_CSS),
  };
  const resources: { id: string; href: string; files: string[]; scormType: "sco" | "asset" }[] = [];
  const groups: Group[] = [];
  const origin = typeof location === "undefined" ? "" : location.origin;

  for (const section of [...modules].sort((a, b) => a.order - b.order)) {
    const items = contents.filter((c) => c.moduleId === section.id).sort((a, b) => a.order - b.order);
    if (!items.length) continue;
    const group: Group = { module: section, items: [] };
    for (const item of items) {
      const resId = `RES_${item.id}`;
      // An imported SCORM package is carried over as-is (its first SCO launches it).
      if (item.type === "scorm" && item.scorm) {
        const zip = await loadUpload(item.id).then((u) => (u ? fetch(u) : item.url ? fetch(item.url) : null)).then((r) => (r ? r.arrayBuffer() : null)).catch(() => null);
        if (zip) {
          const { unzipSync } = await import("fflate");
          const inner = unzipSync(new Uint8Array(zip));
          const dir = `packages/${slug(item.title)}-${item.id.slice(-6)}/`;
          const names: string[] = [];
          for (const [p, data] of Object.entries(inner)) {
            if (p.endsWith("/") || /imsmanifest\.xml$/i.test(p)) continue;
            files[dir + p] = data;
            names.push(dir + p);
          }
          item.scorm.scos.forEach((sco, i) => {
            const scoRes = `${resId}_${i + 1}`;
            resources.push({ id: scoRes, href: dir + sco.href, files: i === 0 ? names : [dir + sco.href.split(/[?#]/)[0]], scormType: sco.isAsset ? "asset" : "sco" });
            group.items.push({ id: `${item.id}_${i + 1}`, title: item.scorm!.scos.length > 1 ? `${item.title} — ${sco.title}` : item.title, resId: scoRes });
          });
          continue;
        }
      }
      // Quizzes and assessments become self-marking SCOs that report score, pass/fail and interactions.
      const assessment = ["quiz", "assignment", "assessment"].includes(item.type) ? assessments.find((a) => a.id === item.refId) : undefined;
      if (assessment && assessment.questions.length) {
        const page = `sco/${String(group.items.length + 1).padStart(2, "0")}-${slug(item.title)}-${item.id.slice(-6)}.html`;
        files[page] = strToU8(quizScoHtml(assessment, course.title));
        resources.push({ id: resId, href: page, files: [page, "shared/scorm.js", "shared/style.css"], scormType: "sco" });
        group.items.push({ id: item.id, title: item.title, resId, masteryScore: Math.round(EXPORT_PASS_MARK * 100) });
        continue;
      }
      // Files uploaded in this browser travel inside the package; others are linked.
      let fileHref: string | undefined;
      if (item.type === "document") {
        const stored = await loadUpload(item.id);
        if (stored) {
          const data = new Uint8Array(await (await fetch(stored)).arrayBuffer());
          fileHref = `files/${item.id}-${(item.fileName ?? "file").replace(/[^\w.-]+/g, "_")}`;
          files[fileHref] = data;
        } else if (item.url?.startsWith("/")) fileHref = origin + item.url;
      }
      const page = `sco/${String(group.items.length + 1).padStart(2, "0")}-${slug(item.title)}-${item.id.slice(-6)}.html`;
      // SCO pages live in sco/, so packaged files and shared/ are one level up.
      const html = scoPage(course, item, embedFor(item, fileHref?.startsWith("files/") ? `../${fileHref}` : fileHref)).replace(/(href|src)="shared\//g, '$1="../shared/');
      files[page] = strToU8(html);
      resources.push({ id: resId, href: page, files: [page, "shared/scorm.js", "shared/style.css", ...(fileHref?.startsWith("files/") ? [fileHref] : [])], scormType: "sco" });
      group.items.push({ id: item.id, title: item.title, resId });
      // Polls have no right answer, so only questions travel.
      const asked = sortInteractions(videoQuestions[item.id] ?? []).filter((i) => i.type !== "poll");
      if (item.type === "video" && asked.length) {
        const quiz: Assessment = { id: `${item.id}_questions`, schoolId: course.schoolId, sessionId: course.sessionId, courseId: course.id, subjectId: course.subjectId, classId: course.classId, teacherId: course.teacherId, title: `${item.title} — questions`, description: "", type: "quiz", totalMarks: asked.reduce((n, i) => n + Math.max(i.points, 1), 0), dueDate: item.createdAt, status: "published", questions: asked.map(toQuestion), createdAt: item.createdAt };
        const qPage = `sco/${String(group.items.length + 1).padStart(2, "0")}-${slug(item.title)}-questions-${item.id.slice(-6)}.html`;
        files[qPage] = strToU8(quizScoHtml(quiz, course.title));
        resources.push({ id: `${resId}_Q`, href: qPage, files: [qPage, "shared/scorm.js", "shared/style.css"], scormType: "sco" });
        group.items.push({ id: `${item.id}_questions`, title: quiz.title, resId: `${resId}_Q`, masteryScore: Math.round(EXPORT_PASS_MARK * 100) });
      }
    }
    groups.push(group);
  }
  // The course's assessments that aren't placed in a section travel as their own group of quiz SCOs.
  const placed = new Set(contents.map((c) => c.refId).filter(Boolean));
  const extra = assessments.filter((x) => x.courseId === course.id && x.status !== "draft" && x.questions.length > 0 && !x.scormContentId && !placed.has(x.id)).sort((x, y) => x.dueDate.localeCompare(y.dueDate));
  if (extra.length) {
    const group: Group = { module: { id: "assessments", courseId: course.id, title: "Assessments", description: "", order: 999, published: true }, items: [] };
    extra.forEach((x, i) => {
      const resId = `RES_${x.id}`;
      const page = `sco/assessment-${String(i + 1).padStart(2, "0")}-${slug(x.title)}.html`;
      files[page] = strToU8(quizScoHtml(x, course.title));
      resources.push({ id: resId, href: page, files: [page, "shared/scorm.js", "shared/style.css"], scormType: "sco" });
      group.items.push({ id: x.id, title: x.title, resId, masteryScore: Math.round(EXPORT_PASS_MARK * 100) });
    });
    groups.push(group);
  }
  files["imsmanifest.xml"] = strToU8(manifestXml(version, course, groups, resources));
  const zipped = zipSync(files, { level: 6 });
  return new Blob([zipped as BlobPart], { type: "application/zip" });
}

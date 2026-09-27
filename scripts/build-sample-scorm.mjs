// Builds public/samples/scorm-computer-basics.zip — a small SCORM 1.2 package
// used as demo content (spec §26.2). Run: node scripts/build-sample-scorm.mjs
import { writeFileSync, mkdirSync } from "node:fs";
import { strToU8, zipSync } from "fflate";

const css = `body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:760px;margin:0 auto;padding:28px;color:#0f172a;line-height:1.6;background:#fff}
h1{font-size:1.5rem;margin:0 0 6px}.tag{display:inline-block;background:#ecfdf5;color:#047857;border-radius:999px;padding:2px 10px;font-size:.8rem;margin-bottom:14px}
.card{border:1px solid #e2e8f0;border-radius:12px;padding:18px;margin:14px 0}.nav{display:flex;gap:8px;justify-content:space-between;align-items:center;margin-top:20px}
button{padding:9px 16px;border:0;border-radius:8px;background:#2563eb;color:#fff;font-size:.95rem;cursor:pointer}button.secondary{background:#e2e8f0;color:#0f172a}button:disabled{opacity:.5;cursor:default}
.dots span{display:inline-block;width:9px;height:9px;border-radius:50%;background:#cbd5e1;margin:0 3px}.dots span.on{background:#2563eb}
label.opt{display:block;border:1px solid #e2e8f0;border-radius:8px;padding:8px 12px;margin:6px 0;cursor:pointer}label.opt:hover{background:#f8fafc}
.result{font-size:1.1rem;font-weight:600}.ok{color:#15803d}.bad{color:#b91c1c}`;

const apiJs = `// Finds the SCORM 1.2 API on a parent window (SCORM RTE API discovery).
window.findAPI = function () { var w = window, n = 0; while (w && n++ < 10) { if (w.API) return w.API; if (w.parent === w) break; w = w.parent; } return window.opener && window.opener.API || null; };
window.scormTime = function (ms) { var s = ms / 1000, h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = (s % 60).toFixed(2);
  return ("000" + h).slice(-4) + ":" + ("0" + m).slice(-2) + ":" + ("0" + sec).slice(-5); };`;

const lesson = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Parts of a computer</title><link rel="stylesheet" href="shared/style.css"><script src="shared/api.js"></script></head><body>
<span class="tag">SCORM 1.2 lesson</span><h1>Parts of a computer</h1>
<div id="page" class="card"></div>
<div class="nav"><button class="secondary" id="prev">Back</button><span class="dots" id="dots"></span><button id="next">Next</button></div>
<p id="note" style="color:#64748b;font-size:.85rem"></p>
<script>
var pages = [
  "<h2>Input devices</h2><p>Input devices send data <strong>into</strong> the computer: the <strong>keyboard</strong>, <strong>mouse</strong>, <strong>microphone</strong>, <strong>scanner</strong> and <strong>webcam</strong>.</p>",
  "<h2>Processing</h2><p>The <strong>CPU</strong> (Central Processing Unit) carries out instructions. <strong>RAM</strong> holds the programs and data being used right now — it is emptied when the computer is switched off.</p>",
  "<h2>Output devices</h2><p>Output devices show or produce results: the <strong>monitor</strong>, <strong>printer</strong>, <strong>speakers</strong> and <strong>projector</strong>.</p>",
  "<h2>Storage</h2><p>Storage keeps data when the power is off: <strong>hard disk drives</strong>, <strong>solid-state drives</strong>, <strong>flash drives</strong> and <strong>cloud storage</strong>.</p><p>That's the end of the lesson — well done! Take the quick check next.</p>"
];
var api = findAPI(), start = Date.now(), page = 0, finished = false;
if (api) {
  api.LMSInitialize("");
  // Resume where the learner left off (bookmarking with cmi.core.lesson_location).
  var loc = parseInt(api.LMSGetValue("cmi.core.lesson_location"), 10);
  if (!isNaN(loc) && api.LMSGetValue("cmi.core.entry") === "resume") page = Math.min(loc, pages.length - 1);
  document.getElementById("note").textContent = "Signed in as " + api.LMSGetValue("cmi.core.student_name") + " · progress is saved";
} else document.getElementById("note").textContent = "Opened outside an LMS — progress isn't saved.";
function show() {
  document.getElementById("page").innerHTML = pages[page];
  document.getElementById("prev").disabled = page === 0;
  document.getElementById("next").textContent = page === pages.length - 1 ? "Finish" : "Next";
  document.getElementById("dots").innerHTML = pages.map(function (_, i) { return '<span class="' + (i <= page ? "on" : "") + '"></span>'; }).join("");
  if (api) { api.LMSSetValue("cmi.core.lesson_location", String(page)); api.LMSCommit(""); }
}
document.getElementById("prev").onclick = function () { if (page > 0) { page--; show(); } };
document.getElementById("next").onclick = function () {
  if (page < pages.length - 1) { page++; show(); return; }
  if (api && !finished) { api.LMSSetValue("cmi.core.lesson_status", "completed"); api.LMSCommit(""); }
  document.getElementById("next").disabled = true; document.getElementById("next").textContent = "Completed ✓";
};
function end() { if (!api || finished) return; finished = true; api.LMSSetValue("cmi.core.session_time", scormTime(Date.now() - start));
  if (api.LMSGetValue("cmi.core.lesson_status") !== "completed") api.LMSSetValue("cmi.core.exit", "suspend"); api.LMSFinish(""); }
window.addEventListener("pagehide", end); window.addEventListener("beforeunload", end);
show();
</script></body></html>`;

const questions = [
  ["Which of these is an input device?", ["Monitor", "Keyboard", "Printer", "Speaker"], 1],
  ["What does CPU stand for?", ["Central Processing Unit", "Computer Power Unit", "Central Program Utility", "Control Processing Unit"], 0],
  ["Which memory is emptied when the computer is switched off?", ["Hard disk", "Flash drive", "RAM", "Cloud storage"], 2],
  ["Which of these is an output device?", ["Scanner", "Microphone", "Webcam", "Projector"], 3],
  ["Where can you keep files so you can open them from any computer?", ["RAM", "Cloud storage", "CPU", "Keyboard"], 1],
];

const quiz = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Quick check</title><link rel="stylesheet" href="shared/style.css"><script src="shared/api.js"></script></head><body>
<span class="tag">SCORM 1.2 quiz · pass mark 60%</span><h1>Quick check: parts of a computer</h1>
<form id="quiz"></form>
<div class="nav"><span id="result" class="result"></span><button id="submit" type="button">Submit answers</button></div>
<script>
var qs = ${JSON.stringify(questions)};
var api = findAPI(), start = Date.now(), finished = false;
if (api) api.LMSInitialize("");
document.getElementById("quiz").innerHTML = qs.map(function (q, i) {
  return '<div class="card"><p><strong>' + (i + 1) + ". " + q[0] + "</strong></p>" + q[1].map(function (o, j) {
    return '<label class="opt"><input type="radio" name="q' + i + '" value="' + j + '"> ' + o + "</label>"; }).join("") + "</div>";
}).join("");
document.getElementById("submit").onclick = function () {
  var right = 0;
  qs.forEach(function (q, i) {
    var pick = document.querySelector('input[name="q' + i + '"]:checked');
    var ok = pick && Number(pick.value) === q[2];
    if (ok) right++;
    if (api) {
      // Interactions: one record per question (cmi.interactions.n.*).
      api.LMSSetValue("cmi.interactions." + i + ".id", "Q" + (i + 1));
      api.LMSSetValue("cmi.interactions." + i + ".type", "choice");
      api.LMSSetValue("cmi.interactions." + i + ".student_response", pick ? String(pick.value) : "");
      api.LMSSetValue("cmi.interactions." + i + ".correct_responses.0.pattern", String(q[2]));
      api.LMSSetValue("cmi.interactions." + i + ".result", ok ? "correct" : "wrong");
    }
  });
  var pct = Math.round((right / qs.length) * 100);
  if (api) {
    api.LMSSetValue("cmi.core.score.min", "0");
    api.LMSSetValue("cmi.core.score.max", "100");
    api.LMSSetValue("cmi.core.score.raw", String(pct));
    // The LMS sets passed/failed from the manifest's mastery score (60).
    api.LMSSetValue("cmi.core.lesson_status", "completed");
    api.LMSCommit("");
  }
  var el = document.getElementById("result");
  el.textContent = "You scored " + right + "/" + qs.length + " (" + pct + "%) — " + (pct >= 60 ? "passed" : "try again");
  el.className = "result " + (pct >= 60 ? "ok" : "bad");
};
function end() { if (!api || finished) return; finished = true; api.LMSSetValue("cmi.core.session_time", scormTime(Date.now() - start)); api.LMSFinish(""); }
window.addEventListener("pagehide", end); window.addEventListener("beforeunload", end);
</script></body></html>`;

const manifest = `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="CLASSPROJECT_COMPUTER_BASICS" version="1.0" xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2" xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd http://www.imsglobal.org/xsd/imsmd_rootv1p2p1 imsmd_rootv1p2p1.xsd http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
  <metadata><schema>ADL SCORM</schema><schemaversion>1.2</schemaversion></metadata>
  <organizations default="ORG_1">
    <organization identifier="ORG_1">
      <title>Computer Basics</title>
      <item identifier="ITEM_LESSON" identifierref="RES_LESSON"><title>Parts of a computer</title></item>
      <item identifier="ITEM_QUIZ" identifierref="RES_QUIZ"><title>Quick check</title><adlcp:masteryscore>60</adlcp:masteryscore></item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="RES_LESSON" type="webcontent" adlcp:scormtype="sco" href="lesson.html"><file href="lesson.html"/><dependency identifierref="RES_SHARED"/></resource>
    <resource identifier="RES_QUIZ" type="webcontent" adlcp:scormtype="sco" href="quiz.html"><file href="quiz.html"/><dependency identifierref="RES_SHARED"/></resource>
    <resource identifier="RES_SHARED" type="webcontent" adlcp:scormtype="asset"><file href="shared/api.js"/><file href="shared/style.css"/></resource>
  </resources>
</manifest>
`;

const zip = zipSync({
  "imsmanifest.xml": strToU8(manifest),
  "lesson.html": strToU8(lesson),
  "quiz.html": strToU8(quiz),
  "shared/api.js": strToU8(apiJs),
  "shared/style.css": strToU8(css),
});
mkdirSync("public/samples", { recursive: true });
writeFileSync("public/samples/scorm-computer-basics.zip", zip);
console.log("wrote public/samples/scorm-computer-basics.zip", zip.length, "bytes");

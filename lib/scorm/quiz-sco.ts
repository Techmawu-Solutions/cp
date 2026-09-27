/**
 * Builds a self-marking SCORM quiz page (SCO) from a platform assessment, for
 * course export (spec §26.2). Auto-marked question types are scored inside the
 * package exactly as the platform marks them (lib/questions.ts) and reported
 * as score, pass/fail status and one interaction per question. Written answers
 * (short/long/essay/file) are recorded as responses but can't be scored here.
 */
import type { Assessment, Question } from "@/lib/types";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Pass mark used for exported quizzes (fraction of the auto-marked total). */
export const EXPORT_PASS_MARK = 0.5;

type QuizQ = Pick<Question, "id" | "type" | "prompt" | "marks" | "options" | "answer" | "answers" | "distractors" | "tolerance" | "pairs" | "image" | "imageAlt">;

export function quizScoHtml(a: Assessment, courseTitle: string): string {
  const questions: QuizQ[] = a.questions.map(({ id, type, prompt, marks, options, answer, answers, distractors, tolerance, pairs, image, imageAlt }) => ({ id, type, prompt, marks, options, answer, answers, distractors, tolerance, pairs, image, imageAlt }));
  // "</" can't appear inside an inline script.
  const data = JSON.stringify({ title: a.title, passMark: EXPORT_PASS_MARK, questions }).replace(/<\//g, "<\\/");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(a.title)}</title><link rel="stylesheet" href="../shared/style.css">
<style>.q{border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin:14px 0}.q img{max-width:100%;border-radius:8px}.opt{display:block;border:1px solid #e2e8f0;border-radius:8px;padding:8px 12px;margin:6px 0;cursor:pointer}
.opt:hover{background:#f8fafc}select,input[type=text],textarea{font:inherit;padding:6px 8px;border:1px solid #cbd5e1;border-radius:6px}textarea{width:100%;min-height:90px}
.row{display:flex;gap:8px;align-items:center;margin:6px 0}.mark{font-size:.8rem;color:#64748b}.fb{margin-top:8px;font-size:.9rem}.ok{color:#15803d}.bad{color:#b91c1c}#summary{font-size:1.1rem;font-weight:600;margin-top:16px}</style></head>
<body>
<h1>${esc(a.title)}</h1>
<div class="meta">${esc(courseTitle)} · ${esc(a.type)} · pass mark ${Math.round(EXPORT_PASS_MARK * 100)}%</div>
${a.description ? `<p>${esc(a.description)}</p>` : ""}
<form id="quiz" onsubmit="return false"></form>
<button id="scorm-done" type="button">Submit answers</button>
<div id="summary"></div>
<p id="scorm-standalone" class="note" hidden>Opened outside an LMS — your score isn't recorded.</p>
<script src="../shared/scorm.js"></script>
<script>
(function () {
  var D = ${data};
  var form = document.getElementById("quiz");
  var AUTO = { mcq: 1, multi_select: 1, true_false: 1, fill_blank: 1, numeric: 1, matching: 1, ordering: 1, drag_words: 1 };
  function h(s) { var d = document.createElement("div"); d.textContent = s == null ? "" : String(s); return d.innerHTML; }
  function norm(s) { return String(s == null ? "" : s).trim().toLowerCase().replace(/\\s+/g, " "); }
  function letter(i) { return String.fromCharCode(97 + i); }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  D.questions.forEach(function (q, i) {
    var html = '<div class="q"><p><strong>' + (i + 1) + ". " + h(q.prompt).replace(/_{3,}/g, "_____") + '</strong> <span class="mark">(' + q.marks + " mark" + (q.marks === 1 ? "" : "s") + ")</span></p>";
    if (q.image) html += '<img src="' + h(q.image) + '" alt="' + h(q.imageAlt || "") + '">';
    var n = "q" + i;
    if (q.type === "mcq") (q.options || []).forEach(function (o, j) { html += '<label class="opt"><input type="radio" name="' + n + '" value="' + j + '"> ' + h(o) + "</label>"; });
    else if (q.type === "true_false") ["true", "false"].forEach(function (v) { html += '<label class="opt"><input type="radio" name="' + n + '" value="' + v + '"> ' + (v === "true" ? "True" : "False") + "</label>"; });
    else if (q.type === "multi_select") (q.options || []).forEach(function (o, j) { html += '<label class="opt"><input type="checkbox" name="' + n + '" value="' + j + '"> ' + h(o) + "</label>"; });
    else if (q.type === "fill_blank" || q.type === "numeric" || q.type === "short_answer") html += '<input type="text" name="' + n + '" style="width:100%" ' + (q.type === "numeric" ? 'inputmode="decimal"' : "") + ">";
    else if (q.type === "matching") { var rights = shuffle((q.pairs || []).map(function (p) { return p.right; }));
      (q.pairs || []).forEach(function (p, j) { html += '<div class="row"><span style="flex:1">' + h(p.left) + '</span><select name="' + n + "_" + j + '"><option value="">Choose…</option>' + rights.map(function (r) { return '<option value="' + h(r) + '">' + h(r) + "</option>"; }).join("") + "</select></div>"; }); }
    else if (q.type === "ordering") { var items = (q.options || []).map(function (o, j) { return { o: o, j: j }; }), mixed = shuffle(items);
      items.forEach(function (_, pos) { html += '<div class="row"><span>' + (pos + 1) + '.</span><select name="' + n + "_" + pos + '"><option value="">Choose…</option>' + mixed.map(function (x) { return '<option value="' + x.j + '">' + h(x.o) + "</option>"; }).join("") + "</select></div>"; }); }
    else if (q.type === "drag_words") { var bank = shuffle((q.answers || []).concat(q.distractors || []));
      (q.answers || []).forEach(function (_, b) { html += '<div class="row"><span>Blank ' + (b + 1) + '</span><select name="' + n + "_" + b + '"><option value="">Choose…</option>' + bank.map(function (w) { return '<option value="' + h(w) + '">' + h(w) + "</option>"; }).join("") + "</select></div>"; }); }
    else html += '<textarea name="' + n + '" placeholder="' + (q.type === "file" ? "Describe your work — upload the file on ClassProject" : "Your answer") + '"></textarea>';
    if (!AUTO[q.type]) html += '<p class="mark">Marked by your teacher on ClassProject — not scored in this package.</p>';
    html += '<div class="fb" id="fb' + i + '"></div></div>';
    form.insertAdjacentHTML("beforeend", html);
  });

  function val(n) { var el = form.elements[n]; return el ? el.value : ""; }
  function checked(n) { return Array.prototype.slice.call(form.querySelectorAll('input[name="' + n + '"]:checked')).map(function (x) { return x.value; }); }

  /** Same marking rules as the platform (lib/questions.ts). Returns [fraction, response]. */
  function mark(q, i) {
    var n = "q" + i;
    switch (q.type) {
      case "mcq": case "true_false": { var v = checked(n)[0] || ""; return [q.answer != null && norm(v) === norm(q.answer) ? 1 : 0, v]; }
      case "fill_blank": { var t = val(n); return [String(q.answer || "").split("|").some(function (x) { return x.trim() && norm(x) === norm(t); }) ? 1 : 0, t]; }
      case "numeric": { var s = val(n), num = Number(s.replace(/,/g, "")); return [s.trim() !== "" && !isNaN(num) && Math.abs(num - Number(q.answer)) <= (q.tolerance || 0) + 1e-9 ? 1 : 0, s]; }
      case "multi_select": { var want = q.answers || [], got = checked(n); if (!want.length) return [0, got];
        var right = got.filter(function (c) { return want.indexOf(c) >= 0; }).length; return [Math.max(0, (right - (got.length - right)) / want.length), got]; }
      case "ordering": { var order = (q.options || []).map(function (_, p) { return val(n + "_" + p); });
        return [(q.options || []).length ? order.filter(function (x, p) { return x !== "" && Number(x) === p; }).length / q.options.length : 0, order]; }
      case "matching": { var pairs = q.pairs || [], picks = pairs.map(function (_, j) { return val(n + "_" + j); });
        return [pairs.length ? pairs.filter(function (p, j) { return picks[j] === p.right; }).length / pairs.length : 0, picks]; }
      case "drag_words": { var ws = q.answers || [], placed = ws.map(function (_, b) { return val(n + "_" + b); });
        return [ws.length ? ws.filter(function (w, b) { return placed[b] && norm(placed[b]) === norm(w); }).length / ws.length : 0, placed]; }
      default: return [null, val(n)];
    }
  }

  var TYPE12 = { mcq: "choice", multi_select: "choice", true_false: "true-false", fill_blank: "fill-in", numeric: "numeric", matching: "matching", ordering: "sequencing", drag_words: "fill-in", short_answer: "fill-in", long_answer: "fill-in", essay: "fill-in", file: "fill-in" };
  var TYPE04 = { mcq: "choice", multi_select: "choice", true_false: "true-false", fill_blank: "fill-in", numeric: "numeric", matching: "matching", ordering: "sequencing", drag_words: "fill-in", short_answer: "fill-in", long_answer: "long-fill-in", essay: "long-fill-in", file: "long-fill-in" };

  /** Formats a response for cmi.interactions.n.(student|learner)_response in each SCORM version. */
  function fmt(q, resp, v04) {
    var sep = v04 ? "[,]" : ",";
    var clip = function (s) { return String(s).slice(0, v04 ? 4000 : 255); };
    switch (q.type) {
      case "mcq": return resp === "" ? "" : letter(Number(resp));
      case "multi_select": return resp.map(function (x) { return letter(Number(x)); }).join(sep);
      case "true_false": return resp === "" ? "" : v04 ? resp : resp.charAt(0);
      case "ordering": return resp.map(function (x) { return x === "" ? "" : letter(Number(x)); }).join(sep);
      case "matching": return resp.map(function (r, j) { return (j + 1) + (v04 ? "[.]" : ".") + clip(r || ""); }).join(sep);
      case "drag_words": return clip(resp.join(v04 ? "[,]" : ","));
      default: return clip(resp);
    }
  }
  function correct(q, v04) {
    var sep = v04 ? "[,]" : ",";
    switch (q.type) {
      case "mcq": return q.answer == null ? "" : letter(Number(q.answer));
      case "true_false": return v04 ? String(q.answer) : String(q.answer).charAt(0);
      case "multi_select": return (q.answers || []).map(function (x) { return letter(Number(x)); }).join(sep);
      case "ordering": return (q.options || []).map(function (_, p) { return letter(p); }).join(sep);
      case "matching": return (q.pairs || []).map(function (p, j) { return (j + 1) + (v04 ? "[.]" : ".") + p.right; }).join(sep);
      case "drag_words": return (q.answers || []).join(sep);
      case "fill_blank": return String(q.answer || "").split("|")[0];
      case "numeric": return v04 ? String(q.answer) + "[:]" + String(q.answer) : String(q.answer);
      default: return "";
    }
  }

  document.getElementById("scorm-done").onclick = function () {
    var api = window.scormApi && window.scormApi(), v04 = !!(window.scormIs2004 && window.scormIs2004());
    var got = 0, max = 0;
    D.questions.forEach(function (q, i) {
      var r = mark(q, i), frac = r[0], fb = document.getElementById("fb" + i);
      if (frac != null) { max += q.marks; got += Math.round(q.marks * frac * 10) / 10;
        fb.textContent = frac >= 1 ? "Correct" : frac > 0 ? "Partly correct" : "Not correct"; fb.className = "fb " + (frac >= 1 ? "ok" : "bad"); }
      if (api) {
        var p = "cmi.interactions." + i + ".", set = function (k, v) { if (v04) api.SetValue(p + k, v); else api.LMSSetValue(p + k, v); };
        set("id", "Q" + (i + 1) + "_" + q.id.replace(/[^\\w-]/g, "").slice(0, 60));
        set("type", (v04 ? TYPE04 : TYPE12)[q.type] || "other");
        set("weighting", String(q.marks));
        var c = correct(q, v04); if (c !== "") set("correct_responses.0.pattern", c);
        set(v04 ? "learner_response" : "student_response", fmt(q, r[1], v04));
        if (frac != null) set("result", frac >= 1 ? "correct" : v04 ? "incorrect" : "wrong");
        if (v04) set("description", String(q.prompt).slice(0, 250));
      }
    });
    var pct = max ? Math.round((got / max) * 1000) / 10 : 100, passed = pct / 100 >= D.passMark;
    document.getElementById("summary").textContent = max ? "You scored " + got + "/" + max + " (" + pct + "%) — " + (passed ? "passed" : "not yet passed") : "Your answers were recorded.";
    document.getElementById("summary").className = max ? (passed ? "ok" : "bad") : "";
    this.disabled = true; this.textContent = "Submitted ✓";
    if (window.scormResult) window.scormResult(pct, max > 0 ? passed : null);
  };
})();
</script>
</body></html>`;
}

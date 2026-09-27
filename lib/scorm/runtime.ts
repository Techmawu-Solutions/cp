/**
 * SCORM run-time environment (spec §26.2): the API object a SCO finds by
 * walking up its window parents — `window.API` for SCORM 1.2 and
 * `window.API_1484_11` for SCORM 2004 — with the CMI data model, error codes
 * and status rules of each version.
 */
import type { ScormPackageInfo } from "@/lib/types";

type Sco = ScormPackageInfo["scos"][number];
type Access = "ro" | "rw" | "wo";

export interface RuntimeSummary {
  completion: "not attempted" | "incomplete" | "completed" | "unknown";
  success: "passed" | "failed" | "unknown";
  scorePercent?: number;
  totalSeconds: number;
  exit: string;
}

export interface RuntimeOptions {
  version: "1.2" | "2004";
  sco: Sco;
  learnerId: string;
  /** "Last, First" as SCORM expects. */
  learnerName: string;
  /** "normal" records results; "browse" (e.g. a teacher previewing) does not. */
  mode: "normal" | "browse" | "review";
  /** Data saved by the previous session, if any. */
  previous?: Record<string, string>;
  onCommit: (cmi: Record<string, string>, summary: RuntimeSummary, finished: boolean) => void;
  /** SCORM 2004 navigation between the package's SCOs. */
  navigation?: { hasNext: boolean; hasPrevious: boolean; ids: string[] };
  /** Called after Terminate with the SCO's adl.nav.request (continue, previous, {target=ID}choice, exit…). */
  onNavigate?: (request: string) => void;
  onLog?: (call: string, result: string, error: string) => void;
}

// ---------------------------------------------------------------- time formats

/** SCORM 1.2 CMITimespan (HHHH:MM:SS.SS) or SCORM 2004 ISO 8601 duration (P…T…) → seconds. */
export function parseDuration(v: string | undefined): number {
  if (!v) return 0;
  const hms = v.match(/^(\d{2,4}):(\d{2}):(\d{2}(?:\.\d{1,2})?)$/);
  if (hms) return Number(hms[1]) * 3600 + Number(hms[2]) * 60 + Number(hms[3]);
  const iso = v.match(/^P(?:(\d+(?:\.\d+)?)Y)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/);
  if (!iso || v === "P" || v.endsWith("T")) return NaN;
  const [, y, mo, d, h, mi, s] = iso.map((x) => Number(x ?? 0));
  return y! * 31_536_000 + mo! * 2_592_000 + d! * 86_400 + h! * 3600 + mi! * 60 + s!;
}

export function formatTimespan12(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(4, "0")}:${String(m).padStart(2, "0")}:${s.toFixed(2).padStart(5, "0")}`;
}

export function formatDuration2004(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round((seconds % 60) * 100) / 100;
  return `PT${h}H${m}M${s}S`;
}

// ---------------------------------------------------------------- data model definitions

interface ElementDef {
  pattern: RegExp;
  access: Access;
  /** Returns an error code when the value is invalid. */
  check?: (v: string) => boolean;
  range?: (v: string) => boolean;
  /** Value returned for a read-only keyword element (e.g. _children). */
  value?: string;
}

const isDecimal = (v: string) => /^-?\d+(\.\d+)?$/.test(v);
const oneOf = (...vals: string[]) => (v: string) => vals.includes(v);
const maxLen = (n: number) => (v: string) => v.length <= n;

const MODEL_12: ElementDef[] = [
  { pattern: /^cmi\._children$/, access: "ro", value: "core,suspend_data,launch_data,comments,comments_from_lms,objectives,student_data,student_preference,interactions" },
  { pattern: /^cmi\.core\._children$/, access: "ro", value: "student_id,student_name,lesson_location,credit,lesson_status,entry,score,total_time,lesson_mode,exit,session_time" },
  { pattern: /^cmi\.core\.(student_id|student_name|credit|entry|total_time|lesson_mode)$/, access: "ro" },
  { pattern: /^cmi\.core\.lesson_location$/, access: "rw", check: maxLen(255) },
  { pattern: /^cmi\.core\.lesson_status$/, access: "rw", check: oneOf("passed", "completed", "failed", "incomplete", "browsed") },
  { pattern: /^cmi\.core\.score\._children$/, access: "ro", value: "raw,min,max" },
  { pattern: /^cmi\.core\.score\.(raw|min|max)$/, access: "rw", check: (v) => v === "" || isDecimal(v), range: (v) => v === "" || (Number(v) >= 0 && Number(v) <= 100) },
  { pattern: /^cmi\.core\.exit$/, access: "wo", check: oneOf("time-out", "suspend", "logout", "") },
  { pattern: /^cmi\.core\.session_time$/, access: "wo", check: (v) => /^\d{2,4}:\d{2}:\d{2}(\.\d{1,2})?$/.test(v) },
  { pattern: /^cmi\.suspend_data$/, access: "rw", check: maxLen(4096) },
  { pattern: /^cmi\.(launch_data|comments_from_lms)$/, access: "ro" },
  { pattern: /^cmi\.comments$/, access: "rw", check: maxLen(4096) },
  { pattern: /^cmi\.student_data\._children$/, access: "ro", value: "mastery_score,max_time_allowed,time_limit_action" },
  { pattern: /^cmi\.student_data\.(mastery_score|max_time_allowed|time_limit_action)$/, access: "ro" },
  { pattern: /^cmi\.student_preference\._children$/, access: "ro", value: "audio,language,speed,text" },
  { pattern: /^cmi\.student_preference\.(audio|speed|text)$/, access: "rw", check: (v) => /^-?\d+$/.test(v) },
  { pattern: /^cmi\.student_preference\.language$/, access: "rw", check: maxLen(255) },
  { pattern: /^cmi\.objectives\._children$/, access: "ro", value: "id,score,status" },
  { pattern: /^cmi\.objectives\._count$/, access: "ro" },
  { pattern: /^cmi\.objectives\.\d+\.id$/, access: "rw", check: maxLen(255) },
  { pattern: /^cmi\.objectives\.\d+\.score\._children$/, access: "ro", value: "raw,min,max" },
  { pattern: /^cmi\.objectives\.\d+\.score\.(raw|min|max)$/, access: "rw", check: (v) => v === "" || isDecimal(v) },
  { pattern: /^cmi\.objectives\.\d+\.status$/, access: "rw", check: oneOf("passed", "completed", "failed", "incomplete", "browsed", "not attempted") },
  { pattern: /^cmi\.interactions\._children$/, access: "ro", value: "id,objectives,time,type,correct_responses,weighting,student_response,result,latency" },
  { pattern: /^cmi\.interactions\._count$/, access: "ro" },
  { pattern: /^cmi\.interactions\.\d+\.objectives\._count$/, access: "ro" },
  { pattern: /^cmi\.interactions\.\d+\.correct_responses\._count$/, access: "ro" },
  { pattern: /^cmi\.interactions\.\d+\.(id|objectives\.\d+\.id|time|type|correct_responses\.\d+\.pattern|weighting|student_response|result|latency)$/, access: "wo" },
];

const MODEL_2004: ElementDef[] = [
  { pattern: /^cmi\._version$/, access: "ro", value: "1.0" },
  { pattern: /^cmi\.(completion_threshold|credit|entry|launch_data|learner_id|learner_name|max_time_allowed|mode|scaled_passing_score|time_limit_action|total_time)$/, access: "ro" },
  { pattern: /^cmi\.completion_status$/, access: "rw", check: oneOf("completed", "incomplete", "not attempted", "unknown") },
  { pattern: /^cmi\.success_status$/, access: "rw", check: oneOf("passed", "failed", "unknown") },
  { pattern: /^cmi\.exit$/, access: "wo", check: oneOf("time-out", "suspend", "logout", "normal", "") },
  { pattern: /^cmi\.session_time$/, access: "wo", check: (v) => !Number.isNaN(parseDuration(v)) },
  { pattern: /^cmi\.location$/, access: "rw", check: maxLen(1000) },
  { pattern: /^cmi\.suspend_data$/, access: "rw", check: maxLen(64000) },
  { pattern: /^cmi\.progress_measure$/, access: "rw", check: isDecimal, range: (v) => Number(v) >= 0 && Number(v) <= 1 },
  { pattern: /^cmi\.score\._children$/, access: "ro", value: "scaled,raw,min,max" },
  { pattern: /^cmi\.score\.scaled$/, access: "rw", check: isDecimal, range: (v) => Number(v) >= -1 && Number(v) <= 1 },
  { pattern: /^cmi\.score\.(raw|min|max)$/, access: "rw", check: isDecimal },
  { pattern: /^cmi\.learner_preference\._children$/, access: "ro", value: "audio_level,language,delivery_speed,audio_captioning" },
  { pattern: /^cmi\.learner_preference\.(audio_level|delivery_speed)$/, access: "rw", check: isDecimal },
  { pattern: /^cmi\.learner_preference\.language$/, access: "rw", check: maxLen(250) },
  { pattern: /^cmi\.learner_preference\.audio_captioning$/, access: "rw", check: oneOf("-1", "0", "1") },
  { pattern: /^cmi\.comments_from_learner\._children$/, access: "ro", value: "comment,location,timestamp" },
  { pattern: /^cmi\.comments_from_(learner|lms)\._count$/, access: "ro" },
  { pattern: /^cmi\.comments_from_learner\.\d+\.(comment|location|timestamp)$/, access: "rw" },
  { pattern: /^cmi\.comments_from_lms\.\d+\.(comment|location|timestamp)$/, access: "ro" },
  { pattern: /^cmi\.objectives\._children$/, access: "ro", value: "id,score,success_status,completion_status,progress_measure,description" },
  { pattern: /^cmi\.objectives\._count$/, access: "ro" },
  { pattern: /^cmi\.objectives\.\d+\.score\._children$/, access: "ro", value: "scaled,raw,min,max" },
  { pattern: /^cmi\.objectives\.\d+\.(id|score\.(scaled|raw|min|max)|success_status|completion_status|progress_measure|description)$/, access: "rw" },
  { pattern: /^cmi\.interactions\._children$/, access: "ro", value: "id,type,objectives,timestamp,correct_responses,weighting,learner_response,result,latency,description" },
  { pattern: /^cmi\.interactions\._count$/, access: "ro" },
  { pattern: /^cmi\.interactions\.\d+\.(objectives|correct_responses)\._count$/, access: "ro" },
  { pattern: /^cmi\.interactions\.\d+\.(id|type|objectives\.\d+\.id|timestamp|correct_responses\.\d+\.pattern|weighting|learner_response|result|latency|description)$/, access: "rw" },
  { pattern: /^adl\.nav\.request$/, access: "rw", check: (v) => /^(continue|previous|exit|exitAll|abandon|abandonAll|suspendAll|_none_|\{target=[^}]+\}(choice|jump))$/.test(v) },
  { pattern: /^adl\.nav\.request_valid\.(continue|previous)$/, access: "ro" },
  { pattern: /^adl\.nav\.request_valid\.(choice|jump)\.\{target=[^}]+\}$/, access: "ro" },
];

const ERRORS_12: Record<string, string> = {
  "0": "No error", "101": "General exception", "201": "Invalid argument error", "202": "Element cannot have children", "203": "Element not an array. Cannot have count",
  "301": "Not initialized", "401": "Not implemented error", "402": "Invalid set value, element is a keyword", "403": "Element is read only", "404": "Element is write only", "405": "Incorrect data type",
};
const ERRORS_2004: Record<string, string> = {
  "0": "No Error", "101": "General Exception", "102": "General Initialization Failure", "103": "Already Initialized", "104": "Content Instance Terminated",
  "111": "General Termination Failure", "112": "Termination Before Initialization", "113": "Termination After Termination",
  "122": "Retrieve Data Before Initialization", "123": "Retrieve Data After Termination", "132": "Store Data Before Initialization", "133": "Store Data After Termination",
  "142": "Commit Before Initialization", "143": "Commit After Termination", "201": "General Argument Error", "301": "General Get Failure", "351": "General Set Failure", "391": "General Commit Failure",
  "401": "Undefined Data Model Element", "402": "Unimplemented Data Model Element", "403": "Data Model Element Value Not Initialized", "404": "Data Model Element Is Read Only",
  "405": "Data Model Element Is Write Only", "406": "Data Model Element Type Mismatch", "407": "Data Model Element Value Out Of Range", "408": "Data Model Dependency Not Established",
};

// ---------------------------------------------------------------- the runtime

export function createScormRuntime(o: RuntimeOptions) {
  const is12 = o.version === "1.2";
  const model = is12 ? MODEL_12 : MODEL_2004;
  const errors = is12 ? ERRORS_12 : ERRORS_2004;
  const prev = o.previous ?? {};
  const k = (e12: string, e2004: string) => (is12 ? e12 : e2004);
  const resumed = (prev[k("cmi.core.exit", "cmi.exit")] ?? "") === "suspend";

  // A new attempt starts unless the learner suspended the previous one (SCORM RTE).
  const cmi: Record<string, string> = resumed ? { ...prev } : {};
  const priorTotal = parseDuration(prev[k("cmi.core.total_time", "cmi.total_time")]);
  const set0 = (key: string, v: string | undefined) => v !== undefined && (cmi[key] = v);

  if (is12) {
    set0("cmi.core.student_id", o.learnerId);
    set0("cmi.core.student_name", o.learnerName);
    set0("cmi.core.credit", o.mode === "normal" ? "credit" : "no-credit");
    set0("cmi.core.lesson_mode", o.mode);
    set0("cmi.core.entry", resumed ? "resume" : Object.keys(prev).length ? "" : "ab-initio");
    set0("cmi.core.total_time", formatTimespan12(priorTotal));
    cmi["cmi.core.lesson_status"] ??= o.mode === "browse" ? "browsed" : "not attempted";
    set0("cmi.launch_data", o.sco.launchData ?? "");
    set0("cmi.comments_from_lms", "");
    set0("cmi.student_data.mastery_score", o.sco.masteryScore != null ? String(o.sco.masteryScore) : "");
    set0("cmi.student_data.max_time_allowed", "");
    set0("cmi.student_data.time_limit_action", "continue,no message");
  } else {
    set0("cmi.learner_id", o.learnerId);
    set0("cmi.learner_name", o.learnerName);
    set0("cmi.credit", o.mode === "normal" ? "credit" : "no-credit");
    set0("cmi.mode", o.mode);
    set0("cmi.entry", resumed ? "resume" : "ab-initio");
    set0("cmi.total_time", formatDuration2004(priorTotal));
    cmi["cmi.completion_status"] ??= "unknown";
    cmi["cmi.success_status"] ??= "unknown";
    set0("cmi.launch_data", o.sco.launchData);
    set0("cmi.completion_threshold", o.sco.completionThreshold != null ? String(o.sco.completionThreshold) : undefined);
    set0("cmi.scaled_passing_score", o.sco.scaledPassingScore != null ? String(o.sco.scaledPassingScore) : undefined);
    set0("cmi.time_limit_action", "continue,no message");
  }
  // Write-only values from an earlier session must not leak into this one.
  delete cmi[k("cmi.core.session_time", "cmi.session_time")];

  let state: "not initialized" | "running" | "terminated" = "not initialized";
  let lastError = "0";
  const startedAt = Date.now();

  const fail = (code: string, ret = "false") => ((lastError = code), ret);
  const ok = (ret = "true") => ((lastError = "0"), ret);
  const log = (call: string, ret: string) => (o.onLog?.(call, ret, lastError), ret);

  const def = (el: string) => model.find((d) => d.pattern.test(el));
  const count = (prefix: string) => {
    let n = 0;
    while (Object.keys(cmi).some((key) => key.startsWith(`${prefix}.${n}.`))) n++;
    return n;
  };

  const sessionSeconds = () => {
    const reported = parseDuration(cmi[k("cmi.core.session_time", "cmi.session_time")]);
    return Number.isFinite(reported) && reported > 0 ? reported : (Date.now() - startedAt) / 1000;
  };

  /** Status rules applied by the LMS (mastery score, completion threshold, passing score). */
  const evaluate = (finishing: boolean) => {
    if (o.mode !== "normal") return;
    if (is12) {
      const raw = cmi["cmi.core.score.raw"];
      if (o.sco.masteryScore != null && raw !== undefined && raw !== "" && cmi["cmi.core.credit"] === "credit") cmi["cmi.core.lesson_status"] = Number(raw) >= o.sco.masteryScore ? "passed" : "failed";
      if (finishing && cmi["cmi.core.lesson_status"] === "not attempted") cmi["cmi.core.lesson_status"] = "completed";
    } else {
      const pm = cmi["cmi.progress_measure"];
      if (o.sco.completionThreshold != null && pm !== undefined) cmi["cmi.completion_status"] = Number(pm) >= o.sco.completionThreshold ? "completed" : "incomplete";
      const scaled = cmi["cmi.score.scaled"];
      if (o.sco.scaledPassingScore != null && scaled !== undefined) cmi["cmi.success_status"] = Number(scaled) >= o.sco.scaledPassingScore ? "passed" : "failed";
    }
  };

  const summary = (finishing: boolean): RuntimeSummary => {
    const total = priorTotal + (finishing ? sessionSeconds() : 0);
    let completion: RuntimeSummary["completion"];
    let success: RuntimeSummary["success"] = "unknown";
    let scorePercent: number | undefined;
    if (is12) {
      const st = cmi["cmi.core.lesson_status"] ?? "not attempted";
      completion = st === "completed" || st === "passed" || st === "failed" ? "completed" : st === "not attempted" ? "not attempted" : st === "browsed" ? "unknown" : "incomplete";
      success = st === "passed" ? "passed" : st === "failed" ? "failed" : "unknown";
      const raw = cmi["cmi.core.score.raw"];
      if (raw) {
        const min = Number(cmi["cmi.core.score.min"] || 0);
        const max = Number(cmi["cmi.core.score.max"] || 100);
        scorePercent = max > min ? ((Number(raw) - min) / (max - min)) * 100 : Number(raw);
      }
    } else {
      const c = cmi["cmi.completion_status"];
      completion = c === "completed" ? "completed" : c === "incomplete" ? "incomplete" : c === "not attempted" ? "not attempted" : "unknown";
      success = (cmi["cmi.success_status"] as RuntimeSummary["success"]) ?? "unknown";
      if (cmi["cmi.score.scaled"]) scorePercent = Number(cmi["cmi.score.scaled"]) * 100;
      else if (cmi["cmi.score.raw"]) {
        const min = Number(cmi["cmi.score.min"] || 0);
        const max = Number(cmi["cmi.score.max"] || 100);
        scorePercent = max > min ? ((Number(cmi["cmi.score.raw"]) - min) / (max - min)) * 100 : Number(cmi["cmi.score.raw"]);
      }
    }
    if (scorePercent != null) scorePercent = Math.max(0, Math.min(100, Math.round(scorePercent * 10) / 10));
    return { completion, success, scorePercent, totalSeconds: Math.round(total), exit: cmi[k("cmi.core.exit", "cmi.exit")] ?? "" };
  };

  const persist = (finishing: boolean) => {
    evaluate(finishing);
    const snapshot = { ...cmi };
    if (finishing) {
      const total = priorTotal + sessionSeconds();
      snapshot[k("cmi.core.total_time", "cmi.total_time")] = is12 ? formatTimespan12(total) : formatDuration2004(total);
    }
    o.onCommit(snapshot, summary(finishing), finishing);
  };

  // -------------------------------------------------------------- API calls

  const initialize = (arg: string) => {
    if (arg !== "") return fail(is12 ? "201" : "201");
    if (state === "running") return fail(is12 ? "101" : "103");
    if (state === "terminated") return fail(is12 ? "101" : "104");
    state = "running";
    if (is12 && cmi["cmi.core.lesson_status"] === "not attempted" && o.mode === "normal") cmi["cmi.core.lesson_status"] = "incomplete";
    if (!is12 && cmi["cmi.completion_status"] === "unknown" && o.mode === "normal") cmi["cmi.completion_status"] = "incomplete";
    return ok();
  };

  const terminate = (arg: string) => {
    if (arg !== "") return fail("201");
    if (state === "not initialized") return fail(is12 ? "301" : "112");
    if (state === "terminated") return fail(is12 ? "101" : "113");
    const navRequest = cmi["adl.nav.request"];
    delete cmi["adl.nav.request"];
    persist(true);
    state = "terminated";
    if (navRequest && navRequest !== "_none_") o.onNavigate?.(navRequest);
    return ok();
  };

  const getValue = (el: string) => {
    if (state !== "running") return fail(is12 ? "301" : state === "terminated" ? "123" : "122", "");
    if (!el) return fail(is12 ? "201" : "301", "");
    const d = def(el);
    if (!d) {
      if (/\._(children|count)$/.test(el)) return fail(is12 ? (el.endsWith("_count") ? "203" : "202") : "301", "");
      return fail(is12 ? "401" : "401", "");
    }
    if (d.access === "wo") return fail(is12 ? "404" : "405", "");
    if (d.value !== undefined) return ok(d.value);
    // Navigation validity is answered from where this SCO sits in the package.
    if (el.startsWith("adl.nav.request_valid.")) {
      const nav = o.navigation;
      if (!nav) return ok("unknown");
      if (el.endsWith(".continue")) return ok(String(nav.hasNext));
      if (el.endsWith(".previous")) return ok(String(nav.hasPrevious));
      const target = el.match(/\{target=([^}]+)\}$/)?.[1];
      return ok(String(!!target && nav.ids.includes(target)));
    }
    if (el.endsWith("._count")) return ok(String(count(el.slice(0, -"._count".length))));
    if (!(el in cmi)) return is12 ? ok("") : fail("403", "");
    return ok(cmi[el]!);
  };

  const setValue = (el: string, raw: unknown) => {
    const v = raw == null ? "" : String(raw);
    if (state !== "running") return fail(is12 ? "301" : state === "terminated" ? "133" : "132");
    if (!el) return fail(is12 ? "201" : "351");
    const d = def(el);
    if (!d) return fail(/\._(children|count|version)$/.test(el) ? (is12 ? "402" : "404") : is12 ? "401" : "401");
    if (d.access === "ro") return fail(/\._(children|count)$/.test(el) ? (is12 ? "402" : "404") : is12 ? "403" : "404");
    // Array elements must be filled in order: index n may be at most the current count.
    const arr = el.match(/^(cmi\.(?:objectives|interactions|comments_from_learner))\.(\d+)\./);
    if (arr && Number(arr[2]) > count(arr[1]!)) return fail(is12 ? "201" : "351");
    if (d.check && !d.check(v)) return fail(is12 ? "405" : "406");
    if (d.range && !d.range(v)) return fail(is12 ? "405" : "407");
    if (o.mode !== "normal" && /lesson_status|completion_status|success_status/.test(el) && !is12) return ok();
    cmi[el] = v;
    return ok();
  };

  const commit = (arg: string) => {
    if (arg !== "") return fail("201");
    if (state !== "running") return fail(is12 ? "301" : state === "terminated" ? "143" : "142");
    persist(false);
    return ok();
  };

  const getLastError = () => lastError;
  const getErrorString = (code: string) => errors[String(code)] ?? "";
  const getDiagnostic = (code: string) => (code ? errors[String(code)] ?? "" : errors[lastError] ?? "");

  const api12 = {
    LMSInitialize: (a = "") => log(`LMSInitialize("${a}")`, initialize(a)),
    LMSFinish: (a = "") => log(`LMSFinish("${a}")`, terminate(a)),
    LMSGetValue: (e: string) => log(`LMSGetValue("${e}")`, getValue(e)),
    LMSSetValue: (e: string, v: unknown) => log(`LMSSetValue("${e}", "${v}")`, setValue(e, v)),
    LMSCommit: (a = "") => log(`LMSCommit("${a}")`, commit(a)),
    LMSGetLastError: getLastError,
    LMSGetErrorString: getErrorString,
    LMSGetDiagnostic: getDiagnostic,
  };
  const api2004 = {
    Initialize: (a = "") => log(`Initialize("${a}")`, initialize(a)),
    Terminate: (a = "") => log(`Terminate("${a}")`, terminate(a)),
    GetValue: (e: string) => log(`GetValue("${e}")`, getValue(e)),
    SetValue: (e: string, v: unknown) => log(`SetValue("${e}", "${v}")`, setValue(e, v)),
    Commit: (a = "") => log(`Commit("${a}")`, commit(a)),
    GetLastError: getLastError,
    GetErrorString: getErrorString,
    GetDiagnostic: getDiagnostic,
    version: "1.0",
  };

  return {
    api: is12 ? api12 : api2004,
    apiName: is12 ? "API" : "API_1484_11",
    /** Called when the learner leaves without the SCO terminating: saves what we have. */
    abandon: () => {
      if (state === "running") {
        if (!cmi[k("cmi.core.exit", "cmi.exit")]) cmi[k("cmi.core.exit", "cmi.exit")] = "suspend";
        persist(true);
        state = "terminated";
      }
    },
    isRunning: () => state === "running",
    summary: () => summary(false),
  };
}

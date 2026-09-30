"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { CheckCircle2, Circle, CircleDot, Loader2, Maximize, Minimize, Package, TriangleAlert, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";
import { useCurrentUser, useMyStudent } from "@/lib/session";
import { preparePackage, scormBase } from "@/lib/scorm/package";
import { createScormRuntime, type RuntimeSummary } from "@/lib/scorm/runtime";
import { saveScormAttempt } from "@/lib/scorm/attempts";
import type { ContentItem, ScormAttempt } from "@/lib/types";
import { cn } from "@/lib/utils";

const fmtTime = (s: number) => (s < 60 ? `${Math.round(s)} s` : s < 3600 ? `${Math.round(s / 60)} min` : `${Math.floor(s / 3600)} h ${Math.round((s % 3600) / 60)} min`);

type ApiWindow = Window & { API?: unknown; API_1484_11?: unknown };

/**
 * Plays a SCORM 1.2 / 2004 package inside the platform (spec section 26.2). The
 * package runs in a same-origin frame and finds the run-time API on this
 * window; students' progress, score, time and resume point are saved. Staff
 * open it in "browse" mode, which records nothing.
 */
export function ScormPlayer({ item }: { item: ContentItem }) {
  const pkg = item.scorm!;
  const me = useCurrentUser();
  const student = useMyStudent();
  const attempts = useStore((s) => s.scormAttempts);
  const isLearner = me?.portal === "student" && !!student;
  const mine = attempts.filter((a) => a.contentId === item.id && a.studentId === student?.id);
  const [scoId, setScoId] = useState(() => pkg.scos.find((s) => !mine.some((a) => a.scoId === s.id && a.completion === "completed"))?.id ?? pkg.scos[0]!.id);
  const [ready, setReady] = useState<"loading" | "ready" | "missing" | "unsupported" | "error">("loading");
  const [live, setLive] = useState<RuntimeSummary | null>(null);
  const [launch, setLaunch] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const frameWrap = useRef<HTMLDivElement>(null);
  const sco = pkg.scos.find((s) => s.id === scoId) ?? pkg.scos[0]!;

  useEffect(() => {
    let live = true;
    preparePackage(item.id, pkg.scos[0]!.href, item.url)
      .then((r) => live && setReady(r))
      .catch(() => live && setReady("error"));
    return () => {
      live = false;
    };
  }, [item.id, item.url, pkg.scos]);

  const commit = useEffectEvent((cmi: Record<string, string>, summary: RuntimeSummary, finished: boolean, id: string) => {
    setLive(summary);
    if (!isLearner || !student || !me) return;
    saveScormAttempt(item, { studentId: student.id, userId: me.user.id, schoolId: student.schoolId, scoId: id, cmi, summary, finished });
  });
  // Assets make no API calls: opening one counts as completing it.
  const assetOpened = () => {
    if (!sco.isAsset) return;
    const summary: RuntimeSummary = { completion: "completed", success: "unknown", totalSeconds: 0, exit: "" };
    setLive(summary);
    if (isLearner && student && me) saveScormAttempt(item, { studentId: student.id, userId: me.user.id, schoolId: student.schoolId, scoId: sco.id, cmi: {}, summary, finished: true });
  };
  const idx = pkg.scos.findIndex((x) => x.id === sco.id);
  const navigate = useEffectEvent((req: string) => {
    const target = req.match(/^\{target=([^}]+)\}(choice|jump)$/)?.[1];
    const next = req === "continue" ? pkg.scos[idx + 1] : req === "previous" ? pkg.scos[idx - 1] : target ? pkg.scos.find((x) => x.id === target) : undefined;
    if (next) {
      setLive(null);
      setScoId(next.id);
    }
  });
  const previousCmi = useEffectEvent((id: string) => mine.find((a) => a.scoId === id)?.cmi);

  // A fresh run-time for each launch of a SCO, installed before the frame loads.
  useEffect(() => {
    if (ready !== "ready" || !me) return;
    const w = window as ApiWindow;
    const nameParts = me.user.name.split(" ");
    const runtime = createScormRuntime({
      version: pkg.version,
      sco,
      learnerId: me.user.username ?? me.user.id,
      learnerName: nameParts.length > 1 ? `${nameParts.slice(-1)[0]}, ${nameParts.slice(0, -1).join(" ")}` : me.user.name,
      mode: isLearner ? "normal" : "browse",
      previous: previousCmi(sco.id),
      onCommit: (cmi, summary, finished) => commit(cmi, summary, finished, sco.id),
      navigation: { hasNext: idx < pkg.scos.length - 1, hasPrevious: idx > 0, ids: pkg.scos.map((x) => x.id) },
      // SCORM 2004 navigation requests move between the package's lessons once the SCO has terminated.
      onNavigate: (req) => setTimeout(() => navigate(req), 0),
    });
    delete w.API;
    delete w.API_1484_11;
    (w as unknown as Record<string, unknown>)[runtime.apiName] = runtime.api;
    const leave = () => runtime.abandon();
    window.addEventListener("pagehide", leave);
    return () => {
      window.removeEventListener("pagehide", leave);
      runtime.abandon();
      if ((w as unknown as Record<string, unknown>)[runtime.apiName] === runtime.api) delete (w as unknown as Record<string, unknown>)[runtime.apiName];
    };
  }, [ready, sco, pkg.version, pkg.scos, idx, me, isLearner, launch]);

  useEffect(() => {
    const on = () => setFullscreen(document.fullscreenElement === frameWrap.current);
    document.addEventListener("fullscreenchange", on);
    return () => document.removeEventListener("fullscreenchange", on);
  }, []);

  const statusOf = (a: ScormAttempt | undefined) =>
    !a ? { icon: Circle, label: "Not started", cls: "text-muted-foreground" } : a.success === "passed" ? { icon: CheckCircle2, label: "Passed", cls: "text-emerald-600" } : a.success === "failed" ? { icon: XCircle, label: "Failed", cls: "text-red-600" } : a.completion === "completed" ? { icon: CheckCircle2, label: "Completed", cls: "text-emerald-600" } : { icon: CircleDot, label: "In progress", cls: "text-amber-600" };
  const current = mine.find((a) => a.scoId === sco.id);
  const shown = live ?? (current ? { completion: current.completion, success: current.success, scorePercent: current.scorePercent, totalSeconds: current.totalSeconds, exit: "" } : null);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Badge variant="secondary" className="gap-1">
          <Package className="size-3.5" /> {pkg.versionLabel}
        </Badge>
        {!isLearner && <Badge variant="outline">Preview — results aren&apos;t recorded</Badge>}
        {shown && (
          <span className="text-muted-foreground">
            {shown.success !== "unknown" ? (shown.success === "passed" ? "Passed" : "Failed") : shown.completion === "completed" ? "Completed" : shown.completion === "not attempted" ? "Not started" : "In progress"}
            {shown.scorePercent != null && ` · Score ${shown.scorePercent}%`}
            {shown.totalSeconds > 0 && ` · ${fmtTime(shown.totalSeconds)}`}
          </span>
        )}
      </div>
      <div className={cn("grid gap-3", pkg.scos.length > 1 && "lg:grid-cols-[220px_1fr]")}>
        {pkg.scos.length > 1 && (
          <nav className="space-y-1 rounded-xl border p-2" aria-label="Lessons in this package">
            {pkg.scos.map((s, i) => {
              const st = statusOf(mine.find((a) => a.scoId === s.id));
              return (
                <button key={s.id} type="button" onClick={() => (setScoId(s.id), setLive(null))} className={cn("flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-muted", s.id === sco.id && "bg-accent")}>
                  <st.icon className={cn("mt-0.5 size-4 shrink-0", st.cls)} aria-label={st.label} />
                  <span className="min-w-0">
                    <span className="block truncate">
                      {i + 1}. {s.title}
                    </span>
                    {isLearner && <span className="text-xs text-muted-foreground">{st.label}</span>}
                  </span>
                </button>
              );
            })}
          </nav>
        )}
        <div ref={frameWrap} className={cn("flex flex-col overflow-hidden rounded-xl border bg-card", fullscreen ? "h-dvh rounded-none" : "h-[78vh]")}>
          <div className="flex h-10 shrink-0 items-center gap-2 border-b px-3 text-sm">
            <span className="min-w-0 flex-1 truncate font-medium">{sco.title}</span>
            <Button type="button" variant="ghost" size="xs" onClick={() => (setLive(null), setLaunch((n) => n + 1))} title="Reload this lesson (your progress is kept)">
              Reload
            </Button>
            <Button type="button" variant="ghost" size="icon-xs" onClick={() => (document.fullscreenElement ? document.exitFullscreen() : frameWrap.current?.requestFullscreen?.())} aria-label={fullscreen ? "Exit full screen" : "Full screen"}>
              {fullscreen ? <Minimize /> : <Maximize />}
            </Button>
          </div>
          <div className="min-h-0 flex-1 bg-white">
            {ready === "ready" ? (
              <iframe key={`${sco.id}:${launch}`} src={scormBase(item.id) + sco.href} title={sco.title} className="size-full" allow="fullscreen; autoplay" onLoad={assetOpened} />
            ) : (
              <div className="flex size-full flex-col items-center justify-center gap-2 p-6 text-center text-sm text-muted-foreground">
                {ready === "loading" ? (
                  <>
                    <Loader2 className="size-6 animate-spin" /> Loading the package…
                  </>
                ) : (
                  <>
                    <TriangleAlert className="size-6 text-amber-500" />
                    {ready === "unsupported" && "This browser can't run SCORM packages (service workers are turned off). Try an up-to-date Chrome, Edge, Firefox or Safari."}
                    {ready === "missing" && "This package hasn't been uploaded in this browser. In production it loads from storage."}
                    {ready === "error" && "The package couldn't be opened."}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

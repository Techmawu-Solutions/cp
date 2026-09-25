"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { CheckCircle2, Download, Loader2, LogOut, PlayCircle, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { LinkButton } from "@/components/common/link-button";
import { FullPageLoader } from "@/components/common/full-page-loader";
import { useLiveContext } from "@/components/classroom/use-live-context";
import { useStore } from "@/lib/store";
import { finalizeRecording } from "@/lib/actions";
import { fmtDateLong, fmtDuration } from "@/lib/helpers";

export default function EndedPage() {
  return (
    <Suspense fallback={<FullPageLoader />}>
      <Ended />
    </Suspense>
  );
}

/** Class Ended → Processing Recording → Recording Ready (spec §34). */
function Ended() {
  const { id } = useParams<{ id: string }>();
  const left = useSearchParams().get("left") === "1";
  const ctx = useLiveContext(id);
  const recordings = useStore((s) => s.recordings);
  const attendance = useStore((s) => s.attendance);
  const rec = recordings.find((r) => r.id === ctx.live?.recordingId);
  const [progress, setProgress] = useState(rec?.status === "ready" ? 100 : 0);

  // The video provider processes the recording; the prototype simulates its progress.
  const recId = rec?.id;
  const processing = rec?.status === "processing";
  useEffect(() => {
    if (!processing) return;
    const t = setInterval(() => setProgress((p) => Math.min(100, p + 4 + Math.random() * 9)), 450);
    return () => clearInterval(t);
  }, [processing]);
  useEffect(() => {
    if (progress < 100 || !processing || !recId) return;
    finalizeRecording(recId);
    toast.success("Recording ready — added to the course and students notified");
  }, [progress, processing, recId]);

  if (!ctx.live) return <FullPageLoader />;
  const live = ctx.live;

  if (left || !rec)
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center p-6 text-center">
        <LogOut className="size-10 text-slate-400" />
        <h1 className="mt-3 text-2xl font-semibold">{left ? "You left the class" : "Class ended"}</h1>
        <p className="mt-1 text-sm text-slate-400">
          {ctx.subject?.name} — {ctx.cls?.name} · {live.title}
        </p>
        {left && ctx.role === "student" && <p className="mt-2 text-sm text-emerald-300">Your attendance has been recorded.</p>}
        <div className="mt-6 flex gap-2">
          {left && live.status === "live" && (
            <LinkButton href={`/classroom/${id}/lobby`} variant="outline">
              Rejoin
            </LinkButton>
          )}
          <LinkButton href={ctx.back}>Back to course</LinkButton>
        </div>
      </div>
    );

  const rows = attendance.filter((a) => a.liveSessionId === live.id);
  const present = rows.filter((a) => a.status === "present").length;
  const late = rows.filter((a) => a.status === "late").length;
  const ready = rec.status === "ready";

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6 text-center">
        <div>
          <h1 className="text-2xl font-semibold">Class Ended</h1>
          <p className="mt-1 text-sm text-slate-400">
            {ctx.subject?.name} — {ctx.cls?.name}
          </p>
        </div>

        {!ready ? (
          <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-900 p-6">
            <p className="flex items-center justify-center gap-2 font-medium">
              <Loader2 className="size-4 animate-spin" /> Processing Recording…
            </p>
            <Progress value={progress} className="[&_[data-slot=progress-track]]:h-2.5" />
            <p className="text-sm text-slate-400 tabular-nums">{progress.toFixed(0)}%</p>
          </div>
        ) : (
          <div className="space-y-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6">
            <p className="flex items-center justify-center gap-2 text-lg font-semibold text-emerald-300">
              Recording Ready <CheckCircle2 className="size-5" />
            </p>
            <div className="text-sm text-slate-300">
              <p className="font-medium text-white">
                {ctx.subject?.name} — {ctx.cls?.name}
              </p>
              <p>{fmtDateLong(rec.date)}</p>
              <p>Duration: {fmtDuration(rec.durationSeconds)}</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <LinkButton href={`/recordings/${rec.id}`}>
                <PlayCircle /> Watch Recording
              </LinkButton>
              <Button variant="outline" onClick={() => toast.message("Download started", { description: `${rec.title}.mp4 · ${rec.sizeMb} MB` })}>
                <Download /> Download
              </Button>
            </div>
          </div>
        )}

        {ctx.role === "host" && (
          <div className="rounded-2xl border border-white/10 bg-slate-900 p-4 text-left">
            <p className="mb-2 flex items-center gap-2 text-sm font-medium">
              <Users className="size-4" /> Attendance captured automatically
            </p>
            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <div className="rounded-lg bg-emerald-500/10 p-2">
                <p className="text-xl font-semibold text-emerald-300">{present}</p>Present
              </div>
              <div className="rounded-lg bg-amber-500/10 p-2">
                <p className="text-xl font-semibold text-amber-300">{late}</p>Late
              </div>
              <div className="rounded-lg bg-red-500/10 p-2">
                <p className="text-xl font-semibold text-red-300">{rows.length - present - late}</p>Absent
              </div>
            </div>
          </div>
        )}
        <LinkButton href={ctx.back} variant="ghost" className="text-slate-300">
          Back to course
        </LinkButton>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { Ban, ImagePlus, Loader2, Sparkles, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NO_BACKGROUND, PRESET_BACKGROUNDS, pictureFromFile, preloadBackgroundEffects, type BackgroundChoice } from "@/lib/virtual-background";
import { cn } from "@/lib/utils";

const same = (a: BackgroundChoice, b: BackgroundChoice) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Choose a camera background (spec §32): none, blur, a picture that comes with
 * the platform, or the teacher's own picture. The preview shows the camera
 * with the effect as students will see it.
 */
export function BackgroundPicker({
  open,
  onOpenChange,
  value,
  onChange,
  preview,
  loading,
  error,
  cameraOn,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  value: BackgroundChoice;
  onChange: (c: BackgroundChoice) => void;
  preview: MediaStream | null;
  loading: boolean;
  error: string | null;
  cameraOn: boolean;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const [custom, setCustom] = useState<string | null>(value.kind === "image" && value.label === "My picture" ? value.src : null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (open) void preloadBackgroundEffects();
  }, [open]);
  useEffect(() => {
    if (video.current && video.current.srcObject !== preview) video.current.srcObject = preview;
  });

  const options: { key: string; choice: BackgroundChoice; label: string; thumb?: string; icon?: React.ReactNode }[] = [
    { key: "none", choice: NO_BACKGROUND, label: "None", icon: <Ban className="size-5" /> },
    { key: "blur-light", choice: { kind: "blur", strength: "light" }, label: "Slight blur", icon: <Sparkles className="size-5" /> },
    { key: "blur-strong", choice: { kind: "blur", strength: "strong" }, label: "Blur", icon: <Sparkles className="size-5" /> },
    ...PRESET_BACKGROUNDS.map((p) => ({ key: p.src, choice: { kind: "image" as const, src: p.src, label: p.label }, label: p.label, thumb: p.src })),
    ...(custom ? [{ key: "custom", choice: { kind: "image" as const, src: custom, label: "My picture" }, label: "My picture", thumb: custom }] : []),
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Background</DialogTitle>
          <DialogDescription>Blur your background or replace it with a picture. Students see it straight away; it&apos;s remembered for your next class.</DialogDescription>
        </DialogHeader>
        <div className="relative aspect-video overflow-hidden rounded-xl bg-slate-900">
          {cameraOn && preview ? <video ref={video} autoPlay playsInline muted className="size-full -scale-x-100 object-cover" /> : <p className="flex size-full items-center justify-center p-6 text-center text-sm text-slate-300">Turn your camera on to see the preview. Your choice applies as soon as it&apos;s on.</p>}
          {loading && (
            <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-black/60 py-2 text-xs text-white">
              <Loader2 className="size-3.5 animate-spin" /> Preparing background effects…
            </span>
          )}
        </div>
        {error && (
          <p className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
            <TriangleAlert className="size-4 shrink-0" /> {error}
          </p>
        )}
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {options.map((o) => (
            <button
              key={o.key}
              type="button"
              onClick={() => onChange(o.choice)}
              aria-pressed={same(o.choice, value)}
              className={cn("group overflow-hidden rounded-lg border-2 text-left text-xs transition-colors", same(o.choice, value) ? "border-primary ring-2 ring-primary/30" : "border-transparent hover:border-muted-foreground/30")}
            >
              <span className="flex aspect-video items-center justify-center bg-muted text-muted-foreground">
                {o.thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element -- small local picture
                  <img src={o.thumb} alt="" className="size-full object-cover" />
                ) : (
                  o.icon
                )}
              </span>
              <span className="block truncate px-1.5 py-1">{o.label}</span>
            </button>
          ))}
          <button type="button" onClick={() => file.current?.click()} disabled={uploading} className="flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-xs text-muted-foreground hover:bg-muted">
            {uploading ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
            {custom ? "Change picture" : "Upload a picture"}
          </button>
        </div>
        <input
          ref={file}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            setUploading(true);
            try {
              const src = await pictureFromFile(f);
              setCustom(src);
              onChange({ kind: "image", src, label: "My picture" });
            } finally {
              setUploading(false);
            }
          }}
        />
        <p className="text-xs text-muted-foreground">Works best with good lighting and a plain wall behind you. Effects run on your device, so older computers may run a little slower.</p>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

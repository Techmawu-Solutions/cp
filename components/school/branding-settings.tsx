"use client";

import { useRef, useState } from "react";
import { Check, ImageUp, Palette, ShieldCheck, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { SchoolLogo } from "@/components/common/user-avatar";
import { BRAND_PRESETS, isHex, logoColour, logoToDataUrl, mix, readableOn } from "@/lib/brand";
import { useStore } from "@/lib/store";
import type { School } from "@/lib/types";
import { cn } from "@/lib/utils";

const DEFAULT_PRIMARY = "#2563eb";

/** School admin: logo and interface colours for everyone in the school (spec §5.2). */
export function BrandingSettings({ school }: { school: School }) {
  const [logo, setLogo] = useState(school.logoUrl);
  const [primary, setPrimary] = useState(school.branding?.primary ?? DEFAULT_PRIMARY);
  const [sidebarMode, setSidebarMode] = useState<"default" | "brand" | "custom">(!school.branding?.sidebar ? "default" : school.branding.sidebar === school.branding.primary ? "brand" : "custom");
  const [sidebar, setSidebar] = useState(school.branding?.sidebar ?? "#0f172a");
  const [suggested, setSuggested] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const sidebarHex = sidebarMode === "default" ? undefined : sidebarMode === "brand" ? primary : sidebar;
  const valid = isHex(primary) && (sidebarMode !== "custom" || isHex(sidebar));

  const upload = async (file: File) => {
    if (!/^image\/(png|jpe?g|webp|svg\+xml)$/.test(file.type)) return toast.error("Use a PNG, JPG, WebP or SVG image");
    if (file.size > 2 * 1024 * 1024) return toast.error("Logos must be 2 MB or smaller");
    setBusy(true);
    try {
      const url = await logoToDataUrl(file);
      setLogo(url);
      const c = file.type === "image/svg+xml" ? null : await logoColour(url);
      setSuggested(c);
      if (c) toast.message("Logo added", { description: "Use “Match logo” to take your colour from it." });
    } catch {
      toast.error("Couldn't read that image");
    } finally {
      setBusy(false);
    }
  };

  const save = () => {
    if (!valid) return toast.error("Enter colours as #rrggbb");
    const st = useStore.getState();
    const isDefault = primary.toLowerCase() === DEFAULT_PRIMARY && !sidebarHex;
    st.update("schools", school.id, { logoUrl: logo, branding: isDefault ? undefined : { primary, sidebar: sidebarHex } });
    st.audit({ schoolId: school.id, action: "Branding updated", target: school.name, category: "school" });
    toast.success("Branding saved — everyone in your school now sees it");
  };

  const reset = () => {
    setLogo(undefined);
    setPrimary(DEFAULT_PRIMARY);
    setSidebarMode("default");
    setSuggested(null);
  };

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="size-4" /> Branding
        </CardTitle>
        <CardDescription>Your logo and colours appear across the platform for your administrators, teachers and students.</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_260px]">
        <div className="space-y-6">
          <section className="space-y-2">
            <p className="text-sm font-medium">Logo</p>
            <div className="flex flex-wrap items-center gap-3">
              <SchoolLogo name={school.name} color={school.logoColor} src={logo} size="lg" className="border" />
              <input ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={(e) => (e.target.files?.[0] && upload(e.target.files[0]), (e.target.value = ""))} />
              <Button variant="outline" onClick={() => input.current?.click()} disabled={busy}>
                <ImageUp /> {logo ? "Replace logo" : "Upload logo"}
              </Button>
              {logo && (
                <Button variant="ghost" onClick={() => (setLogo(undefined), setSuggested(null))}>
                  <Trash2 /> Remove
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">PNG, JPG, WebP or SVG, up to 2 MB. A square logo on a transparent or white background looks best.</p>
          </section>

          <section className="space-y-2">
            <p className="text-sm font-medium">Primary colour</p>
            <p className="text-xs text-muted-foreground">Buttons, links, highlights and the active menu item.</p>
            <div className="flex flex-wrap items-center gap-2">
              {BRAND_PRESETS.map((p) => (
                <button key={p.hex} type="button" title={p.name} aria-label={p.name} onClick={() => setPrimary(p.hex)} className={cn("flex size-8 items-center justify-center rounded-full ring-offset-2 ring-offset-background transition", primary.toLowerCase() === p.hex && "ring-2 ring-foreground")} style={{ background: p.hex }}>
                  {primary.toLowerCase() === p.hex && <Check className="size-4" style={{ color: readableOn(p.hex) }} />}
                </button>
              ))}
              <ColourInput value={primary} onChange={setPrimary} label="Custom primary colour" />
              {suggested && (
                <Button variant="outline" size="sm" onClick={() => setPrimary(suggested)}>
                  <Sparkles /> Match logo
                  <span className="size-3.5 rounded-full border" style={{ background: suggested }} />
                </Button>
              )}
            </div>
          </section>

          <section className="space-y-2">
            <p className="text-sm font-medium">Sidebar</p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["default", "Light (default)"],
                  ["brand", "Primary colour"],
                  ["custom", "Custom colour"],
                ] as const
              ).map(([v, label]) => (
                <button key={v} type="button" onClick={() => setSidebarMode(v)} className={cn("rounded-lg border px-3 py-1.5 text-sm", sidebarMode === v ? "border-primary bg-accent font-medium" : "hover:bg-muted")}>
                  {label}
                </button>
              ))}
              {sidebarMode === "custom" && <ColourInput value={sidebar} onChange={setSidebar} label="Custom sidebar colour" />}
            </div>
          </section>

          <div className="flex flex-wrap gap-2 border-t pt-4">
            <Button onClick={save} disabled={!valid}>
              Save branding
            </Button>
            <Button variant="ghost" onClick={reset}>
              Reset to default
            </Button>
          </div>
        </div>

        <Preview name={school.name} color={school.logoColor} logo={logo} primary={isHex(primary) ? primary : DEFAULT_PRIMARY} sidebar={sidebarHex && isHex(sidebarHex) ? sidebarHex : undefined} />
      </CardContent>
    </Card>
  );
}

function ColourInput({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const [text, setText] = useState(value);
  const [synced, setSynced] = useState(value);
  if (synced !== value) {
    setSynced(value);
    setText(value);
  }
  return (
    <span className="flex items-center gap-1.5">
      <input type="color" value={isHex(value) ? value : "#000000"} onChange={(e) => onChange(e.target.value)} aria-label={label} className="size-8 cursor-pointer rounded-md border bg-transparent p-0.5" />
      <Input
        value={text}
        onChange={(e) => {
          const v = e.target.value.trim();
          setText(v);
          if (isHex(v)) onChange(v.toLowerCase());
        }}
        className="h-8 w-24 font-mono text-xs"
        aria-label={`${label} (hex)`}
        aria-invalid={!isHex(text)}
      />
    </span>
  );
}

/** A miniature of the app with the chosen colours, drawn with inline styles so it doesn't depend on what's saved. */
function Preview({ name, color, logo, primary, sidebar }: { name: string; color: string; logo?: string; primary: string; sidebar?: string }) {
  const sbBg = sidebar ?? "#f8fafc";
  const sbFg = sidebar ? readableOn(sidebar) : "#334155";
  const active = sidebar ? mix(sidebar, sbFg, 0.14) : mix(primary, "#ffffff", 0.9);
  const activeFg = sidebar ? sbFg : mix(primary, "#0f172a", 0.35);
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Preview</p>
      <div className="flex h-56 overflow-hidden rounded-xl border text-[11px] shadow-sm" aria-hidden>
        <div className="flex w-24 shrink-0 flex-col gap-1 border-r p-2" style={{ background: sbBg, color: sbFg }}>
          <div className="mb-1 flex items-center gap-1">
            <SchoolLogo name={name} color={color} src={logo} size="sm" className="size-5 rounded text-[8px]" />
            <span className="truncate font-semibold">{name.split(" ")[0]}</span>
          </div>
          <span className="rounded px-1.5 py-1 font-medium" style={{ background: active, color: activeFg }}>
            Dashboard
          </span>
          {["Subjects", "Live", "Grades"].map((l) => (
            <span key={l} className="px-1.5 py-1 opacity-80">
              {l}
            </span>
          ))}
        </div>
        <div className="flex-1 space-y-2 bg-background p-3">
          <p className="text-xs font-semibold">Good morning</p>
          <div className="space-y-1 rounded-md border bg-card p-2">
            <p className="font-medium">ICT — SHS 1A</p>
            <div className="h-1.5 rounded-full bg-muted">
              <div className="h-full w-2/3 rounded-full" style={{ background: primary }} />
            </div>
          </div>
          <span className="inline-block rounded-md px-2 py-1 font-medium" style={{ background: primary, color: readableOn(primary) }}>
            Continue
          </span>
          <p style={{ color: primary }} className="font-medium">
            View all subjects →
          </p>
        </div>
      </div>
    </div>
  );
}

/** School admin: what students may download (recordings are watch-only by default). */
export function ContentProtectionSettings({ school }: { school: School }) {
  const rules = { recordingDownloads: false, documentDownloads: true, ...school.contentProtection };
  const set = (patch: Partial<typeof rules>) => {
    const st = useStore.getState();
    st.update("schools", school.id, { contentProtection: { ...rules, ...patch } });
    st.audit({ schoolId: school.id, action: "Content protection updated", target: Object.entries(patch).map(([k, v]) => `${k}: ${v ? "allowed" : "blocked"}`).join(", "), category: "school" });
    toast.success("Saved");
  };
  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="size-4" /> Content protection
        </CardTitle>
        <CardDescription>What students can take away from the platform. Teachers and administrators can always download.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <label className="flex items-center justify-between gap-4">
          <span>
            <span className="block text-sm font-medium">Students can download class recordings</span>
            <span className="text-xs text-muted-foreground">When off, recordings and videos are watch-only: no download button, no “Save video as”, and a watermark with the student&apos;s name.</span>
          </span>
          <Switch checked={rules.recordingDownloads} onCheckedChange={(v) => set({ recordingDownloads: v })} />
        </label>
        <label className="flex items-center justify-between gap-4">
          <span>
            <span className="block text-sm font-medium">Students can download course documents</span>
            <span className="text-xs text-muted-foreground">Documents always open in the platform&apos;s viewer. When off, the download button is hidden.</span>
          </span>
          <Switch checked={rules.documentDownloads} onCheckedChange={(v) => set({ documentDownloads: v })} />
        </label>
      </CardContent>
    </Card>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { Download, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { PageTitle } from "@/components/open/bits";
import { signOut } from "@/lib/personas";
import { setOpen, useOpen, type Profile } from "@/lib/store";

type Toggle = keyof Pick<Profile, "personalisation" | "aiTutor" | "aiPractice" | "dataSaver" | "portfolioPublic">;

const TOGGLES: { key: Toggle; title: string; text: string }[] = [
  { key: "personalisation", title: "Personalised recommendations", text: "Use your skills and goals to suggest what's next. Off: you see the same catalogue as everyone." },
  { key: "aiTutor", title: "AI tutor", text: "An in-lesson tutor that answers from your course materials and cites them." },
  { key: "aiPractice", title: "AI-generated practice", text: "Extra practice questions made from your course (marked as AI; never count for credentials)." },
  { key: "dataSaver", title: "Data saver", text: "Text first, audio-only video with slides, images on tap." },
  { key: "portfolioPublic", title: "Public portfolio", text: "Anyone with the link can see your verified projects and credentials." },
];

/** Learner control (spec section 6.20): personalisation, AI, visibility, notifications, data export, deletion. */
export default function SettingsPage() {
  const s = useOpen();
  const router = useRouter();
  const p = s.profile!;
  const teen = p.ageBand === "teen";
  return (
    <>
      <PageTitle title="Privacy & settings" description="You own your learning data. Turn things off, take everything with you, or leave." />
      <div className="max-w-2xl space-y-3">
        {TOGGLES.map((t) => {
          const locked = t.key === "portfolioPublic" && teen;
          return (
            <label key={t.key} className="flex items-center justify-between gap-4 rounded-2xl border bg-card p-4">
              <span>
                <span className="block font-medium">{t.title}</span>
                <span className="text-sm text-muted-foreground">{locked ? "Not available for learners under 18." : t.text}</span>
              </span>
              <Switch disabled={locked} checked={!!p[t.key] && !locked} onCheckedChange={(v) => setOpen((st) => ({ profile: { ...st.profile!, [t.key]: v } }))} />
            </label>
          );
        })}
        <div className="rounded-2xl border bg-card p-4">
          <p className="font-medium">Notifications</p>
          <p className="text-sm text-muted-foreground">Digest by default; we stay quiet when you&apos;re on track.</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(["instant", "daily", "weekly", "off"] as const).map((n) => (
              <button key={n} type="button" onClick={() => setOpen((st) => ({ profile: { ...st.profile!, notifications: n } }))} className={`rounded-full border px-3 py-1 text-sm capitalize ${p.notifications === n ? "border-primary bg-primary text-primary-foreground" : "bg-card"}`}>
                {n === "daily" ? "Daily digest" : n === "weekly" ? "Weekly digest" : n}
              </button>
            ))}
          </div>
        </div>
        {teen && (
          <div className="rounded-2xl border bg-card p-4 text-sm">
            <p className="font-medium">Guardian consent</p>
            <p className="text-muted-foreground">Status: {p.guardian === "granted" ? "approved" : "waiting for approval"}. Consent can be withdrawn at any time.</p>
          </div>
        )}
        <div className="flex flex-wrap gap-2 pt-4">
          <Button
            variant="outline"
            onClick={() => {
              const blob = new Blob([JSON.stringify(s, null, 2)], { type: "application/json" });
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = "my-classproject-open-data.json";
              a.click();
              toast.success("Your data was downloaded");
            }}
          >
            <Download /> Download all my data
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              if (!window.confirm("Delete your account? In production there's a 14-day grace period.")) return;
              signOut();
              router.push("/");
            }}
          >
            <Trash2 /> Delete my account
          </Button>
        </div>
      </div>
    </>
  );
}

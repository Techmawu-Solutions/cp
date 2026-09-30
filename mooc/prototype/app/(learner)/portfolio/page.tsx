"use client";

import Link from "next/link";
import { Download, ExternalLink, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { PageTitle } from "@/components/open/bits";
import { PortfolioView } from "@/components/open/portfolio-view";
import { setOpen, useOpen } from "@/lib/store";

/** Portfolio management (spec section 6.13): learner controls visibility; under-18s are never public. */
export default function PortfolioPage() {
  const s = useOpen();
  const teen = s.profile?.ageBand === "teen";
  return (
    <>
      <PageTitle title="Portfolio" description="Real work, verified — not a pile of certificates.">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const blob = new Blob([JSON.stringify({ projects: s.submissions, credentials: s.credentials, mastery: s.mastery }, null, 2)], { type: "application/json" });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = "portfolio.json";
            a.click();
          }}
        >
          <Download /> Export
        </Button>
      </PageTitle>
      <div className="mb-8 flex flex-wrap items-center gap-4 rounded-2xl border bg-card p-4">
        {teen ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Lock className="size-4" /> Portfolios of learners under 18 stay private. You can still download and share it yourself.
          </p>
        ) : (
          <>
            <label className="flex items-center gap-3 text-sm">
              <Switch checked={!!s.profile?.portfolioPublic} onCheckedChange={(v) => (setOpen((st) => ({ profile: { ...st.profile!, portfolioPublic: v } })), toast(v ? "Portfolio is public" : "Portfolio is private"))} />
              Public portfolio
            </label>
            {s.profile?.portfolioPublic && (
              <Link href={`/p/${s.profile.handle}`} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                open.classproject.com/p/{s.profile.handle} <ExternalLink className="size-3.5" />
              </Link>
            )}
          </>
        )}
      </div>
      <PortfolioView s={s} />
    </>
  );
}

"use client";

import { useParams } from "next/navigation";
import { Lock } from "lucide-react";
import { PortfolioView } from "@/components/open/portfolio-view";
import { useOpen } from "@/lib/store";

/** Public portfolio (spec section 6.13): only if the learner made it public, and never for under-18s. */
export default function PublicPortfolio() {
  const { handle } = useParams<{ handle: string }>();
  const s = useOpen();
  const own = s.profile?.handle === handle;
  const visible = own && s.profile?.portfolioPublic && s.profile.ageBand === "adult";
  if (!visible)
    return (
      <div className="mx-auto max-w-lg text-center">
        <Lock className="mx-auto size-10 text-muted-foreground" />
        <h1 className="mt-3 text-2xl font-semibold">This portfolio is private</h1>
        <p className="mt-2 text-muted-foreground">Its owner hasn&apos;t made it public. (Prototype: public portfolios are only visible in the browser that owns them.)</p>
      </div>
    );
  return (
    <div>
      <p className="text-sm text-muted-foreground">Portfolio</p>
      <h1 className="mb-8 text-4xl font-semibold">{s.profile!.name}</h1>
      <PortfolioView s={s} />
    </div>
  );
}

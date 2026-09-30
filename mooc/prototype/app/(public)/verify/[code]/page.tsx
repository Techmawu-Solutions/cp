"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { BadgeCheck, Braces, Copy, ShieldCheck, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { credentialById, skillName } from "@/lib/data/graph";
import { asVerifiableCredential, lookupCredential } from "@/lib/evidence-view";
import { useOpen } from "@/lib/store";

/** Public credential verification (spec section 16, AC-CR-2): no sign-in needed. */
export default function VerifyPage() {
  const { code } = useParams<{ code: string }>();
  const s = useOpen();
  const [json, setJson] = useState(false);
  const v = lookupCredential(decodeURIComponent(code), s);

  if (!v)
    return (
      <div className="mx-auto max-w-lg text-center">
        <XCircle className="mx-auto size-10 text-destructive" />
        <h1 className="mt-3 text-2xl font-semibold">We can&apos;t find credential {decodeURIComponent(code)}</h1>
        <p className="mt-2 text-muted-foreground">Check the code. (In this prototype, verification only sees credentials earned in this browser — try the sample: SAMP-LE26-OPEN.)</p>
      </div>
    );

  const def = credentialById.get(v.cred.defId)!;
  const vc = asVerifiableCredential(v);
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-2 rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100">
        <ShieldCheck className="size-5 shrink-0" />
        <p>
          <span className="font-semibold">Verified.</span> This credential is genuine and {v.cred.status === "active" ? "active" : "revoked"}.{v.sample && " (Sample credential for demonstration.)"}
        </p>
      </div>

      <article className="overflow-hidden rounded-3xl border bg-card">
        <div className="bg-primary px-8 py-6 text-primary-foreground">
          <p className="text-sm opacity-80">{def.kind === "competency" ? "Competency credential" : def.kind === "badge" ? "Digital badge" : "Certificate"}</p>
          <h1 className="mt-1 font-heading text-3xl font-semibold">{def.name}</h1>
          <p className="mt-1 opacity-90">Awarded to {v.holder}</p>
        </div>
        <div className="grid gap-6 p-8 sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground uppercase">Issuer</p>
            <p className="font-medium">{def.issuer}</p>
            <p className="mt-3 text-xs text-muted-foreground uppercase">Issued</p>
            <p className="font-medium">{new Date(v.cred.issuedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>
            <p className="mt-3 text-xs text-muted-foreground uppercase">Credential ID</p>
            <p className="font-mono font-medium">{v.cred.code}</p>
            <p className="mt-4 text-sm text-muted-foreground">{def.description}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase">Skills demonstrated</p>
            <ul className="mt-1 space-y-1">
              {def.skills.map((sk) => (
                <li key={sk} className="flex items-center gap-2 text-sm">
                  <BadgeCheck className="size-4 text-emerald-600" /> {skillName(sk)}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-muted-foreground uppercase">Evidence</p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
              {v.cred.evidence.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </div>
        </div>
      </article>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => (navigator.clipboard?.writeText(window.location.href), toast.success("Verification link copied"))}>
          <Copy /> Copy verification link
        </Button>
        <Button variant="outline" onClick={() => setJson((j) => !j)}>
          <Braces /> {json ? "Hide" : "Show"} machine-readable credential
        </Button>
      </div>
      {json && <pre className="max-h-96 overflow-auto rounded-2xl border bg-muted p-4 text-xs">{JSON.stringify(vc, null, 2)}</pre>}
      <p className="text-xs text-muted-foreground">Open Badges 3.0 / W3C Verifiable Credential. In production the credential is signed with the issuer&apos;s key and can be checked by any compatible verifier or wallet.</p>
    </div>
  );
}

"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { PERSONAS, signInAs } from "@/lib/personas";
import type { PersonaId } from "@/lib/store";

/** Demo sign-in: one click per persona, like ClassProject's demo accounts. */
export default function SignIn() {
  return (
    <Suspense>
      <Body />
    </Suspense>
  );
}

function Body() {
  const router = useRouter();
  const next = useSearchParams().get("next");
  const choose = (id: PersonaId) => {
    signInAs(id);
    router.push(id === "new" ? "/start" : id === "mensah" ? "/studio" : next && next !== "/sign-in" ? next : "/home");
  };
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-3xl font-semibold">Sign in</h1>
      <p className="mt-1 text-muted-foreground">
        This is a prototype — pick a demo account. In production: email, phone number (SMS/WhatsApp code), Google, Apple or your institution&apos;s single sign-on, with two-step verification for instructors.
      </p>
      <div className="mt-6 grid gap-3">
        {PERSONAS.map((p) => (
          <button key={p.id} type="button" onClick={() => choose(p.id)} className="group flex items-center gap-4 rounded-2xl border bg-card p-4 text-left hover:border-primary/40">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary/15 font-heading text-lg font-semibold text-primary">{p.name[0]}</span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">
                {p.name} <span className="font-normal text-muted-foreground">· {p.blurb}</span>
              </span>
              <span className="block text-sm text-muted-foreground">{p.detail}</span>
            </span>
            <ArrowRight className="size-4 text-muted-foreground group-hover:text-primary" />
          </button>
        ))}
      </div>
      <p className="mt-6 text-xs text-muted-foreground">Signing in as a persona replaces the demo data in this browser.</p>
    </div>
  );
}

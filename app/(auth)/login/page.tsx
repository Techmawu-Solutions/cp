"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useHydrated, useStore } from "@/lib/store";
import { PORTAL_HOME, portalFor, useCurrentUser } from "@/lib/session";
import { DEMO_ACCOUNTS } from "@/lib/demo-accounts";
import { DEMO_PASSWORD } from "@/lib/data/seed";

const schema = z.object({
  // Email, platform username, student school username or teacher staff ID (spec §10.1).
  identifier: z.string().trim().min(1, "Enter your email, username or staff ID"),
  password: z.string().min(1, "Enter your password"),
});
type Values = z.infer<typeof schema>;

/** Where to go after sign-in: the requested page, unless it belongs to another portal (e.g. left over from the previous user). */
function destination(next: string | null, portal: keyof typeof PORTAL_HOME) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return PORTAL_HOME[portal];
  const other = (Object.keys(PORTAL_HOME) as (keyof typeof PORTAL_HOME)[]).some((p) => p !== portal && (next === `/${p}` || next.startsWith(`/${p}/`)));
  return other ? PORTAL_HOME[portal] : next;
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const hydrated = useHydrated();
  const me = useCurrentUser();
  const router = useRouter();
  const next = useSearchParams().get("next");
  const login = useStore((s) => s.login);
  const [error, setError] = useState<string | null>(null);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { identifier: "", password: "" } });

  useEffect(() => {
    if (hydrated && me) router.replace(destination(next, me.portal));
  }, [hydrated, me, next, router]);

  const submit = (v: Values) => {
    setBusy(true);
    setError(null);
    // Simulated network latency so the prototype feels like a real sign-in.
    setTimeout(() => {
      const res = login(v.identifier, v.password);
      setBusy(false);
      if (!res.ok) return setError(res.error);
      const st = useStore.getState();
      const u = st.users.find((x) => x.id === res.userId)!;
      const portal = portalFor(st.roles.filter((r) => u.roleId === r.id));
      router.replace(destination(next, portal));
    }, 450);
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
      <p className="mt-1 text-sm text-muted-foreground">Use the account your school or the platform administrator gave you.</p>

      <form onSubmit={form.handleSubmit(submit)} className="mt-8 space-y-4" noValidate>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <div className="space-y-2">
          <Label htmlFor="identifier">Email, username or staff ID</Label>
          <Input id="identifier" autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder="you@school.edu.gh or 0010712-0001" className="h-10" aria-invalid={!!form.formState.errors.identifier} {...form.register("identifier")} />
          {form.formState.errors.identifier ? (
            <p className="text-xs text-destructive">{form.formState.errors.identifier.message}</p>
          ) : (
            <p className="text-xs text-muted-foreground">Students: school username (WAEC code + number) or platform username. Teachers: staff ID, email or platform username.</p>
          )}
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link href="/forgot-password" className="text-xs text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Input id="password" type={show ? "text" : "password"} autoComplete="current-password" className="h-10 pr-10" aria-invalid={!!form.formState.errors.password} {...form.register("password")} />
            <button type="button" onClick={() => setShow((s) => !s)} className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground" aria-label={show ? "Hide password" : "Show password"}>
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {form.formState.errors.password && <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>}
        </div>
        <Button type="submit" size="lg" className="h-10 w-full" disabled={busy}>
          {busy ? <Loader2 className="animate-spin" /> : null}
          Sign in
        </Button>
      </form>

      <div className="mt-10">
        <div className="mb-3 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          Prototype demo accounts
          <span className="h-px flex-1 bg-border" />
        </div>
        <div className="grid gap-2">
          {DEMO_ACCOUNTS.map((a) => (
            <button
              key={a.email}
              type="button"
              onClick={() => {
                form.setValue("identifier", a.email);
                form.setValue("password", DEMO_PASSWORD);
                submit({ identifier: a.email, password: DEMO_PASSWORD });
              }}
              className="group flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5 text-left transition-colors hover:border-primary/40 hover:bg-accent"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{a.label}</p>
                <p className="truncate text-xs text-muted-foreground">{a.description}</p>
              </div>
              <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </button>
          ))}
        </div>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Every seeded account uses the password <code className="rounded bg-muted px-1">password</code>. Data is stored in this browser only.
        </p>
        <UsernameExamples onPick={(id) => (form.setValue("identifier", id), form.setValue("password", DEMO_PASSWORD))} />
        <a href="/vacation" className="mt-4 flex items-center justify-between rounded-lg border border-orange-500/40 bg-orange-500/5 px-3 py-2.5 text-sm hover:bg-orange-500/10">
          <span>
            <span className="block font-medium text-orange-700 dark:text-orange-300">Vacation Classes are open</span>
            <span className="text-xs text-muted-foreground">Any student can register — no school account needed.</span>
          </span>
          <ArrowRight className="size-4 text-orange-600" />
        </a>
      </div>
    </div>
  );
}

/** Demo: the other sign-in names of the seeded student and teacher (spec §10.1). */
function UsernameExamples({ onPick }: { onPick: (identifier: string) => void }) {
  const users = useStore((s) => s.users);
  const students = useStore((s) => s.students);
  const teachers = useStore((s) => s.teachers);
  const john = users.find((u) => u.email === "john.mensah@ridgeview.edu.gh");
  const eric = users.find((u) => u.email === "eric.dzontoh@ridgeview.edu.gh");
  const johnSchool = students.find((x) => x.userId === john?.id)?.schoolUsername;
  const ericStaff = teachers.find((x) => x.userId === eric?.id)?.staffNumber;
  const examples = [
    johnSchool && { id: johnSchool, label: "John · school username" },
    john?.username && { id: john.username, label: "John · platform username" },
    ericStaff && { id: ericStaff, label: "Mr. Dzontoh · staff ID" },
    eric?.username && { id: eric.username, label: "Mr. Dzontoh · platform username" },
  ].filter(Boolean) as { id: string; label: string }[];
  if (!examples.length) return null;
  return (
    <div className="mt-3 rounded-lg border border-dashed p-3 text-xs">
      <p className="mb-2 text-muted-foreground">Or try signing in with a username (click to fill in, then Sign in):</p>
      <div className="flex flex-wrap gap-1.5">
        {examples.map((e) => (
          <button key={e.id} type="button" onClick={() => onPick(e.id)} className="rounded-md border bg-card px-2 py-1 text-left hover:border-primary/40 hover:bg-accent" title={e.label}>
            <code>{e.id}</code>
            <span className="ml-1.5 text-muted-foreground">{e.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

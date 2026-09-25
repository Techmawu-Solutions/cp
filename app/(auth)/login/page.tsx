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
  email: z.string().min(1, "Enter your email address").email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});
type Values = z.infer<typeof schema>;

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
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } });

  useEffect(() => {
    if (hydrated && me) router.replace(next && next.startsWith("/") ? next : PORTAL_HOME[me.portal]);
  }, [hydrated, me, next, router]);

  const submit = (v: Values) => {
    setBusy(true);
    setError(null);
    // Simulated network latency so the prototype feels like a real sign-in.
    setTimeout(() => {
      const res = login(v.email, v.password);
      setBusy(false);
      if (!res.ok) return setError(res.error);
      const st = useStore.getState();
      const u = st.users.find((x) => x.id === res.userId)!;
      const portal = portalFor(st.roles.filter((r) => u.roleId === r.id));
      router.replace(next && next.startsWith("/") ? next : PORTAL_HOME[portal]);
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
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" placeholder="you@school.edu.gh" className="h-10" aria-invalid={!!form.formState.errors.email} {...form.register("email")} />
          {form.formState.errors.email && <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>}
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
                form.setValue("email", a.email);
                form.setValue("password", DEMO_PASSWORD);
                submit({ email: a.email, password: DEMO_PASSWORD });
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

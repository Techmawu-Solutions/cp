"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LinkButton } from "@/components/common/link-button";
import { useStore } from "@/lib/store";

export default function ForgotPasswordPage() {
  const users = useStore((s) => s.users);
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<{ email: string; token: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError("Enter a valid email address.");
    const user = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    // Always show the same confirmation so the form can't be used to discover accounts.
    setSentTo({ email, token: user ? btoa(user.id) : null });
  };

  if (sentTo) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-emerald-500/10">
          <MailCheck className="size-6 text-emerald-600" />
        </div>
        <h1 className="text-2xl font-semibold">Check your email</h1>
        <p className="mt-2 text-sm text-muted-foreground">If an account exists for {sentTo.email}, we&apos;ve sent a link to reset the password. The link expires in 60 minutes.</p>
        {sentTo.token && (
          <Alert className="mt-6 text-left">
            <AlertDescription>
              <span className="font-medium text-foreground">Prototype shortcut:</span> no email is actually sent.{" "}
              <Link className="text-primary underline" href={`/reset-password?token=${encodeURIComponent(sentTo.token)}`}>
                Open the reset link
              </Link>
            </AlertDescription>
          </Alert>
        )}
        <LinkButton href="/login" variant="ghost" className="mt-6">
          <ArrowLeft /> Back to sign in
        </LinkButton>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate>
      <h1 className="text-2xl font-semibold tracking-tight">Forgot your password?</h1>
      <p className="mt-1 text-sm text-muted-foreground">Enter your email and we&apos;ll send you a link to reset it.</p>
      <div className="mt-8 space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" className="h-10" value={email} onChange={(e) => (setEmail(e.target.value), setError(null))} aria-invalid={!!error} />
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
      <Button type="submit" size="lg" className="mt-4 h-10 w-full">
        Send reset link
      </Button>
      <LinkButton href="/login" variant="ghost" className="mt-3 w-full">
        <ArrowLeft /> Back to sign in
      </LinkButton>
    </form>
  );
}

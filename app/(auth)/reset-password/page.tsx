"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LinkButton } from "@/components/common/link-button";
import { useStore } from "@/lib/store";

const schema = z
  .object({
    password: z.string().min(8, "Use at least 8 characters").regex(/[0-9]/, "Include at least one number").regex(/[A-Za-z]/, "Include at least one letter"),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: "Passwords don't match", path: ["confirm"] });

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}

function decode(token: string | null): string | null {
  try {
    return token ? atob(token) : null;
  } catch {
    return null;
  }
}

function ResetForm() {
  const token = useSearchParams().get("token");
  const users = useStore((s) => s.users);
  const setPassword = useStore((s) => s.setPassword);
  const router = useRouter();
  const user = users.find((u) => u.id === decode(token));
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { password: "", confirm: "" } });
  const [done, setDone] = useState(false);

  if (!user) {
    return (
      <div>
        <h1 className="text-2xl font-semibold">Reset link invalid</h1>
        <p className="mt-2 text-sm text-muted-foreground">This password reset link is invalid or has expired. Request a new one.</p>
        <LinkButton href="/forgot-password" className="mt-6">
          Request a new link
        </LinkButton>
      </div>
    );
  }

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit((v) => {
        setPassword(user.id, v.password);
        setDone(true);
        toast.success("Password updated. Sign in with your new password.");
        setTimeout(() => router.push("/login"), 900);
      })}
    >
      <h1 className="text-2xl font-semibold tracking-tight">Choose a new password</h1>
      <p className="mt-1 text-sm text-muted-foreground">for {user.email}</p>
      {done && (
        <Alert className="mt-6">
          <AlertDescription>Password updated — redirecting to sign in…</AlertDescription>
        </Alert>
      )}
      <div className="mt-8 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <Input id="password" type="password" className="h-10" {...form.register("password")} aria-invalid={!!form.formState.errors.password} />
          {form.formState.errors.password && <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirm new password</Label>
          <Input id="confirm" type="password" className="h-10" {...form.register("confirm")} aria-invalid={!!form.formState.errors.confirm} />
          {form.formState.errors.confirm && <p className="text-xs text-destructive">{form.formState.errors.confirm.message}</p>}
        </div>
      </div>
      <Button type="submit" size="lg" className="mt-6 h-10 w-full" disabled={done}>
        Update password
      </Button>
    </form>
  );
}

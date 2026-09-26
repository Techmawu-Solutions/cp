"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/common/page-header";
import { UserAvatar } from "@/components/common/user-avatar";
import { Field } from "@/components/forms/field";
import { SignInNames } from "@/components/common/sign-in-names";
import { useStore } from "@/lib/store";
import { useCurrentUser, useTenant } from "@/lib/session";
import { DEMO_PASSWORD } from "@/lib/data/seed";
import { AVATAR_COLORS } from "@/lib/helpers";

export default function ProfilePage() {
  const me = useCurrentUser();
  const { school } = useTenant();
  const passwords = useStore((s) => s.passwords);
  const [name, setName] = useState(me?.user.name ?? "");
  const [phone, setPhone] = useState(me?.user.phone ?? "");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  if (!me) return null;
  const u = me.user;

  return (
    <>
      <PageHeader title="Profile" description="Your sign-in names, personal details and password." />
      <div className="grid max-w-4xl gap-4 lg:grid-cols-[280px_1fr]">
        <Card>
          <CardContent className="flex flex-col items-center text-center">
            <UserAvatar name={u.name} color={u.avatarColor} size="xl" />
            <p className="mt-3 font-semibold">{u.name}</p>
            <p className="text-sm text-muted-foreground">{u.email}</p>
            <div className="mt-2 flex flex-wrap justify-center gap-1">
              {me.roles.map((r) => (
                <Badge key={r.id} variant="secondary">
                  {r.name}
                </Badge>
              ))}
            </div>
            {school && <p className="mt-2 text-xs text-muted-foreground">{school.name}</p>}
            <div className="mt-4 flex flex-wrap justify-center gap-1.5">
              {AVATAR_COLORS.map((c) => (
                <button key={c} className="size-5 rounded-full ring-offset-2 ring-offset-card data-[on=true]:ring-2 data-[on=true]:ring-foreground" data-on={u.avatarColor === c} style={{ background: c }} onClick={() => useStore.getState().update("users", u.id, { avatarColor: c })} aria-label={`Avatar colour ${c}`} />
              ))}
            </div>
          </CardContent>
        </Card>
        <div className="space-y-4">
          <SignInNames userId={u.id} title="Your sign-in names" />
          <Card>
            <CardHeader>
              <CardTitle>Personal details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" htmlFor="p-name">
                <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
              <Field label="Phone" htmlFor="p-phone">
                <Input id="p-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </Field>
              <Field label="Email" hint="Contact your administrator to change your email." className="sm:col-span-2">
                <Input value={u.email} disabled />
              </Field>
            </CardContent>
            <CardFooter className="justify-end">
              <Button disabled={name.trim().length < 3} onClick={() => (useStore.getState().update("users", u.id, { name: name.trim(), phone: phone.trim() }), toast.success("Profile saved"))}>
                Save
              </Button>
            </CardFooter>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Change password</CardTitle>
              <CardDescription>Use at least 8 characters with a letter and a number.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <Field label="Current password" htmlFor="p-cur">
                <Input id="p-cur" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} />
              </Field>
              <Field label="New password" htmlFor="p-new">
                <Input id="p-new" type="password" value={next} onChange={(e) => setNext(e.target.value)} />
              </Field>
              <Field label="Confirm" htmlFor="p-con" error={confirm && confirm !== next ? "Doesn't match" : undefined}>
                <Input id="p-con" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              </Field>
            </CardContent>
            <CardFooter className="justify-end">
              <Button
                disabled={!current || next.length < 8 || next !== confirm}
                onClick={() => {
                  if (current !== (passwords[u.id] ?? DEMO_PASSWORD)) return toast.error("Current password is incorrect");
                  if (!/[0-9]/.test(next) || !/[A-Za-z]/.test(next)) return toast.error("Include a letter and a number");
                  useStore.getState().setPassword(u.id, next);
                  setCurrent("");
                  setNext("");
                  setConfirm("");
                  toast.success("Password changed");
                }}
              >
                Update password
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </>
  );
}

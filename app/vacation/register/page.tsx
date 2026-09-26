"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, CreditCard, GraduationCap, Loader2, LogIn, Printer, Smartphone, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CATEGORY_LABEL, STUDENT_SCHOOL_LEVELS } from "@/lib/school-meta";
import { SchoolNotListed, SchoolPicker } from "@/components/vacation/school-picker";
import { AppSelect } from "@/components/common/app-select";
import { Field } from "@/components/forms/field";
import { useStore } from "@/lib/store";
import { useCurrentUser } from "@/lib/session";
import { PAYMENT_LABEL, confirmPayment, fmtGhs, homeProfile, quote, startRegistration, useVacationCatalogue, type NewStudentInput } from "@/lib/vacation";
import type { PaymentMethod, SchoolType, VacationRegistration } from "@/lib/types";
import { cn } from "@/lib/utils";

const STEPS = ["Level", "Subjects", "Account", "Payment", "Done"] as const;

export default function VacationRegisterPage() {
  return (
    <Suspense>
      <Register />
    </Suspense>
  );
}

function Register() {
  const params = useSearchParams();
  const router = useRouter();
  const v = useVacationCatalogue();
  const db = useStore();
  const me = useCurrentUser();
  const presetBundle = v.bundles.find((b) => b.id === params.get("bundle"));
  const [step, setStep] = useState(params.get("class") || (presetBundle && presetBundle.classIds.length === 1) ? 1 : 0);
  const [classId, setClassId] = useState(params.get("class") ?? presetBundle?.classIds[0] ?? "");
  const [mode, setMode] = useState<"bundle" | "subjects">(params.get("mode") === "subjects" ? "subjects" : "bundle");
  const [bundleId, setBundleId] = useState(presetBundle?.id ?? "");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [reg, setReg] = useState<VacationRegistration | null>(null);

  // Subjects this person already paid for in this session are excluded (spec: no double charging).
  const alreadyPaid = useMemo(() => new Set(db.vacationRegistrations.filter((r) => r.userId === me?.user.id && r.sessionId === v.session?.id && r.status === "paid").flatMap((r) => r.subjectIds)), [db.vacationRegistrations, me, v.session]);
  const cls = v.classes.find((c) => c.id === classId);
  const bundles = classId ? v.bundlesFor(classId) : [];
  const subjects = classId ? v.subjectsFor(classId) : [];
  const q = quote(db, mode === "bundle" ? { bundleId, subjectIds: [] } : { subjectIds: [...picked] });
  const chosenIds = mode === "bundle" ? (bundles.find((b) => b.id === bundleId)?.subjectIds ?? []) : [...picked];
  const canContinue = step === 0 ? !!classId : step === 1 ? chosenIds.length > 0 : true;

  if (!v.session || !v.school) return <p className="p-8 text-center text-muted-foreground">Registration isn&apos;t open right now.</p>;
  const isStaff = me && me.portal !== "student";

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold sm:text-3xl">Register — {v.session.name}</h1>
      <ol className="mt-4 mb-6 flex flex-wrap items-center gap-2 text-sm">
        {STEPS.map((s, i) => (
          <li key={s} className="flex items-center gap-2">
            <span className={cn("flex size-6 items-center justify-center rounded-full border text-xs", i < step && "border-orange-600 bg-orange-600 text-white", i === step && "border-orange-600 text-orange-600")}>{i < step ? <Check className="size-3.5" /> : i + 1}</span>
            <span className={i === step ? "font-medium" : "text-muted-foreground"}>{s}</span>
            {i < STEPS.length - 1 && <span className="h-px w-5 bg-border" />}
          </li>
        ))}
      </ol>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
        <div>
          {step === 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {v.classes.map((c) => (
                <button key={c.id} onClick={() => (setClassId(c.id), setBundleId(""), setPicked(new Set()))} className={cn("flex items-center gap-3 rounded-xl border p-4 text-left transition-colors hover:border-orange-400", classId === c.id && "border-orange-600 bg-orange-500/5 ring-2 ring-orange-500/30")}>
                  <GraduationCap className="size-6 text-orange-600" />
                  <span>
                    <span className="block font-semibold">{c.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {v.subjectsFor(c.id).length} subjects · {v.bundlesFor(c.id).length} bundles
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}

          {step === 1 && (
            <Tabs value={mode} onValueChange={(m) => setMode(m as "bundle" | "subjects")}>
              <TabsList className="mb-4">
                <TabsTrigger value="bundle">Choose a bundle</TabsTrigger>
                <TabsTrigger value="subjects">Pick subjects</TabsTrigger>
              </TabsList>
              <TabsContent value="bundle" className="grid gap-3 sm:grid-cols-2">
                {bundles.length === 0 && <p className="text-sm text-muted-foreground">No bundles for {cls?.name} — pick subjects instead.</p>}
                {bundles.map((b) => {
                  const bq = quote(db, { bundleId: b.id, subjectIds: [] });
                  const overlap = b.subjectIds.filter((id) => alreadyPaid.has(id)).length;
                  return (
                    <button key={b.id} onClick={() => setBundleId(b.id)} disabled={overlap === b.subjectIds.length} className={cn("rounded-xl border p-4 text-left transition-colors hover:border-orange-400 disabled:opacity-50", bundleId === b.id && "border-orange-600 bg-orange-500/5 ring-2 ring-orange-500/30")}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold">{b.name}</p>
                        {b.featured && <Badge className="bg-orange-600 text-white">Popular</Badge>}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{b.subjectIds.map((id) => v.subjects.find((x) => x.id === id)?.name).join(" · ")}</p>
                      <p className="mt-3 text-xl font-bold">{fmtGhs(b.price)}</p>
                      {bq.saving > 0 && <p className="text-xs text-emerald-700 dark:text-emerald-400">Save {fmtGhs(bq.saving)}</p>}
                      {overlap > 0 && <p className="mt-1 text-xs text-amber-700">You already paid for {overlap} of these subjects</p>}
                    </button>
                  );
                })}
              </TabsContent>
              <TabsContent value="subjects">
                <div className="grid gap-2 sm:grid-cols-2">
                  {subjects.map((s) => {
                    const paid = alreadyPaid.has(s.id);
                    return (
                      <label key={s.id} className={cn("flex cursor-pointer items-center gap-3 rounded-lg border p-3", picked.has(s.id) && "border-orange-600 bg-orange-500/5", paid && "cursor-not-allowed opacity-60")}>
                        <Checkbox disabled={paid} checked={picked.has(s.id)} onCheckedChange={(c) => setPicked((p) => { const n = new Set(p); if (c) n.add(s.id); else n.delete(s.id); return n; })} />
                        <span className="size-2.5 rounded-full" style={{ background: s.color }} />
                        <span className="flex-1 text-sm font-medium">{s.name}</span>
                        <span className="text-sm tabular-nums">{paid ? "Registered" : fmtGhs(v.priceOf(s.id))}</span>
                      </label>
                    );
                  })}
                </div>
              </TabsContent>
            </Tabs>
          )}

          {step === 2 && (
            <AccountStep
              schoolName={v.school.name}
              isStaff={!!isStaff}
              onReady={(input) => {
                const r = startRegistration({ sessionId: v.session!.id, classId, bundleId: mode === "bundle" ? bundleId : undefined, subjectIds: chosenIds.filter((id) => !alreadyPaid.has(id)), ...input });
                setReg(r);
                setStep(3);
              }}
            />
          )}

          {step === 3 && reg && (
            <PaymentStep
              reg={reg}
              onPaid={(paid) => {
                setReg(paid);
                setStep(4);
              }}
            />
          )}

          {step === 4 && reg && <Receipt reg={reg} onGo={() => {
            const st = useStore.getState();
            // New students are signed in automatically; existing ones switch workspace.
            if (st.userId !== reg.userId) useStore.setState({ userId: reg.userId, actingSchoolId: null });
            st.setWorkspace(v.school!.id === db.users.find((u) => u.id === reg.userId)?.schoolId ? null : v.school!.id);
            router.push("/student/dashboard");
          }} />}
        </div>

        {/* Order summary */}
        {step < 4 && (
          <Card className="self-start lg:sticky lg:top-20">
            <CardHeader>
              <CardTitle>Your selection</CardTitle>
              <CardDescription>{cls?.name ?? "Choose a level"}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {mode === "bundle" && bundleId && <p className="font-medium">{bundles.find((b) => b.id === bundleId)?.name}</p>}
              <ul className="space-y-1">
                {chosenIds.map((id) => (
                  <li key={id} className="flex justify-between gap-2">
                    <span className={cn(alreadyPaid.has(id) && "line-through text-muted-foreground")}>{v.subjects.find((x) => x.id === id)?.name}</span>
                    {mode === "subjects" && <span className="tabular-nums">{fmtGhs(v.priceOf(id))}</span>}
                  </li>
                ))}
                {chosenIds.length === 0 && <li className="text-muted-foreground">Nothing selected yet</li>}
              </ul>
              {q.saving > 0 && (
                <p className="flex justify-between text-emerald-700 dark:text-emerald-400">
                  <span>Bundle saving</span>
                  <span>−{fmtGhs(q.saving)}</span>
                </p>
              )}
              <p className="flex justify-between border-t pt-3 text-lg font-bold">
                <span>Total</span>
                <span>{fmtGhs(reg?.amount ?? q.total)}</span>
              </p>
              {step < 2 && (
                <div className="flex gap-2 pt-2">
                  {step > 0 && (
                    <Button variant="outline" onClick={() => setStep(step - 1)}>
                      <ArrowLeft /> Back
                    </Button>
                  )}
                  <Button className="flex-1 bg-orange-600 text-white hover:bg-orange-500" disabled={!canContinue} onClick={() => setStep(step + 1)}>
                    Continue <ArrowRight />
                  </Button>
                </div>
              )}
              {step === 2 && (
                <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
                  <ArrowLeft /> Change subjects
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}

/** Existing users sign in and their details are picked up; new students create an account (spec §49.1.4). */
function AccountStep({ onReady, isStaff, schoolName }: { onReady: (a: { existingUserId?: string; newStudent?: NewStudentInput }) => void; isStaff: boolean; schoolName: string }) {
  const me = useCurrentUser();
  const db = useStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [who, setWho] = useState<"new" | "existing" | null>(null);
  const [n, setN] = useState<NewStudentInput>({ firstName: "", lastName: "", gender: "F", email: "", phone: "", dateOfBirth: "", currentSchool: "", currentSchoolType: undefined, guardianName: "", guardianPhone: "", password: "" });

  if (me && !isStaff) {
    const home = homeProfile(db, me.user.id);
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your details</CardTitle>
          <CardDescription>We&apos;ve picked these up from your account — nothing to fill in.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row label="Name" value={me.user.name} />
          <Row label="Email" value={me.user.email} />
          {home.school && home.school.kind !== "vacation" && <Row label="School" value={`${home.school.name} · ${CATEGORY_LABEL[home.school.type]}`} />}
          {home.className && <Row label="Class" value={home.className} />}
          {home.student?.guardianName && <Row label="Guardian" value={`${home.student.guardianName} · ${home.student.guardianPhone}`} />}
          <Button className="mt-3 w-full bg-orange-600 text-white hover:bg-orange-500" onClick={() => onReady({ existingUserId: me.user.id })}>
            Continue to payment <ArrowRight />
          </Button>
          <button className="w-full text-center text-xs text-muted-foreground underline" onClick={() => useStore.getState().logout()}>
            Not you? Sign out
          </button>
        </CardContent>
      </Card>
    );
  }
  if (isStaff)
    return (
      <Alert>
        <AlertDescription>
          You&apos;re signed in as {me?.user.name} ({me?.roles[0]?.name}). Vacation registration is for students — sign out to register a student.
          <Button size="sm" variant="outline" className="mt-2" onClick={() => useStore.getState().logout()}>
            Sign out
          </Button>
        </AlertDescription>
      </Alert>
    );

  const set = (k: keyof NewStudentInput, val: string) => (setN((x) => ({ ...x, [k]: val })), setErr(null));
  return (
    <div className="space-y-4">
      {/* Two clearly different paths: create a new account, or sign in so details are picked up. */}
      <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Do you have an account?">
        <PathCard
          selected={who === "new"}
          onSelect={() => (setWho("new"), setErr(null))}
          tone="orange"
          icon={UserPlus}
          title="I'm new here"
          text="First time with ClassProject? Create your account in about 2 minutes."
        />
        <PathCard
          selected={who === "existing"}
          onSelect={() => (setWho("existing"), setErr(null))}
          tone="sky"
          icon={LogIn}
          title="I already have an account"
          text="From your school or an earlier vacation. Sign in and your details are filled in for you."
        />
      </div>

      {who === null && <p className="text-center text-sm text-muted-foreground">Choose one to continue.</p>}

      {who === "existing" && (
        <Card className="border-t-4 border-t-sky-600">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LogIn className="size-5 text-sky-600" /> Sign in to your account
            </CardTitle>
            <CardDescription>Use the account from your school or a previous vacation. Your details are picked up — you only pay the fee.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Field label="Email or username" htmlFor="ex-email">
              <Input id="ex-email" autoComplete="username" autoCapitalize="none" value={email} onChange={(e) => (setEmail(e.target.value), setErr(null))} />
            </Field>
            <Field label="Password" htmlFor="ex-pw" hint="Your school username, platform username or email. Demo: every seeded account uses “password”, e.g. john.mensah@ridgeview.edu.gh">
              <Input id="ex-pw" type="password" value={password} onChange={(e) => (setPassword(e.target.value), setErr(null))} />
            </Field>
            {err && <p className="text-sm text-destructive">{err}</p>}
            <Button
              className="w-full bg-sky-600 text-white hover:bg-sky-500"
              onClick={() => {
                const res = useStore.getState().login(email, password);
                if (!res.ok) return setErr(res.error);
                toast.success("Signed in — details picked up");
              }}
            >
              Sign in
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              No account yet?{" "}
              <button className="text-orange-600 underline" onClick={() => setWho("new")}>
                Register as a new student
              </button>
            </p>
          </CardContent>
        </Card>
      )}

      {who === "new" && (
        <Card className="border-t-4 border-t-orange-600">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="size-5 text-orange-600" /> Create your account
            </CardTitle>
            <CardDescription>You&apos;ll use this to join {schoolName}.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Field label="First name" required>
              <Input value={n.firstName} onChange={(e) => set("firstName", e.target.value)} />
            </Field>
            <Field label="Last name" required>
              <Input value={n.lastName} onChange={(e) => set("lastName", e.target.value)} />
            </Field>
            <Field label="Email" required>
              <Input type="email" value={n.email} onChange={(e) => set("email", e.target.value)} />
            </Field>
            <Field label="Phone" required>
              <Input type="tel" value={n.phone} onChange={(e) => set("phone", e.target.value)} placeholder="024 000 0000" />
            </Field>
            <Field label="Gender">
              <AppSelect value={n.gender} onChange={(g) => set("gender", g)} options={[{ value: "F", label: "Female" }, { value: "M", label: "Male" }]} />
            </Field>
            <Field label="Date of birth">
              <Input type="date" value={n.dateOfBirth} onChange={(e) => set("dateOfBirth", e.target.value)} />
            </Field>
            <Field label="Current school level" required>
              <AppSelect
                value={n.currentSchoolType ?? ""}
                onChange={(v) => (setN((x) => ({ ...x, currentSchoolType: v as SchoolType, currentSchoolId: undefined, currentSchool: "" })), setErr(null))}
                options={STUDENT_SCHOOL_LEVELS.map((t) => ({ value: t, label: CATEGORY_LABEL[t] }))}
                placeholder="Basic, JHS or SHS"
              />
            </Field>
            <Field label="Current school" hint="Optional">
              <SchoolPicker level={n.currentSchoolType} value={n.currentSchoolId} onChange={(id, name) => (setN((x) => ({ ...x, currentSchoolId: id, currentSchool: name })), setErr(null))} />
            </Field>
            <div className="sm:col-span-2">
              <SchoolNotListed />
            </div>
            <Field label="Parent / guardian name" required>
              <Input value={n.guardianName} onChange={(e) => set("guardianName", e.target.value)} />
            </Field>
            <Field label="Parent / guardian phone" required>
              <Input type="tel" value={n.guardianPhone} onChange={(e) => set("guardianPhone", e.target.value)} />
            </Field>
            <Field label="Create a password" hint="At least 8 characters" required className="sm:col-span-2">
              <Input type="password" value={n.password} onChange={(e) => set("password", e.target.value)} />
            </Field>
            {err && <p className="text-sm text-destructive sm:col-span-2">{err}</p>}
            <Button
              className="bg-orange-600 text-white hover:bg-orange-500 sm:col-span-2"
              onClick={() => {
                if (!n.firstName.trim() || !n.lastName.trim()) return setErr("Enter your name");
                if (!/^\S+@\S+\.\S+$/.test(n.email)) return setErr("Enter a valid email");
                if (db.users.some((u) => u.email.toLowerCase() === n.email.trim().toLowerCase())) return setErr("An account with this email already exists — choose “I already have an account”.");
                if (!/^\+?[\d\s]{9,16}$/.test(n.phone)) return setErr("Enter a valid phone number");
                if (!n.currentSchoolType) return setErr("Select the level of your current school (Basic, JHS or SHS)");
                if (!n.guardianName.trim() || !/^\+?[\d\s]{9,16}$/.test(n.guardianPhone)) return setErr("Enter your parent/guardian's name and phone");
                if (n.password.length < 8) return setErr("Password must be at least 8 characters");
                onReady({ newStudent: { ...n, firstName: n.firstName.trim(), lastName: n.lastName.trim() } });
              }}
            >
              Continue to payment <ArrowRight />
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PathCard({ selected, onSelect, tone, icon: Icon, title, text }: { selected: boolean; onSelect: () => void; tone: "orange" | "sky"; icon: React.ElementType; title: string; text: string }) {
  const t =
    tone === "orange"
      ? { ring: "border-orange-600 bg-orange-500/5 ring-2 ring-orange-500/30", hover: "hover:border-orange-400", chip: "bg-orange-600 text-white", icon: "bg-orange-500/15 text-orange-600", check: "text-orange-600" }
      : { ring: "border-sky-600 bg-sky-500/5 ring-2 ring-sky-500/30", hover: "hover:border-sky-400", chip: "bg-sky-600 text-white", icon: "bg-sky-500/15 text-sky-600", check: "text-sky-600" };
  return (
    <button type="button" role="radio" aria-checked={selected} onClick={onSelect} className={cn("relative flex items-start gap-3 rounded-xl border-2 p-4 pr-10 text-left transition-colors", t.hover, selected && t.ring)}>
      <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-full", selected ? t.chip : t.icon)}>
        <Icon className="size-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-base font-semibold">{title}</span>
        <span className="mt-0.5 block text-sm text-muted-foreground">{text}</span>
      </span>
      {selected && <CheckCircle2 className={cn("absolute top-3 right-3 size-5", t.check)} />}
    </button>
  );
}

function PaymentStep({ reg, onPaid }: { reg: VacationRegistration; onPaid: (r: VacationRegistration) => void }) {
  const [method, setMethod] = useState<PaymentMethod>("momo_mtn");
  const [phone, setPhone] = useState("");
  const [card, setCard] = useState({ number: "", expiry: "", cvc: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const momo = method.startsWith("momo");

  const pay = () => {
    if (momo && !/^0\d{9}$/.test(phone.replace(/\s/g, ""))) return setErr("Enter your 10-digit Mobile Money number, e.g. 0241234567");
    if (!momo && (card.number.replace(/\s/g, "").length < 15 || !/^\d{2}\/\d{2}$/.test(card.expiry) || card.cvc.length < 3)) return setErr("Check your card details");
    setErr(null);
    setBusy(true);
    // Simulated payment provider: MoMo waits for approval on the phone.
    setTimeout(() => {
      const paid = confirmPayment(reg.id, { method, phone: momo ? phone : undefined, last4: momo ? undefined : card.number.replace(/\s/g, "").slice(-4) });
      setBusy(false);
      if (paid) onPaid(paid);
    }, momo ? 2600 : 1600);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pay {fmtGhs(reg.amount)}</CardTitle>
        <CardDescription>Your registration is saved. You&apos;re enrolled as soon as payment is confirmed.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-2">
          {(["momo_mtn", "momo_telecel", "momo_airteltigo", "card"] as PaymentMethod[]).map((m) => (
            <button key={m} onClick={() => setMethod(m)} className={cn("flex items-center gap-3 rounded-lg border p-3 text-left text-sm", method === m && "border-orange-600 bg-orange-500/5 ring-2 ring-orange-500/30")}>
              {m === "card" ? <CreditCard className="size-5" /> : <Smartphone className={cn("size-5", m === "momo_mtn" ? "text-yellow-500" : m === "momo_telecel" ? "text-red-500" : "text-blue-500")} />}
              {PAYMENT_LABEL[m]}
            </button>
          ))}
        </div>
        {momo ? (
          <Field label="Mobile Money number" htmlFor="pay-phone">
            <Input id="pay-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="024 123 4567" />
          </Field>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_100px_80px]">
            <Field label="Card number">
              <Input inputMode="numeric" value={card.number} onChange={(e) => setCard({ ...card, number: e.target.value })} placeholder="4111 1111 1111 1111" />
            </Field>
            <Field label="Expiry">
              <Input value={card.expiry} onChange={(e) => setCard({ ...card, expiry: e.target.value })} placeholder="MM/YY" />
            </Field>
            <Field label="CVC">
              <Input inputMode="numeric" value={card.cvc} onChange={(e) => setCard({ ...card, cvc: e.target.value })} placeholder="123" />
            </Field>
          </div>
        )}
        {err && <p className="text-sm text-destructive">{err}</p>}
        {busy && momo && (
          <Alert>
            <Loader2 className="animate-spin" />
            <AlertDescription>A payment prompt was sent to {phone}. Approve it with your Mobile Money PIN… (simulated)</AlertDescription>
          </Alert>
        )}
        <Button size="lg" className="h-11 w-full bg-orange-600 text-base text-white hover:bg-orange-500" disabled={busy} onClick={pay}>
          {busy ? <Loader2 className="animate-spin" /> : null} Pay {fmtGhs(reg.amount)}
        </Button>
        <p className="text-center text-xs text-muted-foreground">Prototype: no real payment is taken.</p>
      </CardContent>
    </Card>
  );
}

function Receipt({ reg, onGo }: { reg: VacationRegistration; onGo: () => void }) {
  const db = useStore();
  const user = db.users.find((u) => u.id === reg.userId);
  const cls = db.classes.find((c) => c.id === reg.classId);
  const bundle = db.vacationBundles.find((b) => b.id === reg.bundleId);
  return (
    <Card className="print:shadow-none">
      <CardContent className="space-y-5 py-4">
        <div className="text-center">
          <CheckCircle2 className="mx-auto size-12 text-emerald-600" />
          <h2 className="mt-2 text-2xl font-bold">You&apos;re registered!</h2>
          <p className="text-muted-foreground">Payment received — welcome to Vacation Classes, {user?.name.split(" ")[0]}.</p>
        </div>
        <dl className="grid gap-2 rounded-lg border p-4 text-sm sm:grid-cols-2">
          <Row label="Receipt no." value={reg.payment?.reference ?? "—"} />
          <Row label="Amount paid" value={fmtGhs(reg.amount)} />
          <Row label="Paid with" value={reg.payment ? PAYMENT_LABEL[reg.payment.method] : "—"} />
          <Row label="Class" value={cls?.name ?? "—"} />
          {bundle && <Row label="Bundle" value={bundle.name} />}
          <Row label="Subjects" value={reg.subjectIds.map((id) => db.subjects.find((x) => x.id === id)?.name).join(", ")} />
        </dl>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer /> Print receipt
          </Button>
          <Button className="bg-orange-600 text-white hover:bg-orange-500" onClick={onGo}>
            Go to Vacation Classes <ArrowRight />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

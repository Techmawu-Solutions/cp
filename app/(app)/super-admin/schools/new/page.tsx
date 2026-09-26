"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, ChevronLeft, ChevronRight, Rocket } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/common/page-header";
import { AppSelect } from "@/components/common/app-select";
import { Field } from "@/components/forms/field";
import { RequirePermission } from "@/components/layout/app-shell";
import { CATEGORY_LABEL, OWNERSHIP_LABEL, SCHOOL_CATEGORIES, SCHOOL_OWNERSHIPS } from "@/lib/school-meta";
import { useStore } from "@/lib/store";
import { onboardSchool, sessionNames } from "@/lib/actions";
import { REGIONS, districtById, districtsOf, regionById } from "@/lib/data/geography";
import { fmtDateLong } from "@/lib/helpers";
import { cn } from "@/lib/utils";

const STEPS = ["School", "Codes", "Location", "Administrator", "Academic year", "Sessions", "Activate"] as const;

const schema = z
  .object({
    name: z.string().trim().min(3, "Enter the school's full name"),
    shortName: z.string().trim().min(2, "2–6 characters").max(6, "2–6 characters"),
    type: z.enum(SCHOOL_CATEGORIES),
    ownership: z.enum(SCHOOL_OWNERSHIPS, "Select public or private"),
    waecCode: z.string().trim().regex(/^\d{7}$/, "WAEC codes are 7 digits"),
    emisCode: z.string().trim().regex(/^\d{6,10}$/, "GES EMIS codes are 6–10 digits"),
    regionId: z.string().min(1, "Select a region"),
    districtId: z.string().min(1, "Select a district"),
    address: z.string().trim().min(3, "Enter the address"),
    phone: z.string().trim().regex(/^\+?[\d\s]{9,16}$/, "Enter a valid phone number"),
    email: z.string().trim().email("Enter a valid email"),
    website: z.union([z.literal(""), z.string().url("Enter a full URL")]),
    adminName: z.string().trim().min(3, "Enter the administrator's full name"),
    adminEmail: z.string().trim().email("Enter a valid email"),
    adminPhone: z.string().trim().optional(),
    yearName: z.string().regex(/^\d{4}\/\d{4}$/, "Use the format 2026/2027"),
    yearStart: z.string().min(1, "Pick a start date"),
    yearEnd: z.string().min(1, "Pick an end date"),
    structure: z.enum(["semester", "term"]),
    sessions: z.array(z.object({ name: z.string().min(1), startDate: z.string().min(1, "Required"), endDate: z.string().min(1, "Required") })).min(1),
    activeIndex: z.number(),
    activate: z.boolean(),
  })
  .refine((v) => v.yearEnd > v.yearStart, { message: "End date must be after the start date", path: ["yearEnd"] })
  .refine((v) => Number(v.yearName.slice(5)) === Number(v.yearName.slice(0, 4)) + 1, { message: "The second year must follow the first", path: ["yearName"] })
  .superRefine((v, ctx) => {
    v.sessions.forEach((s, i) => {
      if (s.endDate <= s.startDate) ctx.addIssue({ code: "custom", message: "Ends before it starts", path: ["sessions", i, "endDate"] });
      if (s.startDate < v.yearStart || s.endDate > v.yearEnd) ctx.addIssue({ code: "custom", message: "Must fall within the academic year", path: ["sessions", i, "startDate"] });
      if (i > 0 && s.startDate <= v.sessions[i - 1]!.endDate) ctx.addIssue({ code: "custom", message: "Overlaps the previous session", path: ["sessions", i, "startDate"] });
    });
  });

type Values = z.infer<typeof schema>;

const STEP_FIELDS: (keyof Values)[][] = [
  ["name", "shortName", "type", "ownership"],
  ["waecCode", "emisCode"],
  ["regionId", "districtId", "address", "phone", "email", "website"],
  ["adminName", "adminEmail", "adminPhone"],
  ["yearName", "yearStart", "yearEnd", "structure"],
  ["sessions"],
  [],
];

function suggestSessions(structure: "semester" | "term", startYear: number) {
  const y = startYear;
  return structure === "semester"
    ? [
        { name: "Semester 1", startDate: `${y}-09-01`, endDate: `${y}-12-18` },
        { name: "Semester 2", startDate: `${y + 1}-01-11`, endDate: `${y + 1}-07-23` },
      ]
    : [
        { name: "Term 1", startDate: `${y}-09-08`, endDate: `${y}-12-11` },
        { name: "Term 2", startDate: `${y + 1}-01-11`, endDate: `${y + 1}-04-09` },
        { name: "Term 3", startDate: `${y + 1}-04-26`, endDate: `${y + 1}-07-30` },
      ];
}

export default function NewSchoolPage() {
  return (
    <RequirePermission perm="schools.create">
      <Wizard />
    </RequirePermission>
  );
}

function Wizard() {
  const router = useRouter();
  const schools = useStore((s) => s.schools);
  const users = useStore((s) => s.users);
  const [step, setStep] = useState(0);
  const y = new Date().getMonth() >= 6 ? new Date().getFullYear() : new Date().getFullYear() - 1;

  const taken = useMemo(() => ({ waec: new Set(schools.map((s) => s.waecCode)), emis: new Set(schools.map((s) => s.emisCode)), emails: new Set(users.map((u) => u.email.toLowerCase())) }), [schools, users]);
  const form = useForm<Values>({
    resolver: zodResolver(
      schema
        .refine((v) => !taken.waec.has(v.waecCode), { message: "Another school already uses this WAEC code", path: ["waecCode"] })
        .refine((v) => !taken.emis.has(v.emisCode), { message: "Another school already uses this GES EMIS code", path: ["emisCode"] })
        .refine((v) => !taken.emails.has(v.adminEmail.toLowerCase()), { message: "A user with this email already exists", path: ["adminEmail"] }),
    ),
    defaultValues: {
      name: "",
      shortName: "",
      type: "SHS",
      waecCode: "",
      emisCode: "",
      regionId: "",
      districtId: "",
      address: "",
      phone: "",
      email: "",
      website: "",
      adminName: "",
      adminEmail: "",
      adminPhone: "",
      yearName: `${y}/${y + 1}`,
      yearStart: `${y}-09-01`,
      yearEnd: `${y + 1}-07-31`,
      structure: "semester",
      sessions: suggestSessions("semester", y),
      activeIndex: 0,
      activate: true,
    },
    mode: "onTouched",
  });
  const { fields, replace } = useFieldArray({ control: form.control, name: "sessions" });
  const e = form.formState.errors;
  const v = form.watch();

  const next = async () => {
    const ok = await form.trigger(STEP_FIELDS[step] as (keyof Values)[]);
    if (!ok) return;
    // Cross-field checks (uniqueness, year ranges) live on the root schema.
    if (step === 1 && (taken.waec.has(v.waecCode) || taken.emis.has(v.emisCode))) {
      if (taken.waec.has(v.waecCode)) form.setError("waecCode", { message: "Another school already uses this WAEC code" });
      if (taken.emis.has(v.emisCode)) form.setError("emisCode", { message: "Another school already uses this GES EMIS code" });
      return;
    }
    if (step === 3 && taken.emails.has(v.adminEmail.toLowerCase())) return form.setError("adminEmail", { message: "A user with this email already exists" });
    if (step === 4) {
      if (v.yearEnd <= v.yearStart) return form.setError("yearEnd", { message: "End date must be after the start date" });
      const first = Number(v.yearName.slice(0, 4));
      if (Number(v.yearName.slice(5)) !== first + 1) return form.setError("yearName", { message: "The second year must follow the first" });
      const names = sessionNames(v.structure);
      if (fields.length !== names.length || fields[0]?.name !== names[0] || !v.sessions[0]?.startDate.startsWith(String(first))) replace(suggestSessions(v.structure, first));
    }
    setStep((s) => s + 1);
  };

  const submit = form.handleSubmit(
    (vals) => {
      const school = onboardSchool({
        school: { name: vals.name, shortName: vals.shortName.toUpperCase(), type: vals.type, ownership: vals.ownership, waecCode: vals.waecCode, emisCode: vals.emisCode, regionId: vals.regionId, districtId: vals.districtId, address: vals.address, phone: vals.phone, email: vals.email, website: vals.website || undefined },
        admin: { name: vals.adminName, email: vals.adminEmail, phone: vals.adminPhone },
        year: { name: vals.yearName, startDate: vals.yearStart, endDate: vals.yearEnd, structure: vals.structure },
        sessions: vals.sessions,
        activeIndex: vals.activeIndex,
        activate: vals.activate,
      });
      toast.success(`${school.name} created`, { description: vals.activate ? "The school is active and its administrator has been invited." : "The school is pending activation." });
      router.push(`/super-admin/schools/${school.id}`);
    },
    (errs) => {
      const firstStep = STEP_FIELDS.findIndex((f) => f.some((k) => k in errs));
      if (firstStep >= 0) setStep(firstStep);
      toast.error("Some details need attention before the school can be created.");
    },
  );

  return (
    <>
      <PageHeader title="Add School" description="Onboard a new school as a tenant. Its data will be isolated from every other school." breadcrumbs={[{ label: "Schools", href: "/super-admin/schools" }, { label: "Add School" }]} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
        <ol className="flex gap-2 overflow-x-auto lg:flex-col lg:gap-1">
          {STEPS.map((label, i) => (
            <li key={label}>
              <button
                type="button"
                disabled={i > step}
                onClick={() => setStep(i)}
                className={cn("flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm whitespace-nowrap", i === step ? "bg-accent font-medium text-accent-foreground" : i < step ? "text-foreground hover:bg-muted" : "text-muted-foreground")}
              >
                <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-full border text-xs", i < step && "border-primary bg-primary text-primary-foreground", i === step && "border-primary text-primary")}>{i < step ? <Check className="size-3.5" /> : i + 1}</span>
                {label}
              </button>
            </li>
          ))}
        </ol>

        <Card>
          <CardContent className="py-2">
            <form onSubmit={(ev) => ev.preventDefault()} noValidate className="space-y-5">
              {step === 0 && (
                <StepIntro title="Create school" text="Basic identity of the school as it appears across the platform.">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="School name" htmlFor="name" error={e.name?.message} required className="sm:col-span-2">
                      <Input id="name" placeholder="e.g. Keta Senior High Technical School" {...form.register("name")} />
                    </Field>
                    <Field label="Short name" htmlFor="shortName" error={e.shortName?.message} required hint="Shown across the platform, e.g. KSHTS">
                      <Input id="shortName" {...form.register("shortName")} />
                    </Field>
                    <Field label="Category" required hint="The level the school teaches">
                      <Controller control={form.control} name="type" render={({ field }) => <AppSelect value={field.value} onChange={field.onChange} options={SCHOOL_CATEGORIES.map((t) => ({ value: t, label: CATEGORY_LABEL[t] }))} />} />
                    </Field>
                    <Field label="School type" error={e.ownership?.message} required>
                      <Controller control={form.control} name="ownership" render={({ field }) => <AppSelect value={field.value ?? ""} onChange={field.onChange} options={SCHOOL_OWNERSHIPS.map((t) => ({ value: t, label: OWNERSHIP_LABEL[t] }))} placeholder="Public or private" />} />
                    </Field>
                  </div>
                </StepIntro>
              )}
              {step === 1 && (
                <StepIntro title="WAEC / GES EMIS codes" text="Official identifiers. Each must be unique on the platform.">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="WAEC code" htmlFor="waec" error={e.waecCode?.message} required hint="7 digits, as issued by WAEC. Starts every Student ID, e.g. 0030501-0001-26">
                      <Input id="waec" inputMode="numeric" maxLength={7} {...form.register("waecCode")} />
                    </Field>
                    <Field label="GES EMIS code" htmlFor="emis" error={e.emisCode?.message} required hint="Education Management Information System number issued by GES">
                      <Input id="emis" inputMode="numeric" maxLength={10} {...form.register("emisCode")} />
                    </Field>
                  </div>
                </StepIntro>
              )}
              {step === 2 && (
                <StepIntro title="Region, district & contact" text="Used for district, regional and national analytics.">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Region" error={e.regionId?.message} required>
                      <Controller control={form.control} name="regionId" render={({ field }) => <AppSelect value={field.value} onChange={(val) => (field.onChange(val), form.setValue("districtId", ""))} options={REGIONS.map((r) => ({ value: r.id, label: r.name }))} placeholder="Select region" />} />
                    </Field>
                    <Field label="District" error={e.districtId?.message} required>
                      <Controller control={form.control} name="districtId" render={({ field }) => <AppSelect value={field.value} onChange={field.onChange} options={districtsOf(v.regionId).map((d) => ({ value: d.id, label: d.name }))} placeholder={v.regionId ? "Select district" : "Select a region first"} disabled={!v.regionId} />} />
                    </Field>
                    <Field label="Address" htmlFor="address" error={e.address?.message} required className="sm:col-span-2">
                      <Input id="address" {...form.register("address")} />
                    </Field>
                    <Field label="Phone" htmlFor="phone" error={e.phone?.message} required>
                      <Input id="phone" type="tel" placeholder="+233 30 000 0000" {...form.register("phone")} />
                    </Field>
                    <Field label="Email" htmlFor="email" error={e.email?.message} required>
                      <Input id="email" type="email" {...form.register("email")} />
                    </Field>
                    <Field label="Website" htmlFor="website" error={e.website?.message} className="sm:col-span-2">
                      <Input id="website" placeholder="https://" {...form.register("website")} />
                    </Field>
                  </div>
                </StepIntro>
              )}
              {step === 3 && (
                <StepIntro title="School administrator" text="This person manages the school. They'll receive an invitation to set their password.">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Full name" htmlFor="adminName" error={e.adminName?.message} required className="sm:col-span-2">
                      <Input id="adminName" {...form.register("adminName")} />
                    </Field>
                    <Field label="Email" htmlFor="adminEmail" error={e.adminEmail?.message} required>
                      <Input id="adminEmail" type="email" {...form.register("adminEmail")} />
                    </Field>
                    <Field label="Phone" htmlFor="adminPhone">
                      <Input id="adminPhone" type="tel" {...form.register("adminPhone")} />
                    </Field>
                  </div>
                </StepIntro>
              )}
              {step === 4 && (
                <StepIntro title="Academic year" text="The school's first academic year. More can be added later from the school workspace.">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Field label="Academic year" htmlFor="yearName" error={e.yearName?.message} required>
                      <Input id="yearName" placeholder="2026/2027" {...form.register("yearName")} />
                    </Field>
                    <Field label="Start date" htmlFor="ys" error={e.yearStart?.message} required>
                      <Input id="ys" type="date" {...form.register("yearStart")} />
                    </Field>
                    <Field label="End date" htmlFor="ye" error={e.yearEnd?.message} required>
                      <Input id="ye" type="date" {...form.register("yearEnd")} />
                    </Field>
                  </div>
                  <div className="mt-5 space-y-2">
                    <Label>Academic structure</Label>
                    <Controller
                      control={form.control}
                      name="structure"
                      render={({ field }) => (
                        <RadioGroup value={field.value} onValueChange={(val) => field.onChange(val)} className="grid gap-2 sm:grid-cols-2">
                          {[
                            { value: "semester", title: "Semesters", text: "2 semesters per year" },
                            { value: "term", title: "Terms", text: "3 terms per year" },
                          ].map((o) => (
                            <label key={o.value} className={cn("flex cursor-pointer items-start gap-3 rounded-lg border p-3", field.value === o.value && "border-primary bg-accent/50")}>
                              <RadioGroupItem value={o.value} className="mt-0.5" />
                              <span>
                                <span className="block text-sm font-medium">{o.title}</span>
                                <span className="text-xs text-muted-foreground">{o.text}</span>
                              </span>
                            </label>
                          ))}
                        </RadioGroup>
                      )}
                    />
                  </div>
                </StepIntro>
              )}
              {step === 5 && (
                <StepIntro title="Academic sessions" text={`${v.yearName} ${v.structure === "semester" ? "semesters" : "terms"}. Choose which session is currently active.`}>
                  <div className="space-y-3">
                    {fields.map((f, i) => (
                      <div key={f.id} className={cn("grid items-start gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_1fr_1fr_auto]", v.activeIndex === i && "border-primary")}>
                        <Field label="Session">
                          <Input {...form.register(`sessions.${i}.name`)} />
                        </Field>
                        <Field label="Start date" error={e.sessions?.[i]?.startDate?.message}>
                          <Input type="date" {...form.register(`sessions.${i}.startDate`)} />
                        </Field>
                        <Field label="End date" error={e.sessions?.[i]?.endDate?.message}>
                          <Input type="date" {...form.register(`sessions.${i}.endDate`)} />
                        </Field>
                        <div className="flex h-full items-end pb-1.5">
                          <Button type="button" size="sm" variant={v.activeIndex === i ? "default" : "outline"} onClick={() => form.setValue("activeIndex", i)}>
                            {v.activeIndex === i ? "● Active" : "Set active"}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </StepIntro>
              )}
              {step === 6 && (
                <StepIntro title="Review & activate" text="Check the details below. An active school can sign in immediately; a pending school waits for activation.">
                  <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                    <Review label="School" value={`${v.name} (${v.shortName.toUpperCase()}) · ${CATEGORY_LABEL[v.type]} · ${v.ownership ? OWNERSHIP_LABEL[v.ownership] : ""}`} />
                    <Review label="WAEC / GES EMIS" value={`${v.waecCode} / ${v.emisCode}`} />
                    <Review label="Location" value={`${districtById(v.districtId)?.name}, ${regionById(v.regionId)?.name}`} />
                    <Review label="Contact" value={`${v.phone} · ${v.email}`} />
                    <Review label="Administrator" value={`${v.adminName} · ${v.adminEmail}`} />
                    <Review label="Academic year" value={`${v.yearName} (${fmtDateLong(v.yearStart)} – ${fmtDateLong(v.yearEnd)})`} />
                    <Review label="Sessions" value={v.sessions.map((s, i) => `${s.name}${i === v.activeIndex ? " (active)" : ""}`).join(", ")} />
                  </dl>
                  <label className="mt-6 flex items-center justify-between gap-4 rounded-lg border p-4">
                    <span>
                      <span className="block text-sm font-medium">Activate school now</span>
                      <span className="text-xs text-muted-foreground">Turn off to create the school as Pending.</span>
                    </span>
                    <Controller control={form.control} name="activate" render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />} />
                  </label>
                </StepIntro>
              )}

              <div className="flex justify-between border-t pt-4">
                <Button type="button" variant="outline" onClick={() => (step === 0 ? router.push("/super-admin/schools") : setStep(step - 1))}>
                  <ChevronLeft /> {step === 0 ? "Cancel" : "Back"}
                </Button>
                {step < STEPS.length - 1 ? (
                  <Button type="button" onClick={next}>
                    Continue <ChevronRight />
                  </Button>
                ) : (
                  <Button type="button" onClick={submit}>
                    <Rocket /> {v.activate ? "Create & activate school" : "Create school"}
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function StepIntro({ title, text, children }: { title: string; text: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mb-5 text-sm text-muted-foreground">{text}</p>
      {children}
    </div>
  );
}

function Review({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

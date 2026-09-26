"use client";

import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { AppSelect } from "@/components/common/app-select";
import { Field } from "@/components/forms/field";
import type { Programme, SchoolClass, SessionType, Subject, Teacher } from "@/lib/types";

const Actions = ({ onCancel, label }: { onCancel: () => void; label: string }) => (
  <div className="flex justify-end gap-2 sm:col-span-2">
    <Button type="button" variant="outline" onClick={onCancel}>
      Cancel
    </Button>
    <Button type="submit">{label}</Button>
  </div>
);

// ------------------------------------------------------------------ AcademicSessionForm (spec §6.1)

const yearSchema = z
  .object({
    name: z.string().regex(/^\d{4}\/\d{4}$/, "Use the format 2027/2028"),
    startDate: z.string().min(1, "Required"),
    endDate: z.string().min(1, "Required"),
    type: z.enum(["semester", "term", "vacation"]),
    sessions: z.array(z.object({ name: z.string().min(1, "Required"), startDate: z.string().min(1, "Required"), endDate: z.string().min(1, "Required") })).min(1),
  })
  .refine((v) => Number(v.name.slice(5)) === Number(v.name.slice(0, 4)) + 1, { message: "The second year must follow the first", path: ["name"] })
  .refine((v) => v.endDate > v.startDate, { message: "Must be after the start date", path: ["endDate"] })
  .superRefine((v, ctx) =>
    v.sessions.forEach((s, i) => {
      if (s.endDate <= s.startDate) ctx.addIssue({ code: "custom", message: "Ends before it starts", path: ["sessions", i, "endDate"] });
      else if (s.startDate < v.startDate || s.endDate > v.endDate) ctx.addIssue({ code: "custom", message: "Outside the academic year", path: ["sessions", i, "startDate"] });
      else if (i > 0 && s.startDate <= v.sessions[i - 1]!.endDate) ctx.addIssue({ code: "custom", message: "Overlaps previous", path: ["sessions", i, "startDate"] });
    }),
  );
export type YearValues = z.infer<typeof yearSchema>;

export function suggestYear(startYear: number, type: SessionType): YearValues {
  const y = startYear;
  return {
    name: `${y}/${y + 1}`,
    startDate: `${y}-09-01`,
    endDate: `${y + 1}-07-31`,
    type,
    sessions:
      type === "vacation"
        ? [
            { name: "Christmas Vacation Classes", startDate: `${y}-12-14`, endDate: `${y + 1}-01-08` },
            { name: "Easter Vacation Classes", startDate: `${y + 1}-04-06`, endDate: `${y + 1}-04-24` },
            { name: "Long Vacation Classes", startDate: `${y + 1}-07-27`, endDate: `${y + 1}-08-28` },
          ]
        : type === "semester"
        ? [
            { name: "Semester 1", startDate: `${y}-09-01`, endDate: `${y}-12-18` },
            { name: "Semester 2", startDate: `${y + 1}-01-11`, endDate: `${y + 1}-07-23` },
          ]
        : [
            { name: "Term 1", startDate: `${y}-09-08`, endDate: `${y}-12-11` },
            { name: "Term 2", startDate: `${y + 1}-01-11`, endDate: `${y + 1}-04-09` },
            { name: "Term 3", startDate: `${y + 1}-04-26`, endDate: `${y + 1}-07-30` },
          ],
  };
}

/** Creates an academic year together with its semesters/terms. */
export function AcademicSessionForm({ initial, takenYears, onSubmit, onCancel }: { initial: YearValues; takenYears: string[]; onSubmit: (v: YearValues) => void; onCancel: () => void }) {
  const form = useForm<YearValues>({
    resolver: zodResolver(yearSchema.refine((v) => !takenYears.includes(v.name), { message: "This academic year already exists", path: ["name"] })),
    defaultValues: initial,
  });
  const { fields, replace, append, remove } = useFieldArray({ control: form.control, name: "sessions" });
  const e = form.formState.errors;
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2" noValidate>
      <Field label="Academic year" htmlFor="ay" error={e.name?.message} required>
        <Input id="ay" {...form.register("name")} />
      </Field>
      <Field label="Session type" hint="Semesters or terms — flexible for other structures later">
        <Controller
          control={form.control}
          name="type"
          render={({ field }) => (
            <AppSelect
              value={field.value}
              onChange={(v) => {
                field.onChange(v);
                replace(suggestYear(Number(form.getValues("name").slice(0, 4)) || new Date().getFullYear(), v as SessionType).sessions);
              }}
              options={[
                { value: "semester", label: "Semester" },
                { value: "term", label: "Term" },
                { value: "vacation", label: "Vacation period" },
              ]}
            />
          )}
        />
      </Field>
      <Field label="Start date" htmlFor="ays" error={e.startDate?.message} required>
        <Input id="ays" type="date" {...form.register("startDate")} />
      </Field>
      <Field label="End date" htmlFor="aye" error={e.endDate?.message} required>
        <Input id="aye" type="date" {...form.register("endDate")} />
      </Field>
      <div className="space-y-2 sm:col-span-2">
        <p className="text-sm font-medium">{form.watch("type") === "semester" ? "Semesters" : "Terms"}</p>
        {fields.map((f, i) => (
          <div key={f.id} className="grid grid-cols-1 items-start gap-2 rounded-lg border p-2.5 sm:grid-cols-[1fr_1fr_1fr_auto]">
            <Input aria-label="Name" {...form.register(`sessions.${i}.name`)} />
            <div>
              <Input type="date" aria-label="Start date" {...form.register(`sessions.${i}.startDate`)} />
              {e.sessions?.[i]?.startDate && <p className="mt-1 text-xs text-destructive">{e.sessions[i]!.startDate!.message}</p>}
            </div>
            <div>
              <Input type="date" aria-label="End date" {...form.register(`sessions.${i}.endDate`)} />
              {e.sessions?.[i]?.endDate && <p className="mt-1 text-xs text-destructive">{e.sessions[i]!.endDate!.message}</p>}
            </div>
            <Button type="button" variant="ghost" size="sm" disabled={fields.length === 1} onClick={() => remove(i)}>
              Remove
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => append({ name: `${form.getValues("type") === "semester" ? "Semester" : "Term"} ${fields.length + 1}`, startDate: "", endDate: "" })}>
          Add {form.watch("type")}
        </Button>
      </div>
      <Actions onCancel={onCancel} label="Create academic year" />
    </form>
  );
}

// ------------------------------------------------------------------ ProgrammeForm (spec §17)

const programmeSchema = z.object({
  name: z.string().trim().min(2, "Enter a name"),
  code: z.string().trim().min(2, "2–8 characters").max(8, "2–8 characters"),
  description: z.string().trim(),
  status: z.enum(["active", "inactive"]),
});
export type ProgrammeValues = z.infer<typeof programmeSchema>;

export function ProgrammeForm({ initial, takenCodes, onSubmit, onCancel, lockIdentity }: { initial?: Partial<Programme>; takenCodes: string[]; onSubmit: (v: ProgrammeValues) => void; onCancel: () => void; lockIdentity?: boolean }) {
  const form = useForm<ProgrammeValues>({
    resolver: zodResolver(programmeSchema.refine((v) => !takenCodes.includes(v.code.toUpperCase()), { message: "Code already used this session", path: ["code"] })),
    defaultValues: { name: initial?.name ?? "", code: initial?.code ?? "", description: initial?.description ?? "", status: initial?.status ?? "active" },
  });
  const e = form.formState.errors;
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2" noValidate>
      <Field label="Programme name" htmlFor="pn" error={e.name?.message} required>
        <Input id="pn" placeholder="e.g. General Science" readOnly={lockIdentity} {...form.register("name")} />
      </Field>
      <Field label="Programme code" htmlFor="pc" error={e.code?.message} required>
        <Input id="pc" placeholder="GSCI" readOnly={lockIdentity} {...form.register("code")} />
      </Field>
      <Field label="Description" htmlFor="pd" className="sm:col-span-2">
        <Textarea id="pd" rows={2} {...form.register("description")} />
      </Field>
      <Field label="Status">
        <Controller control={form.control} name="status" render={({ field }) => <AppSelect value={field.value} onChange={field.onChange} options={[{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]} />} />
      </Field>
      <Actions onCancel={onCancel} label="Save programme" />
    </form>
  );
}

// ------------------------------------------------------------------ ClassForm (spec §18)

const classSchema = z.object({
  name: z.string().trim().min(2, "Enter a class name"),
  programmeId: z.string().min(1, "Select a programme"),
  level: z.string().min(1, "Select a level"),
  classTeacherId: z.string(),
  capacity: z.coerce.number().int().min(1, "At least 1").max(200, "At most 200"),
  status: z.enum(["active", "inactive"]),
});
export type ClassValues = z.infer<typeof classSchema>;
export const LEVELS = ["SHS 1", "SHS 2", "SHS 3", "JHS 1", "JHS 2", "JHS 3", "Basic 1", "Basic 2", "Basic 3", "Basic 4", "Basic 5", "Basic 6", "Level 100", "Level 200", "Level 300", "Level 400"];

export function ClassForm({ initial, programmes, teachers, takenNames, onSubmit, onCancel }: { initial?: Partial<SchoolClass>; programmes: Programme[]; teachers: Teacher[]; takenNames: string[]; onSubmit: (v: ClassValues) => void; onCancel: () => void }) {
  const form = useForm<z.input<typeof classSchema>, unknown, ClassValues>({
    resolver: zodResolver(classSchema.refine((v) => !takenNames.includes(v.name.trim().toLowerCase()), { message: "A class with this name already exists this session", path: ["name"] })),
    defaultValues: { name: initial?.name ?? "", programmeId: initial?.programmeId ?? "", level: initial?.level ?? "SHS 1", classTeacherId: initial?.classTeacherId ?? "", capacity: initial?.capacity ?? 45, status: initial?.status ?? "active" },
  });
  const e = form.formState.errors;
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2" noValidate>
      <Field label="Class name" htmlFor="cn" error={e.name?.message} required>
        <Input id="cn" placeholder="e.g. SHS 1A" {...form.register("name")} />
      </Field>
      <Field label="Level" error={e.level?.message} required>
        <Controller control={form.control} name="level" render={({ field }) => <AppSelect value={field.value} onChange={field.onChange} options={LEVELS.map((l) => ({ value: l, label: l }))} />} />
      </Field>
      <Field label="Programme" error={e.programmeId?.message} required>
        <Controller control={form.control} name="programmeId" render={({ field }) => <AppSelect value={field.value} onChange={field.onChange} options={programmes.map((p) => ({ value: p.id, label: p.name }))} placeholder="Select programme" />} />
      </Field>
      <Field label="Class (form) teacher">
        <Controller control={form.control} name="classTeacherId" render={({ field }) => <AppSelect value={field.value || "__none"} onChange={(v) => field.onChange(v === "__none" ? "" : v)} options={[{ value: "__none", label: "Not assigned" }, ...teachers.map((t) => ({ value: t.id, label: `${t.title} ${t.firstName} ${t.lastName}` }))]} />} />
      </Field>
      <Field label="Capacity" htmlFor="cc" error={e.capacity?.message} required>
        <Input id="cc" type="number" min={1} {...form.register("capacity")} />
      </Field>
      <Field label="Status">
        <Controller control={form.control} name="status" render={({ field }) => <AppSelect value={field.value} onChange={field.onChange} options={[{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]} />} />
      </Field>
      <Actions onCancel={onCancel} label="Save class" />
    </form>
  );
}

// ------------------------------------------------------------------ SubjectForm (spec §19)

const subjectSchema = z.object({
  name: z.string().trim().min(2, "Enter a subject name"),
  code: z.string().trim().min(2, "2–8 characters").max(8, "2–8 characters"),
  description: z.string().trim(),
  programmeId: z.string(),
  color: z.string(),
});
export type SubjectValues = z.infer<typeof subjectSchema>;
const COLORS = ["#2563eb", "#16a34a", "#db2777", "#ea580c", "#7c3aed", "#0891b2", "#ca8a04", "#dc2626", "#4f46e5", "#059669"];

export function SubjectForm({ initial, programmes, takenCodes, onSubmit, onCancel, lockIdentity }: { initial?: Partial<Subject>; programmes: Programme[]; takenCodes: string[]; onSubmit: (v: SubjectValues) => void; onCancel: () => void; lockIdentity?: boolean }) {
  const form = useForm<SubjectValues>({
    resolver: zodResolver(subjectSchema.refine((v) => !takenCodes.includes(v.code.toUpperCase()), { message: "Code already used this session", path: ["code"] })),
    defaultValues: { name: initial?.name ?? "", code: initial?.code ?? "", description: initial?.description ?? "", programmeId: initial?.programmeId ?? "", color: initial?.color ?? COLORS[0]! },
  });
  const e = form.formState.errors;
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2" noValidate>
      <Field label="Subject name" htmlFor="sn" error={e.name?.message} required>
        <Input id="sn" placeholder="e.g. Physics" readOnly={lockIdentity} {...form.register("name")} />
      </Field>
      <Field label="Subject code" htmlFor="sc" error={e.code?.message} required>
        <Input id="sc" placeholder="PHY" readOnly={lockIdentity} {...form.register("code")} />
      </Field>
      <Field label="Programme" hint="Leave as core for subjects every student takes">
        <Controller control={form.control} name="programmeId" render={({ field }) => <AppSelect value={field.value || "__core"} onChange={(v) => field.onChange(v === "__core" ? "" : v)} options={[{ value: "__core", label: "Core (all programmes)" }, ...programmes.map((p) => ({ value: p.id, label: p.name }))]} />} />
      </Field>
      <Field label="Colour">
        <Controller
          control={form.control}
          name="color"
          render={({ field }) => (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {COLORS.map((c) => (
                <button key={c} type="button" onClick={() => field.onChange(c)} className={`size-6 rounded-full ring-offset-2 ring-offset-background ${field.value === c ? "ring-2 ring-foreground" : ""}`} style={{ background: c }} aria-label={`Colour ${c}`} />
              ))}
            </div>
          )}
        />
      </Field>
      <Field label="Description" htmlFor="sd" className="sm:col-span-2">
        <Textarea id="sd" rows={2} {...form.register("description")} />
      </Field>
      <Actions onCancel={onCancel} label="Save subject" />
    </form>
  );
}

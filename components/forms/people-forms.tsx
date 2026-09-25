"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AppSelect } from "@/components/common/app-select";
import { Field } from "@/components/forms/field";
import type { SchoolClass, Student, Teacher } from "@/lib/types";

const phone = z.string().trim().regex(/^\+?[\d\s]{9,16}$/, "Enter a valid phone number");

// ------------------------------------------------------------------ StudentForm (spec §57)

const studentSchema = z.object({
  studentNumber: z.string().trim().min(3, "Enter the student ID"),
  firstName: z.string().trim().min(1, "Required"),
  lastName: z.string().trim().min(1, "Required"),
  gender: z.enum(["M", "F"]),
  dateOfBirth: z.string().min(1, "Required"),
  guardianName: z.string().trim().min(2, "Required"),
  guardianPhone: phone,
  email: z.union([z.literal(""), z.string().trim().email("Enter a valid email")]),
  classId: z.string(),
});
export type StudentValues = z.infer<typeof studentSchema>;

export function StudentForm({ initial, classes, takenNumbers, onSubmit, onCancel, showClass = true, suggestedNumber }: { initial?: Partial<Student> & { classId?: string; email?: string }; classes: SchoolClass[]; takenNumbers: string[]; onSubmit: (v: StudentValues) => void; onCancel: () => void; showClass?: boolean; suggestedNumber?: string }) {
  const form = useForm<StudentValues>({
    resolver: zodResolver(studentSchema.refine((v) => !takenNumbers.includes(v.studentNumber.trim()), { message: "Another student already has this ID", path: ["studentNumber"] })),
    defaultValues: {
      studentNumber: initial?.studentNumber ?? suggestedNumber ?? "",
      firstName: initial?.firstName ?? "",
      lastName: initial?.lastName ?? "",
      gender: initial?.gender ?? "F",
      dateOfBirth: initial?.dateOfBirth ?? "",
      guardianName: initial?.guardianName ?? "",
      guardianPhone: initial?.guardianPhone ?? "",
      email: initial?.email ?? "",
      classId: initial?.classId ?? "",
    },
  });
  const e = form.formState.errors;
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2" noValidate>
      <Field label="First name" htmlFor="sf" error={e.firstName?.message} required>
        <Input id="sf" {...form.register("firstName")} />
      </Field>
      <Field label="Last name" htmlFor="sl" error={e.lastName?.message} required>
        <Input id="sl" {...form.register("lastName")} />
      </Field>
      <Field label="Student ID" htmlFor="sid" error={e.studentNumber?.message} required>
        <Input id="sid" {...form.register("studentNumber")} />
      </Field>
      <Field label="Gender" required>
        <Controller control={form.control} name="gender" render={({ field }) => <AppSelect value={field.value} onChange={field.onChange} options={[{ value: "F", label: "Female" }, { value: "M", label: "Male" }]} />} />
      </Field>
      <Field label="Date of birth" htmlFor="sdob" error={e.dateOfBirth?.message} required>
        <Input id="sdob" type="date" {...form.register("dateOfBirth")} />
      </Field>
      <Field label="Email" htmlFor="se" error={e.email?.message} hint="Optional — generated if empty">
        <Input id="se" type="email" {...form.register("email")} />
      </Field>
      <Field label="Guardian name" htmlFor="sg" error={e.guardianName?.message} required>
        <Input id="sg" {...form.register("guardianName")} />
      </Field>
      <Field label="Guardian phone" htmlFor="sgp" error={e.guardianPhone?.message} required>
        <Input id="sgp" type="tel" {...form.register("guardianPhone")} />
      </Field>
      {showClass && (
        <Field label="Class" className="sm:col-span-2" hint="Also registers the student for the class's subjects">
          <Controller control={form.control} name="classId" render={({ field }) => <AppSelect value={field.value || "__none"} onChange={(v) => field.onChange(v === "__none" ? "" : v)} options={[{ value: "__none", label: "Assign later" }, ...classes.map((c) => ({ value: c.id, label: c.name }))]} />} />
        </Field>
      )}
      <div className="flex justify-end gap-2 sm:col-span-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Save student</Button>
      </div>
    </form>
  );
}

// ------------------------------------------------------------------ TeacherForm (spec §57)

const teacherSchema = z.object({
  title: z.enum(["Mr.", "Mrs.", "Ms.", "Dr.", "Rev."]),
  firstName: z.string().trim().min(1, "Required"),
  lastName: z.string().trim().min(1, "Required"),
  gender: z.enum(["M", "F"]),
  staffNumber: z.string().trim().min(2, "Required"),
  specialization: z.string().trim().min(2, "e.g. ICT, Mathematics"),
  phone,
  email: z.string().trim().email("Enter a valid email"),
  status: z.enum(["active", "on_leave", "inactive"]),
});
export type TeacherValues = z.infer<typeof teacherSchema>;

export function TeacherForm({ initial, takenEmails, onSubmit, onCancel, suggestedNumber }: { initial?: Partial<Teacher> & { email?: string }; takenEmails: string[]; onSubmit: (v: TeacherValues) => void; onCancel: () => void; suggestedNumber?: string }) {
  const form = useForm<TeacherValues>({
    resolver: zodResolver(teacherSchema.refine((v) => !takenEmails.includes(v.email.toLowerCase()), { message: "A user with this email already exists", path: ["email"] })),
    defaultValues: {
      title: initial?.title ?? "Mr.",
      firstName: initial?.firstName ?? "",
      lastName: initial?.lastName ?? "",
      gender: initial?.gender ?? "M",
      staffNumber: initial?.staffNumber ?? suggestedNumber ?? "",
      specialization: initial?.specialization ?? "",
      phone: initial?.phone ?? "",
      email: initial?.email ?? "",
      status: initial?.status ?? "active",
    },
  });
  const e = form.formState.errors;
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-6" noValidate>
      <Field label="Title" className="sm:col-span-2">
        <Controller control={form.control} name="title" render={({ field }) => <AppSelect value={field.value} onChange={field.onChange} options={["Mr.", "Mrs.", "Ms.", "Dr.", "Rev."].map((t) => ({ value: t, label: t }))} />} />
      </Field>
      <Field label="First name" htmlFor="tf" error={e.firstName?.message} required className="sm:col-span-2">
        <Input id="tf" {...form.register("firstName")} />
      </Field>
      <Field label="Last name" htmlFor="tl" error={e.lastName?.message} required className="sm:col-span-2">
        <Input id="tl" {...form.register("lastName")} />
      </Field>
      <Field label="Gender" className="sm:col-span-2">
        <Controller control={form.control} name="gender" render={({ field }) => <AppSelect value={field.value} onChange={field.onChange} options={[{ value: "M", label: "Male" }, { value: "F", label: "Female" }]} />} />
      </Field>
      <Field label="Staff ID" htmlFor="ts" error={e.staffNumber?.message} required className="sm:col-span-2">
        <Input id="ts" {...form.register("staffNumber")} />
      </Field>
      <Field label="Status" className="sm:col-span-2">
        <Controller control={form.control} name="status" render={({ field }) => <AppSelect value={field.value} onChange={field.onChange} options={[{ value: "active", label: "Active" }, { value: "on_leave", label: "On leave" }, { value: "inactive", label: "Inactive" }]} />} />
      </Field>
      <Field label="Specialisation" htmlFor="tsp" error={e.specialization?.message} required className="sm:col-span-6">
        <Input id="tsp" placeholder="e.g. ICT, Mathematics" {...form.register("specialization")} />
      </Field>
      <Field label="Email" htmlFor="te" error={e.email?.message} required className="sm:col-span-3">
        <Input id="te" type="email" {...form.register("email")} />
      </Field>
      <Field label="Phone" htmlFor="tp" error={e.phone?.message} required className="sm:col-span-3">
        <Input id="tp" type="tel" {...form.register("phone")} />
      </Field>
      <div className="flex justify-end gap-2 sm:col-span-6">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Save teacher</Button>
      </div>
    </form>
  );
}

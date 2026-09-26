"use client";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AppSelect } from "@/components/common/app-select";
import { Field } from "@/components/forms/field";
import { REGIONS, districtsOf } from "@/lib/data/geography";
import { CATEGORY_LABEL, OWNERSHIP_LABEL, SCHOOL_CATEGORIES, SCHOOL_OWNERSHIPS } from "@/lib/school-meta";
import type { School } from "@/lib/types";

/** @deprecated use SCHOOL_CATEGORIES from lib/school-meta */
export const SCHOOL_TYPES = SCHOOL_CATEGORIES;

export const schoolSchema = z.object({
  name: z.string().trim().min(3, "Enter the school's full name"),
  shortName: z.string().trim().min(2, "2–6 characters").max(6, "2–6 characters"),
  type: z.enum(SCHOOL_CATEGORIES),
  ownership: z.enum(SCHOOL_OWNERSHIPS, "Select public or private"),
  waecCode: z.string().trim().regex(/^\d{7}$/, "WAEC codes are 7 digits"),
  emisCode: z.string().trim().regex(/^\d{6,10}$/, "GES EMIS codes are 6–10 digits"),
  regionId: z.string().min(1, "Select a region"),
  districtId: z.string().min(1, "Select a district"),
  address: z.string().trim().min(3, "Enter the postal or physical address"),
  phone: z.string().trim().regex(/^\+?[\d\s]{9,16}$/, "Enter a valid phone number"),
  email: z.string().trim().email("Enter a valid email"),
  website: z.union([z.literal(""), z.string().trim().url("Enter a full URL, e.g. https://school.edu.gh")]),
});

export type SchoolValues = z.infer<typeof schoolSchema>;

/**
 * SchoolForm (spec §57). `takenCodes` enforces platform-wide WAEC/EMIS
 * uniqueness, which the backend will also enforce.
 */
export function SchoolForm({
  initial,
  onSubmit,
  submitLabel = "Save",
  takenCodes,
  onCancel,
  validateOnMount,
}: {
  initial?: Partial<School>;
  onSubmit: (v: SchoolValues) => void;
  submitLabel?: string;
  takenCodes: { waec: Set<string>; emis: Set<string> };
  onCancel?: () => void;
  /** Highlight missing/invalid fields immediately (profile completion prompt). */
  validateOnMount?: boolean;
}) {
  const form = useForm<SchoolValues>({
    resolver: zodResolver(
      schoolSchema
        .refine((v) => !takenCodes.waec.has(v.waecCode), { message: "Another school already uses this WAEC code", path: ["waecCode"] })
        .refine((v) => !takenCodes.emis.has(v.emisCode), { message: "Another school already uses this GES EMIS code", path: ["emisCode"] }),
    ),
    defaultValues: {
      name: initial?.name ?? "",
      shortName: initial?.shortName ?? "",
      type: (initial?.type as SchoolValues["type"]) ?? "SHS",
      ownership: initial?.ownership as SchoolValues["ownership"],
      waecCode: initial?.waecCode ?? "",
      emisCode: initial?.emisCode ?? "",
      regionId: initial?.regionId ?? "",
      districtId: initial?.districtId ?? "",
      address: initial?.address ?? "",
      phone: initial?.phone ?? "",
      email: initial?.email ?? "",
      website: initial?.website ?? "",
    },
  });
  const e = form.formState.errors;
  const regionId = form.watch("regionId");
  const { trigger } = form;
  useEffect(() => {
    if (validateOnMount) trigger();
  }, [validateOnMount, trigger]);

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2" noValidate>
      <Field label="School name" htmlFor="name" error={e.name?.message} required className="sm:col-span-2">
        <Input id="name" {...form.register("name")} aria-invalid={!!e.name} />
      </Field>
      <Field label="Short name" htmlFor="shortName" error={e.shortName?.message} required>
        <Input id="shortName" {...form.register("shortName")} aria-invalid={!!e.shortName} />
      </Field>
      <Field label="Category" error={e.type?.message} required>
        <Controller control={form.control} name="type" render={({ field }) => <AppSelect value={field.value} onChange={field.onChange} options={SCHOOL_CATEGORIES.map((t) => ({ value: t, label: CATEGORY_LABEL[t] }))} />} />
      </Field>
      <Field label="School type" error={e.ownership?.message} required>
        <Controller control={form.control} name="ownership" render={({ field }) => <AppSelect value={field.value ?? ""} onChange={field.onChange} options={SCHOOL_OWNERSHIPS.map((t) => ({ value: t, label: OWNERSHIP_LABEL[t] }))} placeholder="Public or private" />} />
      </Field>
      <Field label="WAEC code" htmlFor="waec" error={e.waecCode?.message} required>
        <Input id="waec" inputMode="numeric" {...form.register("waecCode")} aria-invalid={!!e.waecCode} />
      </Field>
      <Field label="GES EMIS code" htmlFor="emis" error={e.emisCode?.message} required>
        <Input id="emis" inputMode="numeric" {...form.register("emisCode")} aria-invalid={!!e.emisCode} />
      </Field>
      <Field label="Region" error={e.regionId?.message} required>
        <Controller
          control={form.control}
          name="regionId"
          render={({ field }) => (
            <AppSelect
              value={field.value}
              onChange={(v) => {
                field.onChange(v);
                form.setValue("districtId", "");
              }}
              options={REGIONS.map((r) => ({ value: r.id, label: r.name }))}
              placeholder="Select region"
            />
          )}
        />
      </Field>
      <Field label="District" error={e.districtId?.message} required>
        <Controller
          control={form.control}
          name="districtId"
          render={({ field }) => <AppSelect value={field.value} onChange={field.onChange} options={districtsOf(regionId).map((d) => ({ value: d.id, label: d.name }))} placeholder={regionId ? "Select district" : "Select a region first"} disabled={!regionId} />}
        />
      </Field>
      <Field label="Address" htmlFor="address" error={e.address?.message} required className="sm:col-span-2">
        <Input id="address" {...form.register("address")} aria-invalid={!!e.address} />
      </Field>
      <Field label="Phone" htmlFor="phone" error={e.phone?.message} required>
        <Input id="phone" type="tel" {...form.register("phone")} aria-invalid={!!e.phone} />
      </Field>
      <Field label="Email" htmlFor="email" error={e.email?.message} required>
        <Input id="email" type="email" {...form.register("email")} aria-invalid={!!e.email} />
      </Field>
      <Field label="Website" htmlFor="website" error={e.website?.message} className="sm:col-span-2">
        <Input id="website" placeholder="https://" {...form.register("website")} aria-invalid={!!e.website} />
      </Field>
      <div className="flex justify-end gap-2 sm:col-span-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}

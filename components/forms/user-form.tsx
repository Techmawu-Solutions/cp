"use client";

import { useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AppSelect } from "@/components/common/app-select";
import { Field } from "@/components/forms/field";
import { useStore } from "@/lib/store";
import type { User } from "@/lib/types";
import { cn } from "@/lib/utils";

const schema = z.object({
  name: z.string().trim().min(3, "Enter the full name"),
  email: z.string().trim().email("Enter a valid email"),
  phone: z.string().trim().optional(),
  roleId: z.string().min(1, "Choose a role"),
  schoolId: z.string(),
  status: z.enum(["active", "invited", "disabled"]),
});
export type UserValues = z.infer<typeof schema>;

/**
 * UserForm (spec §57). Each user has exactly one role (spec §9). School-scoped
 * roles require a school; platform roles have none.
 */
export function UserForm({
  initial,
  onSubmit,
  onCancel,
  lockSchoolId,
  allowedRoleIds,
  submitLabel = "Save user",
}: {
  initial?: Partial<User>;
  onSubmit: (v: UserValues) => void;
  onCancel?: () => void;
  lockSchoolId?: string;
  allowedRoleIds?: string[];
  submitLabel?: string;
}) {
  const roles = useStore((s) => s.roles);
  const schools = useStore((s) => s.schools);
  const users = useStore((s) => s.users);
  const taken = useMemo(() => new Set(users.filter((u) => u.id !== initial?.id).map((u) => u.email.toLowerCase())), [users, initial?.id]);
  const available = roles.filter((r) => !allowedRoleIds || allowedRoleIds.includes(r.id));
  const scopeOf = (roleId: string) => roles.find((r) => r.id === roleId)?.scope;

  const form = useForm<UserValues>({
    resolver: zodResolver(
      schema
        .refine((v) => !taken.has(v.email.toLowerCase()), { message: "A user with this email already exists", path: ["email"] })
        .refine((v) => scopeOf(v.roleId) !== "school" || !!v.schoolId, { message: "This role belongs to a school — choose the school", path: ["schoolId"] }),
    ),
    defaultValues: {
      name: initial?.name ?? "",
      email: initial?.email ?? "",
      phone: initial?.phone ?? "",
      roleId: initial?.roleId ?? "",
      schoolId: lockSchoolId ?? initial?.schoolId ?? "",
      status: initial?.status ?? "invited",
    },
  });
  const e = form.formState.errors;
  const roleId = form.watch("roleId");
  const needsSchool = scopeOf(roleId) === "school";

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2" noValidate>
      <Field label="Full name" htmlFor="u-name" error={e.name?.message} required className="sm:col-span-2">
        <Input id="u-name" {...form.register("name")} />
      </Field>
      <Field label="Email" htmlFor="u-email" error={e.email?.message} required>
        <Input id="u-email" type="email" {...form.register("email")} />
      </Field>
      <Field label="Phone" htmlFor="u-phone">
        <Input id="u-phone" type="tel" {...form.register("phone")} />
      </Field>
      <Field label="Role" error={e.roleId?.message} required hint="A user has one role. Change it here or under Access Control → Role Assignments." className="sm:col-span-2">
        <Controller
          control={form.control}
          name="roleId"
          render={({ field }) => (
            <RadioGroup
              value={field.value}
              onValueChange={(v) => {
                field.onChange(String(v));
                if (scopeOf(String(v)) === "platform" && !lockSchoolId) form.setValue("schoolId", "");
              }}
              className="grid gap-2 sm:grid-cols-2"
            >
              {available.map((r) => (
                <label key={r.id} className={cn("flex cursor-pointer items-start gap-2 rounded-lg border p-2.5 text-sm", field.value === r.id && "border-primary bg-accent/50")}>
                  <RadioGroupItem value={r.id} className="mt-0.5" />
                  <span>
                    {r.name}
                    <span className="block text-xs text-muted-foreground">{r.scope === "platform" ? "Platform-wide" : "School"}</span>
                  </span>
                </label>
              ))}
            </RadioGroup>
          )}
        />
      </Field>
      {!lockSchoolId && needsSchool && (
        <Field label="School" error={e.schoolId?.message} required>
          <Controller
            control={form.control}
            name="schoolId"
            render={({ field }) => (
              <AppSelect
                value={field.value}
                onChange={field.onChange}
                placeholder="Select school"
                options={schools.filter((s) => s.status !== "archived").sort((a, b) => a.name.localeCompare(b.name)).map((s) => ({ value: s.id, label: s.name }))}
              />
            )}
          />
        </Field>
      )}
      <Field label="Status">
        <Controller
          control={form.control}
          name="status"
          render={({ field }) => (
            <AppSelect
              value={field.value}
              onChange={(v) => field.onChange(v)}
              options={[
                { value: "invited", label: "Invited" },
                { value: "active", label: "Active" },
                { value: "disabled", label: "Disabled" },
              ]}
            />
          )}
        />
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

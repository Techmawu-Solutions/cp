"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AppSelect } from "@/components/common/app-select";
import { Field } from "@/components/forms/field";
import { PERMISSION_GROUPS } from "@/lib/permissions";
import type { Role } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface RoleDraft {
  name: string;
  description: string;
  scope: Role["scope"];
  /** New roles only: start from another role's permissions. */
  copyFrom?: string;
}

/** Role name, description and scope. Permissions are managed per role on the Permissions page. */
export function RoleDetailsForm({ initial, roles, onSave, onCancel, existingNames }: { initial?: Role; roles: Role[]; onSave: (r: RoleDraft) => void; onCancel: () => void; existingNames: string[] }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [scope, setScope] = useState<Role["scope"]>(initial?.scope ?? "school");
  const [copyFrom, setCopyFrom] = useState("__none");
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim().length < 3) return setError("Enter a role name");
        if (existingNames.some((n) => n.toLowerCase() === name.trim().toLowerCase())) return setError("A role with this name already exists");
        onSave({ name: name.trim(), description: description.trim(), scope, copyFrom: copyFrom === "__none" ? undefined : copyFrom });
      }}
    >
      <Field label="Role name" htmlFor="role-name" required error={error ?? undefined}>
        <Input id="role-name" value={name} onChange={(e) => (setName(e.target.value), setError(null))} disabled={initial?.system} placeholder="e.g. Examination Officer" />
      </Field>
      <Field label="Description" htmlFor="role-desc">
        <Textarea id="role-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>
      <Field label="Scope" hint={scope === "platform" ? "Not tied to a school — e.g. District or Regional Officer" : "Users with this role belong to one school"}>
        <RadioGroup value={scope} onValueChange={(v) => setScope(v as Role["scope"])} className="flex gap-4 pt-1.5" disabled={initial?.system}>
          <label className="flex items-center gap-2 text-sm">
            <RadioGroupItem value="school" /> School
          </label>
          <label className="flex items-center gap-2 text-sm">
            <RadioGroupItem value="platform" /> Platform
          </label>
        </RadioGroup>
      </Field>
      {!initial && (
        <Field label="Start with permissions from" hint="You'll choose permissions next.">
          <AppSelect value={copyFrom} onChange={setCopyFrom} options={[{ value: "__none", label: "No permissions" }, ...roles.map((r) => ({ value: r.id, label: r.name }))]} />
        </Field>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{initial ? "Save" : "Create & set permissions"}</Button>
      </div>
    </form>
  );
}

/**
 * Permission checklist for ONE role, grouped by category (spec §10). Groups
 * collapse so the page stays scannable.
 */
export function PermissionChecklist({ value, onChange, locked }: { value: Set<string>; onChange: (next: Set<string>) => void; locked?: boolean }) {
  const [q, setQ] = useState("");
  const groups = useMemo(
    () =>
      PERMISSION_GROUPS.map((g) => ({ ...g, permissions: g.permissions.filter((p) => !q || `${p.label} ${p.key} ${g.label}`.toLowerCase().includes(q.toLowerCase())) })).filter((g) => g.permissions.length > 0),
    [q],
  );
  const toggle = (keys: string[], on: boolean) => {
    const next = new Set(value);
    keys.forEach((k) => (on ? next.add(k) : next.delete(k)));
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search permissions" className="pl-8" />
      </div>
      {groups.map((g) => {
        const keys = g.permissions.map((p) => p.key);
        const on = keys.filter((k) => value.has(k)).length;
        return (
          <Collapsible key={g.key} defaultOpen={on > 0 || !!q} className={cn("rounded-lg border", on > 0 && "border-primary/40")}>
            <div className="flex items-center gap-3 px-3 py-2.5">
              <Checkbox checked={on === keys.length} indeterminate={on > 0 && on < keys.length} disabled={locked} onCheckedChange={(c) => toggle(keys, !!c)} aria-label={`All ${g.label} permissions`} />
              <CollapsibleTrigger className="group flex flex-1 items-center gap-2 text-left text-sm font-medium">
                {g.label}
                <span className="text-xs font-normal text-muted-foreground">
                  {on}/{keys.length}
                </span>
                <ChevronDown className="ml-auto size-4 text-muted-foreground transition-transform group-data-[panel-open]:rotate-180" />
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent>
              <div className="grid gap-1 border-t px-3 py-2 sm:grid-cols-2">
                {g.permissions.map((p) => (
                  <label key={p.key} className="flex items-center gap-2.5 rounded-md px-1 py-1.5 text-sm hover:bg-muted/50">
                    <Checkbox checked={value.has(p.key)} disabled={locked} onCheckedChange={(c) => toggle([p.key], !!c)} />
                    <span className="flex-1">{p.label}</span>
                    <code className="text-[10px] text-muted-foreground">{p.key}</code>
                  </label>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );
}

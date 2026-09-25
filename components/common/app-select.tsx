"use client";

import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface Option {
  value: string;
  label: string;
  group?: string;
}

/**
 * Base UI's Select renders the raw value unless it is given the item list, so
 * every select in the app goes through this wrapper.
 */
export function AppSelect({
  value,
  onChange,
  options,
  placeholder = "Select…",
  className,
  size,
  disabled,
  id,
  "aria-label": ariaLabel,
}: {
  value: string | undefined | null;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
  size?: "sm" | "default";
  disabled?: boolean;
  id?: string;
  "aria-label"?: string;
}) {
  const groups = [...new Set(options.map((o) => o.group ?? ""))];
  return (
    <Select
      value={value ?? null}
      onValueChange={(v) => v != null && onChange(String(v))}
      items={options.map((o) => ({ value: o.value, label: o.label }))}
      disabled={disabled}
    >
      <SelectTrigger id={id} size={size} className={cn("w-full min-w-0", className)} aria-label={ariaLabel}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false}>
        {groups.map((g) => (
          <SelectGroup key={g || "_"}>
            {g && <SelectLabel>{g}</SelectLabel>}
            {options
              .filter((o) => (o.group ?? "") === g)
              .map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}

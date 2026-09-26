"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, LifeBuoy } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useStore } from "@/lib/store";
import { DISTRICTS } from "@/lib/data/geography";
import { CATEGORY_SHORT } from "@/lib/school-meta";
import type { ID, SchoolType } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Searchable list of the platform's schools at one level (spec §49.1.4).
 * Students whose school isn't listed are pointed to support.
 */
export function SchoolPicker({ level, value, onChange }: { level?: SchoolType; value?: ID; onChange: (id: ID | undefined, name: string) => void }) {
  const schools = useStore((s) => s.schools);
  const [open, setOpen] = useState(false);
  const options = useMemo(
    () =>
      schools
        .filter((s) => s.kind !== "vacation" && s.status === "active" && (!level || s.type === level))
        .map((s) => ({ id: s.id, name: s.name, district: DISTRICTS.find((d) => d.id === s.districtId)?.name ?? "" }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [schools, level],
  );
  const selected = options.find((o) => o.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={!level}
        render={
          <button
            type="button"
            className="flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 text-left text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
          />
        }
      >
        <span className={cn("truncate", !selected && "text-muted-foreground")}>{selected?.name ?? (level ? `Search ${CATEGORY_SHORT[level]} schools…` : "Select your school level first")}</span>
        <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-(--anchor-width) min-w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder="Type your school's name or town…" />
          <CommandList>
            <CommandEmpty>
              <span className="block px-2 text-sm">No school found.</span>
              <span className="block px-2 text-xs text-muted-foreground">If your school isn&apos;t listed, contact support (below).</span>
            </CommandEmpty>
            <CommandGroup>
              {options.map((o) => (
                <CommandItem
                  key={o.id}
                  value={`${o.name} ${o.district}`}
                  onSelect={() => {
                    onChange(o.id === value ? undefined : o.id, o.id === value ? "" : o.name);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("size-4", o.id === value ? "opacity-100" : "opacity-0")} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{o.name}</span>
                    <span className="block text-xs text-muted-foreground">{o.district}</span>
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/** "School not listed?" note with the platform's support contact. */
export function SchoolNotListed() {
  const settings = useStore((s) => s.settings);
  return (
    <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
      <LifeBuoy className="mt-0.5 size-3.5 shrink-0" />
      <span>
        School not listed? Contact {settings.platformName} support at{" "}
        <a className="text-orange-600 underline" href={`mailto:${settings.supportEmail}?subject=${encodeURIComponent("Please add my school")}`}>
          {settings.supportEmail}
        </a>{" "}
        with its name and town. You can still continue registering.
      </span>
    </p>
  );
}

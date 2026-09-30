"use client";

import { useEffect, useState } from "react";
import { Check, Languages } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LANGUAGES, getLang, onLangChange, setLang, type Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Interface language picker. Language names are shown in their own language and never translated. */
export function LanguageSwitcher({ className }: { className?: string }) {
  const [lang, setCurrent] = useState<Lang>("en");
  useEffect(() => {
    // localStorage is only readable after mount; syncing it into state here is the point of the effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrent(getLang());
    return onLangChange(setCurrent);
  }, []);
  const current = LANGUAGES.find((l) => l.code === lang)!;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn("inline-flex h-8 shrink-0 items-center gap-1 rounded-md px-2 text-sm font-medium outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50", className)}
        aria-label="Language"
        title="Language"
      >
        <Languages className="size-4" />
        <span data-no-translate>{current.short}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Language</DropdownMenuLabel>
          {LANGUAGES.map((l) => (
            <DropdownMenuItem key={l.code} onClick={() => setLang(l.code)} data-no-translate lang={l.code}>
              <span className="flex-1">{l.label}</span>
              {l.code === lang && <Check className="size-4" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

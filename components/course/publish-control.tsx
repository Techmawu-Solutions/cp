"use client";

import { useState } from "react";
import { CalendarClock, ChevronDown, CircleDashed, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AppSelect } from "@/components/common/app-select";
import { publishState, type PublishState } from "@/lib/publishing";
import { fmtDateTime } from "@/lib/helpers";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";

export interface Visibility {
  published: boolean;
  availableFrom?: string;
}

const STYLE: Record<PublishState, string> = {
  published: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  scheduled: "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300",
  draft: "border-dashed border-muted-foreground/40 bg-muted text-muted-foreground",
};

function label(v: Visibility) {
  const state = publishState(v);
  return state === "published" ? "Published" : state === "draft" ? "Draft" : `Opens ${fmtDateTime(v.availableFrom!)}`;
}

function Icon({ state }: { state: PublishState }) {
  return state === "published" ? <Eye className="size-3" /> : state === "scheduled" ? <CalendarClock className="size-3" /> : <CircleDashed className="size-3" />;
}

/** "YYYY-MM-DDTHH:mm" in local time, for datetime-local inputs. */
export function toLocalInput(iso?: string) {
  const d = iso ? new Date(iso) : new Date(Date.now() + 86_400_000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/**
 * Publish status pill for a section or item. Teachers click it to publish
 * now, schedule a release date, or unpublish back to draft; `extra` adds
 * menu items (e.g. publishing a whole section with its content).
 */
export function PublishControl({ value, onChange, readOnly, extra, className, compactOnMobile }: { value: Visibility; onChange: (v: Visibility) => void; readOnly?: boolean; extra?: React.ReactNode; className?: string; compactOnMobile?: boolean }) {
  const state = publishState(value);
  const [scheduling, setScheduling] = useState(false);
  const pill = cn("inline-flex h-6 shrink-0 items-center gap-1 rounded-full border px-2 text-[11px] font-medium whitespace-nowrap", STYLE[state], className);
  if (readOnly)
    return (
      <span className={pill}>
        <Icon state={state} /> <span className={cn(compactOnMobile && "max-sm:sr-only")}>{label(value)}</span>
      </span>
    );
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className={cn(pill, "outline-none hover:opacity-85 focus-visible:ring-3 focus-visible:ring-ring/50")} onClick={(e) => e.stopPropagation()} aria-label={`Visibility: ${label(value)}. Change`}>
          <Icon state={state} /> <span className={cn(compactOnMobile && "max-sm:sr-only")}>{label(value)}</span> <ChevronDown className="size-3 opacity-70" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuItem disabled={state === "published"} onClick={() => onChange({ published: true, availableFrom: undefined })}>
            <Eye /> Publish now
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setScheduling(true)}>
            <CalendarClock /> {state === "scheduled" ? "Change release date…" : "Schedule release…"}
          </DropdownMenuItem>
          <DropdownMenuItem disabled={state === "draft"} onClick={() => onChange({ published: false, availableFrom: undefined })}>
            <EyeOff /> Unpublish (back to draft)
          </DropdownMenuItem>
          {extra && (
            <>
              <DropdownMenuSeparator />
              {extra}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <ScheduleDialog open={scheduling} onOpenChange={setScheduling} initial={value.availableFrom} onSave={(iso) => onChange({ published: true, availableFrom: iso })} />
    </>
  );
}

function ScheduleDialog({ open, onOpenChange, initial, onSave }: { open: boolean; onOpenChange: (o: boolean) => void; initial?: string; onSave: (iso: string) => void }) {
  const [at, setAt] = useState(() => toLocalInput(initial));
  const now = useNow();
  const valid = !Number.isNaN(Date.parse(at)) && Date.parse(at) > now;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Schedule release</DialogTitle>
          <DialogDescription>Students see it automatically from this date and time. Until then it stays hidden.</DialogDescription>
        </DialogHeader>
        <Input type="datetime-local" value={at} min={toLocalInput(new Date(now).toISOString())} onChange={(e) => setAt(e.target.value)} aria-label="Release date and time" aria-invalid={!valid} />
        {!valid && <p className="text-xs text-destructive">Pick a time in the future.</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!valid} onClick={() => (onSave(new Date(at).toISOString()), onOpenChange(false))}>
            Schedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Visibility choice inside the add / edit dialogs. */
export function VisibilityField({ value, onChange, noun }: { value: Visibility; onChange: (v: Visibility) => void; noun: string }) {
  const state = value.published ? (value.availableFrom ? "scheduled" : "published") : "draft";
  return (
    <div className="space-y-2">
      <AppSelect
        aria-label="Visibility"
        value={state}
        onChange={(s) => onChange(s === "published" ? { published: true } : s === "draft" ? { published: false } : { published: true, availableFrom: value.availableFrom ?? new Date(Date.now() + 86_400_000).toISOString() })}
        options={[
          { value: "published", label: "Publish now — students can see it" },
          { value: "scheduled", label: "Schedule — release on a date" },
          { value: "draft", label: `Draft — only staff can see this ${noun}` },
        ]}
      />
      {state === "scheduled" && (
        <Input type="datetime-local" value={toLocalInput(value.availableFrom)} onChange={(e) => !Number.isNaN(Date.parse(e.target.value)) && onChange({ published: true, availableFrom: new Date(e.target.value).toISOString() })} aria-label="Release date and time" />
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AppSelect } from "@/components/common/app-select";
import { Field } from "@/components/forms/field";
import { graduateStudents, type GraduationDetails } from "@/lib/actions";
import { ALUMNI_ACCESS_CHOICES, accessUntil, cohortLabelFor } from "@/lib/promotion";
import { fmtDateLong } from "@/lib/helpers";
import type { ID, Student } from "@/lib/types";

export interface GraduationForm {
  graduatedOn: string;
  cohortLabel: string;
  /** Index into ALUMNI_ACCESS_CHOICES, as a string for the select. */
  access: string;
}

export const graduationForm = (graduatedOn: string): GraduationForm => ({ graduatedOn, cohortLabel: cohortLabelFor(graduatedOn), access: "1" });

export function graduationDetails(f: GraduationForm): GraduationDetails {
  const days = ALUMNI_ACCESS_CHOICES[Number(f.access)]?.days ?? null;
  return { graduatedOn: f.graduatedOn, cohortLabel: f.cohortLabel.trim() || cohortLabelFor(f.graduatedOn), alumniAccessUntil: accessUntil(f.graduatedOn, days) };
}

/** Graduation date, the cohort's name and how long graduates keep read-only access (spec section 22.4). */
export function GraduationFields({ value, onChange }: { value: GraduationForm; onChange: (v: GraduationForm) => void }) {
  const until = graduationDetails(value).alumniAccessUntil;
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Field label="Graduation date" htmlFor="grad-date">
        <Input
          id="grad-date"
          type="date"
          value={value.graduatedOn}
          onChange={(e) => {
            const graduatedOn = e.target.value;
            // The cohort's name follows the date until the administrator types their own.
            onChange({ ...value, graduatedOn, cohortLabel: value.cohortLabel === cohortLabelFor(value.graduatedOn) && graduatedOn ? cohortLabelFor(graduatedOn) : value.cohortLabel });
          }}
        />
      </Field>
      <Field label="Cohort" htmlFor="grad-cohort">
        <Input id="grad-cohort" value={value.cohortLabel} onChange={(e) => onChange({ ...value, cohortLabel: e.target.value })} />
      </Field>
      <Field label="Alumni access" hint={until ? `Read-only until ${fmtDateLong(until)}` : "Accounts close on the graduation date"}>
        <AppSelect value={value.access} onChange={(access) => onChange({ ...value, access })} options={ALUMNI_ACCESS_CHOICES.map((c, i) => ({ value: String(i), label: c.label }))} aria-label="Alumni access" />
      </Field>
    </div>
  );
}

/** Graduates a final-year class before the year ends, e.g. after WASSCE or BECE. */
export function GraduateClassDialog({ open, onOpenChange, schoolId, className, students }: { open: boolean; onOpenChange: (open: boolean) => void; schoolId: ID; className: string; students: Student[] }) {
  const active = students.filter((s) => s.status === "active");
  const [form, setForm] = useState(() => graduationForm(new Date().toISOString().slice(0, 10)));
  const [picked, setPicked] = useState<Set<ID>>(() => new Set(active.map((s) => s.id)));
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{`Graduate ${className}`}</DialogTitle>
          <DialogDescription>Graduates leave the class lists and keep read-only access to their courses, grades and recordings for the time you choose. Their records in this session stay as they are.</DialogDescription>
        </DialogHeader>
        <GraduationFields value={form} onChange={setForm} />
        <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border p-2">
          {active.length === 0 && <p className="p-2 text-sm text-muted-foreground">Everyone in this class has already graduated or left.</p>}
          {active.map((s) => (
            <label key={s.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted">
              <Checkbox checked={picked.has(s.id)} onCheckedChange={(c) => setPicked((p) => { const n = new Set(p); if (c) n.add(s.id); else n.delete(s.id); return n; })} />
              <span className="min-w-0 flex-1 truncate">
                {s.firstName} {s.lastName}
              </span>
              <span className="text-xs text-muted-foreground">{s.studentNumber}</span>
            </label>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={picked.size === 0 || !form.graduatedOn}
            onClick={() => {
              const n = graduateStudents(schoolId, [...picked], graduationDetails(form));
              toast.success(`${n} students graduated`, { description: graduationDetails(form).cohortLabel });
              onOpenChange(false);
            }}
          >
            <GraduationCap /> {`Graduate ${picked.size} students`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

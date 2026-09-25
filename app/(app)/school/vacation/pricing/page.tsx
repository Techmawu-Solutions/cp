"use client";

import { useState } from "react";
import { Pencil, Plus, Star } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/common/page-header";
import { Field } from "@/components/forms/field";
import { VacationGuard } from "@/components/vacation/vacation-guard";
import { useSchoolData } from "@/lib/queries";
import { useStore } from "@/lib/store";
import { fmtGhs, quote } from "@/lib/vacation";
import { uid } from "@/lib/helpers";
import type { VacationBundle } from "@/lib/types";

/** Subject fees and bundles for the selected vacation session (spec §49.1.3). */
export default function VacationPricingPage() {
  return (
    <VacationGuard>
      <Pricing />
    </VacationGuard>
  );
}

function Pricing() {
  const d = useSchoolData();
  const prices = useStore((s) => s.vacationPrices).filter((p) => p.sessionId === d.sessionId);
  const bundles = useStore((s) => s.vacationBundles).filter((b) => b.sessionId === d.sessionId);
  const db = useStore();
  const [editing, setEditing] = useState<VacationBundle | "new" | null>(null);

  const setFee = (subjectId: string, fee: number) => {
    const st = useStore.getState();
    const p = prices.find((x) => x.subjectId === subjectId);
    if (p) st.update("vacationPrices", p.id, { fee });
    else st.insert("vacationPrices", { id: uid("vp"), sessionId: d.sessionId!, subjectId, fee, classIds: d.classes.map((c) => c.id) });
  };
  const toggleClass = (subjectId: string, classId: string, on: boolean) => {
    const p = prices.find((x) => x.subjectId === subjectId);
    if (!p) return;
    useStore.getState().update("vacationPrices", p.id, { classIds: on ? [...p.classIds, classId] : p.classIds.filter((c) => c !== classId) });
  };

  return (
    <>
      <PageHeader title="Bundles & Pricing" description={`What students pay for ${d.session.label}. Subjects come from the catalogue — add more on the Subjects page.`} breadcrumbs={[{ label: "Vacation Classes", href: "/school/vacation" }, { label: "Bundles & Pricing" }]} />

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Subject fees</CardTitle>
          <CardDescription>Fee per subject and the levels it&apos;s offered to. Changes apply to new registrations.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground uppercase">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Subject</th>
                <th className="px-4 py-2 text-left font-medium">Fee (GHS)</th>
                {d.classes.map((c) => (
                  <th key={c.id} className="px-2 py-2 text-center font-medium">
                    {c.level}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {d.subjects.map((s) => {
                const p = prices.find((x) => x.subjectId === s.id);
                return (
                  <tr key={s.id} className="border-t">
                    <td className="px-4 py-2 font-medium">{s.name}</td>
                    <td className="px-4 py-2">
                      <Input type="number" min={0} className="h-8 w-28" defaultValue={p?.fee ?? ""} placeholder="Not offered" onBlur={(e) => e.target.value && Number(e.target.value) !== p?.fee && (setFee(s.id, Number(e.target.value)), toast.success(`${s.name}: ${fmtGhs(Number(e.target.value))}`))} />
                    </td>
                    {d.classes.map((c) => (
                      <td key={c.id} className="px-2 py-2 text-center">
                        <Checkbox disabled={!p} checked={!!p?.classIds.includes(c.id)} onCheckedChange={(on) => toggleClass(s.id, c.id, !!on)} aria-label={`${s.name} for ${c.name}`} />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Bundles</h2>
        <Button onClick={() => setEditing("new")}>
          <Plus /> New bundle
        </Button>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {bundles.map((b) => {
          const q = quote(db, { bundleId: b.id, subjectIds: [] });
          return (
            <Card key={b.id} className={b.active ? "" : "opacity-60"}>
              <CardContent className="space-y-2">
                <div className="flex items-start gap-2">
                  <p className="flex-1 font-semibold">{b.name}</p>
                  {b.featured && <Star className="size-4 fill-orange-400 text-orange-400" />}
                  {!b.active && <Badge variant="outline">Hidden</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">{b.classIds.length ? b.classIds.map((id) => d.byId.class.get(id)?.name).join(", ") : "All levels"}</p>
                <p className="text-sm">{b.subjectIds.map((id) => d.byId.subject.get(id)?.name).join(" · ")}</p>
                <div className="flex items-end justify-between border-t pt-2">
                  <span>
                    <span className="text-xl font-bold">{fmtGhs(b.price)}</span>
                    {q.saving > 0 && <span className="ml-2 text-xs text-emerald-700 dark:text-emerald-400">saves {fmtGhs(q.saving)}</span>}
                  </span>
                  <Button size="sm" variant="outline" onClick={() => setEditing(b)}>
                    <Pencil /> Edit
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <BundleDialog value={editing} onClose={() => setEditing(null)} />
    </>
  );
}

function BundleDialog({ value, onClose }: { value: VacationBundle | "new" | null; onClose: () => void }) {
  const d = useSchoolData();
  const db = useStore();
  const [draft, setDraft] = useState<Omit<VacationBundle, "id" | "sessionId">>({ name: "", description: "", classIds: [], subjectIds: [], price: 0, active: true, featured: false });
  const [loaded, setLoaded] = useState<string | null>(null);
  const key = value === "new" ? "new" : value?.id ?? null;
  if (key !== loaded) {
    setLoaded(key);
    setDraft(value && value !== "new" ? { name: value.name, description: value.description, classIds: value.classIds, subjectIds: value.subjectIds, price: value.price, active: value.active, featured: value.featured } : { name: "", description: "", classIds: [], subjectIds: [], price: 0, active: true, featured: false });
  }
  const full = quote(db, { subjectIds: draft.subjectIds }).total;
  const toggle = (k: "classIds" | "subjectIds", id: string, on: boolean) => setDraft({ ...draft, [k]: on ? [...draft[k], id] : draft[k].filter((x) => x !== id) });
  const valid = draft.name.trim().length >= 3 && draft.subjectIds.length >= 2 && draft.price > 0;

  return (
    <Dialog open={value !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{value === "new" ? "New bundle" : "Edit bundle"}</DialogTitle>
          <DialogDescription>A set of subjects sold for one price.</DialogDescription>
        </DialogHeader>
        <div className="grid max-h-[60vh] gap-3 overflow-y-auto pr-1">
          <Field label="Name" required>
            <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. WASSCE Science Bundle" />
          </Field>
          <Field label="Description">
            <Textarea rows={2} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          </Field>
          <Field label="Levels" hint="None ticked = available to every level">
            <div className="grid grid-cols-2 gap-1.5">
              {d.classes.map((c) => (
                <label key={c.id} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={draft.classIds.includes(c.id)} onCheckedChange={(on) => toggle("classIds", c.id, !!on)} /> {c.name}
                </label>
              ))}
            </div>
          </Field>
          <Field label="Subjects (at least 2)" required>
            <div className="grid grid-cols-2 gap-1.5">
              {d.subjects.map((s) => (
                <label key={s.id} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={draft.subjectIds.includes(s.id)} onCheckedChange={(on) => toggle("subjectIds", s.id, !!on)} /> {s.name}
                </label>
              ))}
            </div>
          </Field>
          <Field label="Bundle price (GHS)" required hint={`Subjects bought separately: ${fmtGhs(full)}${draft.price > 0 && draft.price < full ? ` — students save ${fmtGhs(full - draft.price)}` : ""}`}>
            <Input type="number" min={1} value={draft.price || ""} onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })} className="w-40" />
          </Field>
          <label className="flex items-center justify-between text-sm">
            Show on the landing page
            <Switch checked={draft.active} onCheckedChange={(v) => setDraft({ ...draft, active: v })} />
          </label>
          <label className="flex items-center justify-between text-sm">
            Mark as popular
            <Switch checked={draft.featured} onCheckedChange={(v) => setDraft({ ...draft, featured: v })} />
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!valid}
            onClick={() => {
              const st = useStore.getState();
              const payload = { ...draft, name: draft.name.trim() };
              if (value === "new") st.insert("vacationBundles", { id: uid("vb"), sessionId: d.sessionId!, ...payload });
              else if (value) st.update("vacationBundles", value.id, payload);
              st.audit({ schoolId: d.schoolId, action: value === "new" ? "Vacation bundle created" : "Vacation bundle updated", target: `${payload.name} · ${fmtGhs(payload.price)}`, category: "academic" });
              toast.success("Bundle saved");
              onClose();
            }}
          >
            Save bundle
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

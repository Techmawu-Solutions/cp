"use client";

import { Suspense, useState } from "react";
import { Check, Pencil, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/common/page-header";
import { UrlTabs } from "@/components/common/url-tabs";
import { StatusBadge } from "@/components/common/status-badge";
import { AppSelect } from "@/components/common/app-select";
import { DataTable } from "@/components/tables/data-table";
import { Field } from "@/components/forms/field";
import { RequirePermission } from "@/components/layout/app-shell";
import { useStore } from "@/lib/store";
import { resolveCatalogueRequest } from "@/lib/actions";
import { fmtAgo, uid } from "@/lib/helpers";
import type { CatalogueProgramme, CatalogueRequest, CatalogueSubject } from "@/lib/types";

/** Programme & subject catalogue and school requests (spec §17.1–17.2). */
export default function CataloguePage() {
  const pending = useStore((s) => s.catalogueRequests.filter((r) => r.status === "pending").length);
  return (
    <RequirePermission perm={["programmes.create", "subjects.create"]}>
      <PageHeader title="Programme & Subject Catalogue" description="The standard list schools choose from. Schools request anything that's missing." breadcrumbs={[{ label: "Academic" }, { label: "Catalogue" }]} />
      <Suspense>
        <UrlTabs tabs={[{ value: "programmes", label: "Programmes" }, { value: "subjects", label: "Subjects" }, { value: "requests", label: `Requests${pending ? ` (${pending} pending)` : ""}` }]}>
          {(tab) => (tab === "programmes" ? <ProgrammesTab /> : tab === "subjects" ? <SubjectsTab /> : <RequestsTab />)}
        </UrlTabs>
      </Suspense>
    </RequirePermission>
  );
}

function useUsage() {
  const programmes = useStore((s) => s.programmes);
  const subjects = useStore((s) => s.subjects);
  return (catalogueId: string) => new Set([...programmes, ...subjects].filter((x) => x.catalogueId === catalogueId).map((x) => x.schoolId)).size;
}

function ProgrammesTab() {
  const items = useStore((s) => s.catalogueProgrammes);
  const usage = useUsage();
  const [editing, setEditing] = useState<CatalogueProgramme | "new" | null>(null);
  return (
    <>
      <DataTable
        rows={items}
        search={(p) => `${p.name} ${p.code}`}
        initialSort={{ key: "name", dir: "asc" }}
        toolbar={
          <Button onClick={() => setEditing("new")}>
            <Plus /> Add programme
          </Button>
        }
        columns={[
          { key: "name", header: "Programme", sort: (p) => p.name, cell: (p) => (<div><p className="font-medium">{p.name}</p><p className="text-xs text-muted-foreground">{p.description}</p></div>) },
          { key: "code", header: "Code", cell: (p) => <code className="text-xs">{p.code}</code> },
          { key: "usage", header: "Schools offering", sort: (p) => usage(p.id), cell: (p) => usage(p.id), className: "tabular-nums" },
          { key: "active", header: "Status", cell: (p) => <StatusBadge status={p.active ? "active" : "inactive"} /> },
          { key: "act", header: "", className: "text-right", cell: (p) => (<Button size="icon-sm" variant="ghost" onClick={() => setEditing(p)} aria-label="Edit"><Pencil /></Button>) },
        ]}
      />
      <CatalogueItemDialog kind="programme" value={editing} onClose={() => setEditing(null)} />
    </>
  );
}

function SubjectsTab() {
  const items = useStore((s) => s.catalogueSubjects);
  const programmes = useStore((s) => s.catalogueProgrammes);
  const usage = useUsage();
  const [editing, setEditing] = useState<CatalogueSubject | "new" | null>(null);
  return (
    <>
      <DataTable
        rows={items}
        search={(s) => `${s.name} ${s.code}`}
        initialSort={{ key: "name", dir: "asc" }}
        filters={[
          { key: "cat", label: "Categories", options: [{ value: "core", label: "Core" }, { value: "elective", label: "Elective" }], predicate: (s, v) => s.category === v },
          { key: "prog", label: "Programmes", options: programmes.map((p) => ({ value: p.code, label: p.name })), predicate: (s, v) => s.programmeCodes.includes(v) },
        ]}
        toolbar={
          <Button onClick={() => setEditing("new")}>
            <Plus /> Add subject
          </Button>
        }
        columns={[
          { key: "name", header: "Subject", sort: (s) => s.name, cell: (s) => <span className="font-medium">{s.name}</span> },
          { key: "code", header: "Code", cell: (s) => <code className="text-xs">{s.code}</code> },
          { key: "cat", header: "Category", cell: (s) => (s.category === "core" ? "Core" : "Elective") },
          { key: "progs", header: "Programmes", cell: (s) => <div className="flex flex-wrap gap-1">{s.programmeCodes.map((c) => <Badge key={c} variant="secondary" className="text-[10px]">{c}</Badge>)}</div> },
          { key: "usage", header: "Schools", sort: (s) => usage(s.id), cell: (s) => usage(s.id), className: "tabular-nums" },
          { key: "active", header: "Status", cell: (s) => <StatusBadge status={s.active ? "active" : "inactive"} /> },
          { key: "act", header: "", className: "text-right", cell: (s) => (<Button size="icon-sm" variant="ghost" onClick={() => setEditing(s)} aria-label="Edit"><Pencil /></Button>) },
        ]}
      />
      <CatalogueItemDialog kind="subject" value={editing} onClose={() => setEditing(null)} />
    </>
  );
}

function CatalogueItemDialog({ kind, value, onClose }: { kind: "programme" | "subject"; value: CatalogueProgramme | CatalogueSubject | "new" | null; onClose: () => void }) {
  const programmes = useStore((s) => s.catalogueProgrammes);
  const all = useStore((s) => (kind === "programme" ? s.catalogueProgrammes : s.catalogueSubjects));
  const [draft, setDraft] = useState({ name: "", code: "", description: "", active: true, category: "elective" as "core" | "elective", programmeCodes: [] as string[] });
  const [loaded, setLoaded] = useState<string | null>(null);
  const key = value === "new" ? "new" : value?.id ?? null;
  if (key !== loaded) {
    setLoaded(key);
    const v = value && value !== "new" ? value : null;
    setDraft({ name: v?.name ?? "", code: v?.code ?? "", description: v?.description ?? "", active: v?.active ?? true, category: (v as CatalogueSubject | null)?.category ?? "elective", programmeCodes: (v as CatalogueSubject | null)?.programmeCodes ?? [] });
  }
  const id = value && value !== "new" ? value.id : null;
  const dupe = all.some((x) => x.id !== id && (x.code.toUpperCase() === draft.code.trim().toUpperCase() || x.name.toLowerCase() === draft.name.trim().toLowerCase()));
  const valid = draft.name.trim().length >= 2 && draft.code.trim().length >= 2 && !dupe;

  return (
    <Dialog open={value !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{value === "new" ? `Add ${kind}` : `Edit ${kind}`}</DialogTitle>
          <DialogDescription>Changes to the name apply to new selections; schools that already offer it keep their record.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_120px]">
          <Field label="Name" htmlFor="ci-n" required>
            <Input id="ci-n" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </Field>
          <Field label="Code" htmlFor="ci-c" required>
            <Input id="ci-c" value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })} maxLength={8} />
          </Field>
          {dupe && <p className="text-xs text-destructive sm:col-span-2">Another {kind} already uses this name or code.</p>}
          <Field label="Description" htmlFor="ci-d" className="sm:col-span-2">
            <Textarea id="ci-d" rows={2} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          </Field>
          {kind === "subject" && (
            <>
              <Field label="Category">
                <AppSelect value={draft.category} onChange={(v) => setDraft({ ...draft, category: v as "core" | "elective" })} options={[{ value: "core", label: "Core" }, { value: "elective", label: "Elective" }]} />
              </Field>
              <div className="sm:col-span-2">
                <p className="mb-1.5 text-sm font-medium">Usually offered in</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {programmes.map((p) => (
                    <label key={p.code} className="flex items-center gap-2 text-sm">
                      <Checkbox checked={draft.programmeCodes.includes(p.code)} onCheckedChange={(c) => setDraft({ ...draft, programmeCodes: c ? [...draft.programmeCodes, p.code] : draft.programmeCodes.filter((x) => x !== p.code) })} />
                      {p.name}
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}
          <label className="flex items-center justify-between gap-3 text-sm sm:col-span-2">
            Available for schools to select
            <Switch checked={draft.active} onCheckedChange={(v) => setDraft({ ...draft, active: v })} />
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
              const base = { name: draft.name.trim(), code: draft.code.trim().toUpperCase(), description: draft.description.trim(), active: draft.active };
              if (kind === "programme") {
                if (id) st.update("catalogueProgrammes", id, base);
                else st.insert("catalogueProgrammes", { id: uid("cat_p"), ...base });
              } else {
                const full = { ...base, category: draft.category, programmeCodes: draft.programmeCodes };
                if (id) st.update("catalogueSubjects", id, full);
                else st.insert("catalogueSubjects", { id: uid("cat_s"), ...full });
              }
              st.audit({ schoolId: null, action: `Catalogue ${kind} ${id ? "updated" : "added"}`, target: base.name, category: "academic" });
              toast.success(`${base.name} saved`);
              onClose();
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RequestsTab() {
  const requests = useStore((s) => s.catalogueRequests);
  const schools = useStore((s) => s.schools);
  const users = useStore((s) => s.users);
  const [approving, setApproving] = useState<CatalogueRequest | null>(null);
  const [declining, setDeclining] = useState<CatalogueRequest | null>(null);
  const [note, setNote] = useState("");
  return (
    <>
      <DataTable
        rows={[...requests].sort((a, b) => Number(a.status !== "pending") - Number(b.status !== "pending") || b.createdAt.localeCompare(a.createdAt))}
        search={(r) => `${r.name} ${r.code}`}
        filters={[
          { key: "status", label: "Statuses", options: [{ value: "pending", label: "Pending" }, { value: "approved", label: "Approved" }, { value: "declined", label: "Declined" }], predicate: (r, v) => r.status === v },
          { key: "kind", label: "Types", options: [{ value: "programme", label: "Programmes" }, { value: "subject", label: "Subjects" }], predicate: (r, v) => r.kind === v },
        ]}
        emptyTitle="No requests yet"
        columns={[
          { key: "name", header: "Requested", cell: (r) => (<div><p className="font-medium">{r.name} <Badge variant="outline" className="ml-1">{r.code}</Badge></p><p className="text-xs text-muted-foreground">{r.kind === "programme" ? "Programme" : "Subject"} · {r.description}</p></div>) },
          { key: "school", header: "School", cell: (r) => (<div><p>{schools.find((s) => s.id === r.schoolId)?.name}</p><p className="text-xs text-muted-foreground">{users.find((u) => u.id === r.requestedBy)?.name} · {fmtAgo(r.createdAt)}</p></div>) },
          { key: "reason", header: "Reason", cell: (r) => <p className="max-w-64 text-sm text-muted-foreground">{r.reason}</p> },
          { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status === "approved" ? "active" : r.status === "declined" ? "cancelled" : "pending"}>{r.status[0]!.toUpperCase() + r.status.slice(1)}</StatusBadge> },
          {
            key: "act",
            header: "",
            className: "text-right",
            cell: (r) =>
              r.status === "pending" ? (
                <div className="flex justify-end gap-1">
                  <Button size="sm" variant="outline" onClick={() => (setDeclining(r), setNote(""))}>
                    <X /> Decline
                  </Button>
                  <Button size="sm" onClick={() => setApproving(r)}>
                    <Check /> Approve
                  </Button>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">{r.note}</span>
              ),
          },
        ]}
      />
      <ApproveDialog request={approving} onClose={() => setApproving(null)} />
      <Dialog open={!!declining} onOpenChange={(o) => !o && setDeclining(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline “{declining?.name}”?</DialogTitle>
            <DialogDescription>The requester is notified with your reason.</DialogDescription>
          </DialogHeader>
          <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Please use “Computing” from the catalogue instead." />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeclining(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={note.trim().length < 3}
              onClick={() => {
                resolveCatalogueRequest(declining!.id, { approve: false, note: note.trim() });
                toast.success("Request declined — requester notified");
                setDeclining(null);
              }}
            >
              Decline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ApproveDialog({ request, onClose }: { request: CatalogueRequest | null; onClose: () => void }) {
  const catalogue = useStore((s) => (request?.kind === "programme" ? s.catalogueProgrammes : s.catalogueSubjects));
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [existingId, setExistingId] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [loaded, setLoaded] = useState<string | null>(null);
  if (request && request.id !== loaded) {
    setLoaded(request.id);
    setMode("new");
    setExistingId("");
    setName(request.name);
    setCode(request.code);
    setDescription(request.description);
  }
  const clash = catalogue.some((c) => c.code.toUpperCase() === code.trim().toUpperCase() || c.name.toLowerCase() === name.trim().toLowerCase());
  const valid = mode === "existing" ? !!existingId : name.trim().length >= 2 && code.trim().length >= 2 && !clash;
  return (
    <Dialog open={!!request} onOpenChange={(o) => !o && (onClose(), setLoaded(null))}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Approve {request?.kind} request</DialogTitle>
          <DialogDescription>It&apos;s added to the requesting school&apos;s active session and the requester is notified.</DialogDescription>
        </DialogHeader>
        <AppSelect value={mode} onChange={(v) => setMode(v as "new" | "existing")} options={[{ value: "new", label: "Add as a new catalogue entry" }, { value: "existing", label: "It's the same as an existing entry" }]} />
        {mode === "new" ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_120px]">
            <Field label="Name" htmlFor="ap-n">
              <Input id="ap-n" value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Code" htmlFor="ap-c">
              <Input id="ap-c" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={8} />
            </Field>
            {clash && <p className="text-xs text-destructive sm:col-span-2">An entry with this name or code already exists — link to it instead.</p>}
            <Field label="Description" htmlFor="ap-d" className="sm:col-span-2">
              <Textarea id="ap-d" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
            </Field>
          </div>
        ) : (
          <Field label="Existing entry">
            <AppSelect value={existingId} onChange={setExistingId} options={catalogue.map((c) => ({ value: c.id, label: `${c.name} (${c.code})` }))} placeholder="Select" />
          </Field>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!valid}
            onClick={() => {
              const existing = catalogue.find((c) => c.id === existingId);
              resolveCatalogueRequest(request!.id, mode === "existing" && existing ? { approve: true, existingId: existing.id, name: existing.name, code: existing.code, description: existing.description } : { approve: true, name: name.trim(), code: code.trim(), description: description.trim() });
              toast.success("Approved — added and requester notified");
              onClose();
              setLoaded(null);
            }}
          >
            Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

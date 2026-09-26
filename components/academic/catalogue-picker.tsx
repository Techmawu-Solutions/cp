"use client";

import { useMemo, useState } from "react";
import { MessageSquarePlus, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/common/status-badge";
import { Field } from "@/components/forms/field";
import { useStore } from "@/lib/store";
import { useCurrentUser } from "@/lib/session";
import { addProgrammesFromCatalogue, addSubjectsFromCatalogue, submitCatalogueRequest } from "@/lib/actions";
import { fmtAgo } from "@/lib/helpers";
import { cn } from "@/lib/utils";

type Kind = "programme" | "subject";

/**
 * Schools select the programmes/subjects they offer from the platform
 * catalogue (spec §17.1); anything missing is requested (spec §17.2).
 */
export function CataloguePicker({ kind, open, onOpenChange, schoolId, sessionId, existingCatalogueIds, programmeCodes }: { kind: Kind; open: boolean; onOpenChange: (o: boolean) => void; schoolId: string; sessionId: string; existingCatalogueIds: Set<string | undefined>; programmeCodes: string[] }) {
  const programmes = useStore((s) => s.catalogueProgrammes);
  const subjects = useStore((s) => s.catalogueSubjects);
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [requestOpen, setRequestOpen] = useState(false);

  const items = useMemo(() => {
    const list = kind === "programme" ? programmes.map((p) => ({ ...p, group: "Programmes", hint: p.description })) : subjects.map((s) => ({ ...s, group: s.category === "core" ? "Core subjects" : programmeCodes.some((c) => s.programmeCodes.includes(c)) ? "Electives for your programmes" : "Other electives", hint: s.programmeCodes.length ? s.programmeCodes.join(", ") : s.description }));
    return list.filter((i) => i.active && !existingCatalogueIds.has(i.id) && `${i.name} ${i.code}`.toLowerCase().includes(q.toLowerCase()));
  }, [kind, programmes, subjects, existingCatalogueIds, q, programmeCodes]);
  const groups = [...new Set(items.map((i) => i.group))].sort((a, b) => ["Core subjects", "Electives for your programmes", "Programmes", "Other electives"].indexOf(a) - ["Core subjects", "Electives for your programmes", "Programmes", "Other electives"].indexOf(b));
  const label = kind === "programme" ? "programmes" : "subjects";

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => (onOpenChange(o), !o && setPicked(new Set()))}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Add {label} offered at your school</DialogTitle>
            <DialogDescription>Choose from the platform catalogue. Names and codes are standard across all schools.</DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${label}`} className="pl-8" autoFocus />
          </div>
          <div className="max-h-[50vh] space-y-3 overflow-y-auto pr-1">
            {items.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">{q ? `No ${label} match “${q}”.` : `Your school already offers every ${kind} in the catalogue.`}</p>}
            {groups.map((g) => {
              const inGroup = items.filter((i) => i.group === g);
              const allOn = inGroup.every((i) => picked.has(i.id));
              return (
                <div key={g}>
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{g}</p>
                    <button
                      className="text-xs text-primary hover:underline"
                      onClick={() => setPicked((p) => { const n = new Set(p); inGroup.forEach((i) => (allOn ? n.delete(i.id) : n.add(i.id))); return n; })}
                    >
                      {allOn ? "Clear" : "Select all"}
                    </button>
                  </div>
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    {inGroup.map((i) => (
                      <label key={i.id} className={cn("flex cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 text-sm", picked.has(i.id) && "border-primary bg-accent/50")}>
                        <Checkbox checked={picked.has(i.id)} onCheckedChange={(c) => setPicked((p) => { const n = new Set(p); if (c) n.add(i.id); else n.delete(i.id); return n; })} className="mt-0.5" />
                        <span className="min-w-0">
                          <span className="block font-medium">
                            {i.name} <code className="text-[10px] text-muted-foreground">{i.code}</code>
                          </span>
                          <span className="line-clamp-1 text-xs text-muted-foreground">{i.hint}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-muted/60 p-3 text-sm">
            <span className="flex-1 text-muted-foreground">Can&apos;t find a {kind} your school offers?</span>
            <Button size="sm" variant="outline" onClick={() => setRequestOpen(true)}>
              <MessageSquarePlus /> Request it
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              disabled={picked.size === 0}
              onClick={() => {
                const added = kind === "programme" ? addProgrammesFromCatalogue(schoolId, sessionId, [...picked]) : addSubjectsFromCatalogue(schoolId, sessionId, [...picked]);
                toast.success(`${added.length} ${added.length === 1 ? kind : label} added`);
                setPicked(new Set());
                onOpenChange(false);
              }}
            >
              Add {picked.size || ""} {picked.size === 1 ? kind : label}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <RequestDialog kind={kind} open={requestOpen} onOpenChange={setRequestOpen} schoolId={schoolId} initialName={q} />
    </>
  );
}

export function RequestDialog({ kind, open, onOpenChange, schoolId, initialName = "" }: { kind: Kind; open: boolean; onOpenChange: (o: boolean) => void; schoolId: string; initialName?: string }) {
  const me = useCurrentUser();
  const catalogue = useStore((s) => (kind === "programme" ? s.catalogueProgrammes : s.catalogueSubjects));
  const [name, setName] = useState(initialName);
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [reason, setReason] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setName(initialName);
      setErr(null);
    }
  }
  const similar = name.trim().length >= 3 ? catalogue.filter((c) => c.name.toLowerCase().includes(name.trim().toLowerCase())) : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request a new {kind}</DialogTitle>
          <DialogDescription>The platform team reviews requests. You&apos;ll be notified when it&apos;s added (it&apos;s then added to your school automatically) or if it&apos;s declined.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_120px]">
          <Field label={`${kind === "programme" ? "Programme" : "Subject"} name`} htmlFor="rq-name" required>
            <Input id="rq-name" value={name} onChange={(e) => (setName(e.target.value), setErr(null))} />
          </Field>
          <Field label="Suggested code" htmlFor="rq-code">
            <Input id="rq-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={8} />
          </Field>
          {similar.length > 0 && (
            <p className="text-xs text-amber-700 sm:col-span-2 dark:text-amber-300">
              Already in the catalogue: {similar.map((s) => s.name).join(", ")}. Check it isn&apos;t the same {kind}.
            </p>
          )}
          <Field label="Description" htmlFor="rq-desc" className="sm:col-span-2">
            <Textarea id="rq-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
          <Field label="Why does your school need it?" htmlFor="rq-reason" required className="sm:col-span-2">
            <Textarea id="rq-reason" rows={2} value={reason} onChange={(e) => (setReason(e.target.value), setErr(null))} />
          </Field>
          {err && <p className="text-sm text-destructive sm:col-span-2">{err}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (name.trim().length < 2) return setErr("Enter the name");
              if (reason.trim().length < 5) return setErr("Tell us briefly why it's needed");
              if (catalogue.some((c) => c.name.toLowerCase() === name.trim().toLowerCase())) return setErr(`“${name.trim()}” is already in the catalogue — select it from the list instead.`);
              submitCatalogueRequest({ kind, name: name.trim(), code: code.trim() || name.trim().slice(0, 4).toUpperCase(), description: description.trim(), reason: reason.trim(), schoolId, requestedBy: me!.user.id });
              toast.success("Request sent", { description: "You'll get a notification when it's reviewed." });
              setCode("");
              setDescription("");
              setReason("");
              onOpenChange(false);
            }}
          >
            Send request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** The school's own requests and their outcome. */
export function MyCatalogueRequests({ kind, schoolId }: { kind: Kind; schoolId: string }) {
  const requests = useStore((s) => s.catalogueRequests);
  const mine = requests.filter((r) => r.kind === kind && r.schoolId === schoolId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (mine.length === 0) return null;
  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Your {kind} requests</CardTitle>
        <CardDescription>Requests for {kind === "programme" ? "programmes" : "subjects"} not yet in the catalogue.</CardDescription>
      </CardHeader>
      <CardContent className="divide-y">
        {mine.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
            <div className="min-w-0 flex-1">
              <p className="font-medium">
                {r.name} <Badge variant="outline">{r.code}</Badge>
              </p>
              <p className="text-xs text-muted-foreground">
                Requested {fmtAgo(r.createdAt)}
                {r.note && ` · ${r.note}`}
              </p>
            </div>
            <StatusBadge status={r.status === "approved" ? "active" : r.status === "declined" ? "cancelled" : "pending"}>{r.status === "approved" ? "Approved" : r.status === "declined" ? "Declined" : "Pending review"}</StatusBadge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

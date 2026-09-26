"use client";

import { useState } from "react";
import { AlertTriangle, Archive, CalendarRange, CheckCircle2, Download, Eye, Layers, Plus, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppSelect } from "@/components/common/app-select";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge, type Tone } from "@/components/common/status-badge";
import { VacationGuard } from "@/components/vacation/vacation-guard";
import { useScope } from "@/lib/session";
import { useStore } from "@/lib/store";
import { useNow } from "@/lib/use-now";
import { downloadBlob, fmtDate } from "@/lib/helpers";
import { fmtGhs } from "@/lib/vacation";
import { BATCH_STATE_LABEL, batchRecord, batchState, batchSummary, closeBatch, setupBatch, type BatchState } from "@/lib/vacation-batches";
import type { AcademicSession } from "@/lib/types";

const STATE_TONE: Record<BatchState, Tone> = { upcoming: "blue", registration: "violet", running: "green", ended: "amber", closed: "gray" };

const LIFECYCLE = [
  ["Set up", "Copy classes, subjects, prices and bundles from the last batch."],
  ["Registration", "Students register and pay; returning students keep their account."],
  ["Running", "Teachers are matched, live classes and assessments run."],
  ["Close", "Unpaid registrations cancelled, teachers released, reports sent."],
  ["Kept", "The batch becomes read-only; records stay for reports and audits."],
] as const;

/** Vacation batches (spec §49.1.7): one session per holiday, closed out before the next one starts. */
export default function VacationBatchesPage() {
  return (
    <VacationGuard>
      <Batches />
    </VacationGuard>
  );
}

function Batches() {
  const { schoolId } = useScope();
  const db = useStore();
  const setSession = useStore((s) => s.setSession);
  const now = useNow();
  const [closing, setClosing] = useState<AcademicSession | null>(null);
  const [setup, setSetup] = useState<{ existing?: AcademicSession } | null>(null);
  const batches = db.academicSessions.filter((s) => s.schoolId === schoolId).sort((a, b) => b.startDate.localeCompare(a.startDate));
  const needsClosing = batches.filter((b) => batchState(b, now) === "ended");

  const download = async (b: AcademicSession) => {
    const { default: writeXlsxFile } = await import("write-excel-file/browser");
    const record = batchRecord(db, b.id);
    const blob = await writeXlsxFile(
      record.sheets.map((sh) => ({
        sheet: sh.name,
        data: [sh.header.map((h) => ({ value: h, fontWeight: "bold" as const })), ...sh.rows.map((r) => r.map((c) => (c === "" || c == null ? null : { value: c })))],
      })),
    ).toBlob();
    downloadBlob(blob, `${b.name.replace(/[^\w]+/g, "-").toLowerCase()}-record.xlsx`);
    toast.success("Batch record downloaded", { description: "Students, teachers and payments in one workbook." });
  };

  return (
    <>
      <PageHeader
        title="Batches"
        description="Vacation Classes run as batches — one per school holiday. Each batch keeps its own classes, enrolments, results and payments."
        breadcrumbs={[{ label: "Vacation Classes", href: "/school/vacation" }, { label: "Batches" }]}
        actions={
          <Button onClick={() => setSetup({})}>
            <Plus /> Set up next batch
          </Button>
        }
      />

      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base">How a batch runs</CardTitle>
          <CardDescription>Students and teachers keep one account across batches, so returning students carry their history. Closing a batch never deletes records.</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="grid gap-2 sm:grid-cols-5">
            {LIFECYCLE.map(([title, body], i) => (
              <li key={title} className="rounded-lg border p-3">
                <p className="text-xs font-medium text-muted-foreground">Step {i + 1}</p>
                <p className="font-semibold">{title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{body}</p>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {needsClosing.length > 0 && (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
          <p>
            {needsClosing.map((b) => b.name).join(", ")} {needsClosing.length === 1 ? "has" : "have"} ended. Close {needsClosing.length === 1 ? "it" : "them"} to cancel unpaid registrations, release teachers and send students their reports before the next batch starts.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {batches.map((b) => {
          const state = batchState(b, now);
          const sum = batchSummary(db, b.id);
          const empty = !db.classes.some((c) => c.sessionId === b.id);
          const co = b.batch?.closeout;
          return (
            <Card key={b.id}>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2">
                  <span className="text-muted-foreground">#{b.batch?.number ?? "—"}</span> {b.name}
                  <StatusBadge tone={STATE_TONE[state]}>{BATCH_STATE_LABEL[state]}</StatusBadge>
                </CardTitle>
                <CardDescription className="flex flex-wrap gap-x-4 gap-y-1">
                  <span className="inline-flex items-center gap-1">
                    <CalendarRange className="size-3.5" /> {fmtDate(b.startDate)} – {fmtDate(b.endDate)}
                  </span>
                  {b.batch?.registrationOpens && (
                    <span>
                      Registration {fmtDate(b.batch.registrationOpens)}
                      {b.batch.registrationCloses ? ` – ${fmtDate(b.batch.registrationCloses)}` : ""}
                    </span>
                  )}
                </CardDescription>
                <CardAction className="hidden sm:block">
                  <BatchActions b={b} state={state} empty={empty} onView={() => setSession(schoolId!, b.id)} onDownload={() => download(b)} onClose={() => setClosing(b)} onSetup={() => setSetup({ existing: b })} />
                </CardAction>
              </CardHeader>
              <CardContent className="space-y-3">
                {empty ? (
                  <p className="text-sm text-muted-foreground">Nothing set up yet — copy the classes, subjects and prices from an earlier batch to open registration.</p>
                ) : (
                  <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4 lg:grid-cols-7">
                    <Stat label="Students" value={sum.students} hint={sum.returning ? `${sum.returning} returning` : undefined} />
                    <Stat label="Awaiting payment" value={sum.awaitingPayment} />
                    <Stat label="Revenue" value={fmtGhs(sum.revenue)} />
                    <Stat label="Teachers" value={sum.teachers.length} />
                    <Stat label="Live classes held" value={sum.classesHeld} />
                    <Stat label="Attendance" value={sum.attendanceRate == null ? "—" : `${Math.round(sum.attendanceRate)}%`} />
                    <Stat label="Average score" value={sum.averageScore == null ? "—" : `${Math.round(sum.averageScore)}%`} />
                  </dl>
                )}
                {co && (
                  <div className="rounded-lg bg-muted/50 p-3 text-sm">
                    <p className="flex items-center gap-1.5 font-medium">
                      <Archive className="size-4" /> Closed {fmtDate(co.closedAt)} by {co.closedBy}
                    </p>
                    <ul className="mt-1 grid gap-x-6 gap-y-0.5 text-muted-foreground sm:grid-cols-2">
                      <li>{co.studentsCompleted} students completed{co.reportsSent ? " · reports sent" : ""}</li>
                      <li>{co.unpaidCancelled} unpaid registrations cancelled</li>
                      <li>
                        {co.teachersReleased} teachers released{co.teachersDeactivated ? `, ${co.teachersDeactivated} deactivated` : ""}
                      </li>
                      <li>{co.accessUntil ? `Students can open this batch until ${fmtDate(co.accessUntil)}` : "Students keep access to this batch"}</li>
                      {co.invitedTo && <li>Students invited to {db.academicSessions.find((s) => s.id === co.invitedTo)?.name}</li>}
                    </ul>
                  </div>
                )}
                <div className="sm:hidden">
                  <BatchActions b={b} state={state} empty={empty} onView={() => setSession(schoolId!, b.id)} onDownload={() => download(b)} onClose={() => setClosing(b)} onSetup={() => setSetup({ existing: b })} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {closing && <CloseDialog batch={closing} batches={batches} now={now} onDone={() => setClosing(null)} />}
      {setup && <SetupDialog existing={setup.existing} batches={batches} onDone={() => setSetup(null)} />}
    </>
  );
}

function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-semibold tabular-nums">{value}</dd>
      {hint && <dd className="text-xs text-muted-foreground">{hint}</dd>}
    </div>
  );
}

function BatchActions({ b, state, empty, onView, onDownload, onClose, onSetup }: { b: AcademicSession; state: BatchState; empty: boolean; onView: () => void; onDownload: () => void; onClose: () => void; onSetup: () => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {empty && state !== "closed" ? (
        <Button size="sm" onClick={onSetup}>
          <Layers /> Set up
        </Button>
      ) : (
        <>
          <Button size="sm" variant="outline" onClick={onView} aria-label={`View ${b.name}`}>
            <Eye /> View
          </Button>
          <Button size="sm" variant="outline" onClick={onDownload}>
            <Download /> Batch record
          </Button>
        </>
      )}
      {state !== "closed" && !empty && (
        <Button size="sm" variant={state === "ended" ? "default" : "outline"} onClick={onClose}>
          <CheckCircle2 /> Close batch
        </Button>
      )}
    </div>
  );
}

const ACCESS = [
  { value: "30", label: "30 days" },
  { value: "60", label: "60 days" },
  { value: "90", label: "90 days" },
  { value: "none", label: "No limit" },
];

function CloseDialog({ batch, batches, now, onDone }: { batch: AcademicSession; batches: AcademicSession[]; now: number; onDone: () => void }) {
  const db = useStore();
  const sum = batchSummary(db, batch.id);
  const next = batches.filter((b) => b.status !== "closed" && b.startDate > batch.startDate).sort((a, b) => a.startDate.localeCompare(b.startDate));
  const [access, setAccess] = useState("60");
  const [reports, setReports] = useState(true);
  const [invite, setInvite] = useState(next[0]?.id ?? "");
  const [deactivate, setDeactivate] = useState(false);
  const early = batchState(batch, now) !== "ended";
  const checks = [
    { ok: !early, text: early ? `The batch runs until ${fmtDate(batch.endDate)} — closing early ends it now.` : "Batch dates have passed." },
    { ok: sum.ungraded === 0, text: sum.ungraded ? `${sum.ungraded} submissions are still ungraded — grade them first so reports are complete.` : "All submissions graded." },
    { ok: sum.awaitingPayment === 0, text: sum.awaitingPayment ? `${sum.awaitingPayment} unpaid registrations will be cancelled.` : "No unpaid registrations." },
    { ok: sum.classesScheduledAfterEnd === 0, text: sum.classesScheduledAfterEnd ? `${sum.classesScheduledAfterEnd} live classes scheduled after the end date will be cancelled.` : "No live classes left scheduled." },
  ];

  const confirm = () => {
    const co = closeBatch(batch.id, { accessDays: access === "none" ? null : Number(access), sendReports: reports, inviteTo: invite || undefined, deactivateNonReturning: deactivate });
    if (co) toast.success(`${batch.name} closed`, { description: `${co.studentsCompleted} students completed · ${co.teachersReleased} teachers released.` });
    onDone();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onDone()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Close {batch.name}</DialogTitle>
          <DialogDescription>The batch becomes read-only. Nothing is deleted — results, attendance, recordings and payments stay on record.</DialogDescription>
        </DialogHeader>
        <ul className="space-y-1.5 text-sm">
          {checks.map((c) => (
            <li key={c.text} className="flex items-start gap-2">
              {c.ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" /> : <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />}
              <span>{c.text}</span>
            </li>
          ))}
        </ul>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="access">Students can still open the batch for</Label>
            <AppSelect id="access" value={access} onChange={setAccess} options={ACCESS} />
            <p className="text-xs text-muted-foreground">To rewatch recordings and download their report. Staff always keep access.</p>
          </div>
          <label className="flex items-start gap-2 text-sm">
            <Checkbox checked={reports} onCheckedChange={(c) => setReports(!!c)} className="mt-0.5" />
            <span>
              Send each student their batch report <span className="block text-xs text-muted-foreground">Results, attendance and minutes in live classes.</span>
            </span>
          </label>
          <div className="space-y-1.5">
            <Label htmlFor="invite">Invite students to the next batch</Label>
            <AppSelect id="invite" value={invite || "none"} onChange={(v) => setInvite(v === "none" ? "" : v)} options={[{ value: "none", label: "Don't invite" }, ...next.map((b) => ({ value: b.id, label: b.name }))]} />
          </div>
          <label className="flex items-start gap-2 text-sm">
            <Checkbox checked={deactivate} onCheckedChange={(c) => setDeactivate(!!c)} className="mt-0.5" />
            <span>
              Deactivate teachers not assigned to a later batch
              <span className="block text-xs text-muted-foreground">
                {sum.teachers.length} teachers taught this batch. Their assignments end either way. Deactivated teachers keep their records and history but are left out of Teacher Matching until reactivated.
              </span>
            </span>
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onDone}>
            Cancel
          </Button>
          <Button onClick={confirm}>
            <Archive /> Close batch
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SetupDialog({ existing, batches, onDone }: { existing?: AcademicSession; batches: AcademicSession[]; onDone: () => void }) {
  const db = useStore();
  const setSession = useStore((s) => s.setSession);
  const sources = batches.filter((b) => b.id !== existing?.id && db.classes.some((c) => c.sessionId === b.id));
  const [name, setName] = useState(existing?.name ?? "");
  const [startDate, setStart] = useState(existing?.startDate ?? "");
  const [endDate, setEnd] = useState(existing?.endDate ?? "");
  const [opens, setOpens] = useState(existing?.batch?.registrationOpens ?? "");
  const [closes, setCloses] = useState(existing?.batch?.registrationCloses ?? "");
  const [from, setFrom] = useState(sources[0]?.id ?? "none");
  const [copy, setCopy] = useState({ classes: true, subjects: true, pricing: true, bundles: true });
  const problem = !name.trim()
    ? "Give the batch a name."
    : !startDate || !endDate
      ? "Set the start and end dates."
      : endDate < startDate
        ? "The batch must end after it starts."
        : opens && closes && closes < opens
          ? "Registration must close after it opens."
          : closes && closes > endDate
            ? "Registration should close before the batch ends."
            : batches.some((b) => b.id !== existing?.id && b.startDate <= endDate && startDate <= b.endDate)
              ? `These dates overlap ${batches.find((b) => b.id !== existing?.id && b.startDate <= endDate && startDate <= b.endDate)!.name}.`
              : null;

  const save = () => {
    if (problem) return;
    const s = setupBatch({ name, startDate, endDate, registrationOpens: opens || startDate, registrationCloses: closes || startDate, copyFrom: from === "none" ? undefined : from, copy, existingSessionId: existing?.id });
    if (s) {
      toast.success(`${s.name} is set up`, { description: "Assign teachers in Teacher Matching once students register." });
      setSession(s.schoolId, s.id);
    }
    onDone();
  };

  const toggle = (k: keyof typeof copy, label: string, needs?: keyof typeof copy) => (
    <label className="flex items-center gap-2 text-sm">
      <Checkbox checked={copy[k] && (!needs || copy[needs])} disabled={from === "none" || (!!needs && !copy[needs])} onCheckedChange={(c) => setCopy({ ...copy, [k]: !!c })} /> {label}
    </label>
  );

  return (
    <Dialog open onOpenChange={(o) => !o && onDone()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{existing ? `Set up ${existing.name}` : "Set up next batch"}</DialogTitle>
          <DialogDescription>Starts empty of students. Returning students register again with their existing account.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="bname">Name</Label>
            <Input id="bname" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Easter Vacation Classes 2027" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="bstart">Classes start</Label>
              <Input id="bstart" type="date" value={startDate} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bend">Classes end</Label>
              <Input id="bend" type="date" value={endDate} onChange={(e) => setEnd(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bopen">Registration opens</Label>
              <Input id="bopen" type="date" value={opens} onChange={(e) => setOpens(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bclose">Registration closes</Label>
              <Input id="bclose" type="date" value={closes} onChange={(e) => setCloses(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bfrom">Copy from</Label>
            <AppSelect id="bfrom" value={from} onChange={setFrom} options={[{ value: "none", label: "Start from scratch" }, ...sources.map((b) => ({ value: b.id, label: b.name }))]} />
            <div className="grid grid-cols-2 gap-2 pt-1">
              {toggle("classes", "Classes")}
              {toggle("subjects", "Subjects")}
              {toggle("pricing", "Subject prices", "subjects")}
              {toggle("bundles", "Bundles", "subjects")}
            </div>
            <p className="flex items-center gap-1.5 pt-1 text-xs text-muted-foreground">
              <Users className="size-3.5" /> Students, enrolments, teacher assignments and results are never copied.
            </p>
          </div>
          {problem && (name || startDate || endDate) && <p className="text-sm text-destructive">{problem}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onDone}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!!problem}>
            <Layers /> {existing ? "Save batch" : "Create batch"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

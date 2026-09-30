"use client";

import { useState } from "react";
import { MessageSquareText } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/common/page-header";
import { StudentName } from "@/components/common/student-name";
import { Field } from "@/components/forms/field";
import { DataTable } from "@/components/tables/data-table";
import { VacationGuard } from "@/components/vacation/vacation-guard";
import { DEFAULT_GUARDIAN_ALERTS } from "@/lib/guardian-alerts";
import { fmtDateTime } from "@/lib/helpers";
import { useTenant } from "@/lib/session";
import { useStore } from "@/lib/store";
import type { GuardianAlertSettings, SmsMessage } from "@/lib/types";

const KIND_LABEL: Record<SmsMessage["kind"], string> = { live_absent: "Not joined", live_left_early: "Left early" };

/** Guardian SMS alerts for live classes (spec section 49.1.8): settings and the log of texts sent. */
export default function GuardianAlertsPage() {
  return (
    <VacationGuard>
      <Alerts />
    </VacationGuard>
  );
}

function Alerts() {
  const { school } = useTenant();
  const db = useStore();
  const saved = school?.guardianAlerts ?? DEFAULT_GUARDIAN_ALERTS;
  const [draft, setDraft] = useState<GuardianAlertSettings>(saved);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const valid = draft.lateAfterMinutes >= 1 && draft.lateAfterMinutes <= 60 && draft.awayMinutes >= 1 && draft.awayMinutes <= 30;
  const rows = db.smsMessages.filter((m) => m.schoolId === school?.id).sort((a, b) => b.sentAt.localeCompare(a.sentAt));
  const live = (id: string) => db.liveSessions.find((l) => l.id === id);

  return (
    <>
      <PageHeader title="Guardian Alerts" description="Parents and guardians get a text when a student misses a live class or leaves it early." breadcrumbs={[{ label: "Vacation Classes", href: "/school/vacation" }, { label: "Guardian Alerts" }]} />
      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>When to text</CardTitle>
            <CardDescription>One text of each kind per student per class, sent to the guardian phone on the registration. Nothing is sent during a break or for a student the teacher removed.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center justify-between gap-4">
              <span className="text-sm font-medium">Send guardian alerts</span>
              <Switch checked={draft.enabled} onCheckedChange={(v) => setDraft((d) => ({ ...d, enabled: v }))} />
            </label>
            <Field label="Not joined after (minutes)" htmlFor="late" hint="Counted from when the teacher starts the class.">
              <Input id="late" numeric="integer" min={1} max={60} className="w-28" value={String(draft.lateAfterMinutes)} disabled={!draft.enabled} onChange={(e) => setDraft((d) => ({ ...d, lateAfterMinutes: Number(e.target.value) || 0 }))} />
            </Field>
            <Field label="Left and away for (minutes)" htmlFor="away" hint="A short drop-out isn't texted, and nor is leaving in the last few minutes of the class.">
              <Input id="away" numeric="integer" min={1} max={30} className="w-28" value={String(draft.awayMinutes)} disabled={!draft.enabled} onChange={(e) => setDraft((d) => ({ ...d, awayMinutes: Number(e.target.value) || 0 }))} />
            </Field>
            <div className="space-y-2 rounded-lg bg-muted/60 p-3 text-xs">
              <p className="font-medium">What guardians receive</p>
              <p>“{school?.name}: Ama has not joined today&apos;s Core Mathematics live class, which started at 5:00 PM. Please remind them to join.”</p>
              <p>“{school?.name}: Ama left today&apos;s Core Mathematics live class at 5:24 PM, before it ends at 6:00 PM, and has not rejoined.”</p>
            </div>
          </CardContent>
          <CardFooter className="justify-end gap-2">
            <Button variant="outline" disabled={!dirty} onClick={() => setDraft(saved)}>
              Discard
            </Button>
            <Button
              disabled={!dirty || !valid}
              onClick={() => {
                const st = useStore.getState();
                st.update("schools", school!.id, { guardianAlerts: draft });
                st.audit({ schoolId: school!.id, action: "Guardian alert settings updated", target: draft.enabled ? `Not joined after ${draft.lateAfterMinutes} min · away ${draft.awayMinutes} min` : "Alerts off", category: "school" });
                toast.success("Guardian alert settings saved");
              }}
            >
              Save
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquareText className="size-4" /> Texts sent
            </CardTitle>
            <CardDescription>{rows.length} text{rows.length === 1 ? "" : "s"}. In production they go through the SMS provider and show whether they were delivered.</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              rows={rows}
              search={(m) => {
                const st = db.students.find((x) => x.id === m.studentId);
                return `${st?.firstName} ${st?.lastName} ${m.to} ${live(m.liveSessionId)?.title}`;
              }}
              filters={[{ key: "kind", label: "Kinds", options: Object.entries(KIND_LABEL).map(([value, label]) => ({ value, label })), predicate: (m: SmsMessage, v: string) => m.kind === v }]}
              emptyTitle="No texts yet"
              emptyDescription="They appear here as live classes run."
              columns={[
                { key: "at", header: "Sent", sort: (m) => m.sentAt, cell: (m) => <span className="whitespace-nowrap">{fmtDateTime(m.sentAt)}</span> },
                { key: "student", header: "Student", cell: (m) => <StudentName student={db.students.find((x) => x.id === m.studentId)} /> },
                { key: "class", header: "Live class", cell: (m) => live(m.liveSessionId)?.title ?? "—" },
                { key: "kind", header: "Why", cell: (m) => <Badge variant={m.kind === "live_absent" ? "secondary" : "outline"}>{KIND_LABEL[m.kind]}</Badge> },
                { key: "to", header: "To", cell: (m) => <span className="whitespace-nowrap tabular-nums">{m.to}</span> },
                { key: "body", header: "Message", cell: (m) => <span className="line-clamp-2 max-w-md text-xs text-muted-foreground">{m.body}</span> },
              ]}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}

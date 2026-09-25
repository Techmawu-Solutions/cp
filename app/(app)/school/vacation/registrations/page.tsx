"use client";

import { useMemo, useState } from "react";
import { Banknote, Receipt, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { UserAvatar } from "@/components/common/user-avatar";
import { DataTable } from "@/components/tables/data-table";
import { ExportButton } from "@/components/tables/export-button";
import { VacationGuard } from "@/components/vacation/vacation-guard";
import { useSchoolData } from "@/lib/queries";
import { useStore } from "@/lib/store";
import { PAYMENT_LABEL, cancelRegistration, confirmPayment, fmtGhs } from "@/lib/vacation";
import { fmtDateTime } from "@/lib/helpers";
import type { VacationRegistration } from "@/lib/types";

const STATUS = { paid: ["active", "Paid"], awaiting_payment: ["pending", "Awaiting payment"], cancelled: ["cancelled", "Cancelled"], refunded: ["archived", "Refunded"] } as const;

/** Registrations & payments (spec §49.1.6). */
export default function VacationRegistrationsPage() {
  return (
    <VacationGuard>
      <Registrations />
    </VacationGuard>
  );
}

function Registrations() {
  const d = useSchoolData();
  const all = useStore((s) => s.vacationRegistrations);
  const users = useStore((s) => s.users);
  const bundles = useStore((s) => s.vacationBundles);
  const rows = useMemo(() => all.filter((r) => r.sessionId === d.sessionId), [all, d.sessionId]);
  const [receipt, setReceipt] = useState<VacationRegistration | null>(null);
  const [cash, setCash] = useState<VacationRegistration | null>(null);
  const [cancel, setCancel] = useState<VacationRegistration | null>(null);
  const name = (r: VacationRegistration) => users.find((u) => u.id === r.userId)?.name ?? "—";
  const pick = (r: VacationRegistration) => (r.bundleId ? bundles.find((b) => b.id === r.bundleId)?.name ?? "Bundle" : `${r.subjectIds.length} subjects`);

  return (
    <>
      <PageHeader title="Registrations & Payments" description={`${rows.filter((r) => r.status === "paid").length} paid · ${fmtGhs(rows.filter((r) => r.status === "paid").reduce((a, r) => a + r.amount, 0))} received for ${d.session.label}.`} breadcrumbs={[{ label: "Vacation Classes", href: "/school/vacation" }, { label: "Registrations" }]} />
      <DataTable
        rows={rows}
        search={(r) => `${name(r)} ${r.homeSchoolName ?? ""} ${r.payment?.reference ?? ""}`}
        searchPlaceholder="Search student, school or receipt no.…"
        initialSort={{ key: "date", dir: "desc" }}
        filters={[
          { key: "status", label: "Statuses", options: Object.entries(STATUS).map(([k, v]) => ({ value: k, label: v[1] })), predicate: (r, v) => r.status === v },
          { key: "class", label: "Classes", options: d.classes.map((c) => ({ value: c.id, label: c.name })), predicate: (r, v) => r.classId === v },
          { key: "source", label: "Students", options: [{ value: "new", label: "New to the platform" }, { value: "existing", label: "Existing accounts" }], predicate: (r, v) => r.source === v },
        ]}
        toolbar={<ExportButton filename="vacation-registrations" header={["Student", "Email", "Class", "Selection", "Amount (GHS)", "Status", "Method", "Reference", "Home school", "Registered"]} rows={() => rows.map((r) => [name(r), users.find((u) => u.id === r.userId)?.email, d.byId.class.get(r.classId)?.name, pick(r), r.amount, STATUS[r.status][1], r.payment ? PAYMENT_LABEL[r.payment.method] : "", r.payment?.reference ?? "", r.homeSchoolName ?? "", r.createdAt])} />}
        columns={[
          {
            key: "student",
            header: "Student",
            sort: name,
            cell: (r) => {
              const u = users.find((x) => x.id === r.userId);
              return (
                <div className="flex items-center gap-3">
                  <UserAvatar name={u?.name ?? "?"} color={u?.avatarColor} size="sm" />
                  <div>
                    <p className="font-medium">{u?.name}</p>
                    <p className="text-xs text-muted-foreground">{r.source === "existing" ? `Existing account · ${r.homeSchoolName ?? "—"}` : `New · ${r.homeSchoolName ?? "school not given"}`}</p>
                  </div>
                </div>
              );
            },
          },
          { key: "class", header: "Class", cell: (r) => d.byId.class.get(r.classId)?.name },
          { key: "pick", header: "Selection", cell: (r) => (<div><p>{pick(r)}</p><p className="max-w-56 truncate text-xs text-muted-foreground">{r.subjectIds.map((id) => d.byId.subject.get(id)?.code).join(", ")}</p></div>) },
          { key: "amount", header: "Amount", sort: (r) => r.amount, cell: (r) => <span className="font-medium tabular-nums">{fmtGhs(r.amount)}</span> },
          { key: "status", header: "Status", sort: (r) => r.status, cell: (r) => <StatusBadge status={STATUS[r.status][0]}>{STATUS[r.status][1]}</StatusBadge> },
          { key: "date", header: "Registered", sort: (r) => r.createdAt, cell: (r) => <span className="text-xs whitespace-nowrap text-muted-foreground">{fmtDateTime(r.createdAt)}</span> },
          {
            key: "act",
            header: "",
            className: "text-right",
            cell: (r) => (
              <div className="flex justify-end gap-1">
                {r.status === "paid" && (
                  <Button size="sm" variant="ghost" onClick={() => setReceipt(r)}>
                    <Receipt /> Receipt
                  </Button>
                )}
                {r.status === "awaiting_payment" && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => setCash(r)}>
                      <Banknote /> Record cash
                    </Button>
                    <Button size="icon-sm" variant="ghost" className="text-destructive" onClick={() => setCancel(r)} aria-label="Cancel registration">
                      <XCircle />
                    </Button>
                  </>
                )}
              </div>
            ),
          },
        ]}
      />
      <Dialog open={!!receipt} onOpenChange={(o) => !o && setReceipt(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Receipt {receipt?.payment?.reference}</DialogTitle>
            <DialogDescription>{receipt && name(receipt)}</DialogDescription>
          </DialogHeader>
          {receipt?.payment && (
            <dl className="space-y-2 text-sm">
              {[
                ["Amount", fmtGhs(receipt.amount)],
                ["Method", PAYMENT_LABEL[receipt.payment.method]],
                ["Paid", fmtDateTime(receipt.payment.paidAt)],
                ...(receipt.payment.phone ? [["Phone", receipt.payment.phone]] : []),
                ...(receipt.payment.last4 ? [["Card", `•••• ${receipt.payment.last4}`]] : []),
                ["Class", d.byId.class.get(receipt.classId)?.name ?? ""],
                ["Subjects", receipt.subjectIds.map((id) => d.byId.subject.get(id)?.name).join(", ")],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="text-right">{v}</dd>
                </div>
              ))}
            </dl>
          )}
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={!!cash}
        onOpenChange={(o) => !o && setCash(null)}
        title={`Record ${cash ? fmtGhs(cash.amount) : ""} cash payment?`}
        description={cash ? `${name(cash)} will be enrolled in ${cash.subjectIds.length} subjects and notified.` : undefined}
        confirmLabel="Record payment"
        onConfirm={() => {
          if (!cash) return;
          confirmPayment(cash.id, { method: "cash" });
          toast.success("Payment recorded — student enrolled");
        }}
      />
      <ConfirmDialog open={!!cancel} onOpenChange={(o) => !o && setCancel(null)} title="Cancel this registration?" description="The student hasn't paid, so nothing is refunded." destructive confirmLabel="Cancel registration" onConfirm={() => cancel && (cancelRegistration(cancel.id), toast.success("Registration cancelled"))} />
    </>
  );
}

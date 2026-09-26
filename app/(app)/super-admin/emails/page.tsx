"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/common/page-header";
import { RequirePermission } from "@/components/layout/app-shell";
import { DataTable } from "@/components/tables/data-table";
import { useStore } from "@/lib/store";
import { fmtDateTime } from "@/lib/helpers";
import type { EmailMessage } from "@/lib/types";

/**
 * Every email the platform sent, e.g. "live class started" alerts. The
 * prototype has no mail server, so this outbox is where they land.
 */
export default function EmailOutboxPage() {
  const emails = useStore((s) => s.emails);
  const schools = useStore((s) => s.schools);
  const [open, setOpen] = useState<EmailMessage | null>(null);
  return (
    <RequirePermission perm="users.update">
      <PageHeader title="Email Outbox" description="Emails sent to users, newest first — for example live-class alerts to students." breadcrumbs={[{ label: "System" }, { label: "Email Outbox" }]} />
      <DataTable
        rows={emails}
        search={(e) => `${e.to} ${e.subject}`}
        searchPlaceholder="Search recipient or subject"
        initialSort={{ key: "sent", dir: "desc" }}
        onRowClick={setOpen}
        emptyTitle="No emails sent yet"
        emptyDescription="Emails appear here when, for example, a teacher starts a live class."
        columns={[
          { key: "sent", header: "Sent", sort: (e) => e.sentAt, cell: (e) => <span className="whitespace-nowrap tabular-nums">{fmtDateTime(e.sentAt)}</span> },
          { key: "to", header: "To", sort: (e) => e.to, cell: (e) => <span className="break-all">{e.to}</span> },
          { key: "subject", header: "Subject", cell: (e) => <span className="font-medium">{e.subject}</span> },
          { key: "school", header: "School", cell: (e) => schools.find((s) => s.id === e.schoolId)?.shortName ?? "—" },
        ]}
      />
      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="size-4 text-primary" /> {open?.subject}
            </DialogTitle>
            <DialogDescription>
              To {open?.to} · {open && fmtDateTime(open.sentAt)}
            </DialogDescription>
          </DialogHeader>
          <p className="rounded-lg bg-muted p-3 text-sm whitespace-pre-wrap">{open?.body}</p>
        </DialogContent>
      </Dialog>
    </RequirePermission>
  );
}

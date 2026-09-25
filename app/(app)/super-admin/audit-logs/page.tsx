"use client";

import { PageHeader } from "@/components/common/page-header";
import { RequirePermission } from "@/components/layout/app-shell";
import { AuditLogTable } from "@/components/admin/audit-log-table";
import { useStore } from "@/lib/store";

export default function AuditLogsPage() {
  const logs = useStore((s) => s.auditLogs);
  return (
    <RequirePermission perm="users.update">
      <PageHeader title="Audit Logs" description="A tamper-evident record of who did what, across every school and the platform." breadcrumbs={[{ label: "System" }, { label: "Audit Logs" }]} />
      <AuditLogTable logs={logs} showSchool />
    </RequirePermission>
  );
}

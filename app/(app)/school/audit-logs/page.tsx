"use client";

import { PageHeader } from "@/components/common/page-header";
import { RequirePermission } from "@/components/layout/app-shell";
import { AuditLogTable } from "@/components/admin/audit-log-table";
import { useStore } from "@/lib/store";
import { useTenant } from "@/lib/session";

export default function SchoolAuditLogsPage() {
  const logs = useStore((s) => s.auditLogs);
  const { schoolId } = useTenant();
  return (
    <RequirePermission perm="users.update">
      <PageHeader title="Audit Logs" description="Everything that changed in your school, and who changed it." />
      <AuditLogTable logs={logs.filter((l) => l.schoolId === schoolId)} />
    </RequirePermission>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/common/page-header";
import { DataTable } from "@/components/tables/data-table";
import { ExportButton } from "@/components/tables/export-button";
import { StatusBadge } from "@/components/common/status-badge";
import { UserAvatar } from "@/components/common/user-avatar";
import { TeacherForm } from "@/components/forms/people-forms";
import { RequirePermission } from "@/components/layout/app-shell";
import { useSchoolData } from "@/lib/queries";
import { useCurrentUser } from "@/lib/session";
import { useStore } from "@/lib/store";
import { createTeacher } from "@/lib/actions";
import { fmtAgo } from "@/lib/helpers";

export default function TeachersPage() {
  return (
    <RequirePermission perm="teachers.view">
      <Teachers />
    </RequirePermission>
  );
}

function Teachers() {
  const d = useSchoolData();
  const me = useCurrentUser();
  const router = useRouter();
  const users = useStore((s) => s.users);
  const [creating, setCreating] = useState(false);
  const user = (id: string) => users.find((u) => u.id === id);
  const load = (tid: string) => d.teachingAssignments.filter((t) => t.teacherId === tid);

  return (
    <>
      <PageHeader
        title="Teachers"
        description={`${d.teachers.length} teachers at ${d.school?.shortName}. Teaching loads reflect ${d.session.label}.`}
        breadcrumbs={[{ label: "Teachers" }]}
        actions={
          me?.can("teachers.create") && (
            <Button onClick={() => setCreating(true)}>
              <Plus /> Add teacher
            </Button>
          )
        }
      />
      <DataTable
        rows={d.teachers}
        search={(t) => `${t.firstName} ${t.lastName} ${t.staffNumber} ${t.specialization}`}
        onRowClick={(t) => router.push(`/school/teachers/${t.id}`)}
        initialSort={{ key: "name", dir: "asc" }}
        filters={[{ key: "status", label: "Statuses", options: [{ value: "active", label: "Active" }, { value: "on_leave", label: "On leave" }, { value: "inactive", label: "Inactive" }], predicate: (t, v) => t.status === v }]}
        toolbar={<ExportButton filename="teachers" header={["Staff ID", "Name", "Specialisation", "Email", "Phone", "Classes", "Status"]} rows={() => d.teachers.map((t) => [t.staffNumber, `${t.title} ${t.firstName} ${t.lastName}`, t.specialization, user(t.userId)?.email, t.phone, load(t.id).length, t.status])} />}
        columns={[
          {
            key: "name",
            header: "Teacher",
            sort: (t) => `${t.lastName} ${t.firstName}`,
            cell: (t) => (
              <div className="flex items-center gap-3">
                <UserAvatar name={`${t.firstName} ${t.lastName}`} color={user(t.userId)?.avatarColor} size="sm" />
                <div>
                  <p className="font-medium">
                    {t.title} {t.firstName} {t.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">{user(t.userId)?.email}</p>
                </div>
              </div>
            ),
          },
          { key: "staff", header: "Staff ID", sort: (t) => t.staffNumber, cell: (t) => <code className="text-xs">{t.staffNumber}</code> },
          { key: "spec", header: "Specialisation", cell: (t) => t.specialization },
          { key: "load", header: "Classes taught", sort: (t) => load(t.id).length, cell: (t) => load(t.id).length, className: "tabular-nums" },
          { key: "last", header: "Last active", cell: (t) => { const la = user(t.userId)?.lastActive; return la ? <span className="text-xs text-muted-foreground">{fmtAgo(la)}</span> : <StatusBadge status="invited" />; } },
          { key: "status", header: "Status", cell: (t) => <StatusBadge status={t.status} /> },
        ]}
      />
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add teacher</DialogTitle>
            <DialogDescription>They&apos;ll receive an email invitation. Assign subjects from the Subjects page.</DialogDescription>
          </DialogHeader>
          <TeacherForm
            suggestedNumber={`${d.school?.shortName}/STF/${String(d.teachers.length + 1).padStart(3, "0")}`}
            takenEmails={users.map((u) => u.email.toLowerCase())}
            onCancel={() => setCreating(false)}
            onSubmit={(v) => {
              const t = createTeacher(d.schoolId!, v);
              toast.success(`${v.title} ${v.lastName} added`);
              setCreating(false);
              router.push(`/school/teachers/${t.id}`);
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

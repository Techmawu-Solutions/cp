"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PageHeader } from "@/components/common/page-header";
import { DataTable } from "@/components/tables/data-table";
import { StatusBadge } from "@/components/common/status-badge";
import { ClassForm } from "@/components/academic/forms";
import { SessionBanner, useSessionEditable } from "@/components/academic/session-banner";
import { RequirePermission } from "@/components/layout/app-shell";
import { useSchoolData } from "@/lib/queries";
import { useCurrentUser, teacherName } from "@/lib/session";
import { useStore } from "@/lib/store";
import { uid } from "@/lib/helpers";

export default function ClassesPage() {
  return (
    <RequirePermission perm="classes.view">
      <Classes />
    </RequirePermission>
  );
}

function Classes() {
  const d = useSchoolData();
  const me = useCurrentUser();
  const router = useRouter();
  const editable = useSessionEditable();
  const [creating, setCreating] = useState(false);
  const size = (id: string) => d.placements.filter((p) => p.classId === id).length;

  return (
    <>
      <PageHeader
        title="Classes"
        description={`Classes in ${d.session.label}. Open a class to manage its students and subjects.`}
        breadcrumbs={[{ label: "Academic" }, { label: "Classes" }]}
        actions={
          editable &&
          me?.can("classes.create") && (
            <Button onClick={() => setCreating(true)} disabled={d.programmes.length === 0} title={d.programmes.length === 0 ? "Create a programme first" : undefined}>
              <Plus /> Add class
            </Button>
          )
        }
      />
      <SessionBanner />
      <DataTable
        rows={d.classes}
        search={(c) => c.name}
        onRowClick={(c) => router.push(`/school/classes/${c.id}`)}
        initialSort={{ key: "name", dir: "asc" }}
        filters={[
          { key: "prog", label: "Programmes", options: d.programmes.map((p) => ({ value: p.id, label: p.name })), predicate: (c, v) => c.programmeId === v },
          { key: "level", label: "Levels", options: [...new Set(d.classes.map((c) => c.level))].map((l) => ({ value: l, label: l })), predicate: (c, v) => c.level === v },
        ]}
        emptyTitle="No classes in this session"
        columns={[
          { key: "name", header: "Class", sort: (c) => c.name, cell: (c) => <span className="font-medium">{c.name}</span> },
          { key: "prog", header: "Programme", sort: (c) => d.byId.programme.get(c.programmeId)?.name ?? "", cell: (c) => d.byId.programme.get(c.programmeId)?.name },
          { key: "level", header: "Level", cell: (c) => c.level },
          { key: "teacher", header: "Class teacher", cell: (c) => teacherName(d.byId.teacher.get(c.classTeacherId ?? "")) },
          { key: "subjects", header: "Subjects", cell: (c) => new Set(d.teachingAssignments.filter((t) => t.classId === c.id).map((t) => t.subjectId)).size, className: "tabular-nums" },
          {
            key: "size",
            header: "Students",
            sort: (c) => size(c.id),
            cell: (c) => (
              <div className="flex min-w-32 items-center gap-2">
                <Progress value={(size(c.id) / c.capacity) * 100} className="flex-1" />
                <span className="text-xs tabular-nums">
                  {size(c.id)}/{c.capacity}
                </span>
              </div>
            ),
          },
          { key: "status", header: "Status", cell: (c) => <StatusBadge status={c.status} /> },
        ]}
      />
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Add class</DialogTitle>
            <DialogDescription>For {d.session.label}.</DialogDescription>
          </DialogHeader>
          <ClassForm
            programmes={d.programmes}
            teachers={d.teachers}
            takenNames={d.classes.map((c) => c.name.toLowerCase())}
            onCancel={() => setCreating(false)}
            onSubmit={(v) => {
              const st = useStore.getState();
              const id = uid("cls");
              st.insert("classes", { id, schoolId: d.schoolId!, sessionId: d.sessionId!, name: v.name.trim(), programmeId: v.programmeId, level: v.level, classTeacherId: v.classTeacherId || undefined, capacity: v.capacity, status: v.status });
              st.audit({ schoolId: d.schoolId, action: "Class created", target: v.name, category: "academic" });
              toast.success(`${v.name} created`);
              setCreating(false);
              router.push(`/school/classes/${id}`);
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

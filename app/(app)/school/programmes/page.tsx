"use client";

import { useState } from "react";
import { MessageSquarePlus, Pencil, Plus, Trash2 } from "lucide-react";
import { CataloguePicker, MyCatalogueRequests, RequestDialog } from "@/components/academic/catalogue-picker";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PageHeader } from "@/components/common/page-header";
import { DataTable } from "@/components/tables/data-table";
import { StatusBadge } from "@/components/common/status-badge";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { ProgrammeForm } from "@/components/academic/forms";
import { SessionBanner, useSessionEditable } from "@/components/academic/session-banner";
import { RequirePermission } from "@/components/layout/app-shell";
import { useSchoolData } from "@/lib/queries";
import { useCurrentUser } from "@/lib/session";
import { useStore } from "@/lib/store";
import { uid } from "@/lib/helpers";
import type { Programme } from "@/lib/types";

export default function ProgrammesPage() {
  return (
    <RequirePermission perm="programmes.view">
      <Programmes />
    </RequirePermission>
  );
}

function Programmes() {
  const d = useSchoolData();
  const me = useCurrentUser();
  const editable = useSessionEditable();
  const [editing, setEditing] = useState<Programme | "new" | null>(null);
  const [deleting, setDeleting] = useState<Programme | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const classCount = (id: string) => d.classes.filter((c) => c.programmeId === id).length;
  const studentCount = (id: string) => d.placements.filter((p) => d.byId.class.get(p.classId)?.programmeId === id).length;

  return (
    <>
      <PageHeader
        title="Programmes"
        description={`Programmes offered in ${d.session.label}.`}
        breadcrumbs={[{ label: "Academic" }, { label: "Programmes" }]}
        actions={
          editable &&
          me?.can("programmes.create") && (
            <>
              <Button variant="outline" onClick={() => setRequestOpen(true)}>
                <MessageSquarePlus /> Request a programme
              </Button>
              <Button onClick={() => setPickerOpen(true)}>
                <Plus /> Add programmes
              </Button>
            </>
          )
        }
      />
      <SessionBanner />
      <DataTable
        rows={d.programmes}
        search={(p) => `${p.name} ${p.code}`}
        initialSort={{ key: "name", dir: "asc" }}
        emptyTitle="No programmes in this session"
        emptyDescription="Select the programmes your school offers from the catalogue, or copy them from a previous session."
        columns={[
          { key: "name", header: "Programme", sort: (p) => p.name, cell: (p) => (<div><p className="font-medium">{p.name}</p><p className="text-xs text-muted-foreground">{p.description}</p></div>) },
          { key: "code", header: "Code", sort: (p) => p.code, cell: (p) => <code className="text-xs">{p.code}</code> },
          { key: "classes", header: "Classes", sort: (p) => classCount(p.id), cell: (p) => classCount(p.id), className: "tabular-nums" },
          { key: "students", header: "Students", sort: (p) => studentCount(p.id), cell: (p) => studentCount(p.id), className: "tabular-nums" },
          { key: "status", header: "Status", cell: (p) => <StatusBadge status={p.status} /> },
          {
            key: "act",
            header: "",
            className: "text-right",
            cell: (p) =>
              editable && (
                <div className="flex justify-end gap-1">
                  {me?.can("programmes.update") && (
                    <Button size="icon-sm" variant="ghost" onClick={() => setEditing(p)} aria-label="Edit">
                      <Pencil />
                    </Button>
                  )}
                  {me?.can("programmes.delete") && (
                    <Button size="icon-sm" variant="ghost" className="text-destructive" onClick={() => setDeleting(p)} aria-label="Delete">
                      <Trash2 />
                    </Button>
                  )}
                </div>
              ),
          },
        ]}
      />
      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing === "new" ? "Add programme" : "Edit programme"}</DialogTitle>
            <DialogDescription>Belongs to {d.school?.shortName}, {d.session.label}.</DialogDescription>
          </DialogHeader>
          {editing !== null && (
            <ProgrammeForm
              initial={editing === "new" ? undefined : editing}
              lockIdentity={editing !== "new" && !!editing.catalogueId}
              takenCodes={d.programmes.filter((p) => editing === "new" || p.id !== editing.id).map((p) => p.code.toUpperCase())}
              onCancel={() => setEditing(null)}
              onSubmit={(v) => {
                const st = useStore.getState();
                const payload = { ...v, code: v.code.toUpperCase() };
                if (editing === "new") {
                  st.insert("programmes", { id: uid("prg"), schoolId: d.schoolId!, sessionId: d.sessionId!, ...payload });
                  st.audit({ schoolId: d.schoolId, action: "Programme created", target: v.name, category: "academic" });
                } else {
                  st.update("programmes", editing.id, payload);
                  st.audit({ schoolId: d.schoolId, action: "Programme updated", target: v.name, category: "academic" });
                }
                toast.success("Programme saved");
                setEditing(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
      {d.schoolId && d.sessionId && (
        <>
          <CataloguePicker kind="programme" open={pickerOpen} onOpenChange={setPickerOpen} schoolId={d.schoolId} sessionId={d.sessionId} existingCatalogueIds={new Set(d.programmes.map((p) => p.catalogueId))} programmeCodes={d.programmes.map((p) => p.code)} />
          <RequestDialog kind="programme" open={requestOpen} onOpenChange={setRequestOpen} schoolId={d.schoolId} />
          <MyCatalogueRequests kind="programme" schoolId={d.schoolId} />
        </>
      )}
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete ${deleting?.name}?`}
        description={deleting && classCount(deleting.id) > 0 ? `This programme has ${classCount(deleting.id)} classes. Move or delete them first.` : "This can't be undone."}
        destructive
        confirmLabel="Delete"
        onConfirm={() => {
          if (!deleting) return;
          if (classCount(deleting.id) > 0) return toast.error("Programme still has classes");
          const st = useStore.getState();
          st.remove("programmes", deleting.id);
          st.audit({ schoolId: d.schoolId, action: "Programme deleted", target: deleting.name, category: "academic" });
          toast.success("Programme deleted");
        }}
      />
    </>
  );
}

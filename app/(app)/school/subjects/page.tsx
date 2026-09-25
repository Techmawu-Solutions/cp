"use client";

import { useState } from "react";
import { MessageSquarePlus, Pencil, Plus, Trash2, UserCog } from "lucide-react";
import { CataloguePicker, MyCatalogueRequests, RequestDialog } from "@/components/academic/catalogue-picker";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/common/page-header";
import { DataTable } from "@/components/tables/data-table";
import { AppSelect } from "@/components/common/app-select";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Field } from "@/components/forms/field";
import { SubjectForm } from "@/components/academic/forms";
import { SessionBanner, useSessionEditable } from "@/components/academic/session-banner";
import { RequirePermission } from "@/components/layout/app-shell";
import { useSchoolData } from "@/lib/queries";
import { useCurrentUser } from "@/lib/session";
import { useStore } from "@/lib/store";
import { assignTeacher } from "@/lib/actions";
import { uid } from "@/lib/helpers";
import type { Subject } from "@/lib/types";

export default function SubjectsPage() {
  return (
    <RequirePermission perm="subjects.view">
      <Subjects />
    </RequirePermission>
  );
}

function Subjects() {
  const d = useSchoolData();
  const me = useCurrentUser();
  const editable = useSessionEditable();
  const [editing, setEditing] = useState<Subject | "new" | null>(null);
  const [assigning, setAssigning] = useState<Subject | null>(null);
  const [deleting, setDeleting] = useState<Subject | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);

  return (
    <>
      <PageHeader
        title="Subjects"
        description={`Subjects offered in ${d.session.label}, and who teaches them in each class.`}
        breadcrumbs={[{ label: "Academic" }, { label: "Subjects" }]}
        actions={
          editable &&
          me?.can("subjects.create") && (
            <>
              <Button variant="outline" onClick={() => setRequestOpen(true)}>
                <MessageSquarePlus /> Request a subject
              </Button>
              <Button onClick={() => setPickerOpen(true)}>
                <Plus /> Add subjects
              </Button>
            </>
          )
        }
      />
      <SessionBanner />
      <DataTable
        rows={d.subjects}
        search={(s) => `${s.name} ${s.code}`}
        initialSort={{ key: "name", dir: "asc" }}
        filters={[{ key: "prog", label: "Programmes", options: [{ value: "__core", label: "Core subjects" }, ...d.programmes.map((p) => ({ value: p.id, label: p.name }))], predicate: (s, v) => (v === "__core" ? !s.programmeId : s.programmeId === v) }]}
        emptyTitle="No subjects in this session"
        emptyDescription="Select the subjects your school offers from the catalogue."
        columns={[
          { key: "name", header: "Subject", sort: (s) => s.name, cell: (s) => (<span className="flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ background: s.color }} /><span className="font-medium">{s.name}</span></span>) },
          { key: "code", header: "Code", cell: (s) => <code className="text-xs">{s.code}</code> },
          { key: "prog", header: "Programme", cell: (s) => (s.programmeId ? d.byId.programme.get(s.programmeId)?.name : <span className="text-muted-foreground">Core</span>) },
          {
            key: "teachers",
            header: "Teachers → classes",
            cell: (s) => {
              const ta = d.teachingAssignments.filter((t) => t.subjectId === s.id);
              const byTeacher = new Map<string, string[]>();
              ta.forEach((t) => byTeacher.set(t.teacherId, [...(byTeacher.get(t.teacherId) ?? []), d.byId.class.get(t.classId)?.name ?? ""]));
              if (!ta.length) return <span className="text-xs text-muted-foreground">Not assigned</span>;
              return (
                <div className="space-y-1">
                  {[...byTeacher.entries()].map(([tid, classes]) => {
                    const t = d.byId.teacher.get(tid);
                    return (
                      <div key={tid} className="flex flex-wrap items-center gap-1 text-xs">
                        <span className="font-medium">
                          {t?.title} {t?.lastName}:
                        </span>
                        {classes.sort().map((c) => (
                          <Badge key={c} variant="secondary" className="px-1.5 py-0 text-[10px] font-normal">
                            {c}
                          </Badge>
                        ))}
                      </div>
                    );
                  })}
                </div>
              );
            },
          },
          { key: "enrol", header: "Students", sort: (s) => d.enrollments.filter((e) => e.subjectId === s.id).length, cell: (s) => d.enrollments.filter((e) => e.subjectId === s.id).length, className: "tabular-nums" },
          {
            key: "act",
            header: "",
            className: "text-right",
            cell: (s) =>
              editable && (
                <div className="flex justify-end gap-1">
                  {me?.can("subjects.assign") && (
                    <Button size="sm" variant="outline" onClick={() => setAssigning(s)}>
                      <UserCog /> Assign
                    </Button>
                  )}
                  {me?.can("subjects.update") && (
                    <Button size="icon-sm" variant="ghost" onClick={() => setEditing(s)} aria-label="Edit">
                      <Pencil />
                    </Button>
                  )}
                  {me?.can("subjects.delete") && (
                    <Button size="icon-sm" variant="ghost" className="text-destructive" onClick={() => setDeleting(s)} aria-label="Delete">
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
            <DialogTitle>{editing === "new" ? "Add subject" : "Edit subject"}</DialogTitle>
          </DialogHeader>
          {editing !== null && (
            <SubjectForm
              initial={editing === "new" ? undefined : editing}
              lockIdentity={editing !== "new" && !!editing.catalogueId}
              programmes={d.programmes}
              takenCodes={d.subjects.filter((s) => editing === "new" || s.id !== editing.id).map((s) => s.code.toUpperCase())}
              onCancel={() => setEditing(null)}
              onSubmit={(v) => {
                const st = useStore.getState();
                const payload = { ...v, code: v.code.toUpperCase(), programmeId: v.programmeId || undefined };
                if (editing === "new") st.insert("subjects", { id: uid("sub"), schoolId: d.schoolId!, sessionId: d.sessionId!, ...payload });
                else st.update("subjects", editing.id, payload);
                st.audit({ schoolId: d.schoolId, action: editing === "new" ? "Subject created" : "Subject updated", target: v.name, category: "academic" });
                toast.success("Subject saved");
                setEditing(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
      {d.schoolId && d.sessionId && (
        <>
          <CataloguePicker kind="subject" open={pickerOpen} onOpenChange={setPickerOpen} schoolId={d.schoolId} sessionId={d.sessionId} existingCatalogueIds={new Set(d.subjects.map((s) => s.catalogueId))} programmeCodes={d.programmes.map((p) => p.code)} />
          <RequestDialog kind="subject" open={requestOpen} onOpenChange={setRequestOpen} schoolId={d.schoolId} />
          <MyCatalogueRequests kind="subject" schoolId={d.schoolId} />
        </>
      )}
      <AssignTeacherDialog subject={assigning} onClose={() => setAssigning(null)} />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete ${deleting?.name}?`}
        description="Teacher assignments and student registrations for this subject in this session will also be removed."
        destructive
        confirmLabel="Delete"
        onConfirm={() => {
          if (!deleting) return;
          const st = useStore.getState();
          st.removeWhere("teachingAssignments", (t) => t.subjectId === deleting.id);
          st.removeWhere("enrollments", (e) => e.subjectId === deleting.id);
          st.remove("subjects", deleting.id);
          st.audit({ schoolId: d.schoolId, action: "Subject deleted", target: deleting.name, category: "academic" });
          toast.success("Subject deleted");
        }}
      />
    </>
  );
}

/** Spec §20: Subject → Teacher → tick the classes they teach it in. */
function AssignTeacherDialog({ subject, onClose }: { subject: Subject | null; onClose: () => void }) {
  const d = useSchoolData();
  const [teacherId, setTeacherId] = useState("");
  const [classes, setClasses] = useState<Set<string>>(new Set());
  const pickTeacher = (tid: string) => {
    setTeacherId(tid);
    setClasses(new Set(d.teachingAssignments.filter((t) => t.subjectId === subject?.id && t.teacherId === tid).map((t) => t.classId)));
  };
  const eligible = d.classes.filter((c) => !subject?.programmeId || c.programmeId === subject.programmeId);
  const ownerOf = (classId: string) => d.teachingAssignments.find((t) => t.subjectId === subject?.id && t.classId === classId);

  return (
    <Dialog open={!!subject} onOpenChange={(o) => !o && (onClose(), setTeacherId(""), setClasses(new Set()))}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign teacher — {subject?.name}</DialogTitle>
          <DialogDescription>Tick the classes this teacher teaches {subject?.name} in. A class can have one teacher per subject.</DialogDescription>
        </DialogHeader>
        <Field label="Teacher">
          <AppSelect value={teacherId} onChange={pickTeacher} options={d.teachers.map((t) => ({ value: t.id, label: `${t.title} ${t.firstName} ${t.lastName}` }))} placeholder="Select teacher" />
        </Field>
        {teacherId && (
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Classes</p>
            <div className="grid max-h-64 gap-1.5 overflow-y-auto sm:grid-cols-2">
              {eligible.map((c) => {
                const owner = ownerOf(c.id);
                const other = owner && owner.teacherId !== teacherId ? d.byId.teacher.get(owner.teacherId) : null;
                return (
                  <label key={c.id} className="flex items-center gap-2 rounded-md border px-2.5 py-2 text-sm">
                    <Checkbox checked={classes.has(c.id)} onCheckedChange={(v) => setClasses((s) => { const n = new Set(s); if (v) n.add(c.id); else n.delete(c.id); return n; })} />
                    <span className="flex-1">{c.name}</span>
                    {other && <span className="text-[10px] text-amber-700 dark:text-amber-300">replaces {other.lastName}</span>}
                  </label>
                );
              })}
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!teacherId}
            onClick={() => {
              if (!subject) return;
              assignTeacher(d.schoolId!, d.sessionId!, subject.id, teacherId, [...classes]);
              toast.success("Teacher assignment saved");
              onClose();
              setTeacherId("");
            }}
          >
            Save assignment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

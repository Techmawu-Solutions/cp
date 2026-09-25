"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Upload, ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/common/page-header";
import { LinkButton } from "@/components/common/link-button";
import { DataTable } from "@/components/tables/data-table";
import { ExportButton } from "@/components/tables/export-button";
import { StatusBadge } from "@/components/common/status-badge";
import { AppSelect } from "@/components/common/app-select";
import { Field } from "@/components/forms/field";
import { StudentForm } from "@/components/forms/people-forms";
import { SessionBanner, useSessionEditable } from "@/components/academic/session-banner";
import { RequirePermission } from "@/components/layout/app-shell";
import { useSchoolData } from "@/lib/queries";
import { studentName, useCurrentUser } from "@/lib/session";
import { useStore } from "@/lib/store";
import { createStudents, placeStudents } from "@/lib/actions";
import type { Student } from "@/lib/types";

/** Student management (spec §22). */
export default function StudentsPage() {
  return (
    <RequirePermission perm="students.view">
      <Students />
    </RequirePermission>
  );
}

function Students() {
  const d = useSchoolData();
  const me = useCurrentUser();
  const router = useRouter();
  const users = useStore((s) => s.users);
  const editable = useSessionEditable();
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveTo, setMoveTo] = useState("");
  const [autoEnroll, setAutoEnroll] = useState(true);

  const cls = (s: Student) => d.byId.class.get(d.classOf.get(s.id) ?? "");
  const nextNumber = `${d.school?.shortName ?? "STU"}/${String(new Date().getFullYear()).slice(2)}/${String(d.allStudents.length + 1).padStart(4, "0")}`;
  const lastActive = (s: Student) => users.find((u) => u.id === s.userId)?.lastActive;
  const unplaced = d.students.filter((s) => !d.classOf.has(s.id)).length;

  return (
    <>
      <PageHeader
        title="Students"
        description={`Students placed in ${d.session.label} classes${unplaced ? `, plus ${unplaced} new students not yet in a class` : ""}.`}
        breadcrumbs={[{ label: "Students" }]}
        actions={
          editable && (
            <>
              {me?.can("students.import") && (
                <LinkButton href="/school/students/import" variant="outline">
                  <Upload /> Import
                </LinkButton>
              )}
              {me?.can("students.create") && (
                <Button onClick={() => setCreating(true)}>
                  <Plus /> Add student
                </Button>
              )}
            </>
          )
        }
      />
      <SessionBanner />
      <DataTable
        rows={d.students}
        search={(s) => `${s.firstName} ${s.lastName} ${s.studentNumber}`}
        searchPlaceholder="Search name or student ID…"
        onRowClick={(s) => router.push(`/school/students/${s.id}`)}
        selectable={editable}
        selected={selected}
        onSelectedChange={setSelected}
        initialSort={{ key: "name", dir: "asc" }}
        filters={[
          { key: "class", label: "Classes", options: [{ value: "__none", label: "Not in a class" }, ...d.classes.map((c) => ({ value: c.id, label: c.name }))], predicate: (s, v) => (v === "__none" ? !d.classOf.has(s.id) : d.classOf.get(s.id) === v) },
          { key: "gender", label: "Genders", options: [{ value: "F", label: "Female" }, { value: "M", label: "Male" }], predicate: (s, v) => s.gender === v },
        ]}
        toolbar={
          <>
            {selected.size > 0 && editable && (
              <Button variant="outline" onClick={() => setMoveOpen(true)}>
                <ArrowRightLeft /> Assign {selected.size} to class
              </Button>
            )}
            {me?.can("students.export") && (
              <ExportButton
                filename={`students-${d.school?.shortName}`}
                header={["Student ID", "First name", "Last name", "Gender", "Date of birth", "Class", "Guardian", "Guardian phone"]}
                rows={() => d.students.map((s) => [s.studentNumber, s.firstName, s.lastName, s.gender, s.dateOfBirth, cls(s)?.name ?? "", s.guardianName, s.guardianPhone])}
                onExported={(f) => useStore.getState().audit({ schoolId: d.schoolId, action: "Students exported", target: `${d.students.length} records (${f})`, category: "user" })}
              />
            )}
          </>
        }
        emptyTitle="No students in this session"
        emptyAction={<LinkButton href="/school/students/import">Import students</LinkButton>}
        columns={[
          { key: "name", header: "Student", sort: (s) => `${s.lastName} ${s.firstName}`, cell: (s) => <span className="font-medium">{studentName(s)}</span> },
          { key: "num", header: "Student ID", sort: (s) => s.studentNumber, cell: (s) => <code className="text-xs">{s.studentNumber}</code> },
          { key: "class", header: "Class", sort: (s) => cls(s)?.name ?? "~", cell: (s) => cls(s)?.name ?? <StatusBadge tone="amber">Unplaced</StatusBadge> },
          { key: "gender", header: "Gender", cell: (s) => (s.gender === "M" ? "Male" : "Female") },
          { key: "subjects", header: "Subjects", sort: (s) => d.enrollments.filter((e) => e.studentId === s.id).length, cell: (s) => d.enrollments.filter((e) => e.studentId === s.id).length, className: "tabular-nums" },
          { key: "active", header: "Last active", sort: (s) => lastActive(s) ?? "", cell: (s) => { const la = lastActive(s); return la ? <span className="text-xs text-muted-foreground">{new Date(la).toLocaleDateString("en-GB")}</span> : <StatusBadge status="invited" />; } },
        ]}
      />

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add student</DialogTitle>
            <DialogDescription>The student receives login details to access their courses.</DialogDescription>
          </DialogHeader>
          <StudentForm
            classes={d.classes}
            suggestedNumber={nextNumber}
            takenNumbers={d.allStudents.map((s) => s.studentNumber)}
            onCancel={() => setCreating(false)}
            onSubmit={(v) => {
              const [s] = createStudents(d.schoolId!, d.sessionId, [{ ...v, classId: v.classId || undefined }], { autoEnroll: true });
              toast.success(`${v.firstName} ${v.lastName} added`);
              setCreating(false);
              router.push(`/school/students/${s!.id}`);
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={moveOpen} onOpenChange={setMoveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign {selected.size} students to a class</DialogTitle>
            <DialogDescription>Students already in a class this session will be moved.</DialogDescription>
          </DialogHeader>
          <Field label="Class">
            <AppSelect value={moveTo} onChange={setMoveTo} options={d.classes.map((c) => ({ value: c.id, label: `${c.name} (${d.placements.filter((p) => p.classId === c.id).length}/${c.capacity})` }))} placeholder="Select class" />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={autoEnroll} onCheckedChange={(c) => setAutoEnroll(!!c)} /> Register them for the class&apos;s subjects
          </label>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!moveTo}
              onClick={() => {
                placeStudents(d.schoolId!, d.sessionId!, [...selected], moveTo, { autoEnroll });
                toast.success(`${selected.size} students assigned to ${d.byId.class.get(moveTo)?.name}`);
                setSelected(new Set());
                setMoveOpen(false);
              }}
            >
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

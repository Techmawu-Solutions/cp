"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { BookPlus, Pencil, UserMinus, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { StatusBadge } from "@/components/common/status-badge";
import { AppSelect } from "@/components/common/app-select";
import { Field } from "@/components/forms/field";
import { DataTable } from "@/components/tables/data-table";
import { ClassForm } from "@/components/academic/forms";
import { SessionBanner, useSessionEditable } from "@/components/academic/session-banner";
import { RequirePermission } from "@/components/layout/app-shell";
import { useSchoolData } from "@/lib/queries";
import { studentName, teacherName, useCurrentUser } from "@/lib/session";
import { useStore } from "@/lib/store";
import { assignTeacher, enroll, placeStudents } from "@/lib/actions";
import type { Student } from "@/lib/types";

export default function ClassDetailPage() {
  return (
    <RequirePermission perm="classes.view">
      <ClassDetail />
    </RequirePermission>
  );
}

function ClassDetail() {
  const { id } = useParams<{ id: string }>();
  const d = useSchoolData();
  const me = useCurrentUser();
  const router = useRouter();
  const editable = useSessionEditable();
  const cls = d.byId.class.get(id);
  const [editOpen, setEditOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [subjectOpen, setSubjectOpen] = useState(false);
  const [removing, setRemoving] = useState<Set<string>>(new Set());

  const roster = useMemo(() => d.placements.filter((p) => p.classId === id).map((p) => d.byId.student.get(p.studentId)!).filter(Boolean), [d, id]);
  const subjects = useMemo(() => {
    const ta = d.teachingAssignments.filter((t) => t.classId === id);
    return ta.map((t) => ({ id: t.id, subject: d.byId.subject.get(t.subjectId)!, teacher: d.byId.teacher.get(t.teacherId), enrolled: d.enrollments.filter((e) => e.classId === id && e.subjectId === t.subjectId).length })).filter((x) => x.subject);
  }, [d, id]);

  if (!cls) return <EmptyState title="Class not found in this session" description="Classes belong to a single academic session. Switch session or go back to the class list." action={<Button onClick={() => router.push("/school/classes")}>Back to classes</Button>} />;
  const programme = d.byId.programme.get(cls.programmeId);

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Classes", href: "/school/classes" }, { label: cls.name }]}
        title={cls.name}
        description={`${programme?.name} · ${d.session.label} · Class teacher: ${teacherName(d.byId.teacher.get(cls.classTeacherId ?? ""))}`}
        actions={
          editable &&
          me?.can("classes.update") && (
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil /> Edit class
            </Button>
          )
        }
      />
      <SessionBanner />
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card size="sm" className="px-4">
          <p className="text-xs text-muted-foreground">Students</p>
          <p className="text-xl font-semibold">
            {roster.length} <span className="text-sm font-normal text-muted-foreground">/ {cls.capacity}</span>
          </p>
        </Card>
        <Card size="sm" className="px-4">
          <p className="text-xs text-muted-foreground">Subjects</p>
          <p className="text-xl font-semibold">{subjects.length}</p>
        </Card>
        <Card size="sm" className="px-4">
          <p className="text-xs text-muted-foreground">Level</p>
          <p className="text-xl font-semibold">{cls.level}</p>
        </Card>
        <Card size="sm" className="px-4">
          <p className="text-xs text-muted-foreground">Status</p>
          <StatusBadge status={cls.status} className="mt-1.5" />
        </Card>
      </div>

      <Tabs defaultValue="students">
        <TabsList variant="line" className="mb-4">
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="subjects">Subjects & teachers</TabsTrigger>
        </TabsList>
        <TabsContent value="students">
          <DataTable<Student>
            rows={roster}
            search={(s) => `${s.firstName} ${s.lastName} ${s.studentNumber}`}
            onRowClick={(s) => router.push(`/school/students/${s.id}`)}
            selectable={editable}
            selected={removing}
            onSelectedChange={setRemoving}
            initialSort={{ key: "name", dir: "asc" }}
            emptyTitle="No students in this class"
            emptyAction={editable && <Button onClick={() => setAddOpen(true)}>Add students</Button>}
            toolbar={
              editable && (
                <>
                  {removing.size > 0 && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        const st = useStore.getState();
                        st.removeWhere("placements", (p) => p.classId === id && removing.has(p.studentId));
                        st.audit({ schoolId: d.schoolId, action: "Students removed from class", target: `${removing.size} ← ${cls.name}`, category: "academic" });
                        toast.success(`${removing.size} students removed from ${cls.name}`);
                        setRemoving(new Set());
                      }}
                    >
                      <UserMinus /> Remove {removing.size}
                    </Button>
                  )}
                  <Button onClick={() => setAddOpen(true)}>
                    <UserPlus /> Add students
                  </Button>
                </>
              )
            }
            columns={[
              { key: "name", header: "Student", sort: (s) => `${s.lastName} ${s.firstName}`, cell: (s) => <span className="font-medium">{studentName(s)}</span> },
              { key: "num", header: "Student ID", sort: (s) => s.studentNumber, cell: (s) => <code className="text-xs">{s.studentNumber}</code> },
              { key: "gender", header: "Gender", cell: (s) => (s.gender === "M" ? "Male" : "Female") },
              { key: "subjects", header: "Subjects registered", cell: (s) => d.enrollments.filter((e) => e.studentId === s.id).length, className: "tabular-nums" },
              { key: "guardian", header: "Guardian", cell: (s) => (<div><p>{s.guardianName}</p><p className="text-xs text-muted-foreground">{s.guardianPhone}</p></div>) },
            ]}
          />
        </TabsContent>
        <TabsContent value="subjects">
          <Card>
            <CardHeader>
              <CardTitle>Subjects taught in {cls.name}</CardTitle>
              <CardDescription>Each subject here becomes a course with its own content, assessments, live classes and forum.</CardDescription>
              <CardAction>
                {editable && me?.can("subjects.assign") && (
                  <Button size="sm" onClick={() => setSubjectOpen(true)}>
                    <BookPlus /> Add subject
                  </Button>
                )}
              </CardAction>
            </CardHeader>
            <CardContent>
              {subjects.length === 0 ? (
                <EmptyState title="No subjects assigned" description="Add subjects and choose who teaches them." />
              ) : (
                <div className="divide-y">
                  {subjects.map((s) => (
                    <div key={s.id} className="flex flex-wrap items-center gap-3 py-3">
                      <span className="size-3 rounded-full" style={{ background: s.subject.color }} />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{s.subject.name}</p>
                        <p className="text-xs text-muted-foreground">{teacherName(s.teacher)}</p>
                      </div>
                      <span className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Users className="size-3.5" /> {s.enrolled}/{roster.length} registered
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit {cls.name}</DialogTitle>
          </DialogHeader>
          <ClassForm
            initial={cls}
            programmes={d.programmes}
            teachers={d.teachers}
            takenNames={d.classes.filter((c) => c.id !== cls.id).map((c) => c.name.toLowerCase())}
            onCancel={() => setEditOpen(false)}
            onSubmit={(v) => {
              const st = useStore.getState();
              st.update("classes", cls.id, { ...v, name: v.name.trim(), classTeacherId: v.classTeacherId || undefined });
              st.audit({ schoolId: d.schoolId, action: "Class updated", target: v.name, category: "academic" });
              toast.success("Class updated");
              setEditOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>

      <AddStudentsDialog open={addOpen} onOpenChange={setAddOpen} classId={cls.id} className={cls.name} capacityLeft={cls.capacity - roster.length} />
      <AddSubjectDialog open={subjectOpen} onOpenChange={setSubjectOpen} classId={cls.id} existing={subjects.map((s) => s.subject.id)} />
    </>
  );
}

function AddStudentsDialog({ open, onOpenChange, classId, className, capacityLeft }: { open: boolean; onOpenChange: (o: boolean) => void; classId: string; className: string; capacityLeft: number }) {
  const d = useSchoolData();
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [autoEnroll, setAutoEnroll] = useState(true);
  const candidates = d.students.filter((s) => d.classOf.get(s.id) !== classId && s.status === "active" && `${s.firstName} ${s.lastName} ${s.studentNumber}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <Dialog open={open} onOpenChange={(o) => (onOpenChange(o), !o && setPicked(new Set()))}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add students to {className}</DialogTitle>
          <DialogDescription>Students already in another class this session will be moved. {capacityLeft} places left.</DialogDescription>
        </DialogHeader>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search students" />
        <div className="max-h-72 overflow-y-auto rounded-lg border">
          {candidates.length === 0 && <p className="p-4 text-center text-sm text-muted-foreground">No students available.</p>}
          {candidates.slice(0, 100).map((s) => {
            const current = d.byId.class.get(d.classOf.get(s.id) ?? "");
            return (
              <label key={s.id} className="flex items-center gap-3 border-b px-3 py-2 last:border-0">
                <Checkbox checked={picked.has(s.id)} onCheckedChange={(c) => setPicked((p) => { const n = new Set(p); if (c) n.add(s.id); else n.delete(s.id); return n; })} />
                <span className="flex-1 text-sm">
                  {studentName(s)} <span className="text-xs text-muted-foreground">{s.studentNumber}</span>
                </span>
                <span className="text-xs text-muted-foreground">{current ? current.name : "Unplaced"}</span>
              </label>
            );
          })}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={autoEnroll} onCheckedChange={(c) => setAutoEnroll(!!c)} />
          Also register them for all of {className}&apos;s subjects
        </label>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={picked.size === 0 || picked.size > capacityLeft}
            onClick={() => {
              placeStudents(d.schoolId!, d.sessionId!, [...picked], classId, { autoEnroll });
              toast.success(`${picked.size} students added to ${className}`);
              setPicked(new Set());
              onOpenChange(false);
            }}
          >
            {picked.size > capacityLeft ? "Over capacity" : `Add ${picked.size || ""} students`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddSubjectDialog({ open, onOpenChange, classId, existing }: { open: boolean; onOpenChange: (o: boolean) => void; classId: string; existing: string[] }) {
  const d = useSchoolData();
  const [subjectId, setSubjectId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [enrollAll, setEnrollAll] = useState(true);
  const available = d.subjects.filter((s) => !existing.includes(s.id));
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add subject to class</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Field label="Subject">
            <AppSelect value={subjectId} onChange={setSubjectId} options={available.map((s) => ({ value: s.id, label: s.name }))} placeholder={available.length ? "Select subject" : "All subjects already added"} />
          </Field>
          <Field label="Teacher">
            <AppSelect value={teacherId} onChange={setTeacherId} options={d.teachers.map((t) => ({ value: t.id, label: `${t.title} ${t.firstName} ${t.lastName} — ${t.specialization}` }))} placeholder="Select teacher" />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={enrollAll} onCheckedChange={(c) => setEnrollAll(!!c)} /> Register every student in the class for this subject
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!subjectId || !teacherId}
            onClick={() => {
              const existingForTeacher = d.teachingAssignments.filter((t) => t.subjectId === subjectId && t.teacherId === teacherId).map((t) => t.classId);
              assignTeacher(d.schoolId!, d.sessionId!, subjectId, teacherId, [...existingForTeacher, classId]);
              if (enrollAll) {
                const ids = d.placements.filter((p) => p.classId === classId).map((p) => p.studentId);
                enroll(d.schoolId!, d.sessionId!, classId, ids, [subjectId]);
              }
              toast.success("Subject added");
              setSubjectId("");
              setTeacherId("");
              onOpenChange(false);
            }}
          >
            Add subject
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

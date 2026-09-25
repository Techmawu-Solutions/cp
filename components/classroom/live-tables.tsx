"use client";

import { useRouter } from "next/navigation";
import { PlayCircle } from "lucide-react";
import { DataTable } from "@/components/tables/data-table";
import { ExportButton } from "@/components/tables/export-button";
import { StatusBadge } from "@/components/common/status-badge";
import { LinkButton } from "@/components/common/link-button";
import { useStore } from "@/lib/store";
import { fmtDateTime, fmtDuration, fmtNumber } from "@/lib/helpers";
import type { AttendanceRecord, LiveSession, Recording } from "@/lib/types";

function useLookups() {
  const db = useStore();
  return {
    school: (id: string) => db.schools.find((s) => s.id === id)?.shortName ?? "",
    cls: (id: string) => db.classes.find((c) => c.id === id)?.name ?? "",
    subject: (id: string) => db.subjects.find((s) => s.id === id)?.name ?? "",
    teacher: (id: string) => {
      const t = db.teachers.find((x) => x.id === id);
      return t ? `${t.title} ${t.lastName}` : "";
    },
    student: (id: string) => {
      const s = db.students.find((x) => x.id === id);
      return s ? `${s.firstName} ${s.lastName}` : "";
    },
    live: (id?: string) => db.liveSessions.find((l) => l.id === id),
    db,
  };
}

export function LiveSessionsTable({ rows, showSchool, joinable }: { rows: LiveSession[]; showSchool?: boolean; joinable?: boolean }) {
  const L = useLookups();
  return (
    <DataTable
      rows={rows}
      search={(l) => `${l.title} ${L.subject(l.subjectId)} ${L.cls(l.classId)}`}
      initialSort={{ key: "when", dir: "desc" }}
      filters={[{ key: "status", label: "Statuses", options: ["scheduled", "live", "ended", "cancelled"].map((s) => ({ value: s, label: s[0]!.toUpperCase() + s.slice(1) })), predicate: (l, v) => l.status === v }]}
      emptyTitle="No live classes"
      columns={[
        { key: "when", header: "When", sort: (l) => l.scheduledAt, cell: (l) => <span className="whitespace-nowrap tabular-nums">{fmtDateTime(l.scheduledAt)}</span> },
        { key: "title", header: "Class", sort: (l) => l.title, cell: (l) => (<div><p className="font-medium">{l.title}</p><p className="text-xs text-muted-foreground">{L.subject(l.subjectId)} — {L.cls(l.classId)}</p></div>) },
        { key: "teacher", header: "Teacher", cell: (l) => L.teacher(l.teacherId) },
        ...(showSchool ? [{ key: "school", header: "School", cell: (l: LiveSession) => L.school(l.schoolId) }] : []),
        { key: "dur", header: "Duration", cell: (l) => `${l.durationMinutes} min` },
        { key: "status", header: "Status", sort: (l) => l.status, cell: (l) => <StatusBadge status={l.status} /> },
        ...(joinable
          ? [{ key: "act", header: "", className: "text-right", cell: (l: LiveSession) => (l.status === "live" ? <LinkButton size="sm" href={`/classroom/${l.id}/lobby`}>Join</LinkButton> : l.recordingId ? <LinkButton size="sm" variant="outline" href={`/recordings/${l.recordingId}`}><PlayCircle /> Recording</LinkButton> : null) }]
          : []),
      ]}
    />
  );
}

export function RecordingsTable({ rows, showSchool }: { rows: Recording[]; showSchool?: boolean }) {
  const L = useLookups();
  const router = useRouter();
  return (
    <DataTable
      rows={rows}
      search={(r) => `${r.title} ${L.subject(r.subjectId)} ${L.cls(r.classId)}`}
      initialSort={{ key: "date", dir: "desc" }}
      onRowClick={(r) => r.status === "ready" && router.push(`/recordings/${r.id}`)}
      emptyTitle="No recordings yet"
      emptyDescription="Recordings appear automatically after a live class ends."
      columns={[
        { key: "title", header: "Recording", sort: (r) => r.title, cell: (r) => (<div className="flex items-center gap-2"><PlayCircle className="size-4 shrink-0 text-primary" /><div><p className="font-medium">{r.title}</p><p className="text-xs text-muted-foreground">{L.subject(r.subjectId)} — {L.cls(r.classId)}</p></div></div>) },
        { key: "date", header: "Date", sort: (r) => r.date, cell: (r) => <span className="whitespace-nowrap">{fmtDateTime(r.date)}</span> },
        { key: "teacher", header: "Teacher", cell: (r) => L.teacher(r.teacherId) },
        ...(showSchool ? [{ key: "school", header: "School", cell: (r: Recording) => L.school(r.schoolId) }] : []),
        { key: "dur", header: "Duration", sort: (r) => r.durationSeconds, cell: (r) => <span className="tabular-nums">{fmtDuration(r.durationSeconds)}</span> },
        { key: "size", header: "Size", sort: (r) => r.sizeMb, cell: (r) => `${fmtNumber(r.sizeMb)} MB`, className: "tabular-nums" },
        { key: "views", header: "Views", sort: (r) => r.views, cell: (r) => r.views, className: "tabular-nums" },
        { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
      ]}
    />
  );
}

/** Live-class attendance, auto-captured on join/leave (spec §40). */
export function LiveAttendanceTable({ rows, showSchool }: { rows: AttendanceRecord[]; showSchool?: boolean }) {
  const L = useLookups();
  return (
    <DataTable
      rows={rows}
      search={(a) => `${L.student(a.studentId)} ${L.live(a.liveSessionId)?.title ?? ""}`}
      initialSort={{ key: "date", dir: "desc" }}
      pageSize={20}
      filters={[{ key: "status", label: "Statuses", options: ["present", "late", "absent"].map((s) => ({ value: s, label: s[0]!.toUpperCase() + s.slice(1) })), predicate: (a, v) => a.status === v }]}
      toolbar={<ExportButton filename="live-attendance" header={["Student", "Live class", "Class", "Joined", "Left", "Minutes", "Status"]} rows={() => rows.map((a) => [L.student(a.studentId), L.live(a.liveSessionId)?.title, L.cls(a.classId), a.joinTime ?? "", a.leaveTime ?? "", a.durationMinutes ?? 0, a.status])} />}
      dense
      columns={[
        { key: "student", header: "Student", sort: (a) => L.student(a.studentId), cell: (a) => <span className="font-medium">{L.student(a.studentId)}</span> },
        { key: "live", header: "Live class", cell: (a) => (<div><p>{L.live(a.liveSessionId)?.title}</p><p className="text-xs text-muted-foreground">{L.cls(a.classId)}</p></div>) },
        ...(showSchool ? [{ key: "school", header: "School", cell: (a: AttendanceRecord) => L.school(a.schoolId) }] : []),
        { key: "date", header: "Date", sort: (a) => a.date, cell: (a) => <span className="whitespace-nowrap">{fmtDateTime(a.date)}</span> },
        { key: "join", header: "Joined", cell: (a) => (a.joinTime ? new Date(a.joinTime).toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit" }) : "—") },
        { key: "left", header: "Left", cell: (a) => (a.leaveTime ? new Date(a.leaveTime).toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit" }) : "—") },
        { key: "dur", header: "Duration", sort: (a) => a.durationMinutes ?? 0, cell: (a) => (a.durationMinutes ? `${a.durationMinutes} min` : "—"), className: "tabular-nums" },
        { key: "status", header: "Status", sort: (a) => a.status, cell: (a) => <StatusBadge status={a.status} /> },
      ]}
    />
  );
}

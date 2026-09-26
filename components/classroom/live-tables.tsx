"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarDays, Eye, Film, HardDrive, Loader2, Play, PlayCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppSelect } from "@/components/common/app-select";
import { EmptyState } from "@/components/common/empty-state";
import { DataTable } from "@/components/tables/data-table";
import { ExportButton } from "@/components/tables/export-button";
import { StatusBadge } from "@/components/common/status-badge";
import { LinkButton } from "@/components/common/link-button";
import { useStore } from "@/lib/store";
import { fmtDateTime, fmtDuration, fmtNumber } from "@/lib/helpers";
import { cn } from "@/lib/utils";
import type { AttendanceRecord, LiveSession, Recording, Subject } from "@/lib/types";

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

const RECORDING_SORTS = {
  newest: (a: Recording, b: Recording) => b.date.localeCompare(a.date),
  oldest: (a: Recording, b: Recording) => a.date.localeCompare(b.date),
  views: (a: Recording, b: Recording) => b.views - a.views,
  longest: (a: Recording, b: Recording) => b.durationSeconds - a.durationSeconds,
};

/** Recordings as video thumbnails: subject name on the cover, details beneath (spec §39). */
export function RecordingsGrid({ rows, showSchool, pageSize = 12 }: { rows: Recording[]; showSchool?: boolean; pageSize?: number }) {
  const L = useLookups();
  const [query, setQuery] = useState("");
  const [subjectId, setSubjectId] = useState("__all");
  const [sort, setSort] = useState<keyof typeof RECORDING_SORTS>("newest");
  const [limit, setLimit] = useState(pageSize);

  const subjects = [...new Set(rows.map((r) => r.subjectId))].map((id) => ({ value: id, label: L.subject(id) })).sort((a, b) => a.label.localeCompare(b.label));
  const q = query.trim().toLowerCase();
  const filtered = rows
    .filter((r) => (subjectId === "__all" || r.subjectId === subjectId) && (!q || `${r.title} ${L.subject(r.subjectId)} ${L.cls(r.classId)} ${L.teacher(r.teacherId)}`.toLowerCase().includes(q)))
    .sort(RECORDING_SORTS[sort]);

  if (rows.length === 0) return <EmptyState icon={Film} title="No recordings yet" description="Recordings appear automatically after a live class ends." />;

  const visible = filtered.slice(0, limit);
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => (setQuery(e.target.value), setLimit(pageSize))} placeholder="Search recordings" className="pl-8" aria-label="Search recordings" />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          {subjects.length > 1 && <AppSelect aria-label="Subject" className="sm:w-48" value={subjectId} onChange={(v) => (setSubjectId(v), setLimit(pageSize))} options={[{ value: "__all", label: "All subjects" }, ...subjects]} />}
          <AppSelect
            aria-label="Sort"
            className={cn("sm:w-40", subjects.length <= 1 && "col-span-2")}
            value={sort}
            onChange={(v) => setSort(v as keyof typeof RECORDING_SORTS)}
            options={[
              { value: "newest", label: "Newest first" },
              { value: "oldest", label: "Oldest first" },
              { value: "views", label: "Most viewed" },
              { value: "longest", label: "Longest" },
            ]}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Film} title="No matches" description={query ? `No recording matches "${query}".` : "No recordings for this subject."} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {visible.map((r) => (
            <RecordingCard key={r.id} rec={r} subject={L.db.subjects.find((x) => x.id === r.subjectId)} cls={L.cls(r.classId)} teacher={L.teacher(r.teacherId)} school={showSchool ? L.school(r.schoolId) : undefined} />
          ))}
        </div>
      )}

      {filtered.length > limit && (
        <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
          <span>
            Showing {visible.length} of {filtered.length}
          </span>
          <Button variant="outline" onClick={() => setLimit(limit + pageSize)}>
            Show more
          </Button>
        </div>
      )}
    </div>
  );
}

function RecordingCard({ rec, subject, cls, teacher, school }: { rec: Recording; subject?: Subject; cls: string; teacher: string; school?: string }) {
  const ready = rec.status === "ready";
  const color = subject?.color ?? "var(--primary)";
  const thumb = (
    <div className="relative aspect-video overflow-hidden rounded-t-xl text-white" style={{ background: `linear-gradient(135deg, ${color} 0%, color-mix(in oklab, ${color} 55%, black) 100%)` }}>
      {/* Decorative rings so the cover reads as a video frame rather than a flat swatch */}
      <span className="pointer-events-none absolute -top-10 -right-10 size-40 rounded-full border-[18px] border-white/10" />
      <span className="pointer-events-none absolute -bottom-14 -left-8 size-36 rounded-full bg-black/10" />
      <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
        <span className="rounded-md bg-black/30 px-1.5 py-0.5 text-[11px] font-medium backdrop-blur-sm">{cls}</span>
        {subject?.code && <span className="text-[11px] font-semibold tracking-wider uppercase opacity-80">{subject.code}</span>}
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3 pt-10 pr-20">
        <p className="line-clamp-2 text-lg leading-tight font-semibold drop-shadow-sm">{subject?.name ?? "Recording"}</p>
      </div>
      <span className="absolute right-2 bottom-2 rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-medium tabular-nums">{fmtDuration(rec.durationSeconds)}</span>
      {ready ? (
        <span className="absolute top-1/2 left-1/2 flex size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow-lg transition-transform group-hover:scale-110">
          <Play className="ml-0.5 size-5 fill-current" />
        </span>
      ) : (
        <span className="absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs font-medium">
          <Loader2 className="size-3.5 animate-spin" /> Processing
        </span>
      )}
    </div>
  );
  const body = (
    <div className="space-y-1.5 p-3">
      <p className="line-clamp-2 font-medium group-hover:underline">{rec.title}</p>
      <p className="truncate text-sm text-muted-foreground">
        {teacher}
        {school && <> · {school}</>}
      </p>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <CalendarDays className="size-3.5" /> {fmtDateTime(rec.date)}
        </span>
        <span className="inline-flex items-center gap-1 tabular-nums">
          <Eye className="size-3.5" /> {fmtNumber(rec.views)} {rec.views === 1 ? "view" : "views"}
        </span>
        <span className="inline-flex items-center gap-1 tabular-nums">
          <HardDrive className="size-3.5" /> {fmtNumber(rec.sizeMb)} MB
        </span>
      </div>
    </div>
  );
  const card = "group block overflow-hidden rounded-xl border bg-card shadow-xs transition-shadow";
  return ready ? (
    <Link href={`/recordings/${rec.id}`} className={cn(card, "hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none")} aria-label={`Play ${subject?.name ?? ""} recording: ${rec.title}`}>
      {thumb}
      {body}
    </Link>
  ) : (
    <div className={cn(card, "opacity-80")} title="This recording is still processing">
      {thumb}
      {body}
    </div>
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

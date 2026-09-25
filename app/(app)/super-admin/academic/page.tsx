"use client";

import { Suspense, useMemo } from "react";
import { PageHeader } from "@/components/common/page-header";
import { UrlTabs } from "@/components/common/url-tabs";
import { DataTable } from "@/components/tables/data-table";
import { StatusBadge } from "@/components/common/status-badge";
import { RequirePermission } from "@/components/layout/app-shell";
import { useStore } from "@/lib/store";
import { fmtDate } from "@/lib/helpers";

/** Platform-wide read-only view of every school's academic structure (spec §11). */
export default function PlatformAcademicPage() {
  return (
    <RequirePermission perm={["programmes.view", "classes.view", "subjects.view"]}>
      <PageHeader title="Academic Structure" description="Programmes, classes and subjects across all schools. Schools manage their own structure; this view is read-only." breadcrumbs={[{ label: "Academic" }]} />
      <Suspense>
        <Body />
      </Suspense>
    </RequirePermission>
  );
}

function Body() {
  const db = useStore();
  const school = (id: string) => db.schools.find((s) => s.id === id);
  const sessionLabel = (id: string) => {
    const s = db.academicSessions.find((x) => x.id === id);
    const y = db.academicYears.find((x) => x.id === s?.academicYearId);
    return s ? `${y?.name} — ${s.name}` : "—";
  };
  const schoolFilter = useMemo(() => ({ key: "school", label: "Schools", options: db.schools.filter((s) => db.academicSessions.some((a) => a.schoolId === s.id)).map((s) => ({ value: s.id, label: s.name })), predicate: (r: { schoolId: string }, v: string) => r.schoolId === v }), [db]);
  const activeOnly = { key: "active", label: "Sessions", options: [{ value: "active", label: "Active session only" }], predicate: (r: { sessionId: string }) => db.academicSessions.find((s) => s.id === r.sessionId)?.status === "active" };

  return (
    <UrlTabs tabs={[{ value: "sessions", label: "Academic Sessions" }, { value: "programmes", label: "Programmes" }, { value: "classes", label: "Classes" }, { value: "subjects", label: "Subjects" }]}>
      {(tab) =>
        tab === "sessions" ? (
          <DataTable
            rows={db.academicSessions}
            filters={[schoolFilter, { key: "status", label: "Statuses", options: ["active", "upcoming", "closed"].map((s) => ({ value: s, label: s })), predicate: (r, v) => r.status === v }]}
            initialSort={{ key: "start", dir: "desc" }}
            columns={[
              { key: "school", header: "School", sort: (r) => school(r.schoolId)?.name ?? "", cell: (r) => school(r.schoolId)?.name },
              { key: "year", header: "Academic year", cell: (r) => db.academicYears.find((y) => y.id === r.academicYearId)?.name },
              { key: "name", header: "Session", cell: (r) => r.name },
              { key: "start", header: "Dates", sort: (r) => r.startDate, cell: (r) => `${fmtDate(r.startDate)} – ${fmtDate(r.endDate)}` },
              { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
            ]}
          />
        ) : tab === "programmes" ? (
          <DataTable
            rows={db.programmes}
            search={(r) => `${r.name} ${r.code}`}
            filters={[schoolFilter, activeOnly]}
            columns={[
              { key: "name", header: "Programme", sort: (r) => r.name, cell: (r) => (<div><p className="font-medium">{r.name}</p><p className="text-xs text-muted-foreground">{r.code}</p></div>) },
              { key: "school", header: "School", sort: (r) => school(r.schoolId)?.name ?? "", cell: (r) => school(r.schoolId)?.shortName },
              { key: "session", header: "Session", cell: (r) => sessionLabel(r.sessionId) },
              { key: "classes", header: "Classes", cell: (r) => db.classes.filter((c) => c.programmeId === r.id).length, className: "tabular-nums" },
              { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
            ]}
          />
        ) : tab === "classes" ? (
          <DataTable
            rows={db.classes}
            search={(r) => r.name}
            filters={[schoolFilter, activeOnly]}
            columns={[
              { key: "name", header: "Class", sort: (r) => r.name, cell: (r) => <span className="font-medium">{r.name}</span> },
              { key: "prog", header: "Programme", cell: (r) => db.programmes.find((p) => p.id === r.programmeId)?.name },
              { key: "school", header: "School", sort: (r) => school(r.schoolId)?.name ?? "", cell: (r) => school(r.schoolId)?.shortName },
              { key: "session", header: "Session", cell: (r) => sessionLabel(r.sessionId) },
              { key: "students", header: "Students", sort: (r) => db.placements.filter((p) => p.classId === r.id).length, cell: (r) => `${db.placements.filter((p) => p.classId === r.id).length} / ${r.capacity}`, className: "tabular-nums" },
            ]}
          />
        ) : (
          <DataTable
            rows={db.subjects}
            search={(r) => `${r.name} ${r.code}`}
            filters={[schoolFilter, activeOnly]}
            columns={[
              { key: "name", header: "Subject", sort: (r) => r.name, cell: (r) => (<span className="flex items-center gap-2 font-medium"><span className="size-2.5 rounded-full" style={{ background: r.color }} />{r.name}</span>) },
              { key: "code", header: "Code", cell: (r) => r.code },
              { key: "school", header: "School", sort: (r) => school(r.schoolId)?.name ?? "", cell: (r) => school(r.schoolId)?.shortName },
              { key: "session", header: "Session", cell: (r) => sessionLabel(r.sessionId) },
              { key: "enrolled", header: "Enrolments", sort: (r) => db.enrollments.filter((e) => e.subjectId === r.id).length, cell: (r) => db.enrollments.filter((e) => e.subjectId === r.id).length, className: "tabular-nums" },
            ]}
          />
        )
      }
    </UrlTabs>
  );
}

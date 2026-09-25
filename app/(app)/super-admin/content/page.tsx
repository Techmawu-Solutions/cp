"use client";

import { Suspense } from "react";
import { ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { UrlTabs } from "@/components/common/url-tabs";
import { DataTable } from "@/components/tables/data-table";
import { StatusBadge } from "@/components/common/status-badge";
import { RequirePermission } from "@/components/layout/app-shell";
import { CONTENT_META } from "@/components/course/content-meta";
import { useStore } from "@/lib/store";
import { fmtDate } from "@/lib/helpers";

export default function PlatformContentPage() {
  return (
    <RequirePermission perm="courses.view">
      <PageHeader title="Content" description="Courses and learning content across all schools." breadcrumbs={[{ label: "Content" }]} />
      <Suspense>
        <Body />
      </Suspense>
    </RequirePermission>
  );
}

function Body() {
  const db = useStore();
  const school = (id: string) => db.schools.find((s) => s.id === id)?.shortName;
  const course = (id: string) => db.courses.find((c) => c.id === id);
  const teacher = (id: string) => {
    const t = db.teachers.find((x) => x.id === id);
    return t ? `${t.title} ${t.lastName}` : "—";
  };
  const schoolFilter = { key: "school", label: "Schools", options: db.schools.filter((s) => db.courses.some((c) => c.schoolId === s.id)).map((s) => ({ value: s.id, label: s.name })), predicate: (r: { schoolId?: string; courseId?: string }, v: string) => (r.schoolId ?? course(r.courseId!)?.schoolId) === v };
  return (
    <UrlTabs tabs={[{ value: "courses", label: "Courses" }, { value: "resources", label: "Resources" }, { value: "library", label: "Content Library" }]}>
      {(tab) =>
        tab === "courses" ? (
          <DataTable
            rows={db.courses.filter((c) => db.academicSessions.find((s) => s.id === c.sessionId)?.status === "active")}
            search={(c) => c.title}
            filters={[schoolFilter]}
            columns={[
              { key: "title", header: "Course", sort: (c) => c.title, cell: (c) => <span className="font-medium">{c.title}</span> },
              { key: "school", header: "School", cell: (c) => school(c.schoolId) },
              { key: "teacher", header: "Teacher", cell: (c) => teacher(c.teacherId) },
              { key: "modules", header: "Modules", sort: (c) => db.modules.filter((m) => m.courseId === c.id).length, cell: (c) => db.modules.filter((m) => m.courseId === c.id).length, className: "tabular-nums" },
              { key: "items", header: "Items", sort: (c) => db.contents.filter((m) => m.courseId === c.id).length, cell: (c) => db.contents.filter((m) => m.courseId === c.id).length, className: "tabular-nums" },
            ]}
          />
        ) : (
          <DataTable
            rows={tab === "resources" ? db.contents.filter((c) => c.type === "link") : db.contents}
            search={(c) => `${c.title} ${c.url ?? ""}`}
            filters={[schoolFilter, ...(tab === "library" ? [{ key: "type", label: "Types", options: Object.entries(CONTENT_META).map(([k, v]) => ({ value: k, label: v.label })), predicate: (c: { type: string }, v: string) => c.type === v }] : [])]}
            columns={[
              {
                key: "title",
                header: "Item",
                sort: (c) => c.title,
                cell: (c) => {
                  const M = CONTENT_META[c.type];
                  return (
                    <span className="flex items-center gap-2">
                      <M.icon className={`size-4 ${M.color}`} />
                      <span className="font-medium">{c.title}</span>
                    </span>
                  );
                },
              },
              { key: "type", header: "Type", cell: (c) => CONTENT_META[c.type].label },
              { key: "course", header: "Course", cell: (c) => course(c.courseId)?.title },
              { key: "school", header: "School", cell: (c) => school(course(c.courseId)?.schoolId ?? "") },
              ...(tab === "resources"
                ? [{ key: "url", header: "URL", cell: (c: (typeof db.contents)[number]) => (<a href={c.url} target="_blank" rel="noreferrer" className="inline-flex max-w-64 items-center gap-1 truncate text-primary hover:underline" onClick={(e) => e.stopPropagation()}>{c.url?.replace(/^https?:\/\//, "")}<ExternalLink className="size-3 shrink-0" /></a>) }]
                : [{ key: "date", header: "Added", sort: (c: (typeof db.contents)[number]) => c.createdAt, cell: (c: (typeof db.contents)[number]) => fmtDate(c.createdAt) }]),
              { key: "status", header: "Status", cell: (c) => <StatusBadge status={c.published ? "published" : "draft"} /> },
            ]}
          />
        )
      }
    </UrlTabs>
  );
}

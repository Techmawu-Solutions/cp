"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, Library, MoreHorizontal, Pencil, Plus, School, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { AppSelect } from "@/components/common/app-select";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { Field } from "@/components/forms/field";
import { RequirePermission } from "@/components/layout/app-shell";
import { CONTENT_META } from "@/components/course/content-meta";
import { CATALOGUE_SUBJECTS } from "@/lib/data/catalogue";
import { registerUpload } from "@/lib/file-registry";
import { fmtBytes, uid } from "@/lib/helpers";
import { LIBRARY_LEVELS, levelLabel, libraryKey } from "@/lib/library";
import { useCurrentUser } from "@/lib/session";
import { useStore } from "@/lib/store";
import type { LibraryMaterial, LibraryMaterialType, LibraryTopic } from "@/lib/types";
import { cn } from "@/lib/utils";

const TYPES: LibraryMaterialType[] = ["text", "video", "pdf", "presentation", "ebook", "link", "file"];

/**
 * The ClassProject library (spec section 25.3): the Super Administrator adds
 * learning materials by subject and level; every class at that level taking
 * the subject sees them inside its course.
 */
export default function MaterialsPage() {
  return (
    <RequirePermission perm="library.manage">
      <PageHeader title="Learning Materials" description="Shared materials by subject and level. Every class at the level that takes the subject gets them in its course — in every school." breadcrumbs={[{ label: "Content", href: "/super-admin/content" }, { label: "Learning Materials" }]} />
      <Materials />
    </RequirePermission>
  );
}

function Materials() {
  const db = useStore();
  const me = useCurrentUser();
  const [subject, setSubject] = useState("MATH");
  const [level, setLevel] = useState("SHS1");
  const [topicDialog, setTopicDialog] = useState<LibraryTopic | "new" | null>(null);
  const [materialDialog, setMaterialDialog] = useState<{ topicId: string; material?: LibraryMaterial } | null>(null);
  const [deleting, setDeleting] = useState<{ kind: "topic" | "material"; id: string; title: string } | null>(null);

  const topics = db.libraryTopics.filter((t) => t.subjectCode === subject && t.level === level).sort((a, b) => a.order - b.order);
  const materialsOf = (topicId: string) => db.libraryMaterials.filter((m) => m.topicId === topicId).sort((a, b) => a.order - b.order);

  // Who this reaches: classes in active sessions at this level with a course for this subject.
  const reach = useMemo(() => {
    const active = new Set(db.academicSessions.filter((s) => s.status === "active").map((s) => s.id));
    const courses = db.courses.filter((c) => active.has(c.sessionId)).filter((c) => {
      const key = libraryKey(db.subjects.find((s) => s.id === c.subjectId), db.classes.find((k) => k.id === c.classId));
      return key?.subjectCode === subject && key.level === level;
    });
    const classIds = new Set(courses.map((c) => c.classId));
    const students = new Set(db.enrollments.filter((e) => classIds.has(e.classId) && courses.some((c) => c.classId === e.classId && c.subjectId === e.subjectId)).map((e) => e.studentId));
    return { classes: classIds.size, schools: new Set(courses.map((c) => c.schoolId)).size, students: students.size };
  }, [db.academicSessions, db.courses, db.subjects, db.classes, db.enrollments, subject, level]);

  // Coverage across the whole library, for the overview.
  const coverage = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of db.libraryTopics) m.set(`${t.subjectCode}:${t.level}`, (m.get(`${t.subjectCode}:${t.level}`) ?? 0) + db.libraryMaterials.filter((x) => x.topicId === t.id).length);
    return [...m.entries()].map(([k, n]) => ({ subjectCode: k.split(":")[0]!, level: k.split(":")[1]!, n })).sort((a, b) => a.subjectCode.localeCompare(b.subjectCode) || a.level.localeCompare(b.level));
  }, [db.libraryTopics, db.libraryMaterials]);

  const st = useStore.getState;
  const subjectName = CATALOGUE_SUBJECTS.find((c) => c.code === subject)?.name ?? subject;
  const moveTopic = (t: LibraryTopic, dir: -1 | 1) => {
    const i = topics.findIndex((x) => x.id === t.id);
    const other = topics[i + dir];
    if (!other) return;
    st().update("libraryTopics", t.id, { order: other.order });
    st().update("libraryTopics", other.id, { order: t.order });
  };
  const moveMaterial = (list: LibraryMaterial[], m: LibraryMaterial, dir: -1 | 1) => {
    const i = list.findIndex((x) => x.id === m.id);
    const other = list[i + dir];
    if (!other) return;
    st().update("libraryMaterials", m.id, { order: other.order });
    st().update("libraryMaterials", other.id, { order: m.order });
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="flex flex-wrap items-end gap-4">
          <Field label="Subject" htmlFor="subj">
            <AppSelect id="subj" className="w-64" value={subject} onChange={setSubject} options={CATALOGUE_SUBJECTS.filter((c) => c.active).map((c) => ({ value: c.code, label: c.name }))} />
          </Field>
          <Field label="Level" htmlFor="lvl">
            <AppSelect id="lvl" className="w-40" value={level} onChange={setLevel} options={LIBRARY_LEVELS.map((l) => ({ value: l.code, label: l.label }))} />
          </Field>
          <div className="ml-auto flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <School className="size-4" /> {reach.schools} school{reach.schools === 1 ? "" : "s"}
            </span>
            <span className="flex items-center gap-1.5">
              <Library className="size-4" /> {reach.classes} class{reach.classes === 1 ? "" : "es"}
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="size-4" /> {reach.students} student{reach.students === 1 ? "" : "s"}
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">
              {subjectName} · {levelLabel(level)}
            </h2>
            <Button onClick={() => setTopicDialog("new")}>
              <Plus /> Add topic
            </Button>
          </div>
          {topics.length === 0 && <EmptyState icon={Library} title="No materials for this subject and level yet" description={`Add a topic, then add lessons, videos, documents and links. They appear in every ${levelLabel(level)} ${subjectName} class.`} action={<Button onClick={() => setTopicDialog("new")}><Plus /> Add topic</Button>} />}
          {topics.map((t, ti) => {
            const list = materialsOf(t.id);
            return (
              <Card key={t.id} className={cn("gap-0 p-0", !t.published && "border-dashed")}>
                <div className="flex items-start gap-2 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      {t.title} {!t.published && <Badge variant="outline" className="ml-1">Hidden</Badge>}
                    </p>
                    {t.description && <p className="text-sm text-muted-foreground">{t.description}</p>}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`${t.title} actions`} />}>
                      <MoreHorizontal />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => setMaterialDialog({ topicId: t.id })}>
                        <Plus /> Add material
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setTopicDialog(t)}>
                        <Pencil /> Edit topic
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => (st().update("libraryTopics", t.id, { published: !t.published }), toast.success(t.published ? "Topic hidden from classes" : "Topic shown to classes"))}>
                        {t.published ? <EyeOff /> : <Eye />} {t.published ? "Hide from classes" : "Show to classes"}
                      </DropdownMenuItem>
                      <DropdownMenuItem disabled={ti === 0} onClick={() => moveTopic(t, -1)}>
                        <ArrowUp /> Move up
                      </DropdownMenuItem>
                      <DropdownMenuItem disabled={ti === topics.length - 1} onClick={() => moveTopic(t, 1)}>
                        <ArrowDown /> Move down
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive" onClick={() => setDeleting({ kind: "topic", id: t.id, title: t.title })}>
                        <Trash2 /> Delete topic
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <ul className="divide-y border-t">
                  {list.map((m, mi) => {
                    const M = CONTENT_META[m.type];
                    return (
                      <li key={m.id} className={cn("flex items-center gap-3 px-4 py-2.5", !m.published && "opacity-60")}>
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                          <M.icon className={cn("size-4", M.color)} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{m.title}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {M.label}
                            {m.durationMinutes ? ` · ${m.durationMinutes} min` : ""}
                            {m.fileSize ? ` · ${fmtBytes(m.fileSize)}` : ""}
                            {!m.published && " · hidden"}
                          </span>
                        </span>
                        <Button variant="ghost" size="icon-xs" aria-label="Move up" disabled={mi === 0} onClick={() => moveMaterial(list, m, -1)}>
                          <ArrowUp />
                        </Button>
                        <Button variant="ghost" size="icon-xs" aria-label="Move down" disabled={mi === list.length - 1} onClick={() => moveMaterial(list, m, 1)}>
                          <ArrowDown />
                        </Button>
                        <Button variant="ghost" size="icon-xs" aria-label={`Edit ${m.title}`} onClick={() => setMaterialDialog({ topicId: t.id, material: m })}>
                          <Pencil />
                        </Button>
                        <Button variant="ghost" size="icon-xs" aria-label={`Delete ${m.title}`} onClick={() => setDeleting({ kind: "material", id: m.id, title: m.title })}>
                          <Trash2 />
                        </Button>
                      </li>
                    );
                  })}
                  <li className="px-4 py-2">
                    <Button variant="ghost" size="sm" onClick={() => setMaterialDialog({ topicId: t.id })}>
                      <Plus /> Add material
                    </Button>
                  </li>
                </ul>
              </Card>
            );
          })}
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">What&apos;s in the library</CardTitle>
            <CardDescription>Materials per subject and level. Select one to open it.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {coverage.length === 0 && <p className="text-sm text-muted-foreground">Nothing yet.</p>}
            {coverage.map((c) => (
              <button key={`${c.subjectCode}:${c.level}`} type="button" onClick={() => (setSubject(c.subjectCode), setLevel(c.level))} className={cn("flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm hover:bg-muted", c.subjectCode === subject && c.level === level && "bg-accent")}>
                <span>
                  {CATALOGUE_SUBJECTS.find((x) => x.code === c.subjectCode)?.name ?? c.subjectCode} · {levelLabel(c.level)}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">{c.n}</span>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>

      <TopicDialog
        value={topicDialog}
        onClose={() => setTopicDialog(null)}
        onSave={(v) => {
          if (topicDialog === "new") {
            st().insert("libraryTopics", { id: uid("libt"), subjectCode: subject, level, title: v.title, description: v.description, order: topics.length ? Math.max(...topics.map((t) => t.order)) + 1 : 0, published: v.published, createdAt: new Date().toISOString() });
            st().audit({ schoolId: null, action: "Library topic added", target: `${v.title} (${subjectName} ${levelLabel(level)})`, category: "lms" });
            toast.success(v.published ? `Topic added — ${reach.classes} class${reach.classes === 1 ? "" : "es"} will see it once it has materials` : "Topic added (hidden)");
          } else if (topicDialog) {
            st().update("libraryTopics", topicDialog.id, v);
            toast.success("Topic updated");
          }
          setTopicDialog(null);
        }}
      />
      <MaterialDialog
        value={materialDialog}
        onClose={() => setMaterialDialog(null)}
        onSave={(v, file) => {
          const id = materialDialog?.material?.id ?? uid("libm");
          const url = file ? registerUpload(id, file) : v.url;
          const patch = { ...v, url, fileName: file?.name ?? v.fileName, fileSize: file?.size ?? v.fileSize };
          if (materialDialog?.material) {
            st().update("libraryMaterials", id, patch);
            toast.success("Material updated");
          } else if (materialDialog) {
            const siblings = materialsOf(materialDialog.topicId);
            st().insert("libraryMaterials", { ...patch, id, topicId: materialDialog.topicId, order: siblings.length ? Math.max(...siblings.map((m) => m.order)) + 1 : 0, createdAt: new Date().toISOString(), createdBy: me?.user.id });
            st().audit({ schoolId: null, action: "Library material added", target: `${v.title} (${subjectName} ${levelLabel(level)})`, category: "lms" });
            toast.success(v.published ? `Added — now in ${reach.classes} ${levelLabel(level)} class${reach.classes === 1 ? "" : "es"}` : "Added (hidden)");
          }
          setMaterialDialog(null);
        }}
      />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete “${deleting?.title}”?`}
        description={deleting?.kind === "topic" ? "The topic and all its materials are removed from every class." : "The material is removed from every class."}
        destructive
        confirmLabel="Delete"
        onConfirm={() => {
          if (!deleting) return;
          if (deleting.kind === "topic") {
            st().removeWhere("libraryMaterials", (m) => m.topicId === deleting.id);
            st().remove("libraryTopics", deleting.id);
          } else st().remove("libraryMaterials", deleting.id);
          st().audit({ schoolId: null, action: deleting.kind === "topic" ? "Library topic deleted" : "Library material deleted", target: deleting.title, category: "lms" });
          toast.success("Deleted");
        }}
      />
    </div>
  );
}

function TopicDialog({ value, onClose, onSave }: { value: LibraryTopic | "new" | null; onClose: () => void; onSave: (v: { title: string; description: string; published: boolean }) => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [published, setPublished] = useState(true);
  const [loaded, setLoaded] = useState<string | null>(null);
  const key = value === "new" ? "new" : (value?.id ?? null);
  if (key !== loaded) {
    setLoaded(key);
    setTitle(value && value !== "new" ? value.title : "");
    setDescription(value && value !== "new" ? value.description : "");
    setPublished(value && value !== "new" ? value.published : true);
  }
  return (
    <Dialog open={value !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{value === "new" ? "Add topic" : "Edit topic"}</DialogTitle>
          <DialogDescription>A topic groups related materials, like a chapter of the syllabus.</DialogDescription>
        </DialogHeader>
        <Field label="Title" htmlFor="tt" required>
          <Input id="tt" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Number bases" autoFocus />
        </Field>
        <Field label="Summary" htmlFor="td">
          <Textarea id="td" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <label className="flex items-center justify-between gap-3 text-sm">
          Show to classes
          <Switch checked={published} onCheckedChange={setPublished} />
        </label>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={title.trim().length < 2} onClick={() => onSave({ title: title.trim(), description: description.trim(), published })}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type MaterialDraft = Omit<LibraryMaterial, "id" | "topicId" | "order" | "createdAt" | "createdBy">;

function MaterialDialog({ value, onClose, onSave }: { value: { topicId: string; material?: LibraryMaterial } | null; onClose: () => void; onSave: (v: MaterialDraft, file: File | null) => void }) {
  const maxMb = useStore((s) => s.settings.maxUploadMb);
  const [d, setD] = useState<MaterialDraft>({ type: "text", title: "", description: "", published: true });
  const [file, setFile] = useState<File | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<string | null>(null);
  const key = value ? (value.material?.id ?? `new-${value.topicId}`) : null;
  if (key !== loaded) {
    setLoaded(key);
    const m = value?.material;
    setD(m ? { type: m.type, title: m.title, description: m.description, body: m.body, url: m.url, fileName: m.fileName, fileSize: m.fileSize, durationMinutes: m.durationMinutes, published: m.published } : { type: "text", title: "", description: "", published: true });
    setFile(null);
    setErr(null);
  }
  const set = <K extends keyof MaterialDraft>(k: K, v: MaterialDraft[K]) => (setD((x) => ({ ...x, [k]: v })), setErr(null));
  const needsUrl = d.type === "video" || d.type === "link";
  const needsFile = ["pdf", "presentation", "ebook", "file"].includes(d.type);
  const save = () => {
    if (d.title.trim().length < 2) return setErr("Enter a title");
    if (d.type === "text" && (d.body ?? "").trim().length < 10) return setErr("Write the lesson");
    if (needsUrl && !/^https?:\/\/\S+$/.test(d.url ?? "")) return setErr("Enter a full URL starting with https://");
    if (needsFile && !file && !d.url) return setErr("Upload the file");
    if (file && file.size > maxMb * 1024 * 1024) return setErr(`Files must be ${maxMb} MB or smaller`);
    onSave({ ...d, title: d.title.trim(), description: d.description.trim(), body: d.type === "text" ? d.body : undefined }, file);
  };
  return (
    <Dialog open={!!value} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{value?.material ? "Edit material" : "Add material"}</DialogTitle>
          <DialogDescription>Lessons, videos, documents and links for every class at this level.</DialogDescription>
        </DialogHeader>
        <div className="grid max-h-[65vh] gap-4 overflow-y-auto pr-1">
          {!value?.material && (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
              {TYPES.map((t) => {
                const M = CONTENT_META[t];
                return (
                  <button key={t} type="button" onClick={() => set("type", t)} className={cn("flex flex-col items-center gap-1 rounded-lg border p-2 text-center text-xs", d.type === t ? "border-primary bg-accent" : "hover:bg-muted")}>
                    <M.icon className={cn("size-5", M.color)} />
                    {M.label}
                  </button>
                );
              })}
            </div>
          )}
          <Field label="Title" htmlFor="mt" required>
            <Input id="mt" value={d.title} onChange={(e) => set("title", e.target.value)} />
          </Field>
          <Field label="Description" htmlFor="md">
            <Input id="md" value={d.description} onChange={(e) => set("description", e.target.value)} />
          </Field>
          {d.type === "text" && (
            <Field label="Lesson" htmlFor="mb" hint="Use ## for headings, - for bullet points and **bold**." required>
              <Textarea id="mb" rows={10} value={d.body ?? ""} onChange={(e) => set("body", e.target.value)} className="font-mono text-xs" />
            </Field>
          )}
          {needsUrl && (
            <Field label={d.type === "video" ? "Video URL" : "Link"} htmlFor="mu" required hint={d.type === "video" ? "MP4 link, YouTube or Vimeo" : undefined}>
              <Input id="mu" value={d.url ?? ""} onChange={(e) => set("url", e.target.value)} placeholder="https://" />
            </Field>
          )}
          {needsFile && (
            <Field label="File" htmlFor="mf" required hint={`Up to ${maxMb} MB. Opens in the platform's viewer.${d.fileName ? ` Current: ${d.fileName}` : ""}`}>
              <Input id="mf" type="file" accept={d.type === "pdf" ? "application/pdf" : d.type === "presentation" ? ".pdf,.pptx,.ppt,.odp" : d.type === "ebook" ? ".pdf,.epub" : undefined} onChange={(e) => (setFile(e.target.files?.[0] ?? null), setErr(null))} />
            </Field>
          )}
          {(d.type === "text" || d.type === "video") && (
            <Field label="Estimated minutes" htmlFor="mm">
              <Input id="mm" numeric="integer" min={1} className="w-28" value={d.durationMinutes ? String(d.durationMinutes) : ""} onChange={(e) => set("durationMinutes", e.target.value ? Number(e.target.value) : undefined)} />
            </Field>
          )}
          <label className="flex items-center justify-between gap-3 text-sm">
            Show to classes
            <Switch checked={d.published} onCheckedChange={(v) => set("published", v)} />
          </label>
          {err && <p className="text-sm text-destructive">{err}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

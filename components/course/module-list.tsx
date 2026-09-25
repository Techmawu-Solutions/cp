"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, ChevronDown, Eye, EyeOff, GripVertical, MoreHorizontal, Pencil, Plus, Trash2, CheckCircle2, Circle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { EmptyState } from "@/components/common/empty-state";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { AppSelect } from "@/components/common/app-select";
import { Field } from "@/components/forms/field";
import { CONTENT_META } from "@/components/course/content-meta";
import { useStore } from "@/lib/store";
import { notifyCourseStudents } from "@/lib/actions";
import { registerUpload } from "@/lib/file-registry";
import { fmtBytes, uid } from "@/lib/helpers";
import type { ContentItem, ContentType, Course, CourseModule } from "@/lib/types";
import { cn } from "@/lib/utils";

const ADDABLE: ContentType[] = ["text", "video", "pdf", "ebook", "presentation", "link", "file"];

/**
 * ModuleList (spec §25–26). In `edit` mode teachers build modules and content;
 * in `learn` mode students see published items with completion ticks.
 */
export function ModuleList({ course, mode, itemHref, completed }: { course: Course; mode: "edit" | "view" | "learn"; itemHref: (item: ContentItem) => string; completed?: Set<string> }) {
  const allModules = useStore((s) => s.modules);
  const allContents = useStore((s) => s.contents);
  const modules = allModules.filter((m) => m.courseId === course.id && (mode !== "learn" || m.published)).sort((a, b) => a.order - b.order);
  const items = (moduleId: string) => allContents.filter((c) => c.moduleId === moduleId && (mode !== "learn" || c.published)).sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt));
  const [moduleDialog, setModuleDialog] = useState<CourseModule | "new" | null>(null);
  const [itemDialog, setItemDialog] = useState<{ moduleId: string; item?: ContentItem } | null>(null);
  const [deleting, setDeleting] = useState<{ kind: "module" | "item"; id: string; title: string } | null>(null);
  const edit = mode === "edit";

  const move = (m: CourseModule, dir: -1 | 1) => {
    const idx = modules.findIndex((x) => x.id === m.id);
    const other = modules[idx + dir];
    if (!other) return;
    const st = useStore.getState();
    st.update("modules", m.id, { order: other.order });
    st.update("modules", other.id, { order: m.order });
  };
  const moveItem = (list: ContentItem[], it: ContentItem, dir: -1 | 1) => {
    const idx = list.findIndex((x) => x.id === it.id);
    const other = list[idx + dir];
    if (!other) return;
    const st = useStore.getState();
    st.update("contents", it.id, { order: other.order === it.order ? other.order + dir : other.order });
    st.update("contents", other.id, { order: it.order });
  };

  if (modules.length === 0)
    return (
      <>
        <EmptyState title={edit ? "No modules yet" : "No content published yet"} description={edit ? "Organise the course into modules, e.g. “Module 1 — Introduction to ICT”, then add lessons, videos, files and links." : "Your teacher hasn't published any content for this course yet."} action={edit && <Button onClick={() => setModuleDialog("new")}><Plus /> Add module</Button>} />
        {edit && <ModuleDialog course={course} value={moduleDialog} onClose={() => setModuleDialog(null)} nextOrder={0} />}
      </>
    );

  return (
    <div className="space-y-3">
      {edit && (
        <div className="flex justify-end">
          <Button onClick={() => setModuleDialog("new")}>
            <Plus /> Add module
          </Button>
        </div>
      )}
      {modules.map((m, mi) => {
        const list = items(m.id);
        const done = completed ? list.filter((i) => completed.has(i.id)).length : 0;
        return (
          <Collapsible key={m.id} defaultOpen={mi < 3}>
            <Card className="gap-0 p-0">
              <div className="flex items-center gap-2 px-3 py-3 sm:px-4">
                <CollapsibleTrigger className="group flex min-w-0 flex-1 items-center gap-2 text-left">
                  <ChevronDown className="size-4 shrink-0 -rotate-90 transition-transform group-data-[panel-open]:rotate-0" />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{m.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {list.length} items{completed ? ` · ${done}/${list.length} completed` : ""}
                      {m.description && ` · ${m.description}`}
                    </p>
                  </div>
                </CollapsibleTrigger>
                {edit && !m.published && <Badge variant="outline">Draft</Badge>}
                {edit && (
                  <DropdownMenu>
                    <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Module actions" />}>
                      <MoreHorizontal />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem onClick={() => setItemDialog({ moduleId: m.id })}>
                        <Plus /> Add content
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setModuleDialog(m)}>
                        <Pencil /> Edit module
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          useStore.getState().update("modules", m.id, { published: !m.published });
                          if (!m.published) notifyCourseStudents(course, { kind: "material", title: "New course material", body: `${m.title} is now available in ${course.title}.`, href: `/student/courses/${course.id}` });
                          toast.success(m.published ? "Module unpublished" : "Module published — students notified");
                        }}
                      >
                        {m.published ? <EyeOff /> : <Eye />} {m.published ? "Unpublish" : "Publish"}
                      </DropdownMenuItem>
                      <DropdownMenuItem disabled={mi === 0} onClick={() => move(m, -1)}>
                        <ArrowUp /> Move up
                      </DropdownMenuItem>
                      <DropdownMenuItem disabled={mi === modules.length - 1} onClick={() => move(m, 1)}>
                        <ArrowDown /> Move down
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive" onClick={() => setDeleting({ kind: "module", id: m.id, title: m.title })}>
                        <Trash2 /> Delete module
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              <CollapsibleContent>
                <ul className="border-t">
                  {list.length === 0 && <li className="px-4 py-4 text-sm text-muted-foreground">No content in this module yet.</li>}
                  {list.map((it, ii) => {
                    const M = CONTENT_META[it.type];
                    const isDone = completed?.has(it.id);
                    return (
                      <li key={it.id} className="flex items-center gap-2 border-b px-3 py-2.5 last:border-0 sm:px-4">
                        {edit && <GripVertical className="hidden size-4 text-muted-foreground/50 sm:block" />}
                        {mode === "learn" && (isDone ? <CheckCircle2 className="size-4 shrink-0 text-emerald-600" /> : <Circle className="size-4 shrink-0 text-muted-foreground/60" />)}
                        <M.icon className={cn("size-4 shrink-0", M.color)} />
                        <Link href={itemHref(it)} className="min-w-0 flex-1 hover:underline">
                          <p className={cn("truncate text-sm", !it.published && "text-muted-foreground")}>{it.title}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {M.label}
                            {it.durationMinutes ? ` · ${it.durationMinutes} min` : ""}
                            {it.fileSize ? ` · ${fmtBytes(it.fileSize)}` : ""}
                          </p>
                        </Link>
                        {edit && !it.published && <Badge variant="outline">Draft</Badge>}
                        {edit && (
                          <DropdownMenu>
                            <DropdownMenuTrigger render={<Button variant="ghost" size="icon-xs" aria-label="Item actions" />}>
                              <MoreHorizontal />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              {it.type !== "recording" && (
                                <DropdownMenuItem onClick={() => setItemDialog({ moduleId: m.id, item: it })}>
                                  <Pencil /> Edit
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => (useStore.getState().update("contents", it.id, { published: !it.published }), toast.success(it.published ? "Unpublished" : "Published"))}>
                                {it.published ? <EyeOff /> : <Eye />} {it.published ? "Unpublish" : "Publish"}
                              </DropdownMenuItem>
                              <DropdownMenuItem disabled={ii === 0} onClick={() => moveItem(list, it, -1)}>
                                <ArrowUp /> Move up
                              </DropdownMenuItem>
                              <DropdownMenuItem disabled={ii === list.length - 1} onClick={() => moveItem(list, it, 1)}>
                                <ArrowDown /> Move down
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem variant="destructive" onClick={() => setDeleting({ kind: "item", id: it.id, title: it.title })}>
                                <Trash2 /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </li>
                    );
                  })}
                </ul>
                {edit && (
                  <div className="border-t px-3 py-2 sm:px-4">
                    <Button variant="ghost" size="sm" onClick={() => setItemDialog({ moduleId: m.id })}>
                      <Plus /> Add content
                    </Button>
                  </div>
                )}
              </CollapsibleContent>
            </Card>
          </Collapsible>
        );
      })}

      {edit && (
        <>
          <ModuleDialog course={course} value={moduleDialog} onClose={() => setModuleDialog(null)} nextOrder={(modules[modules.length - 1]?.order ?? -1) + 1} />
          <ContentDialog course={course} value={itemDialog} onClose={() => setItemDialog(null)} nextOrder={itemDialog ? items(itemDialog.moduleId).length : 0} />
          <ConfirmDialog
            open={!!deleting}
            onOpenChange={(o) => !o && setDeleting(null)}
            title={`Delete “${deleting?.title}”?`}
            description={deleting?.kind === "module" ? "The module and all of its content will be removed." : "This item will be removed from the course."}
            destructive
            confirmLabel="Delete"
            onConfirm={() => {
              if (!deleting) return;
              const st = useStore.getState();
              if (deleting.kind === "module") {
                st.removeWhere("contents", (c) => c.moduleId === deleting.id);
                st.remove("modules", deleting.id);
              } else st.remove("contents", deleting.id);
              st.audit({ schoolId: course.schoolId, action: deleting.kind === "module" ? "Module deleted" : "Content deleted", target: deleting.title, category: "lms" });
              toast.success("Deleted");
            }}
          />
        </>
      )}
    </div>
  );
}

function ModuleDialog({ course, value, onClose, nextOrder }: { course: Course; value: CourseModule | "new" | null; onClose: () => void; nextOrder: number }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loaded, setLoaded] = useState<string | null>(null);
  const key = value === "new" ? "new" : value?.id ?? null;
  if (key !== loaded) {
    setLoaded(key);
    setTitle(value && value !== "new" ? value.title : `Module ${nextOrder + 1} — `);
    setDescription(value && value !== "new" ? value.description : "");
  }
  return (
    <Dialog open={value !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{value === "new" ? "Add module" : "Edit module"}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (title.trim().length < 3) return toast.error("Give the module a title");
            const st = useStore.getState();
            if (value === "new") {
              st.insert("modules", { id: uid("mod"), courseId: course.id, title: title.trim(), description: description.trim(), order: nextOrder, published: false });
              st.audit({ schoolId: course.schoolId, action: "Module created", target: `${title.trim()} (${course.title})`, category: "lms" });
              toast.success("Module added as a draft — publish it when ready");
            } else if (value) {
              st.update("modules", value.id, { title: title.trim(), description: description.trim() });
              toast.success("Module updated");
            }
            onClose();
          }}
        >
          <Field label="Title" htmlFor="mt" required>
            <Input id="mt" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          </Field>
          <Field label="Description" htmlFor="md">
            <Textarea id="md" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Content builder dialog for lessons, video, files and external resources (spec §26–27). */
function ContentDialog({ course, value, onClose, nextOrder }: { course: Course; value: { moduleId: string; item?: ContentItem } | null; onClose: () => void; nextOrder: number }) {
  const maxMb = useStore((s) => s.settings.maxUploadMb);
  const [type, setType] = useState<ContentType>("text");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [duration, setDuration] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [publish, setPublish] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<string | null>(null);
  const key = value ? value.item?.id ?? `new-${value.moduleId}` : null;
  if (key !== loaded) {
    setLoaded(key);
    const it = value?.item;
    setType(it?.type ?? "text");
    setTitle(it?.title ?? "");
    setDescription(it?.description ?? "");
    setBody(it?.body ?? "");
    setUrl(it?.url ?? "");
    setDuration(it?.durationMinutes ? String(it.durationMinutes) : "");
    setFile(null);
    setPublish(it?.published ?? true);
    setErr(null);
  }
  const needsUrl = type === "video" || type === "link";
  const needsFile = ["pdf", "ebook", "presentation", "file"].includes(type);

  const save = () => {
    if (title.trim().length < 2) return setErr("Enter a title");
    if (type === "text" && body.trim().length < 10) return setErr("Write the lesson content");
    if (needsUrl && !/^https?:\/\/\S+$/.test(url.trim())) return setErr("Enter a full URL starting with https://");
    if (needsFile && !file && !value?.item?.fileName && !url.trim()) return setErr("Upload a file or paste a link to it");
    if (file && file.size > maxMb * 1024 * 1024) return setErr(`Files must be ${maxMb} MB or smaller`);
    const st = useStore.getState();
    const id = value?.item?.id ?? uid("cnt");
    const fileUrl = file ? registerUpload(id, file) : undefined;
    const patch: Partial<ContentItem> = {
      type,
      title: title.trim(),
      description: description.trim(),
      body: type === "text" ? body : undefined,
      url: needsUrl ? url.trim() : fileUrl ?? (url.trim() || value?.item?.url),
      fileName: file?.name ?? value?.item?.fileName,
      fileSize: file?.size ?? value?.item?.fileSize,
      durationMinutes: duration ? Number(duration) : undefined,
      published: publish,
    };
    if (value?.item) st.update("contents", id, patch);
    else {
      st.insert("contents", { id, moduleId: value!.moduleId, courseId: course.id, order: nextOrder, createdAt: new Date().toISOString(), ...(patch as Omit<ContentItem, "id" | "moduleId" | "courseId" | "order" | "createdAt">) });
      st.audit({ schoolId: course.schoolId, action: "Content created", target: `${title.trim()} (${CONTENT_META[type].label})`, category: "lms" });
      if (publish) notifyCourseStudents(course, { kind: "material", title: "New course material", body: `${title.trim()} was added to ${course.title}.`, href: `/student/courses/${course.id}` });
    }
    toast.success(value?.item ? "Content updated" : publish ? "Content published — students notified" : "Saved as draft");
    onClose();
  };

  return (
    <Dialog open={!!value} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{value?.item ? "Edit content" : "Add content"}</DialogTitle>
          <DialogDescription>Text lessons, videos, documents, presentations and external resources.</DialogDescription>
        </DialogHeader>
        <div className="grid max-h-[65vh] gap-4 overflow-y-auto pr-1">
          {!value?.item && (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-7">
              {ADDABLE.map((t) => {
                const M = CONTENT_META[t];
                return (
                  <button key={t} type="button" onClick={() => (setType(t), setErr(null))} className={cn("flex flex-col items-center gap-1 rounded-lg border p-2 text-center text-xs", type === t ? "border-primary bg-accent" : "hover:bg-muted")}>
                    <M.icon className={cn("size-5", M.color)} />
                    {M.label}
                  </button>
                );
              })}
            </div>
          )}
          <Field label="Title" htmlFor="ct" required>
            <Input id="ct" value={title} onChange={(e) => (setTitle(e.target.value), setErr(null))} />
          </Field>
          <Field label="Description" htmlFor="cd">
            <Input id="cd" value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
          {type === "text" && (
            <Field label="Lesson content" htmlFor="cb" hint="Use ## for headings, - for bullet points and **bold**." required>
              <Textarea id="cb" rows={10} value={body} onChange={(e) => (setBody(e.target.value), setErr(null))} className="font-mono text-xs" />
            </Field>
          )}
          {needsUrl && (
            <Field label={type === "video" ? "Video URL" : "Resource URL"} htmlFor="cu" required hint={type === "video" ? "MP4 link, YouTube or Vimeo" : "The platform will try to display the page inside the classroom."}>
              <Input id="cu" value={url} onChange={(e) => (setUrl(e.target.value), setErr(null))} placeholder="https://" />
            </Field>
          )}
          {needsFile && (
            <Field label="File" hint={`Up to ${maxMb} MB. ${value?.item?.fileName ? `Current: ${value.item.fileName}` : ""}`} required>
              <Input type="file" accept={type === "pdf" ? "application/pdf" : type === "presentation" ? ".ppt,.pptx,.pdf,.key,.odp" : type === "ebook" ? ".pdf,.epub" : undefined} onChange={(e) => (setFile(e.target.files?.[0] ?? null), setErr(null))} />
            </Field>
          )}
          {(type === "text" || type === "video") && (
            <Field label="Estimated duration (minutes)" htmlFor="cdur">
              <Input id="cdur" type="number" min={1} value={duration} onChange={(e) => setDuration(e.target.value)} className="w-32" />
            </Field>
          )}
          <Field label="Visibility">
            <AppSelect value={publish ? "pub" : "draft"} onChange={(v) => setPublish(v === "pub")} options={[{ value: "pub", label: "Published — visible to students" }, { value: "draft", label: "Draft — only you can see it" }]} />
          </Field>
          {err && <p className="text-sm text-destructive">{err}</p>}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

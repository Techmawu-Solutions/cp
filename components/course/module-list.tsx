"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, ChevronDown, ChevronsDownUp, ChevronsUpDown, Eye, EyeOff, FolderInput, GripVertical, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RichText } from "@/components/common/rich-text";
import { useDragDrop } from "@/components/common/use-drag-drop";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/common/empty-state";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { AppSelect } from "@/components/common/app-select";
import { Field } from "@/components/forms/field";
import { CONTENT_META } from "@/components/course/content-meta";
import { useStore } from "@/lib/store";
import { notifyCourseStudents } from "@/lib/actions";
import { registerUpload } from "@/lib/file-registry";
import { fmtBytes, sectionTerm, uid } from "@/lib/helpers";
import type { ContentItem, ContentType, Course, CourseModule, SectionLabel } from "@/lib/types";
import { cn } from "@/lib/utils";

const ADDABLE: ContentType[] = ["text", "video", "pdf", "ebook", "presentation", "link", "file"];
const SECTION_LABELS: SectionLabel[] = ["Section", "Module", "Topic", "Week", "Unit"];

/**
 * Course sections, Moodle-style (spec §25–26). In `edit` mode teachers add
 * sections with a summary, fill them with lessons, videos, documents and
 * links, drag items within or between sections, drag whole sections to
 * reorder them, and show or hide either from students. `view` is read-only.
 */
export function ModuleList({ course, mode, itemHref }: { course: Course; mode: "edit" | "view"; itemHref: (item: ContentItem) => string }) {
  const allModules = useStore((s) => s.modules);
  const allContents = useStore((s) => s.contents);
  const modules = allModules.filter((m) => m.courseId === course.id).sort((a, b) => a.order - b.order);
  const items = (moduleId: string) => allContents.filter((c) => c.moduleId === moduleId).sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt));
  const [moduleDialog, setModuleDialog] = useState<CourseModule | "new" | null>(null);
  const [itemDialog, setItemDialog] = useState<{ moduleId: string; item?: ContentItem } | null>(null);
  const [deleting, setDeleting] = useState<{ kind: "module" | "item"; id: string; title: string } | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const edit = mode === "edit";
  const term = sectionTerm(course);
  const isOpen = (id: string, i: number) => open[id] ?? i < 4;

  /** Writes a new order for a section's items (optionally moving one in from another section). */
  const placeItem = (itemId: string, sectionId: string, beforeId: string | null) => {
    const list = items(sectionId).filter((c) => c.id !== itemId);
    const at = beforeId ? list.findIndex((c) => c.id === beforeId) : list.length;
    const ids = [...list.map((c) => c.id)];
    ids.splice(at < 0 ? ids.length : at, 0, itemId);
    const order = new Map(ids.map((id, i) => [id, i]));
    useStore.getState().mutate((db) => ({ contents: db.contents.map((c) => (order.has(c.id) ? { ...c, moduleId: sectionId, order: order.get(c.id)! } : c)) }));
  };
  const placeSection = (sectionId: string, beforeId: string | null) => {
    const ids = modules.map((m) => m.id).filter((id) => id !== sectionId);
    const at = beforeId ? ids.indexOf(beforeId) : ids.length;
    ids.splice(at < 0 ? ids.length : at, 0, sectionId);
    const order = new Map(ids.map((id, i) => [id, i]));
    useStore.getState().mutate((db) => ({ modules: db.modules.map((m) => (order.has(m.id) ? { ...m, order: order.get(m.id)! } : m)) }));
  };
  const moveSection = (m: CourseModule, dir: -1 | 1) => {
    const idx = modules.findIndex((x) => x.id === m.id);
    const target = modules[idx + dir];
    if (target) placeSection(m.id, dir === -1 ? target.id : (modules[idx + 2]?.id ?? null));
  };
  const moveItem = (list: ContentItem[], it: ContentItem, dir: -1 | 1) => {
    const idx = list.findIndex((x) => x.id === it.id);
    if (!list[idx + dir]) return;
    placeItem(it.id, it.moduleId, dir === -1 ? list[idx - 1]!.id : (list[idx + 2]?.id ?? null));
  };

  // Drag ids: "s:<sectionId>" for sections, "i:<itemId>" for items. Drop targets:
  // an item ("i:") inserts before it; a section header ("s:") or a section's end zone ("end:") appends.
  const dnd = useDragDrop((drag, target) => {
    if (!target) return;
    const [kind, id] = drag.split(":") as ["s" | "i", string];
    const [tk, tid] = target.split(":") as ["s" | "i" | "end", string];
    if (kind === "s") {
      const sec = tk === "s" || tk === "end" ? tid : allContents.find((c) => c.id === tid)?.moduleId;
      if (sec && sec !== id) placeSection(id, sec);
      return;
    }
    if (tk === "i") {
      if (tid === id) return;
      const t = allContents.find((c) => c.id === tid);
      if (t) placeItem(id, t.moduleId, t.id);
    } else placeItem(id, tid, null);
    if (tk !== "i" || allContents.find((c) => c.id === tid)?.moduleId !== allContents.find((c) => c.id === id)?.moduleId) {
      const sec = modules.find((m) => m.id === (tk === "i" ? allContents.find((c) => c.id === tid)?.moduleId : tid));
      if (sec) setOpen((o) => ({ ...o, [sec.id]: true }));
    }
  });

  if (modules.length === 0)
    return (
      <>
        <EmptyState
          title={edit ? `No ${term.lower}s yet` : "No content yet"}
          description={edit ? `Organise the course into ${term.lower}s, e.g. “${term.one} 1 — Introduction”, then add lessons, videos, documents and links to each.` : "Content added by the teacher appears here."}
          action={edit && <Button onClick={() => setModuleDialog("new")}><Plus /> Add {term.lower}</Button>}
        />
        {edit && <ModuleDialog course={course} value={moduleDialog} onClose={() => setModuleDialog(null)} nextOrder={0} />}
      </>
    );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => setOpen(Object.fromEntries(modules.map((m) => [m.id, true])))}>
          <ChevronsUpDown /> Expand all
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setOpen(Object.fromEntries(modules.map((m) => [m.id, false])))}>
          <ChevronsDownUp /> Collapse all
        </Button>
        {edit && (
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              Call them
              <AppSelect
                aria-label="What to call sections"
                className="w-32"
                value={term.one}
                onChange={(v) => (useStore.getState().update("courses", course.id, { sectionLabel: v as SectionLabel }), toast.success(`Now called ${v.toLowerCase()}s`))}
                options={SECTION_LABELS.map((l) => ({ value: l, label: `${l}s` }))}
              />
            </label>
            <Button onClick={() => setModuleDialog("new")}>
              <Plus /> Add {term.lower}
            </Button>
          </div>
        )}
      </div>
      {edit && <p className="text-xs text-muted-foreground">Drag items by their handle to reorder them or move them to another {term.lower}; drag a {term.lower} by its handle to reorder {term.lower}s. You can also tap a handle, then tap where it goes.</p>}

      {modules.map((m, mi) => {
        const list = items(m.id);
        const hiddenCount = list.filter((i) => !i.published).length;
        const expanded = isOpen(m.id, mi);
        return (
          <Card key={m.id} data-drop={`s:${m.id}`} className={cn("gap-0 p-0 transition-shadow", dnd.over === `s:${m.id}` && "ring-2 ring-primary/50", dnd.picked && "cursor-copy", !m.published && "border-dashed")} onClick={() => edit && dnd.picked && dnd.place(`end:${m.id}`)}>
            <div className="flex items-start gap-2 px-3 py-3 sm:px-4">
              {edit && (
                <span {...dnd.chip(`s:${m.id}`, m.title)} tabIndex={0} role="button" aria-label={`Drag ${m.title}`} className={cn("mt-0.5 cursor-grab rounded p-0.5 text-muted-foreground hover:bg-muted active:cursor-grabbing", dnd.picked === `s:${m.id}` && "bg-primary/10 text-primary")}>
                  <GripVertical className="size-4" />
                </span>
              )}
              <button type="button" className="group flex min-w-0 flex-1 items-start gap-2 text-left" onClick={(e) => (e.stopPropagation(), setOpen((o) => ({ ...o, [m.id]: !expanded })))} aria-expanded={expanded}>
                <ChevronDown className={cn("mt-1 size-4 shrink-0 transition-transform", !expanded && "-rotate-90")} />
                <span className="min-w-0">
                  <span className="block font-semibold">{m.title}</span>
                  <span className="block text-xs text-muted-foreground">
                    {list.length} item{list.length === 1 ? "" : "s"}
                    {edit && hiddenCount > 0 && ` · ${hiddenCount} hidden`}
                  </span>
                </span>
              </button>
              {!m.published && (
                <Badge variant="outline" className="gap-1">
                  <EyeOff className="size-3" /> Hidden from students
                </Badge>
              )}
              {edit && (
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`${term.one} actions`} onClick={(e) => e.stopPropagation()} />}>
                    <MoreHorizontal />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => setItemDialog({ moduleId: m.id })}>
                      <Plus /> Add content
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setModuleDialog(m)}>
                      <Pencil /> Edit {term.lower}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        useStore.getState().update("modules", m.id, { published: !m.published });
                        if (!m.published) notifyCourseStudents(course, { kind: "material", title: "New course material", body: `${m.title} is now available in ${course.title}.`, href: `/learn/${course.id}` });
                        toast.success(m.published ? `${term.one} hidden from students` : `${term.one} shown — students notified`);
                      }}
                    >
                      {m.published ? <EyeOff /> : <Eye />} {m.published ? "Hide from students" : "Show to students"}
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled={mi === 0} onClick={() => moveSection(m, -1)}>
                      <ArrowUp /> Move up
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled={mi === modules.length - 1} onClick={() => moveSection(m, 1)}>
                      <ArrowDown /> Move down
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onClick={() => setDeleting({ kind: "module", id: m.id, title: m.title })}>
                      <Trash2 /> Delete {term.lower}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            {expanded && (
              <>
                {m.description && (
                  <div className="px-4 pb-3 text-sm text-muted-foreground sm:pl-12">
                    <RichText text={m.description} />
                  </div>
                )}
                <ul className="border-t">
                  {list.length === 0 && <li className="px-4 py-4 text-sm text-muted-foreground">Nothing in this {term.lower} yet{edit ? " — add content or drag items here." : "."}</li>}
                  {list.map((it, ii) => {
                    const M = CONTENT_META[it.type];
                    return (
                      <li
                        key={it.id}
                        data-drop={`i:${it.id}`}
                        onClick={(e) => edit && dnd.picked && (e.stopPropagation(), dnd.place(`i:${it.id}`))}
                        className={cn("relative flex items-center gap-2 border-b px-3 py-2.5 last:border-0 sm:px-4", dnd.over === `i:${it.id}` && "before:absolute before:inset-x-3 before:-top-px before:h-0.5 before:rounded before:bg-primary", dnd.picked === `i:${it.id}` && "bg-primary/5")}
                      >
                        {edit && (
                          <span {...dnd.chip(`i:${it.id}`, it.title)} tabIndex={0} role="button" aria-label={`Drag ${it.title}`} className="cursor-grab rounded p-0.5 text-muted-foreground/70 hover:bg-muted hover:text-foreground active:cursor-grabbing">
                            <GripVertical className="size-4" />
                          </span>
                        )}
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                          <M.icon className={cn("size-4", M.color)} />
                        </span>
                        <Link href={itemHref(it)} className="min-w-0 flex-1 hover:underline" onClick={(e) => dnd.picked && e.preventDefault()}>
                          <p className={cn("truncate text-sm font-medium", !it.published && "text-muted-foreground")}>{it.title}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {M.label}
                            {it.durationMinutes ? ` · ${it.durationMinutes} min` : ""}
                            {it.fileSize ? ` · ${fmtBytes(it.fileSize)}` : ""}
                            {it.description ? ` · ${it.description}` : ""}
                          </p>
                        </Link>
                        {!it.published && (
                          <Badge variant="outline" className="gap-1">
                            <EyeOff className="size-3" /> Hidden
                          </Badge>
                        )}
                        {edit && (
                          <DropdownMenu>
                            <DropdownMenuTrigger render={<Button variant="ghost" size="icon-xs" aria-label="Item actions" onClick={(e) => e.stopPropagation()} />}>
                              <MoreHorizontal />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              {it.type !== "recording" && (
                                <DropdownMenuItem onClick={() => setItemDialog({ moduleId: m.id, item: it })}>
                                  <Pencil /> Edit
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => (useStore.getState().update("contents", it.id, { published: !it.published }), toast.success(it.published ? "Hidden from students" : "Shown to students"))}>
                                {it.published ? <EyeOff /> : <Eye />} {it.published ? "Hide from students" : "Show to students"}
                              </DropdownMenuItem>
                              <DropdownMenuItem disabled={ii === 0} onClick={() => moveItem(list, it, -1)}>
                                <ArrowUp /> Move up
                              </DropdownMenuItem>
                              <DropdownMenuItem disabled={ii === list.length - 1} onClick={() => moveItem(list, it, 1)}>
                                <ArrowDown /> Move down
                              </DropdownMenuItem>
                              {modules.length > 1 && (
                                <DropdownMenuSub>
                                  <DropdownMenuSubTrigger>
                                    <FolderInput /> Move to {term.lower}
                                  </DropdownMenuSubTrigger>
                                  <DropdownMenuSubContent className="w-56">
                                    {modules
                                      .filter((x) => x.id !== m.id)
                                      .map((x) => (
                                        <DropdownMenuItem key={x.id} onClick={() => (placeItem(it.id, x.id, null), toast.success(`Moved to ${x.title}`))}>
                                          <span className="truncate">{x.title}</span>
                                        </DropdownMenuItem>
                                      ))}
                                  </DropdownMenuSubContent>
                                </DropdownMenuSub>
                              )}
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
                  <div data-drop={`end:${m.id}`} className={cn("border-t px-3 py-2 sm:px-4", dnd.over === `end:${m.id}` && "bg-primary/5")}>
                    <Button variant="ghost" size="sm" onClick={(e) => (e.stopPropagation(), setItemDialog({ moduleId: m.id }))}>
                      <Plus /> Add an activity or resource
                    </Button>
                  </div>
                )}
              </>
            )}
          </Card>
        );
      })}
      {dnd.overlay}

      {edit && (
        <>
          <Button variant="outline" className="w-full border-dashed" onClick={() => setModuleDialog("new")}>
            <Plus /> Add {term.lower}
          </Button>
          <ModuleDialog course={course} value={moduleDialog} onClose={() => setModuleDialog(null)} nextOrder={(modules[modules.length - 1]?.order ?? -1) + 1} />
          <ContentDialog course={course} value={itemDialog} onClose={() => setItemDialog(null)} nextOrder={itemDialog ? items(itemDialog.moduleId).length : 0} />
          <ConfirmDialog
            open={!!deleting}
            onOpenChange={(o) => !o && setDeleting(null)}
            title={`Delete “${deleting?.title}”?`}
            description={deleting?.kind === "module" ? `The ${term.lower} and all of its content will be removed.` : "This item will be removed from the course."}
            destructive
            confirmLabel="Delete"
            onConfirm={() => {
              if (!deleting) return;
              const st = useStore.getState();
              if (deleting.kind === "module") {
                st.removeWhere("contents", (c) => c.moduleId === deleting.id);
                st.remove("modules", deleting.id);
              } else st.remove("contents", deleting.id);
              st.audit({ schoolId: course.schoolId, action: deleting.kind === "module" ? `${term.one} deleted` : "Content deleted", target: deleting.title, category: "lms" });
              toast.success("Deleted");
            }}
          />
        </>
      )}
    </div>
  );
}

function ModuleDialog({ course, value, onClose, nextOrder }: { course: Course; value: CourseModule | "new" | null; onClose: () => void; nextOrder: number }) {
  const term = sectionTerm(course);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visible, setVisible] = useState(true);
  const [loaded, setLoaded] = useState<string | null>(null);
  const key = value === "new" ? "new" : value?.id ?? null;
  if (key !== loaded) {
    setLoaded(key);
    setTitle(value && value !== "new" ? value.title : `${term.one} ${nextOrder + 1} — `);
    setDescription(value && value !== "new" ? value.description : "");
    setVisible(value && value !== "new" ? value.published : true);
  }
  return (
    <Dialog open={value !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{value === "new" ? `Add ${term.lower}` : `Edit ${term.lower}`}</DialogTitle>
          <DialogDescription>A {term.lower} groups related lessons, videos, documents and links — like a topic or week in Moodle.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (title.trim().length < 3) return toast.error(`Give the ${term.lower} a title`);
            const st = useStore.getState();
            if (value === "new") {
              st.insert("modules", { id: uid("mod"), courseId: course.id, title: title.trim(), description: description.trim(), order: nextOrder, published: visible });
              st.audit({ schoolId: course.schoolId, action: `${term.one} created`, target: `${title.trim()} (${course.title})`, category: "lms" });
              toast.success(visible ? `${term.one} added` : `${term.one} added — hidden until you show it`);
            } else if (value) {
              st.update("modules", value.id, { title: title.trim(), description: description.trim(), published: visible });
              toast.success(`${term.one} updated`);
            }
            onClose();
          }}
        >
          <Field label="Title" htmlFor="mt" required>
            <Input id="mt" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          </Field>
          <Field label="Summary" htmlFor="md" hint="Shown to students at the top of the section. Use ## for headings, - for bullets and **bold**.">
            <Textarea id="md" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What students will learn in this section" />
          </Field>
          <label className="flex items-center justify-between gap-4 rounded-lg border px-3 py-2">
            <span className="text-sm">
              <span className="block font-medium">Visible to students</span>
              <span className="text-xs text-muted-foreground">Hidden {term.lower}s stay in your course but students can&apos;t see them.</span>
            </span>
            <Switch checked={visible} onCheckedChange={setVisible} />
          </label>
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
      if (publish) notifyCourseStudents(course, { kind: "material", title: "New course material", body: `${title.trim()} was added to ${course.title}.`, href: `/learn/${course.id}/${id}` });
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
            <Field label="File" hint={`Up to ${maxMb} MB. Opens in the platform's viewer: PDF, Word (.docx), Excel (.xlsx/.csv), images and text. Upload slides as PDF.${value?.item?.fileName ? ` Current: ${value.item.fileName}` : ""}`} required>
              <Input type="file" accept={type === "pdf" ? "application/pdf" : type === "presentation" ? ".pdf,.pptx,.ppt,.key,.odp" : type === "ebook" ? ".pdf,.epub" : undefined} onChange={(e) => (setFile(e.target.files?.[0] ?? null), setErr(null))} />
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

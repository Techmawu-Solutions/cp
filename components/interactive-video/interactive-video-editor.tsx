"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, CheckCircle2, Clapperboard, Eye, ListVideo, Loader2, Pause, Play, Plus, Save, Sparkles, Undo2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { AppSelect } from "@/components/common/app-select";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { LinkButton } from "@/components/common/link-button";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { useRecordSessionOpen } from "@/components/academic/session-banner";
import { InteractionForm } from "@/components/interactive-video/interaction-form";
import { InteractiveVideoPlayer } from "@/components/interactive-video/interactive-video-player";
import { VideoSurface } from "@/components/interactive-video/video-surface";
import { VideoTimeline } from "@/components/interactive-video/video-timeline";
import { canManageCourseVideo, decideSuggestions, discardDraft, interactionsOf, openDraft, publishDraft, publishedSetOf, requestSuggestions, saveDraft, setVideoDuration, unpublishSet } from "@/lib/interactive-video/actions";
import { INTERACTION_TYPES, blankInteraction, fmtTime, interactionLabel, interactionProblems, moveInteraction, parseTime, parseVideoUrl, renumber, sortInteractions } from "@/lib/interactive-video/engine";
import type { PlayerEngine } from "@/lib/interactive-video/player";
import { uid } from "@/lib/helpers";
import { useCurrentUser } from "@/lib/session";
import { useStore } from "@/lib/store";
import type { ContentItem, ID, VideoAiSuggestion, VideoAsset, VideoInteraction, VideoInteractionSet, VideoInteractionType } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Interactive Video Editor (spec section 26.3): the teacher plays the lesson's
 * video, pauses where a question belongs, adds it at that moment, and drags
 * markers to fine-tune. Changes stay in a draft until published.
 */
export function InteractiveVideoEditor({ base }: { base: "/teacher" | "/school" }) {
  const { id, itemId } = useParams<{ id: string; itemId: string }>();
  const course = useStore((s) => s.courses.find((c) => c.id === id));
  const item = useStore((s) => s.contents.find((c) => c.id === itemId && c.courseId === id));
  const sets = useStore((s) => s.videoInteractionSets);
  const assets = useStore((s) => s.videoAssets);
  const me = useCurrentUser();
  const open = useRecordSessionOpen(course?.sessionId);
  const store = useStore.getState;
  if (!course || !item) return <EmptyState title="Content not found" />;
  const back = `${base}/courses/${id}/items/${itemId}`;
  if (item.type !== "video" || !item.url || !parseVideoUrl(item.url) || parseVideoUrl(item.url)?.provider === "vimeo")
    return <EmptyState icon={Clapperboard} title="This video can't have questions yet" description="Interactive questions work with uploaded video files and YouTube videos. Vimeo support is coming." action={<LinkButton href={back}>Back to the lesson</LinkButton>} className="mt-8" />;
  const allowed = canManageCourseVideo(store(), me?.user.id ?? null, course) && open;
  const draft = sets.find((s) => s.contentId === item.id && s.status === "draft");
  const published = sets.find((s) => s.contentId === item.id && s.status === "published");
  const asset = assets.find((v) => v.id === (draft ?? published)?.videoId);

  const header = (
    <PageHeader
      breadcrumbs={[{ label: course.title, href: `${base}/courses/${id}?tab=content` }, { label: item.title, href: back }, { label: "Interactive video" }]}
      title="Interactive video editor"
      description={
        <span className="flex flex-wrap items-center gap-2">
          <span data-no-translate>{item.title}</span>
          {published && <StatusBadge status="published">Published · version {published.version}</StatusBadge>}
          {draft && <StatusBadge status="draft">Draft · version {draft.version}</StatusBadge>}
        </span>
      }
      className="mb-4"
    />
  );

  if (!draft || !asset)
    return (
      <>
        {header}
        <Card className="mx-auto max-w-2xl">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <ListVideo className="size-9 text-primary" />
            <p className="text-lg font-semibold">{published ? "Change this video's questions" : "Add questions to this video"}</p>
            <p className="max-w-md text-sm text-muted-foreground">
              {published
                ? "Your changes go into a new draft. Students keep the published questions until you publish the draft, and the answers already given stay in Results."
                : "Play the video, pause where you want to check understanding and add a question there. The video file itself is never changed."}
            </p>
            {!allowed && <p className="text-sm text-muted-foreground">{open ? "Only the course's teacher can edit its questions." : "This academic session is closed, so its lessons can't be changed."}</p>}
            <div className="flex flex-wrap justify-center gap-2">
              <LinkButton href={back} variant="outline">
                Back to the lesson
              </LinkButton>
              <Button
                disabled={!allowed}
                onClick={() => {
                  const r = openDraft(item);
                  if (!r.ok) toast.error(r.error);
                }}
              >
                <Plus /> {published ? "Edit questions" : "Start adding questions"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </>
    );

  return (
    <>
      {header}
      <DraftEditor key={draft.id} item={item} set={draft} published={published ?? null} asset={asset} readOnly={!allowed} back={back} />
    </>
  );
}

type Settings = Pick<VideoInteractionSet, "preventSkipping" | "completionPercent">;

function DraftEditor({ item, set, published, asset, readOnly, back }: { item: ContentItem; set: VideoInteractionSet; published: VideoInteractionSet | null; asset: VideoAsset; readOnly: boolean; back: string }) {
  const router = useRouter();
  const [saved, setSaved] = useState(() => interactionsOf(useStore.getState(), set.id));
  const [list, setList] = useState<VideoInteraction[]>(saved);
  const [settings, setSettings] = useState<Settings>({ preventSkipping: set.preventSkipping, completionPercent: set.completionPercent });
  const [selected, setSelected] = useState<ID | null>(null);
  const [engine, setEngine] = useState<PlayerEngine | null>(null);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(asset.durationSeconds);
  const [addAt, setAddAt] = useState("");
  const [confirm, setConfirm] = useState<null | "delete" | "cancel" | "publish" | "discard" | "unpublish">(null);
  const [preview, setPreview] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const suggestions = useStore((s) => s.videoAiSuggestions).filter((x) => x.setId === set.id && x.status === "pending");
  const [accepted, setAccepted] = useState<{ id: ID; as: ID }[]>([]);
  const [dismissed, setDismissed] = useState<ID[]>([]);
  const onEngine = useCallback((e: PlayerEngine | null) => setEngine(e), []);

  const sorted = sortInteractions(list);
  const dirty = JSON.stringify(sortInteractions(saved)) !== JSON.stringify(sorted) || settings.preventSkipping !== set.preventSkipping || settings.completionPercent !== set.completionPercent || accepted.length > 0 || dismissed.length > 0;
  const current = sorted.find((i) => i.id === selected) ?? null;
  const problems = sorted.map((i) => interactionProblems(i, duration || null));
  const badCount = problems.filter((p) => p.length).length;

  useEffect(() => {
    if (!engine) return;
    return engine.subscribe((e) => {
      if (e.type === "time") setTime(e.time);
      else if (e.type === "play") setPlaying(true);
      else if (e.type === "pause" || e.type === "ended") setPlaying(false);
      else if (e.type === "ready" && e.duration > 0) {
        setDuration(e.duration);
        // The real length from the player replaces the estimate, so timestamps are checked against it.
        setVideoDuration(asset.id, e.duration);
      } else if (e.type === "error") toast.error(e.message);
    });
  }, [engine, asset.id]);

  // Unsaved changes: warn before the tab closes.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const seek = (t: number) => {
    engine?.seek(t);
    setTime(t);
  };
  const update = (next: VideoInteraction) => setList((l) => l.map((i) => (i.id === next.id ? next : i)));
  const add = (type: VideoInteractionType, at = time) => {
    const t = Math.min(Math.max(0, Math.round(at * 10) / 10), duration || at);
    engine?.pause();
    const i = { ...blankInteraction(type, { id: uid("vit"), setId: set.id, optionId: () => uid("vio") }, t), order: sorted.filter((x) => x.timestamp === t).length };
    setList((l) => [...l, i]);
    setSelected(i.id);
    toast.success(`${interactionLabel(type)} added at ${fmtTime(t)}`);
    setTimeout(() => document.getElementById(`ivf-${i.id}-q`)?.focus(), 50);
  };
  const duplicate = (i: VideoInteraction) => {
    const copy = { ...i, id: uid("vit"), timestamp: Math.min(duration || i.timestamp + 5, i.timestamp + 5), options: i.options.map((o) => ({ ...o, id: uid("vio") })), source: "teacher" as const };
    setList((l) => [...l, copy]);
    setSelected(copy.id);
  };
  const save = (quiet = false) => {
    const r = saveDraft(set.id, list, settings);
    if (!r.ok) {
      toast.error(r.error);
      return false;
    }
    decideSuggestions([...accepted.map((a) => ({ id: a.id, status: "accepted" as const, acceptedAsId: list.some((i) => i.id === a.as) ? a.as : undefined })), ...dismissed.map((id) => ({ id, status: "dismissed" as const }))]);
    setAccepted([]);
    setDismissed([]);
    const fresh = interactionsOf(useStore.getState(), set.id);
    setSaved(fresh);
    setList(fresh);
    if (!quiet) toast.success("Draft saved");
    return true;
  };
  const publish = () => {
    if (!save(true)) return;
    const r = publishDraft(set.id);
    if (!r.ok) return void toast.error(r.error);
    toast.success(`Published — students see these ${list.length} questions next time they open the lesson`);
    router.push(back);
  };
  const suggest = async () => {
    setSuggesting(true);
    const r = await requestSuggestions(set.id, list);
    setSuggesting(false);
    if (!r.ok) return void toast.error(r.error);
    if (r.value.length === 0) toast.info("No new suggestions: every part of the transcript already has a question nearby.");
  };
  const accept = (s: VideoAiSuggestion) => {
    const i: VideoInteraction = { ...s.suggestion, id: uid("vit"), setId: set.id, order: 0, source: "ai", options: s.suggestion.options.map((o) => ({ ...o, id: uid("vio") })) };
    setList((l) => renumber([...l, i]));
    setAccepted((a) => [...a, { id: s.id, as: i.id }]);
    setSelected(i.id);
  };
  const pendingSuggestions = suggestions.filter((s) => !accepted.some((a) => a.id === s.id) && !dismissed.includes(s.id));

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="sticky top-14 z-20 -mx-1 flex flex-wrap items-center gap-2 rounded-xl border bg-background/95 px-3 py-2 shadow-sm backdrop-blur">
        <p className="mr-auto text-sm text-muted-foreground">
          {sorted.length === 1 ? "1 question" : `${sorted.length} questions`}
          {badCount > 0 && <span className="text-amber-700 dark:text-amber-300"> · {badCount === 1 ? "1 needs attention" : `${badCount} need attention`}</span>}
          {dirty && <span> · Unsaved changes</span>}
          {published && <span className="hidden sm:inline"> · Students see version {published.version} until you publish</span>}
        </p>
        <Button variant="outline" size="sm" onClick={() => setPreview(true)} disabled={sorted.length === 0}>
          <Eye /> Preview
        </Button>
        {!readOnly && (
          <>
            <Button variant="ghost" size="sm" onClick={() => (dirty ? setConfirm("cancel") : router.push(back))}>
              <Undo2 /> {dirty ? "Cancel changes" : "Done"}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => save()} disabled={!dirty}>
              <Save /> Save draft
            </Button>
            <Button size="sm" onClick={() => setConfirm("publish")} disabled={sorted.length === 0 || badCount > 0}>
              <Upload /> Publish
            </Button>
          </>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="min-w-0 space-y-4">
          <Card className="gap-0 overflow-hidden p-0">
            <div className="relative aspect-video bg-black">
              <VideoSurface asset={asset} onEngine={onEngine} />
            </div>
            <div className="space-y-2 p-3">
              <VideoTimeline
                duration={duration}
                time={time}
                markers={sorted.map((i, n) => ({ id: i.id, time: i.timestamp, label: `Question ${n + 1}: ${interactionLabel(i.type)}`, required: i.required, problem: problems[n]!.length > 0 }))}
                onSeek={seek}
                onSelect={(mid) => {
                  setSelected(mid);
                  const m = sorted.find((x) => x.id === mid);
                  if (m) seek(m.timestamp);
                }}
                onMove={readOnly ? undefined : (mid, t) => setList((l) => renumber(l.map((i) => (i.id === mid ? { ...i, timestamp: Math.min(t, duration || t) } : i))))}
                selectedId={selected}
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button size="icon-sm" variant="outline" onClick={() => (playing ? engine?.pause() : engine?.play())} disabled={!engine} aria-label={playing ? "Pause" : "Play"}>
                  {playing ? <Pause /> : <Play />}
                </Button>
                <span className="text-sm tabular-nums">
                  {fmtTime(time)} <span className="text-muted-foreground">/ {fmtTime(duration)}</span>
                </span>
                <div className="flex-1" />
                {!readOnly && (
                  <>
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button size="sm" />}>
                        <Plus /> Add at {fmtTime(time)}
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-60">
                        {INTERACTION_TYPES.map((t) => (
                          <DropdownMenuItem key={t.value} onClick={() => add(t.value)}>
                            <span>
                              <span className="block">{t.label}</span>
                              <span className="block text-xs text-muted-foreground">{t.hint}</span>
                            </span>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <form
                      className="flex items-center gap-1"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const t = parseTime(addAt);
                        if (t == null) return void toast.error("Type a time such as 2:35.");
                        if (duration && t > duration) return void toast.error(`The video is only ${fmtTime(duration)} long.`);
                        add("mcq", t);
                        setAddAt("");
                      }}
                    >
                      <Input value={addAt} onChange={(e) => setAddAt(e.target.value)} placeholder="m:ss" aria-label="Add a question at this time" className="h-7 w-20 text-sm" />
                      <Button size="sm" variant="outline" type="submit">
                        Add at time
                      </Button>
                    </form>
                  </>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Drag a marker to move its question, or select it and use the arrow keys (Shift for 5 seconds).</p>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Questions</CardTitle>
              <CardDescription>In the order students meet them.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {sorted.length === 0 ? (
                <EmptyState icon={ListVideo} title="No questions yet" description="Play the video and use Add at… where you want to check understanding." className="mx-4 mb-4" />
              ) : (
                <ol className="divide-y">
                  {sorted.map((i, n) => (
                    <li key={i.id} className={cn("flex items-center gap-2 px-4 py-2.5", selected === i.id && "bg-primary/5")}>
                      <button type="button" onClick={() => seek(i.timestamp)} className="w-12 shrink-0 rounded text-left font-mono text-sm tabular-nums text-primary hover:underline" title="Go to this moment">
                        {fmtTime(i.timestamp)}
                      </button>
                      <button type="button" onClick={() => (setSelected(i.id), seek(i.timestamp))} className="min-w-0 flex-1 text-left">
                        <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                          {interactionLabel(i.type)}
                          {i.required ? <span className="rounded bg-primary/10 px-1 text-primary">Required</span> : <span>Optional</span>}
                          {i.source === "ai" && <Sparkles className="size-3 text-violet-500" aria-label="Suggested" />}
                          {problems[n]!.length > 0 && <span className="rounded bg-amber-500/15 px-1 text-amber-800 dark:text-amber-300">Needs attention</span>}
                        </span>
                        <span className="block truncate text-sm font-medium" data-no-translate>
                          {i.question || <span className="text-muted-foreground italic">No question yet</span>}
                        </span>
                      </button>
                      {!readOnly && (
                        <span className="flex shrink-0">
                          <Button size="icon-xs" variant="ghost" disabled={n === 0} onClick={() => setList((l) => moveInteraction(l, i.id, -1))} aria-label="Move earlier">
                            <ArrowUp />
                          </Button>
                          <Button size="icon-xs" variant="ghost" disabled={n === sorted.length - 1} onClick={() => setList((l) => moveInteraction(l, i.id, 1))} aria-label="Move later">
                            <ArrowDown />
                          </Button>
                        </span>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Rules for students</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <label className="flex items-start gap-3">
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">No skipping past required questions</span>
                    <span className="block text-xs text-muted-foreground">Students can always go back; going forward stops at a required question they haven&apos;t answered.</span>
                  </span>
                  <Switch checked={settings.preventSkipping} disabled={readOnly} onCheckedChange={(v) => setSettings((s) => ({ ...s, preventSkipping: v }))} />
                </label>
                <div className="space-y-1.5">
                  <p className="text-sm font-medium">Complete when they have watched</p>
                  <AppSelect value={String(settings.completionPercent)} disabled={readOnly} onChange={(v) => setSettings((s) => ({ ...s, completionPercent: Number(v) }))} options={[50, 75, 90, 100].map((n) => ({ value: String(n), label: `${n}% of the video` }))} />
                  <p className="text-xs text-muted-foreground">…and answered every required question. Skipping ahead doesn&apos;t count as watching.</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-1.5">
                  <Sparkles className="size-4 text-violet-500" /> Suggested questions
                </CardTitle>
                <CardDescription>Drafted from the video&apos;s transcript. Nothing reaches students until you accept, check and publish it.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {pendingSuggestions.map((s) => (
                  <div key={s.id} className="rounded-lg border p-2.5 text-sm">
                    <p className="text-xs text-muted-foreground">
                      {fmtTime(s.suggestion.timestamp)} · {interactionLabel(s.suggestion.type)}
                    </p>
                    <p className="font-medium" data-no-translate>
                      {s.suggestion.question}
                    </p>
                    {s.rationale && (
                      <p className="mt-0.5 text-xs text-muted-foreground" data-no-translate>
                        {s.rationale}
                      </p>
                    )}
                    {!readOnly && (
                      <div className="mt-2 flex gap-1.5">
                        <Button size="xs" onClick={() => accept(s)}>
                          <CheckCircle2 /> Add to draft
                        </Button>
                        <Button size="xs" variant="ghost" onClick={() => setDismissed((d) => [...d, s.id])}>
                          <X /> Dismiss
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
                {!readOnly && (
                  <Button size="sm" variant="outline" onClick={suggest} disabled={suggesting || !asset.transcript}>
                    {suggesting ? <Loader2 className="animate-spin" /> : <Sparkles />} Suggest questions
                  </Button>
                )}
                {!asset.transcript && <p className="text-xs text-muted-foreground">This video has no transcript yet.</p>}
              </CardContent>
            </Card>
          </div>

          {published && !readOnly && (
            <div className="flex flex-wrap gap-2 text-sm">
              <Button variant="ghost" size="sm" onClick={() => setConfirm("discard")}>
                Discard this draft
              </Button>
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setConfirm("unpublish")}>
                Stop showing questions on this video
              </Button>
            </div>
          )}
        </div>

        <div className="min-w-0">
          <Card className="lg:sticky lg:top-32">
            <CardContent>
              {current ? (
                <InteractionForm
                  key={current.id}
                  value={current}
                  number={sorted.indexOf(current) + 1}
                  duration={duration}
                  currentTime={time}
                  onChange={update}
                  onDuplicate={() => duplicate(current)}
                  onDelete={() => setConfirm("delete")}
                  onClose={() => setSelected(null)}
                  disabled={readOnly}
                />
              ) : (
                <EmptyState icon={ListVideo} title="Select a question to edit it" description="Or add one at the current moment in the video." className="border-0" />
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={preview} onOpenChange={setPreview}>
        <DialogContent className="max-h-[95vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Student preview</DialogTitle>
            <DialogDescription>Exactly what students get, with your unsaved changes. Nothing you answer here is recorded.</DialogDescription>
          </DialogHeader>
          {preview && <InteractiveVideoPlayer asset={asset} set={{ id: `preview-${set.id}`, ...settings }} interactions={sorted} />}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirm === "delete"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Delete this question?"
        description="It's removed from the draft. Published questions and their answers aren't affected until you publish."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          setList((l) => l.filter((i) => i.id !== selected));
          setSelected(null);
          setConfirm(null);
        }}
      />
      <ConfirmDialog
        open={confirm === "cancel"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Throw away your unsaved changes?"
        description="The draft goes back to how it was when you last saved it."
        confirmLabel="Throw away"
        destructive
        onConfirm={() => {
          setList(saved);
          setSettings({ preventSkipping: set.preventSkipping, completionPercent: set.completionPercent });
          setAccepted([]);
          setDismissed([]);
          setSelected(null);
          setConfirm(null);
        }}
      />
      <ConfirmDialog
        open={confirm === "publish"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={`Publish ${sorted.length === 1 ? "1 question" : `${sorted.length} questions`}?`}
        description={published ? `Students get version ${set.version} next time they open the lesson. Answers to version ${published.version} stay in Results, and students keep their place in the video.` : "Students get these questions next time they open the lesson."}
        confirmLabel="Publish"
        onConfirm={() => {
          setConfirm(null);
          publish();
        }}
      />
      <ConfirmDialog
        open={confirm === "discard"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Discard this draft?"
        description={`Students keep version ${published?.version}. Your draft changes are lost.`}
        confirmLabel="Discard"
        destructive
        onConfirm={() => {
          const r = discardDraft(set.id);
          if (!r.ok) toast.error(r.error);
          else router.push(back);
        }}
      />
      <ConfirmDialog
        open={confirm === "unpublish"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Stop showing questions on this video?"
        description="Students see the plain video again. Their answers so far stay in Results, and you can publish questions again later."
        confirmLabel="Stop showing"
        destructive
        onConfirm={() => {
          const live = publishedSetOf(useStore.getState(), item.id);
          if (live) {
            const r = unpublishSet(live.id);
            if (!r.ok) return void toast.error(r.error);
          }
          setConfirm(null);
          toast.success("Questions hidden from students");
        }}
      />
    </div>
  );
}

"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, Download, FileWarning } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RichText } from "@/components/common/rich-text";
import { LinkButton } from "@/components/common/link-button";
import { VideoPlayer } from "@/components/media/video-player";
import { ResourceViewer, toEmbedUrl } from "@/components/course/resource-viewer";
import { CONTENT_META } from "@/components/course/content-meta";
import { uploadedUrl } from "@/lib/file-registry";
import { fmtBytes, fmtDate } from "@/lib/helpers";
import type { ContentItem } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * LessonViewer (spec §57) — renders any content type. Students get
 * "Mark as complete" and previous/next navigation through the course.
 */
export function ContentViewer({
  item,
  prev,
  next,
  hrefFor,
  completed,
  onComplete,
}: {
  item: ContentItem;
  prev?: ContentItem;
  next?: ContentItem;
  hrefFor: (i: ContentItem) => string;
  completed?: boolean;
  onComplete?: () => void;
}) {
  const M = CONTENT_META[item.type];
  const fileUrl = uploadedUrl(item.id) ?? (item.url?.startsWith("blob:") ? undefined : item.url);
  const isMp4 = !!item.url && /\.(mp4|webm|ogg)(\?|$)/i.test(item.url);

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex items-start gap-3">
        <span className="mt-1 flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
          <M.icon className={cn("size-5", M.color)} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">
            {M.label}
            {item.durationMinutes ? ` · ${item.durationMinutes} min` : ""} · Added {fmtDate(item.createdAt)}
          </p>
          <h1 className="text-xl font-semibold sm:text-2xl">{item.title}</h1>
          {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
        </div>
      </div>

      {item.type === "text" && item.body && (
        <Card>
          <CardContent className="py-2">
            <RichText text={item.body} />
          </CardContent>
        </Card>
      )}

      {(item.type === "video" || item.type === "recording") && item.url && (isMp4 ? <VideoPlayer src={item.url} title={item.title} onEnded={onComplete} /> : <ResourceViewer url={toEmbedUrl(item.url).url} title={item.title} />)}

      {item.type === "link" && item.url && <ResourceViewer url={item.url} title={item.title} />}

      {["pdf", "ebook", "presentation", "file"].includes(item.type) &&
        (fileUrl && (item.type === "pdf" || item.fileName?.endsWith(".pdf")) ? (
          <iframe src={fileUrl} title={item.title} className="h-[75vh] w-full rounded-xl border" />
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center py-10 text-center">
              {fileUrl ? <Download className="size-8 text-primary" /> : <FileWarning className="size-8 text-muted-foreground" />}
              <p className="mt-3 font-medium">{item.fileName ?? item.title}</p>
              <p className="text-sm text-muted-foreground">
                {item.fileSize ? fmtBytes(item.fileSize) : ""}
                {fileUrl ? "" : " · The prototype doesn't store file contents; in production this downloads from storage."}
              </p>
              {fileUrl ? (
                <a href={fileUrl} download={item.fileName} className={cn(buttonVariants(), "mt-4")}>
                  <Download /> Download
                </a>
              ) : (
                <Button className="mt-4" variant="outline" onClick={() => toast.message("Download simulated", { description: item.fileName })}>
                  <Download /> Download
                </Button>
              )}
            </CardContent>
          </Card>
        ))}

      <div className="flex flex-wrap items-center gap-2 border-t pt-4">
        {prev ? (
          <LinkButton href={hrefFor(prev)} variant="outline" className="max-w-[45%]">
            <ArrowLeft /> <span className="truncate">{prev.title}</span>
          </LinkButton>
        ) : (
          <span />
        )}
        <div className="flex-1" />
        {onComplete &&
          (completed ? (
            <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
              <CheckCircle2 className="size-4" /> Completed
            </span>
          ) : (
            <Button variant="secondary" onClick={onComplete}>
              <CheckCircle2 /> Mark as complete
            </Button>
          ))}
        {next && (
          <Link href={hrefFor(next)} onClick={() => onComplete && !completed && item.type !== "video" && onComplete()} className="inline-flex max-w-[45%] items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/85">
            <span className="truncate">{next.title}</span> <ArrowRight className="size-4 shrink-0" />
          </Link>
        )}
      </div>
    </div>
  );
}

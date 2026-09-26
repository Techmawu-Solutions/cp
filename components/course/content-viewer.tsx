"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, Download, FileWarning } from "lucide-react";
import { DocumentViewer } from "@/components/media/document-viewer";
import { useCurrentUser, useTenant } from "@/lib/session";
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
  protect,
}: {
  item: ContentItem;
  prev?: ContentItem;
  next?: ContentItem;
  hrefFor: (i: ContentItem) => string;
  completed?: boolean;
  onComplete?: () => void;
  /** Viewer is a student: apply the school's download restrictions and watermark videos. */
  protect?: boolean;
}) {
  const M = CONTENT_META[item.type];
  const me = useCurrentUser();
  const { school } = useTenant();
  const fileUrl = uploadedUrl(item.id) ?? (item.url?.startsWith("blob:") ? undefined : item.url);
  const isMp4 = !!item.url && /\.(mp4|webm|ogg)(\?|$)/i.test(item.url);
  const rules = school?.contentProtection;
  const canDownloadDocs = !protect || rules?.documentDownloads !== false;
  const canDownloadVideo = !protect || !!rules?.recordingDownloads;
  const watermark = protect && me ? `${me.user.name} · ${me.user.username ?? me.user.email}` : undefined;

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

      {(item.type === "video" || item.type === "recording") &&
        item.url &&
        (isMp4 ? (
          <>
            <VideoPlayer src={item.url} title={item.title} onEnded={onComplete} protect={!canDownloadVideo} watermark={watermark} />
            {canDownloadVideo && (
              <a href={item.url} download className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                <Download /> Download video
              </a>
            )}
          </>
        ) : (
          <ResourceViewer url={toEmbedUrl(item.url).url} title={item.title} />
        ))}

      {item.type === "link" && item.url && <ResourceViewer url={item.url} title={item.title} />}

      {["pdf", "ebook", "presentation", "file"].includes(item.type) &&
        (fileUrl ? (
          <DocumentViewer url={fileUrl} fileName={item.fileName ?? item.title} allowDownload={canDownloadDocs} />
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center py-10 text-center">
              <FileWarning className="size-8 text-muted-foreground" />
              <p className="mt-3 font-medium">{item.fileName ?? item.title}</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                {item.fileSize ? `${fmtBytes(item.fileSize)} · ` : ""}The file for this item hasn&apos;t been uploaded in this browser. In production it opens here from storage.
              </p>
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

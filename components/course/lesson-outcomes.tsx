"use client";

import { EyeOff, Target } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/common/status-badge";
import { useStore } from "@/lib/store";
import { OUTCOME_LABEL, outcomeStatus } from "@/lib/outcomes";
import { fmtAgo } from "@/lib/helpers";
import type { ContentItem } from "@/lib/types";

/**
 * A lesson's learning outcomes and indicators on the staff lesson page
 * (spec §25.2). This component is only used on teacher and administrator
 * pages; students never see it.
 */
export function LessonOutcomes({ item, canEdit, onEdit }: { item: ContentItem; canEdit?: boolean; onEdit?: () => void }) {
  const by = useStore((s) => s.users.find((u) => u.id === item.outcomesUpdatedBy));
  const status = outcomeStatus(item);
  const list = (title: string, xs: string[] | undefined) => (
    <div>
      <p className="mb-1.5 text-sm font-medium">{title}</p>
      {xs?.length ? (
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          {xs.map((x, i) => (
            <li key={i}>{x}</li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-muted-foreground">Not added yet.</p>
      )}
    </div>
  );
  return (
    <Card className="mx-auto mt-6 max-w-4xl border-dashed">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          <Target className="size-5 text-primary" /> Learning outcomes and indicators
          <StatusBadge tone={status === "complete" ? "green" : status === "partial" ? "amber" : "gray"}>{OUTCOME_LABEL[status]}</StatusBadge>
        </CardTitle>
        <CardDescription className="flex flex-wrap items-center gap-1.5">
          <EyeOff className="size-3.5" /> Only teachers and administrators see this — never students.
          {item.outcomesUpdatedAt && (
            <span>
              · Updated {fmtAgo(item.outcomesUpdatedAt)}
              {by ? ` by ${by.name}` : ""}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5 sm:grid-cols-2">
        {list("Learning outcomes", item.learningOutcomes)}
        {list("Learning indicators", item.learningIndicators)}
        {canEdit && onEdit && status !== "complete" && (
          <p className="text-sm text-muted-foreground sm:col-span-2">
            Add them with{" "}
            <button type="button" onClick={onEdit} className="text-primary underline underline-offset-2">
              Edit
            </button>{" "}
            on this lesson in the course outline.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

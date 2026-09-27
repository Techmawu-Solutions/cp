"use client";

import { Eye, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { StatusBadge } from "@/components/common/status-badge";
import { useStore } from "@/lib/store";
import { useAcademicSession, useTenant } from "@/lib/session";
import { fmtDateLong } from "@/lib/helpers";
import { cn } from "@/lib/utils";

/**
 * Academic Sessions for teachers and students (spec §6.5): shows the active
 * session and lets them view an earlier session's records. Only school
 * administrators set the active session.
 */
export function SessionListPage() {
  const { schoolId, school } = useTenant();
  const { sessions, years, active, current } = useAcademicSession(schoolId);
  const setSession = useStore((s) => s.setSession);
  const batch = school?.kind === "vacation";
  if (!schoolId) return null;
  const view = (id: string, label: string) => {
    setSession(schoolId, id);
    toast.message(`Viewing ${label}`, { description: id === active?.id ? "This is the active session." : "Records shown are from this session only." });
  };

  return (
    <>
      <PageHeader
        title={batch ? "Batches" : "Academic Sessions"}
        description={`The active ${batch ? "batch" : "session"} is set by your school. You can view an earlier one to look back at its classes, grades and recordings.`}
        actions={
          current && active && current.id !== active.id ? (
            <Button variant="outline" onClick={() => view(active.id, active.name)}>
              <RotateCcw /> Back to the active {batch ? "batch" : "session"}
            </Button>
          ) : null
        }
      />
      {years.length === 0 && <EmptyState title="No sessions yet" />}
      <div className="space-y-4">
        {[...years].reverse().map((y) => (
          <Card key={y.id}>
            <CardHeader>
              <CardTitle>{y.name}</CardTitle>
              <CardDescription>
                {fmtDateLong(y.startDate)} – {fmtDateLong(y.endDate)}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {sessions
                .filter((s) => s.academicYearId === y.id)
                .sort((a, b) => a.startDate.localeCompare(b.startDate))
                .map((s) => {
                  const viewing = s.id === current?.id;
                  return (
                    <div key={s.id} className={cn("rounded-xl border p-4", s.status === "active" && "border-emerald-500/50", viewing && "ring-2 ring-primary/30")}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold">{s.name}</p>
                        <StatusBadge status={s.status} />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {fmtDateLong(s.startDate)} – {fmtDateLong(s.endDate)}
                      </p>
                      <div className="mt-3">
                        {viewing ? (
                          <span className="text-xs font-medium text-primary">Viewing now</span>
                        ) : (
                          <Button size="xs" variant="outline" onClick={() => view(s.id, `${y.name} — ${s.name}`)} disabled={s.status === "upcoming"} title={s.status === "upcoming" ? "Not started yet" : undefined}>
                            <Eye /> View
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}

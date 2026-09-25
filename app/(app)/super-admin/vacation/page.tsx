"use client";

import { useRouter } from "next/navigation";
import { Banknote, ExternalLink, LogIn, Sun, UserCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/common/page-header";
import { LinkButton } from "@/components/common/link-button";
import { EmptyState } from "@/components/common/empty-state";
import { StatusBadge } from "@/components/common/status-badge";
import { StatCard } from "@/components/dashboard/stat-card";
import { RequirePermission } from "@/components/layout/app-shell";
import { useStore } from "@/lib/store";
import { fmtGhs, vacationSchool } from "@/lib/vacation";
import { fmtDate } from "@/lib/helpers";

/** Platform view of Vacation Classes (spec §49.1). */
export default function SuperAdminVacationPage() {
  const db = useStore();
  const router = useRouter();
  const school = vacationSchool(db);
  if (!school) return <EmptyState icon={Sun} title="Vacation Classes isn't set up" className="mt-10" />;
  const sessions = db.academicSessions.filter((s) => s.schoolId === school.id).sort((a, b) => a.startDate.localeCompare(b.startDate));
  const regs = db.vacationRegistrations;
  const paid = regs.filter((r) => r.status === "paid");
  const enter = (path: string) => {
    useStore.getState().setActingSchool(school.id);
    router.push(path);
  };
  return (
    <RequirePermission perm="schools.view">
      <PageHeader
        title="Vacation Classes"
        description="Paid vacation programme open to students from any school — or none. Runs as its own workspace with every LMS feature."
        actions={
          <>
            <LinkButton href="/vacation" variant="outline" target="_blank">
              <ExternalLink /> Landing page
            </LinkButton>
            <Button onClick={() => enter("/school/vacation")}>
              <LogIn /> Open vacation workspace
            </Button>
          </>
        }
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Registrations" value={regs.length} icon={Users} />
        <StatCard label="Paid students" value={paid.length} icon={UserCheck} tone="green" />
        <StatCard label="Revenue" value={fmtGhs(paid.reduce((a, r) => a + r.amount, 0))} icon={Banknote} tone="teal" />
        <StatCard label="Teachers" value={db.teachers.filter((t) => t.schoolId === school.id).length} icon={Sun} tone="amber" />
      </div>
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Vacation sessions</CardTitle>
          <CardDescription>Create new vacation periods from the workspace&apos;s Academic Sessions page.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {sessions.map((s) => {
            const r = regs.filter((x) => x.sessionId === s.id);
            return (
              <div key={s.id} className="rounded-lg border p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">{s.name}</p>
                  <StatusBadge status={s.status} />
                </div>
                <p className="text-sm text-muted-foreground">
                  {fmtDate(s.startDate)} – {fmtDate(s.endDate)}
                </p>
                <p className="mt-2 text-sm">
                  {r.length} registrations · {fmtGhs(r.filter((x) => x.status === "paid").reduce((a, x) => a + x.amount, 0))}
                </p>
              </div>
            );
          })}
        </CardContent>
      </Card>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => enter("/school/vacation/registrations")}>
          Registrations & payments
        </Button>
        <Button variant="outline" onClick={() => enter("/school/vacation/pricing")}>
          Bundles & pricing
        </Button>
        <Button variant="outline" onClick={() => enter("/school/vacation/matching")}>
          Teacher matching
        </Button>
      </div>
    </RequirePermission>
  );
}

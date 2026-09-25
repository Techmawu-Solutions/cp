"use client";

import { useMemo } from "react";
import Link from "next/link";
import { AlertTriangle, Banknote, Clock, ExternalLink, UserCheck, UserPlus, Users } from "lucide-react";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/common/page-header";
import { LinkButton } from "@/components/common/link-button";
import { StatusBadge } from "@/components/common/status-badge";
import { StatCard } from "@/components/dashboard/stat-card";
import { ActivityChart, ChartLegend, CHART_COLORS, DonutChart, UsageChart } from "@/components/dashboard/charts";
import { VacationGuard } from "@/components/vacation/vacation-guard";
import { useSchoolData } from "@/lib/queries";
import { useStore } from "@/lib/store";
import { PAYMENT_LABEL, fmtGhs } from "@/lib/vacation";
import { fmtAgo } from "@/lib/helpers";

/** Vacation coordinator overview (spec §49.1.6). */
export default function VacationOverviewPage() {
  return (
    <VacationGuard>
      <Overview />
    </VacationGuard>
  );
}

function Overview() {
  const d = useSchoolData();
  const all = useStore((s) => s.vacationRegistrations);
  const users = useStore((s) => s.users);
  const bundles = useStore((s) => s.vacationBundles);
  const regs = useMemo(() => all.filter((r) => r.sessionId === d.sessionId), [all, d.sessionId]);
  const paid = regs.filter((r) => r.status === "paid");
  const awaiting = regs.filter((r) => r.status === "awaiting_payment");
  const revenue = paid.reduce((a, r) => a + r.amount, 0);

  const byDay = (() => {
    const out: { label: string; value: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const day = new Date();
      day.setDate(day.getDate() - i);
      const key = day.toDateString();
      out.push({ label: day.toLocaleDateString("en-GB", { day: "numeric", month: "short" }), value: paid.filter((r) => new Date(r.payment!.paidAt).toDateString() === key).reduce((a, r) => a + r.amount, 0) });
    }
    return out;
  })();
  const bySubject = d.subjects.map((s) => ({ label: s.name, students: d.enrollments.filter((e) => e.subjectId === s.id).length })).sort((a, b) => b.students - a.students);
  const byMethod = Object.entries(paid.reduce<Record<string, number>>((acc, r) => ((acc[r.payment!.method] = (acc[r.payment!.method] ?? 0) + r.amount), acc), {})).map(([k, v]) => ({ name: PAYMENT_LABEL[k as keyof typeof PAYMENT_LABEL], value: v }));
  const pairs = new Set(d.enrollments.map((e) => `${e.classId}:${e.subjectId}`));
  const unmatched = [...pairs].filter((p) => !d.teachingAssignments.some((t) => `${t.classId}:${t.subjectId}` === p));
  const sessionBundles = bundles.filter((b) => b.sessionId === d.sessionId);

  return (
    <>
      <PageHeader
        title="Vacation Classes"
        description={`${d.session.label} · registrations, payments and teaching.`}
        actions={
          <LinkButton href="/vacation" variant="outline" target="_blank">
            <ExternalLink /> View landing page
          </LinkButton>
        }
      />
      {unmatched.length > 0 && (
        <Card className="mb-4 border-amber-500/40 bg-amber-500/5">
          <CardContent className="flex flex-wrap items-center gap-3 text-sm">
            <AlertTriangle className="size-5 text-amber-600" />
            <span className="flex-1">
              <strong>{unmatched.length} subject classes</strong> have paid students but no teacher yet.
            </span>
            <LinkButton href="/school/vacation/matching" size="sm">
              Match teachers
            </LinkButton>
          </CardContent>
        </Card>
      )}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Registrations" value={regs.length} icon={Users} />
        <StatCard label="Paid" value={paid.length} icon={UserCheck} tone="green" />
        <StatCard label="Awaiting payment" value={awaiting.length} icon={Clock} tone="amber" href="/school/vacation/registrations" />
        <StatCard label="Revenue" value={fmtGhs(revenue)} icon={Banknote} tone="teal" />
        <StatCard label="New to the platform" value={regs.filter((r) => r.source === "new").length} icon={UserPlus} tone="violet" hint={`${regs.filter((r) => r.source === "existing").length} from partner schools`} />
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Revenue</CardTitle>
            <CardDescription>Payments received, last 14 days (GHS)</CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityChart data={byDay} series={[{ key: "value", label: "GHS", color: "var(--chart-3)" }]} height={230} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Payment methods</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <DonutChart data={byMethod} centerLabel="GHS" height={170} />
            <ChartLegend items={byMethod.map((m, i) => ({ label: m.name, color: CHART_COLORS[i]!, value: fmtGhs(m.value) }))} />
          </CardContent>
        </Card>
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Enrolments by subject</CardTitle>
          </CardHeader>
          <CardContent>
            <UsageChart data={bySubject} series={[{ key: "students", label: "Students" }]} layout="vertical" height={Math.max(220, bySubject.length * 30)} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Bundles</CardTitle>
            <CardAction>
              <Link href="/school/vacation/pricing" className="text-xs text-primary hover:underline">
                Manage
              </Link>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-2">
            {sessionBundles.map((b) => {
              const sold = paid.filter((r) => r.bundleId === b.id).length;
              return (
                <div key={b.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate">{b.name}</span>
                  <span className="shrink-0 text-muted-foreground tabular-nums">{sold} sold</span>
                </div>
              );
            })}
            <div className="flex items-center justify-between gap-2 border-t pt-2 text-sm">
              <span>Individual subjects</span>
              <span className="text-muted-foreground tabular-nums">{paid.filter((r) => !r.bundleId).length} sold</span>
            </div>
          </CardContent>
        </Card>
      </div>
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Latest registrations</CardTitle>
          <CardAction>
            <Link href="/school/vacation/registrations" className="text-xs text-primary hover:underline">
              All registrations
            </Link>
          </CardAction>
        </CardHeader>
        <CardContent className="divide-y">
          {[...regs].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6).map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
              <span className="min-w-0 flex-1">
                <span className="font-medium">{users.find((u) => u.id === r.userId)?.name}</span>
                <span className="text-muted-foreground"> · {d.byId.class.get(r.classId)?.name} · {r.homeSchoolName ?? "No school listed"}</span>
              </span>
              <span className="tabular-nums">{fmtGhs(r.amount)}</span>
              <StatusBadge status={r.status === "paid" ? "active" : r.status === "awaiting_payment" ? "pending" : "cancelled"}>{r.status === "paid" ? "Paid" : r.status === "awaiting_payment" ? "Awaiting payment" : "Cancelled"}</StatusBadge>
              <span className="w-24 text-right text-xs text-muted-foreground">{fmtAgo(r.createdAt)}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}

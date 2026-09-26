"use client";

import { offerUsernameGeneration } from "@/components/school/username-banner";
import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Archive, BarChart3, CheckCircle2, ExternalLink, LogIn, Mail, MapPin, Pencil, Phone, Plus, ShieldOff, UserPlus, Globe } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardAction } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { SchoolLogo, UserAvatar } from "@/components/common/user-avatar";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { LinkButton } from "@/components/common/link-button";
import { StatCard } from "@/components/dashboard/stat-card";
import { ActivityChart } from "@/components/dashboard/charts";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { SchoolForm } from "@/components/forms/school-form";
import { UserForm } from "@/components/forms/user-form";
import { RequirePermission } from "@/components/layout/app-shell";
import { CATEGORY_LABEL, OWNERSHIP_LABEL } from "@/lib/school-meta";
import { useStore } from "@/lib/store";
import { useCurrentUser } from "@/lib/session";
import { setSchoolStatus } from "@/lib/actions";
import { dailySeries, schoolStats } from "@/lib/analytics";
import { locationLabel } from "@/lib/data/geography";
import { fmtAgo, fmtDate, fmtDateLong, fmtNumber, uid } from "@/lib/helpers";
import { Users, UserSquare2, Video, NotebookPen } from "lucide-react";
import type { School } from "@/lib/types";

export default function SchoolDetailPage() {
  return (
    <RequirePermission perm="schools.view">
      <SchoolDetail />
    </RequirePermission>
  );
}

function SchoolDetail() {
  const { id } = useParams<{ id: string }>();
  const db = useStore();
  const me = useCurrentUser();
  const router = useRouter();
  const school = db.schools.find((s) => s.id === id);
  const [editOpen, setEditOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [confirm, setConfirm] = useState<School["status"] | null>(null);

  const stats = useMemo(() => (school ? schoolStats(db, school) : null), [db, school]);
  const series = useMemo(() => (school && stats ? dailySeries(`school-${school.id}`, (stats.activeStudents + stats.activeTeachers) * 0.7) : []), [school, stats]);
  if (!school || !stats) return <EmptyState title="School not found" description="It may have been deleted." action={<LinkButton href="/super-admin/schools">Back to schools</LinkButton>} />;

  const admins = db.users.filter((u) => u.schoolId === school.id && u.roleId === "role_school_admin");
  const years = db.academicYears.filter((y) => y.schoolId === school.id).sort((a, b) => b.name.localeCompare(a.name));
  const sessions = db.academicSessions.filter((s) => s.schoolId === school.id);
  const logs = db.auditLogs.filter((l) => l.schoolId === school.id);
  const hasRecords = db.students.some((s) => s.schoolId === school.id) || db.teachers.some((t) => t.schoolId === school.id) || sessions.length > 0;

  const openWorkspace = () => {
    useStore.getState().setActingSchool(school.id);
    router.push("/school/dashboard");
  };

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Schools", href: "/super-admin/schools" }, { label: school.name }]}
        title={
          <span className="flex items-center gap-3">
            <SchoolLogo name={school.name} color={school.logoColor} src={school.logoUrl} size="lg" />
            <span>
              {school.name}
              <span className="mt-1 flex flex-wrap items-center gap-2 text-sm font-normal text-muted-foreground">
                <StatusBadge status={school.status} /> {CATEGORY_LABEL[school.type]} · {OWNERSHIP_LABEL[school.ownership]} · WAEC {school.waecCode} · GES EMIS {school.emisCode}
              </span>
            </span>
          </span>
        }
        actions={
          <>
            {me?.can("schools.update") && (
              <Button variant="outline" onClick={() => setEditOpen(true)}>
                <Pencil /> Edit
              </Button>
            )}
            {school.status !== "active" && me?.can("schools.suspend") && (
              <Button variant="outline" onClick={() => setConfirm("active")}>
                <CheckCircle2 /> Activate
              </Button>
            )}
            {school.status === "active" && me?.can("schools.suspend") && (
              <Button variant="destructive" onClick={() => setConfirm("suspended")}>
                <ShieldOff /> Suspend
              </Button>
            )}
            {school.status !== "archived" && me?.can("schools.delete") && (
              <Button variant="ghost" onClick={() => setConfirm("archived")}>
                <Archive /> Archive
              </Button>
            )}
            <Button onClick={openWorkspace} disabled={!hasRecords}>
              <LogIn /> Open school workspace
            </Button>
          </>
        }
      />

      <Tabs defaultValue="overview">
        <TabsList variant="line" className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="admins">Administrators ({admins.length})</TabsTrigger>
          <TabsTrigger value="sessions">Academic sessions ({sessions.length})</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Students" value={fmtNumber(stats.students)} icon={Users} tone="green" hint={`${fmtNumber(stats.activeStudents)} active`} />
            <StatCard label="Teachers" value={fmtNumber(stats.teachers)} icon={UserSquare2} tone="violet" hint={`${fmtNumber(stats.activeTeachers)} active`} />
            <StatCard label="Live classes" value={fmtNumber(stats.liveClasses)} icon={Video} tone="rose" />
            <StatCard label="Assignments" value={fmtNumber(stats.assignments)} icon={NotebookPen} tone="amber" hint={`${fmtNumber(stats.quizzes)} quizzes`} />
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>School profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="flex gap-2">
                  <MapPin className="size-4 shrink-0 text-muted-foreground" />
                  <span>
                    {school.address}
                    <br />
                    <span className="text-muted-foreground">
                      {locationLabel(school)}
                    </span>
                  </span>
                </p>
                <p className="flex gap-2">
                  <Phone className="size-4 text-muted-foreground" /> {school.phone}
                </p>
                <p className="flex gap-2">
                  <Mail className="size-4 text-muted-foreground" /> {school.email}
                </p>
                {school.website && (
                  <p className="flex gap-2">
                    <Globe className="size-4 text-muted-foreground" />
                    <a href={school.website} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                      {school.website}
                    </a>
                  </p>
                )}
                <div className="grid grid-cols-2 gap-3 border-t pt-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Onboarded</p>
                    <p>{fmtDateLong(school.dateOnboarded)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Structure</p>
                    <p>{school.sessionStructure === "semester" ? "2 semesters / year" : "3 terms / year"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Daily active users</CardTitle>
                <CardDescription>Last 30 days</CardDescription>
                <CardAction>
                  <LinkButton href={`/super-admin/analytics/schools/${school.id}`} variant="ghost" size="sm">
                    <BarChart3 /> Analytics
                  </LinkButton>
                </CardAction>
              </CardHeader>
              <CardContent>
                <ActivityChart data={series} series={[{ key: "value", label: "Active users" }]} height={220} />
              </CardContent>
            </Card>
          </div>
          {!hasRecords && (
            <Card>
              <CardContent className="text-sm text-muted-foreground">
                This school&apos;s detailed records aren&apos;t loaded in the prototype — figures above come from its aggregate statistics. Schools you create with <strong>Add School</strong>, and the demo tenants Ridgeview SHS and Lakeside SHS, have full workspaces.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="admins">
          <Card>
            <CardHeader>
              <CardTitle>School administrators</CardTitle>
              <CardDescription>Administrators can only access {school.shortName}&apos;s data.</CardDescription>
              <CardAction>
                {me?.can("users.create") && (
                  <Button size="sm" onClick={() => setAdminOpen(true)}>
                    <UserPlus /> Add administrator
                  </Button>
                )}
              </CardAction>
            </CardHeader>
            <CardContent>
              {admins.length === 0 ? (
                <EmptyState title="No administrator yet" description="Create one so the school can manage its own setup." />
              ) : (
                <ul className="divide-y">
                  {admins.map((a) => (
                    <li key={a.id} className="flex items-center gap-3 py-3">
                      <UserAvatar name={a.name} color={a.avatarColor} />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{a.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {a.email} · {a.lastActive ? `active ${fmtAgo(a.lastActive)}` : "never signed in"}
                        </p>
                      </div>
                      <StatusBadge status={a.status} />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions">
          <Card>
            <CardHeader>
              <CardTitle>Academic years & sessions</CardTitle>
              <CardDescription>Managed by the school administrator. Only one session is active at a time.</CardDescription>
              <CardAction>
                {hasRecords && (
                  <Button size="sm" variant="outline" onClick={() => (useStore.getState().setActingSchool(school.id), router.push("/school/academic-sessions"))}>
                    <Plus /> Manage sessions <ExternalLink />
                  </Button>
                )}
              </CardAction>
            </CardHeader>
            <CardContent className="space-y-4">
              {years.length === 0 && <EmptyState title="No academic years configured" />}
              {years.map((y) => (
                <div key={y.id}>
                  <p className="mb-2 font-medium">{y.name}</p>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {sessions
                      .filter((s) => s.academicYearId === y.id)
                      .sort((a, b) => a.startDate.localeCompare(b.startDate))
                      .map((s) => (
                        <div key={s.id} className="rounded-lg border p-3">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{s.name}</span>
                            <StatusBadge status={s.status} />
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {fmtDate(s.startDate)} – {fmtDate(s.endDate)}
                          </p>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardContent>
              <RecentActivity logs={logs} limit={40} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit school</DialogTitle>
            <DialogDescription>Changes apply immediately across the platform.</DialogDescription>
          </DialogHeader>
          <SchoolForm
            initial={school}
            takenCodes={{ waec: new Set(db.schools.filter((s) => s.id !== school.id).map((s) => s.waecCode)), emis: new Set(db.schools.filter((s) => s.id !== school.id).map((s) => s.emisCode)) }}
            onCancel={() => setEditOpen(false)}
            onSubmit={(v) => {
              const st = useStore.getState();
              st.update("schools", school.id, { ...v, shortName: v.shortName.toUpperCase(), website: v.website || undefined });
              st.audit({ schoolId: school.id, action: "School updated", target: v.name, category: "school" });
              setEditOpen(false);
              toast.success("School updated");
              offerUsernameGeneration(school.id);
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={adminOpen} onOpenChange={setAdminOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Add school administrator</DialogTitle>
            <DialogDescription>They&apos;ll be invited by email and can only access {school.name}.</DialogDescription>
          </DialogHeader>
          <UserForm
            lockSchoolId={school.id}
            allowedRoleIds={db.roles.filter((r) => r.scope === "school").map((r) => r.id)}
            initial={{ roleId: "role_school_admin", status: "invited" }}
            submitLabel="Create administrator"
            onCancel={() => setAdminOpen(false)}
            onSubmit={(v) => {
              const st = useStore.getState();
              st.insert("users", { id: uid("usr"), name: v.name, email: v.email, phone: v.phone, roleId: v.roleId, schoolId: school.id, status: v.status, avatarColor: "#db2777" });
              st.audit({ schoolId: school.id, action: "School administrator created", target: `${v.name} (${v.email})`, category: "user" });
              setAdminOpen(false);
              toast.success("Administrator created", { description: `Invitation sent to ${v.email}` });
            }}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={confirm === "active" ? "Activate school?" : confirm === "suspended" ? "Suspend school?" : "Archive school?"}
        description={
          confirm === "suspended"
            ? `Users at ${school.name} won't be able to sign in until the school is re-activated. Data is kept.`
            : confirm === "archived"
              ? `${school.name} will be hidden from active lists and its users can no longer sign in.`
              : `${school.name}'s users will be able to sign in.`
        }
        destructive={confirm !== "active"}
        confirmLabel={confirm === "active" ? "Activate" : confirm === "suspended" ? "Suspend" : "Archive"}
        onConfirm={() => {
          if (!confirm) return;
          setSchoolStatus(school.id, confirm);
          toast.success(`School ${confirm === "active" ? "activated" : confirm}`);
        }}
      />
    </>
  );
}

"use client";

import { Suspense, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Lock, Save, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/common/page-header";
import { AppSelect } from "@/components/common/app-select";
import { RequirePermission } from "@/components/layout/app-shell";
import { PermissionChecklist } from "@/components/admin/role-editor";
import { useStore } from "@/lib/store";
import { ALL_PERMISSIONS } from "@/lib/permissions";
import { cn } from "@/lib/utils";

export default function PermissionsPage() {
  return (
    <RequirePermission perm="users.update">
      <Suspense>
        <Permissions />
      </Suspense>
    </RequirePermission>
  );
}

/** Select a role, then tick the permissions it should have (spec §9). */
function Permissions() {
  const roles = useStore((s) => s.roles);
  const users = useStore((s) => s.users);
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const roleId = params.get("role") ?? roles[1]?.id ?? roles[0]?.id;
  const role = roles.find((r) => r.id === roleId);
  const [draft, setDraft] = useState<Set<string>>(() => new Set(role?.permissions));
  const [loadedFor, setLoadedFor] = useState(roleId);
  if (loadedFor !== roleId) {
    setLoadedFor(roleId);
    setDraft(new Set(role?.permissions));
  }
  const dirty = useMemo(() => !!role && (draft.size !== role.permissions.length || role.permissions.some((p) => !draft.has(p))), [draft, role]);
  const locked = role?.key === "super_admin";
  const select = (id: string) => {
    if (dirty && !confirm("Discard unsaved permission changes?")) return;
    router.replace(`${pathname}?role=${id}`);
  };
  const save = () => {
    if (!role) return;
    const added = [...draft].filter((p) => !role.permissions.includes(p));
    const removed = role.permissions.filter((p) => !draft.has(p));
    const st = useStore.getState();
    st.update("roles", role.id, { permissions: [...draft] });
    st.audit({ schoolId: null, action: "Permission modified", target: `${role.name}: +${added.length} / −${removed.length}`, category: "rbac" });
    toast.success(`${role.name} permissions saved`);
  };

  return (
    <>
      <PageHeader title="Permissions" description="Choose a role, then tick the permissions its users should have." breadcrumbs={[{ label: "Access Control" }, { label: "Permissions" }]} />
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        {/* Role picker: a select on mobile, a list on desktop */}
        <div className="lg:hidden">
          <AppSelect value={roleId} onChange={select} options={roles.map((r) => ({ value: r.id, label: r.name }))} aria-label="Role" />
        </div>
        <Card className="hidden gap-0 self-start p-2 lg:flex">
          <p className="px-2 pt-1 pb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Roles</p>
          {roles.map((r) => (
            <button key={r.id} onClick={() => select(r.id)} className={cn("flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-muted", r.id === roleId && "bg-accent font-medium text-accent-foreground")}>
              <span className="flex-1 truncate">{r.name}</span>
              <span className="text-xs text-muted-foreground tabular-nums">{r.permissions.length}</span>
            </button>
          ))}
        </Card>

        {role && (
          <Card>
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center gap-2">
                {role.name}
                <Badge variant="outline">{role.scope === "platform" ? "Platform" : "School"}</Badge>
                {locked && (
                  <Badge variant="secondary">
                    <Lock /> Always has every permission
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {users.filter((u) => u.roleId === role.id).length} users · {draft.size}/{ALL_PERMISSIONS.length} permissions selected
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <PermissionChecklist key={role.id} value={draft} onChange={setDraft} locked={locked} />
              {!locked && (
                <div className="sticky bottom-0 -mx-4 flex items-center justify-end gap-2 border-t bg-card px-4 py-3">
                  {dirty && <span className="mr-auto text-sm text-amber-700 dark:text-amber-300">Unsaved changes</span>}
                  <Button variant="outline" disabled={!dirty} onClick={() => setDraft(new Set(role.permissions))}>
                    <Undo2 /> Discard
                  </Button>
                  <Button disabled={!dirty} onClick={save}>
                    <Save /> Save permissions
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}

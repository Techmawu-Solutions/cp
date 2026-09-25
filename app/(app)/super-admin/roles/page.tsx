"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Lock, Pencil, Plus, ShieldCheck, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/common/page-header";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { LinkButton } from "@/components/common/link-button";
import { RequirePermission } from "@/components/layout/app-shell";
import { RoleDetailsForm } from "@/components/admin/role-editor";
import { useStore } from "@/lib/store";
import { ALL_PERMISSIONS, PERMISSION_GROUPS } from "@/lib/permissions";
import { uid } from "@/lib/helpers";
import type { Role } from "@/lib/types";

export default function RolesPage() {
  return (
    <RequirePermission perm="users.update">
      <Roles />
    </RequirePermission>
  );
}

/** Roles (spec §9). Each user holds exactly one role; permissions are set per role. */
function Roles() {
  const roles = useStore((s) => s.roles);
  const users = useStore((s) => s.users);
  const router = useRouter();
  const [editing, setEditing] = useState<Role | "new" | null>(null);
  const [deleting, setDeleting] = useState<Role | null>(null);
  const count = (r: Role) => users.filter((u) => u.roleId === r.id).length;

  return (
    <>
      <PageHeader
        title="Roles"
        description="Each user has exactly one role. A role's permissions decide what its users can see and do, so new roles work without code changes."
        breadcrumbs={[{ label: "Access Control" }, { label: "Roles" }]}
        actions={
          <Button onClick={() => setEditing("new")}>
            <Plus /> Create role
          </Button>
        }
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {roles.map((r) => (
          <Card key={r.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-primary" /> {r.name}
              </CardTitle>
              <CardDescription>{r.description || "No description"}</CardDescription>
              <CardAction className="flex gap-1">
                {r.system && (
                  <Badge variant="secondary">
                    <Lock /> System
                  </Badge>
                )}
                <Badge variant="outline">{r.scope === "platform" ? "Platform" : "School"}</Badge>
              </CardAction>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-6 text-sm">
                <span className="flex items-center gap-1.5">
                  <Users className="size-4 text-muted-foreground" /> {count(r)} users
                </span>
                <span>
                  {r.permissions.length}/{ALL_PERMISSIONS.length} permissions
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {PERMISSION_GROUPS.filter((g) => g.permissions.some((p) => r.permissions.includes(p.key))).map((g) => (
                  <Badge key={g.key} variant="secondary" className="font-normal">
                    {g.label}
                  </Badge>
                ))}
              </div>
            </CardContent>
            <CardFooter className="gap-2">
              <LinkButton size="sm" href={`/super-admin/permissions?role=${r.id}`}>
                <KeyRound /> Permissions
              </LinkButton>
              <Button size="sm" variant="outline" onClick={() => setEditing(r)}>
                <Pencil /> Edit
              </Button>
              <LinkButton size="sm" variant="ghost" href={`/super-admin/role-assignments?role=${r.id}`}>
                Users
              </LinkButton>
              {!r.system && (
                <Button size="sm" variant="ghost" className="ml-auto text-destructive" onClick={() => setDeleting(r)} aria-label={`Delete ${r.name}`}>
                  <Trash2 />
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing === "new" ? "Create role" : `Edit ${editing?.name}`}</DialogTitle>
            <DialogDescription>Permissions are chosen per role on the Permissions page.</DialogDescription>
          </DialogHeader>
          {editing !== null && (
            <RoleDetailsForm
              initial={editing === "new" ? undefined : editing}
              roles={roles}
              existingNames={roles.filter((r) => editing === "new" || r.id !== editing.id).map((r) => r.name)}
              onCancel={() => setEditing(null)}
              onSave={(d) => {
                const st = useStore.getState();
                if (editing === "new") {
                  const id = uid("role");
                  const permissions = roles.find((r) => r.id === d.copyFrom)?.permissions ?? [];
                  st.insert("roles", { id, key: d.name.toLowerCase().replace(/[^a-z]+/g, "_"), system: false, name: d.name, description: d.description, scope: d.scope, permissions: [...permissions] });
                  st.audit({ schoolId: null, action: "Role created", target: d.name, category: "rbac" });
                  toast.success(`Role "${d.name}" created — now choose its permissions`);
                  router.push(`/super-admin/permissions?role=${id}`);
                } else {
                  st.update("roles", editing.id, editing.system ? { description: d.description } : { name: d.name, description: d.description, scope: d.scope });
                  st.audit({ schoolId: null, action: "Role updated", target: d.name, category: "rbac" });
                  toast.success("Role updated");
                }
                setEditing(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete "${deleting?.name}"?`}
        description={deleting && count(deleting) > 0 ? `${count(deleting)} users have this role. Every user needs exactly one role, so reassign them under Role Assignments first.` : "This role isn't assigned to anyone."}
        destructive
        confirmLabel="Delete role"
        onConfirm={() => {
          if (!deleting) return;
          if (count(deleting) > 0) return toast.error(`Reassign the ${count(deleting)} users with this role first`);
          const st = useStore.getState();
          st.remove("roles", deleting.id);
          st.audit({ schoolId: null, action: "Role deleted", target: deleting.name, category: "rbac" });
          toast.success("Role deleted");
        }}
      />
    </>
  );
}

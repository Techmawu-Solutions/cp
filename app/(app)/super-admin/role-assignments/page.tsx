"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { UserCog } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/common/page-header";
import { DataTable } from "@/components/tables/data-table";
import { UserAvatar } from "@/components/common/user-avatar";
import { RequirePermission } from "@/components/layout/app-shell";
import { useStore } from "@/lib/store";
import type { User } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function RoleAssignmentsPage() {
  return (
    <RequirePermission perm="users.update">
      <Suspense>
        <Assignments />
      </Suspense>
    </RequirePermission>
  );
}

/** Each user has exactly one role (spec §9); changing it replaces the previous one. */
function Assignments() {
  const roleParam = useSearchParams().get("role");
  const users = useStore((s) => s.users);
  const roles = useStore((s) => s.roles);
  const schools = useStore((s) => s.schools);
  const [editing, setEditing] = useState<User | null>(null);
  const [draft, setDraft] = useState("");
  // Students are hidden by default — there are thousands and their role rarely changes.
  const rows = useMemo(() => users.filter((u) => (roleParam ? u.roleId === roleParam : u.roleId !== "role_student")), [users, roleParam]);
  const roleName = (id: string) => roles.find((r) => r.id === id)?.name ?? "No role";

  return (
    <>
      <PageHeader
        title="Role Assignments"
        description={roleParam ? `Users with the ${roleName(roleParam)} role.` : "Each user has one role. Students are hidden — filter by role to see them."}
        breadcrumbs={[{ label: "Access Control" }, { label: "Role Assignments" }]}
      />
      <DataTable
        key={roleParam ?? "all"}
        rows={rows}
        search={(u) => `${u.name} ${u.email}`}
        filters={[{ key: "role", label: "Roles", options: roles.map((r) => ({ value: r.id, label: r.name })), predicate: (u, v) => u.roleId === v }]}
        initialSort={{ key: "user", dir: "asc" }}
        columns={[
          {
            key: "user",
            header: "User",
            sort: (u) => u.name,
            cell: (u) => (
              <div className="flex items-center gap-3">
                <UserAvatar name={u.name} color={u.avatarColor} size="sm" />
                <div>
                  <p className="font-medium">{u.name}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </div>
              </div>
            ),
          },
          { key: "school", header: "School", cell: (u) => (u.schoolId ? schools.find((s) => s.id === u.schoolId)?.shortName : "Platform") },
          { key: "role", header: "Role", sort: (u) => roleName(u.roleId), cell: (u) => <Badge variant="secondary">{roleName(u.roleId)}</Badge> },
          {
            key: "act",
            header: "",
            className: "text-right",
            cell: (u) => (
              <Button size="sm" variant="outline" onClick={() => (setEditing(u), setDraft(u.roleId))}>
                <UserCog /> Change role
              </Button>
            ),
          },
        ]}
      />
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Role for {editing?.name}</DialogTitle>
            <DialogDescription>{editing?.schoolId ? "School user — only school roles apply." : "Platform user — only platform roles apply."} Choosing a new role replaces the current one.</DialogDescription>
          </DialogHeader>
          <RadioGroup value={draft} onValueChange={(v) => setDraft(String(v))} className="grid gap-2">
            {roles
              .filter((r) => (editing?.schoolId ? r.scope === "school" : r.scope === "platform"))
              .map((r) => (
                <label key={r.id} className={cn("flex cursor-pointer items-start gap-3 rounded-lg border p-3", draft === r.id && "border-primary bg-accent/50")}>
                  <RadioGroupItem value={r.id} className="mt-0.5" />
                  <span>
                    <span className="block text-sm font-medium">{r.name}</span>
                    <span className="text-xs text-muted-foreground">{r.description}</span>
                  </span>
                </label>
              ))}
          </RadioGroup>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              disabled={!draft || draft === editing?.roleId}
              onClick={() => {
                if (!editing) return;
                const st = useStore.getState();
                st.update("users", editing.id, { roleId: draft });
                st.audit({ schoolId: editing.schoolId, action: "Role assignment changed", target: `${editing.name}: ${roleName(editing.roleId)} → ${roleName(draft)}`, category: "rbac" });
                toast.success("Role updated");
                setEditing(null);
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

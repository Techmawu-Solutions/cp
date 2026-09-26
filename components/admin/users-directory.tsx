"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { KeyRound, MoreHorizontal, Pencil, Plus, UserX, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PageHeader } from "@/components/common/page-header";
import { DataTable, type Column } from "@/components/tables/data-table";
import { ExportButton } from "@/components/tables/export-button";
import { StatusBadge } from "@/components/common/status-badge";
import { UserAvatar } from "@/components/common/user-avatar";
import { UserForm } from "@/components/forms/user-form";
import { useStore } from "@/lib/store";
import { useCurrentUser } from "@/lib/session";
import { fmtAgo, uid } from "@/lib/helpers";
import type { User } from "@/lib/types";

const TITLES: Record<string, string> = { student: "Students", teacher: "Teachers", school_admin: "Administrators" };

export function UsersDirectory({ onlyRole, title, description }: { onlyRole?: string; title?: string; description?: string }) {
  const params = useSearchParams();
  const roleKey = onlyRole ?? params.get("role") ?? "";
  const users = useStore((s) => s.users);
  const roles = useStore((s) => s.roles);
  const schools = useStore((s) => s.schools);
  const studentByUser = new Map(useStore((s) => s.students).map((st) => [st.userId, st]));
  const me = useCurrentUser();
  const [editing, setEditing] = useState<User | "new" | null>(null);

  const role = roles.find((r) => r.key === roleKey);
  const rows = useMemo(() => (role ? users.filter((u) => u.roleId === role.id) : users), [users, role]);
  const schoolName = (id: string | null) => (id ? schools.find((s) => s.id === id)?.shortName ?? "—" : "Platform");
  const roleNames = (u: User) => roles.find((r) => r.id === u.roleId)?.name ?? "No role";

  const setStatus = (u: User, status: User["status"]) => {
    const st = useStore.getState();
    st.update("users", u.id, { status });
    st.audit({ schoolId: u.schoolId, action: status === "disabled" ? "User disabled" : "User enabled", target: u.name, category: "user" });
    toast.success(`${u.name} ${status === "disabled" ? "disabled" : "enabled"}`);
  };

  const columns: Column<User>[] = [
    {
      key: "name",
      header: "User",
      sort: (u) => u.name,
      cell: (u) => (
        <div className="flex items-center gap-3">
          <UserAvatar name={u.name} color={u.avatarColor} size="sm" />
          <div className="min-w-0">
            <p className="truncate font-medium">{u.name}</p>
            <p className="truncate text-xs text-muted-foreground">{u.email}</p>
            {u.username && <p className="truncate font-mono text-[11px] text-muted-foreground">{u.username}</p>}
          </div>
        </div>
      ),
    },
    { key: "role", header: "Role", sort: roleNames, cell: roleNames },
    { key: "school", header: "School", sort: (u) => schoolName(u.schoolId), cell: (u) => schoolName(u.schoolId) },
    { key: "status", header: "Status", sort: (u) => u.status, cell: (u) => <StatusBadge status={u.status} /> },
    { key: "last", header: "Last active", sort: (u) => u.lastActive ?? "", cell: (u) => (u.lastActive ? fmtAgo(u.lastActive) : <span className="text-muted-foreground">Never</span>), className: "whitespace-nowrap" },
    {
      key: "actions",
      header: "",
      className: "w-10",
      cell: (u) =>
        me?.can("users.update") && (
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Actions" onClick={(e) => e.stopPropagation()} />}>
              <MoreHorizontal />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => setEditing(u)}>
                <Pencil /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  useStore.getState().setPassword(u.id, "password");
                  toast.success("Password reset", { description: `A reset link was sent to ${u.email}. (Prototype: password set to "password".)` });
                }}
              >
                <KeyRound /> Reset password
              </DropdownMenuItem>
              {u.status === "disabled" ? (
                <DropdownMenuItem onClick={() => setStatus(u, "active")}>
                  <UserCheck /> Enable
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem variant="destructive" disabled={u.id === me.user.id} onClick={() => setStatus(u, "disabled")}>
                  <UserX /> Disable
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
    },
  ];

  return (
    <>
      <PageHeader
        title={title ?? TITLES[roleKey] ?? "All Users"}
        description={description ?? "Every account on the platform. Scope, roles and status determine what each person can see."}
        breadcrumbs={[{ label: "Users", href: "/super-admin/users" }, ...(role ? [{ label: role.name }] : [])]}
        actions={
          me?.can("users.create") && (
            <Button onClick={() => setEditing("new")}>
              <Plus /> Add user
            </Button>
          )
        }
      />
      <DataTable
        key={roleKey}
        rows={rows}
        columns={columns}
        search={(u) => `${u.name} ${u.email} ${u.username ?? ""} ${studentByUser.get(u.id)?.indexNumber ?? ""} ${studentByUser.get(u.id)?.studentNumber ?? ""}`}
        searchPlaceholder="Search name, email, username, student ID or index number…"
        initialSort={{ key: "name", dir: "asc" }}
        filters={[
          ...(role ? [] : [{ key: "role", label: "Roles", options: roles.map((r) => ({ value: r.id, label: r.name })), predicate: (u: User, v: string) => u.roleId === v }]),
          { key: "school", label: "Schools", options: [{ value: "__platform", label: "Platform" }, ...schools.filter((s) => users.some((u) => u.schoolId === s.id)).map((s) => ({ value: s.id, label: s.name }))], predicate: (u, v) => (v === "__platform" ? u.schoolId === null : u.schoolId === v) },
          { key: "status", label: "Statuses", options: ["active", "invited", "disabled"].map((s) => ({ value: s, label: s[0]!.toUpperCase() + s.slice(1) })), predicate: (u, v) => u.status === v },
        ]}
        toolbar={<ExportButton filename="users" header={["Name", "Email", "Platform username", "Role", "School", "Status"]} rows={() => rows.map((u) => [u.name, u.email, u.username ?? "", roleNames(u), schoolName(u.schoolId), u.status])} />}
      />
      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing === "new" ? "Add user" : "Edit user"}</DialogTitle>
            <DialogDescription>New users receive an email invitation to set their password.</DialogDescription>
          </DialogHeader>
          {editing !== null && (
            <UserForm
              initial={editing === "new" ? { roleId: role?.id ?? "", status: "invited" } : editing}
              onCancel={() => setEditing(null)}
              onSubmit={(v) => {
                const st = useStore.getState();
                const payload = { name: v.name, email: v.email, phone: v.phone, roleId: v.roleId, schoolId: v.schoolId || null, status: v.status };
                if (editing === "new") {
                  st.insert("users", { id: uid("usr"), avatarColor: "#0891b2", ...payload });
                  st.audit({ schoolId: payload.schoolId, action: "User created", target: `${v.name} (${v.email})`, category: "user" });
                  toast.success("User created");
                } else {
                  const rolesChanged = editing.roleId !== v.roleId;
                  st.update("users", editing.id, payload);
                  st.audit({ schoolId: payload.schoolId, action: rolesChanged ? "Role assignment changed" : "User updated", target: v.name, category: rolesChanged ? "rbac" : "user" });
                  toast.success("User updated");
                }
                setEditing(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

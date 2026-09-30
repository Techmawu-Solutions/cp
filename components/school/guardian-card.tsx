"use client";

import { useState } from "react";
import { Mail, Phone, Plus, Unlink, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/forms/field";
import { AppSelect } from "@/components/common/app-select";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { StatusBadge } from "@/components/common/status-badge";
import { RELATIONSHIP_LABEL, addGuardian, removeGuardianLink } from "@/lib/actions";
import { useCurrentUser } from "@/lib/session";
import { useStore } from "@/lib/store";
import type { GuardianRelationship, ID } from "@/lib/types";

/**
 * A student's parents and guardians (spec section 22.3). Only where the Super Administrator
 * turned parent access on for the school; otherwise it explains who can turn it on.
 */
export function GuardianCard({ studentId }: { studentId: ID }) {
  const me = useCurrentUser();
  const student = useStore((s) => s.students.find((x) => x.id === studentId));
  const school = useStore((s) => s.schools.find((x) => x.id === student?.schoolId));
  const links = useStore((s) => s.guardianLinks).filter((l) => l.studentId === studentId);
  const users = useStore((s) => s.users);
  const [open, setOpen] = useState(false);
  const [removing, setRemoving] = useState<ID | null>(null);
  if (!student || !school || school.kind === "vacation" || !me?.can("guardians.view")) return null;
  const canManage = me.can("guardians.manage");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UsersRound className="size-4" /> Parents &amp; guardians
        </CardTitle>
        <CardDescription>{school.parentAccess ? "They sign in to follow this student's progress, grades, work and attendance." : "Parent access is off for this school."}</CardDescription>
        {school.parentAccess && canManage && (
          <CardAction>
            <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
              <Plus /> Add
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {!school.parentAccess && <p className="text-muted-foreground">The platform administrator turns parent access on per school, usually for Basic and JHS levels.</p>}
        {school.parentAccess && links.length === 0 && <p className="text-muted-foreground">No parent account yet. Add one so a parent can follow this student.</p>}
        {links.map((l) => {
          const u = users.find((x) => x.id === l.guardianUserId);
          if (!u) return null;
          return (
            <div key={l.id} className="flex items-start gap-2 rounded-lg border p-2.5">
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {u.name} <span className="font-normal text-muted-foreground">· {RELATIONSHIP_LABEL[l.relationship]}</span>
                </p>
                <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                  <Mail className="size-3" /> {u.email}
                </p>
                {u.phone && (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Phone className="size-3" /> {u.phone}
                  </p>
                )}
                <StatusBadge status={u.status} className="mt-1" />
              </div>
              {canManage && (
                <Button size="icon-sm" variant="ghost" aria-label={`Unlink ${u.name}`} title="Unlink" onClick={() => setRemoving(l.id)}>
                  <Unlink />
                </Button>
              )}
            </div>
          );
        })}
      </CardContent>
      <AddGuardianDialog open={open} onOpenChange={setOpen} studentId={studentId} studentFirstName={student.firstName} defaultName={links.length ? "" : student.guardianName} defaultPhone={links.length ? "" : student.guardianPhone} />
      <ConfirmDialog
        open={!!removing}
        onOpenChange={(o) => !o && setRemoving(null)}
        title="Unlink this parent?"
        description="They will no longer see this student. A parent with no other children linked can no longer sign in."
        confirmLabel="Unlink"
        destructive
        onConfirm={() => {
          if (removing) removeGuardianLink(removing);
          setRemoving(null);
          toast.success("Parent unlinked");
        }}
      />
    </Card>
  );
}

function AddGuardianDialog({ open, onOpenChange, studentId, studentFirstName, defaultName, defaultPhone }: { open: boolean; onOpenChange: (o: boolean) => void; studentId: ID; studentFirstName: string; defaultName: string; defaultPhone: string }) {
  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState(defaultPhone);
  const [relationship, setRelationship] = useState<GuardianRelationship>("guardian");
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    if (name.trim().length < 3) return setError("Enter the parent's full name");
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError("Enter a valid email — the parent signs in with it");
    const res = addGuardian(studentId, { name, email, phone, relationship });
    if (!res.ok) return setError(res.error);
    toast.success(res.invited ? "Parent invited" : "Parent linked", { description: res.invited ? `${name.trim()} will receive an email to set a password and follow ${studentFirstName}.` : `${name.trim()} can now follow ${studentFirstName} with their existing sign-in.` });
    setEmail("");
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (onOpenChange(o), setError(null))}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a parent or guardian</DialogTitle>
          <DialogDescription>They sign in with this email. A parent who already follows a brother or sister keeps one account.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" htmlFor="g-name" required className="sm:col-span-2">
            <Input id="g-name" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Email" htmlFor="g-email" required>
            <Input id="g-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Phone" htmlFor="g-phone">
            <Input id="g-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
          <Field label="Relationship" className="sm:col-span-2">
            <AppSelect value={relationship} onChange={(v) => setRelationship(v as GuardianRelationship)} options={(Object.keys(RELATIONSHIP_LABEL) as GuardianRelationship[]).map((k) => ({ value: k, label: RELATIONSHIP_LABEL[k] }))} />
          </Field>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit}>
            <Plus /> Add parent
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

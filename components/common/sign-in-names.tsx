"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useStore } from "@/lib/store";
import type { ID } from "@/lib/types";

/** Every name a person can sign in with (spec §10.1). */
export function SignInNames({ userId, title = "Sign-in names", className }: { userId: ID; title?: string; className?: string }) {
  const user = useStore((s) => s.users.find((u) => u.id === userId));
  const students = useStore((s) => s.students);
  const teachers = useStore((s) => s.teachers);
  const schools = useStore((s) => s.schools);
  if (!user) return null;
  const schoolName = (id: ID) => schools.find((x) => x.id === id)?.shortName ?? "";
  const rows: { label: string; value?: string; hint?: string }[] = [
    { label: "Platform username", value: user.username, hint: "Permanent · used by connected products" },
    { label: "Email", value: user.email },
    ...students
      .filter((st) => st.userId === userId && schools.find((x) => x.id === st.schoolId)?.kind !== "vacation")
      .map((st) => ({ label: "School username", value: st.schoolUsername, hint: st.schoolUsername ? `${schoolName(st.schoolId)} · WAEC prefix` : `${schoolName(st.schoolId)} · issued once the school's WAEC code is added` })),
    ...teachers.filter((t) => t.userId === userId).map((t) => ({ label: "Staff ID", value: t.staffNumber, hint: schoolName(t.schoolId) })),
  ];
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Any of these works on the sign-in page, with the same password.</CardDescription>
      </CardHeader>
      <CardContent className="divide-y text-sm">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center justify-between gap-3 py-2">
            <div className="min-w-0">
              <p className="text-muted-foreground">{r.label}</p>
              {r.hint && <p className="text-xs text-muted-foreground">{r.hint}</p>}
            </div>
            {r.value ? (
              <button
                type="button"
                className="flex min-w-0 items-center gap-1.5 rounded px-1.5 py-0.5 font-mono text-xs hover:bg-muted"
                title="Copy"
                onClick={() => {
                  void navigator.clipboard?.writeText(r.value!);
                  toast.success(`${r.label} copied`);
                }}
              >
                <span className="truncate">{r.value}</span>
                <Copy className="size-3 shrink-0 opacity-60" />
              </button>
            ) : (
              <span className="text-xs text-muted-foreground">Not issued yet</span>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/common/page-header";
import { AppSelect } from "@/components/common/app-select";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Field } from "@/components/forms/field";
import { RequirePermission } from "@/components/layout/app-shell";
import { useStore } from "@/lib/store";
import { useRouter } from "next/navigation";

export default function PlatformSettingsPage() {
  const settings = useStore((s) => s.settings);
  const [draft, setDraft] = useState(settings);
  const [resetOpen, setResetOpen] = useState(false);
  const router = useRouter();
  const set = <K extends keyof typeof draft>(k: K, v: (typeof draft)[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const dirty = JSON.stringify(draft) !== JSON.stringify(settings);

  return (
    <RequirePermission perm="schools.update">
      <PageHeader title="Platform Settings" description="Defaults and limits that apply to every school." breadcrumbs={[{ label: "System" }, { label: "Settings" }]} />
      <div className="grid max-w-3xl gap-4">
        <Card>
          <CardHeader>
            <CardTitle>General</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Platform name" htmlFor="pn">
              <Input id="pn" value={draft.platformName} onChange={(e) => set("platformName", e.target.value)} />
            </Field>
            <Field label="Support email" htmlFor="se">
              <Input id="se" type="email" value={draft.supportEmail} onChange={(e) => set("supportEmail", e.target.value)} />
            </Field>
            <Field label="Default academic structure" hint="Used for imported schools">
              <AppSelect value={draft.defaultSessionStructure} onChange={(v) => set("defaultSessionStructure", v as "semester" | "term")} options={[{ value: "semester", label: "Semesters (2 per year)" }, { value: "term", label: "Terms (3 per year)" }]} />
            </Field>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Content & storage</CardTitle>
            <CardDescription>Video is processed and stored by the video provider, not the web frontend.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Maximum upload size (MB)" htmlFor="mu">
              <Input id="mu" type="number" min={1} max={2048} value={draft.maxUploadMb} onChange={(e) => set("maxUploadMb", Number(e.target.value))} />
            </Field>
            <Field label="Recording retention (days)" htmlFor="rr">
              <Input id="rr" type="number" min={30} max={3650} value={draft.recordingRetentionDays} onChange={(e) => set("recordingRetentionDays", Number(e.target.value))} />
            </Field>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Access</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center justify-between gap-4">
              <span>
                <span className="block text-sm font-medium">Allow self-registration</span>
                <span className="text-xs text-muted-foreground">Students can create their own accounts with a school code.</span>
              </span>
              <Switch checked={draft.allowSelfRegistration} onCheckedChange={(v) => set("allowSelfRegistration", v)} />
            </label>
            <label className="flex items-center justify-between gap-4">
              <span>
                <span className="block text-sm font-medium">Maintenance mode</span>
                <span className="text-xs text-muted-foreground">Shows a maintenance banner to all non-admin users.</span>
              </span>
              <Switch checked={draft.maintenanceMode} onCheckedChange={(v) => set("maintenanceMode", v)} />
            </label>
          </CardContent>
          <CardFooter className="justify-end gap-2">
            <Button variant="outline" disabled={!dirty} onClick={() => setDraft(settings)}>
              Discard
            </Button>
            <Button
              disabled={!dirty}
              onClick={() => {
                const st = useStore.getState();
                st.updateSettings(draft);
                st.audit({ schoolId: null, action: "Platform settings updated", target: Object.keys(draft).filter((k) => draft[k as keyof typeof draft] !== settings[k as keyof typeof settings]).join(", "), category: "system" });
                toast.success("Settings saved");
              }}
            >
              Save changes
            </Button>
          </CardFooter>
        </Card>
        <Card className="ring-destructive/30">
          <CardHeader>
            <CardTitle>Prototype data</CardTitle>
            <CardDescription>All data in this prototype lives in your browser. Resetting restores the original demo schools and signs you out.</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button variant="destructive" onClick={() => setResetOpen(true)}>
              Reset demo data
            </Button>
          </CardFooter>
        </Card>
      </div>
      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Reset all demo data?"
        description="Every change you've made in this browser will be discarded."
        destructive
        confirmLabel="Reset"
        onConfirm={() => {
          useStore.getState().resetDemo();
          router.push("/login");
        }}
      />
    </RequirePermission>
  );
}

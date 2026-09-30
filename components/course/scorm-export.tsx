"use client";

import { useState } from "react";
import { Loader2, PackageOpen } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useStore } from "@/lib/store";
import { exportCourseAsScorm, type ExportVersion } from "@/lib/scorm/export";
import { downloadBlob } from "@/lib/helpers";
import type { Course } from "@/lib/types";

/** Downloads a course as a SCORM 1.2 or SCORM 2004 package (spec section 26.2). Needs the scorm.export permission (Super Administrator by default). */
export function ScormExportButton({ course, size }: { course: Course; size?: "sm" | "xs" }) {
  const [open, setOpen] = useState(false);
  const [version, setVersion] = useState<ExportVersion>("1.2");
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      const st = useStore.getState();
      const modules = st.modules.filter((m) => m.courseId === course.id);
      const contents = st.contents.filter((c) => c.courseId === course.id);
      const blob = await exportCourseAsScorm(course, modules, contents, version, st.assessments.filter((x) => x.courseId === course.id));
      downloadBlob(blob, `${course.title.replace(/[^\w]+/g, "-")}-scorm-${version === "1.2" ? "1.2" : "2004"}.zip`);
      st.audit({ schoolId: course.schoolId, action: "Course exported as SCORM", target: `${course.title} (SCORM ${version === "1.2" ? "1.2" : "2004 4th Edition"})`, category: "lms" });
      toast.success("SCORM package downloaded", { description: "Upload it to any SCORM-conformant LMS." });
      setOpen(false);
    } catch {
      toast.error("The package couldn't be created.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button variant="outline" size={size} onClick={(e) => (e.stopPropagation(), setOpen(true))}>
        <PackageOpen /> Export SCORM
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export as SCORM</DialogTitle>
            <DialogDescription>
              Download this course as a SCORM package for any SCORM-conformant LMS. Each section becomes a group and each item a lesson that reports completion and time. Quizzes and assessments become self-marking SCORM quizzes that report the score, pass/fail and each answer; written answers are recorded but marked on ClassProject.
            </DialogDescription>
          </DialogHeader>
          <RadioGroup value={version} onValueChange={(v) => setVersion(v as ExportVersion)} className="gap-3">
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm">
              <RadioGroupItem value="1.2" className="mt-0.5" />
              <span>
                <span className="font-medium">SCORM 1.2</span>
                <span className="block text-xs text-muted-foreground">Works with almost every LMS. Choose this if unsure.</span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm">
              <RadioGroupItem value="2004" className="mt-0.5" />
              <span>
                <span className="font-medium">SCORM 2004 4th Edition</span>
                <span className="block text-xs text-muted-foreground">Separate completion and pass/fail status, richer tracking.</span>
              </span>
            </label>
          </RadioGroup>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={run} disabled={busy}>
              {busy && <Loader2 className="animate-spin" />} Download package
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileViewerDialog } from "@/components/media/file-viewer-dialog";
import { useStore } from "@/lib/store";
import { loadUpload, registerUpload } from "@/lib/file-registry";
import { sampleSubmissionPdf } from "@/lib/sample-pdf";
import type { Submission } from "@/lib/types";

export const submissionFileKey = (submissionId: string) => `submission:${submissionId}`;

/** Keeps a student's uploaded file with their submission so it can be opened later. */
export const storeSubmissionFile = registerUpload;

/**
 * Opens a submission's attached file in the in-app viewer. Files the student
 * uploaded in this browser open as uploaded; seeded demo submissions (which
 * only store a file name) open a generated sample PDF.
 */
export function SubmissionFileButton({ submission, label = "Open" }: { submission: Submission; label?: string }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<{ url: string; name: string } | null>(null);
  const name = submission.fileName ?? "submission.pdf";

  const show = async () => {
    setOpen(true);
    if (file) return;
    const key = submissionFileKey(submission.id);
    const stored = await loadUpload(key);
    if (stored) return setFile({ url: stored, name });
    const db = useStore.getState();
    const a = db.assessments.find((x) => x.id === submission.assessmentId);
    const st = db.students.find((x) => x.id === submission.studentId);
    const placement = db.placements.find((p) => p.studentId === submission.studentId && p.sessionId === a?.sessionId);
    const blob = sampleSubmissionPdf({
      student: st ? `${st.firstName} ${st.lastName}` : "Student",
      className: db.classes.find((c) => c.id === (placement?.classId ?? a?.classId))?.name,
      school: db.schools.find((s) => s.id === st?.schoolId)?.name,
      title: a?.title ?? name,
      description: a?.description,
      submittedAt: submission.submittedAt,
      fileName: name,
    });
    // The generated stand-in is always a PDF, whatever the original extension was.
    setFile({ url: URL.createObjectURL(blob), name: name.replace(/\.[a-z0-9]+$/i, "") + ".pdf" });
  };

  return (
    <>
      <Button size="xs" variant="outline" className="ml-auto" onClick={show}>
        {label}
      </Button>
      <FileViewerDialog open={open} onOpenChange={setOpen} url={file?.url ?? null} fileName={file?.name ?? name} />
    </>
  );
}

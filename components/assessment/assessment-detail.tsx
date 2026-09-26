"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, FileText, Lock, Pencil, Send, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { StatusBadge } from "@/components/common/status-badge";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { DataTable } from "@/components/tables/data-table";
import { ExportButton } from "@/components/tables/export-button";
import { AccessDenied } from "@/components/layout/app-shell";
import { ASSESSMENT_TYPES } from "@/components/assessment/assessments-table";
import { QUESTION_TYPES } from "@/components/assessment/assessment-builder";
import { useSchoolData } from "@/lib/queries";
import { PORTAL_HOME, studentName, useCurrentUser, useMyTeacher } from "@/lib/session";
import { useStore } from "@/lib/store";
import { gradeSubmission, publishAssessment } from "@/lib/actions";
import { avg, fmtDateTime } from "@/lib/helpers";
import type { Question, Submission } from "@/lib/types";
import { cn } from "@/lib/utils";

export function AssessmentDetail({ id, base }: { id: string; base: "/teacher" | "/school" }) {
  const d = useSchoolData();
  const me = useCurrentUser();
  const myTeacher = useMyTeacher();
  const router = useRouter();
  const [grading, setGrading] = useState<Submission | null>(null);
  const [closing, setClosing] = useState(false);
  const a = d.byId.assessment.get(id);
  const subs = useMemo(() => d.submissions.filter((s) => s.assessmentId === id), [d.submissions, id]);

  if (!a) return <EmptyState title="Assessment not found in this session" className="mt-8" />;
  if (me?.portal === "teacher" && a.teacherId !== myTeacher?.id) return <AccessDenied home={PORTAL_HOME.teacher} message="You can only open assessments for courses you teach." />;
  const canGrade = me?.portal === "teacher" || !!me?.can("assessments.grade");
  const course = d.byId.course.get(a.courseId);
  const roster = d.placements.filter((p) => p.classId === a.classId).map((p) => d.byId.student.get(p.studentId)!).filter(Boolean);
  const submittedIds = new Set(subs.map((s) => s.studentId));
  const missing = roster.filter((s) => !submittedIds.has(s.id));
  const graded = subs.filter((s) => s.score != null);
  const avgPct = avg(graded.map((s) => (s.score! / a.totalMarks) * 100));

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: course?.title ?? "Course", href: `${base}/courses/${a.courseId}?tab=assessments` }, { label: a.title }]}
        title={a.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {ASSESSMENT_TYPES.find((t) => t.value === a.type)?.label} · {a.totalMarks} marks{a.durationMinutes ? ` · ${a.durationMinutes} min` : ""} · Due {fmtDateTime(a.dueDate)} <StatusBadge status={a.status} />
          </span>
        }
        actions={
          canGrade && (
            <>
              {a.status === "draft" && (
                <>
                  <Button variant="outline" onClick={() => router.push(`/teacher/assessments/new?edit=${a.id}`)}>
                    <Pencil /> Edit
                  </Button>
                  <Button
                    onClick={() => {
                      useStore.getState().update("assessments", a.id, { status: "published" });
                      publishAssessment({ ...a, status: "published" });
                      toast.success("Published — students notified");
                    }}
                  >
                    <Send /> Publish
                  </Button>
                </>
              )}
              {a.status === "published" && (
                <Button variant="outline" onClick={() => setClosing(true)}>
                  <Lock /> Close submissions
                </Button>
              )}
              <ExportButton
                filename={`results-${a.title.replace(/\W+/g, "-")}`}
                header={["Student ID", "Student", "Submitted", "Score", "Out of", "Status", "Feedback"]}
                rows={() => roster.map((s) => { const sub = subs.find((x) => x.studentId === s.id); return [s.studentNumber, studentName(s), sub?.submittedAt ?? "", sub?.score ?? "", a.totalMarks, sub?.status ?? "not submitted", sub?.feedback ?? ""]; })}
              />
            </>
          )
        }
      />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Submitted", value: `${subs.length}/${roster.length}` },
          { label: "Graded", value: `${graded.length}` },
          { label: "Awaiting grading", value: `${subs.length - graded.length}` },
          { label: "Average", value: graded.length ? `${avgPct.toFixed(1)}%` : "—" },
        ].map((s) => (
          <Card key={s.label} size="sm" className="px-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-2xl font-semibold tabular-nums">{s.value}</p>
          </Card>
        ))}
      </div>
      <Tabs defaultValue="submissions">
        <TabsList variant="line" className="mb-3">
          <TabsTrigger value="submissions">Submissions ({subs.length})</TabsTrigger>
          <TabsTrigger value="missing">Not submitted ({missing.length})</TabsTrigger>
          <TabsTrigger value="questions">Questions ({a.questions.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="submissions">
          <DataTable
            rows={subs}
            search={(s) => studentName(d.byId.student.get(s.studentId))}
            initialSort={{ key: "status", dir: "desc" }}
            onRowClick={canGrade ? setGrading : undefined}
            emptyTitle="No submissions yet"
            columns={[
              { key: "student", header: "Student", sort: (s) => studentName(d.byId.student.get(s.studentId)), cell: (s) => <span className="font-medium">{studentName(d.byId.student.get(s.studentId))}</span> },
              { key: "at", header: "Submitted", sort: (s) => s.submittedAt, cell: (s) => (<span className={cn("whitespace-nowrap", Date.parse(s.submittedAt) > Date.parse(a.dueDate) && "text-amber-600")}>{fmtDateTime(s.submittedAt)}</span>) },
              { key: "file", header: "Attachment", cell: (s) => (s.fileName ? <span className="flex items-center gap-1 text-xs"><FileText className="size-3.5" /> {s.fileName}</span> : "—") },
              { key: "score", header: "Score", sort: (s) => s.score ?? -1, cell: (s) => (s.score != null ? <span className="font-semibold tabular-nums">{s.score}/{a.totalMarks}</span> : "—") },
              { key: "status", header: "Status", sort: (s) => (s.status === "graded" ? 0 : 1), cell: (s) => <StatusBadge status={s.status === "late" ? "late" : s.status} /> },
              { key: "act", header: "", className: "text-right", cell: (s) => canGrade && <Button size="sm" variant={s.status === "graded" ? "ghost" : "outline"}>{s.status === "graded" ? "Review" : "Grade"}</Button> },
            ]}
          />
        </TabsContent>
        <TabsContent value="missing">
          <Card>
            <CardContent className="divide-y">
              {missing.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">Everyone has submitted.</p>}
              {missing.map((s) => (
                <div key={s.id} className="flex items-center justify-between py-2 text-sm">
                  <span>{studentName(s)}</span>
                  <span className="text-xs text-muted-foreground">{s.studentNumber}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="questions">
          <div className="space-y-3">
            {a.description && (
              <Card>
                <CardContent className="text-sm whitespace-pre-wrap">{a.description}</CardContent>
              </Card>
            )}
            {a.questions.map((q, i) => (
              <QuestionPreview key={q.id} q={q} index={i} />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <GradeDialog submission={grading} onClose={() => setGrading(null)} />
      <ConfirmDialog
        open={closing}
        onOpenChange={setClosing}
        title="Close submissions?"
        description="Students who haven't submitted will no longer be able to. Missing work counts as zero in the gradebook."
        confirmLabel="Close"
        onConfirm={() => (useStore.getState().update("assessments", a.id, { status: "closed" }), toast.success("Submissions closed"))}
      />
    </>
  );
}

function QuestionPreview({ q, index, answer, correct }: { q: Question; index: number; answer?: string; correct?: boolean | null }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-start gap-2 text-sm">
          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[11px]">{index + 1}</span>
          <span className="flex-1 font-normal">{q.prompt}</span>
          {correct === true && <CheckCircle2 className="size-4 text-emerald-600" />}
          {correct === false && <XCircle className="size-4 text-red-600" />}
        </CardTitle>
        <CardDescription>
          {QUESTION_TYPES.find((t) => t.value === q.type)?.label} · {q.marks} marks
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-1 text-sm">
        {q.type === "mcq" &&
          q.options?.map((o, i) => (
            <p key={i} className={cn("rounded px-2 py-0.5", String(i) === q.answer && "bg-emerald-500/10 font-medium", answer === String(i) && String(i) !== q.answer && "bg-red-500/10")}>
              {String.fromCharCode(65 + i)}. {o}
            </p>
          ))}
        {(q.type === "true_false" || q.type === "fill_blank") && <p className="text-muted-foreground">Correct answer: <span className="font-medium text-foreground">{q.answer}</span></p>}
        {q.type === "matching" && q.pairs?.map((p, i) => <p key={i}>{p.left} → {p.right}</p>)}
        {answer !== undefined && q.type !== "mcq" && (
          <p className="mt-2 rounded-lg bg-muted p-2 whitespace-pre-wrap">
            <span className="text-xs text-muted-foreground">Student answer: </span>
            {answer || <em>No answer</em>}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function GradeDialog({ submission, onClose }: { submission: Submission | null; onClose: () => void }) {
  const d = useSchoolData();
  const [score, setScore] = useState("");
  const [feedback, setFeedback] = useState("");
  const [loaded, setLoaded] = useState<string | null>(null);
  if (submission && submission.id !== loaded) {
    setLoaded(submission.id);
    setScore(submission.score != null ? String(submission.score) : "");
    setFeedback(submission.feedback ?? "");
  }
  const a = submission ? d.byId.assessment.get(submission.assessmentId) : undefined;
  const student = submission ? d.byId.student.get(submission.studentId) : undefined;
  const n = Number(score);
  const valid = score !== "" && !Number.isNaN(n) && n >= 0 && n <= (a?.totalMarks ?? 0);
  const isCorrect = (q: Question): boolean | null => {
    const given = (submission?.answers[q.id] ?? "").trim().toLowerCase();
    if (["mcq", "true_false", "fill_blank"].includes(q.type)) return given === (q.answer ?? "").toLowerCase();
    return null;
  };
  return (
    <Dialog open={!!submission} onOpenChange={(o) => !o && (onClose(), setLoaded(null))}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{studentName(student)}</DialogTitle>
          <DialogDescription>
            {a?.title} · submitted {submission && fmtDateTime(submission.submittedAt)}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[50vh] space-y-3 overflow-y-auto pr-1">
          {submission?.fileName && (
            <div className="flex items-center gap-2 rounded-lg border p-3 text-sm">
              <FileText className="size-4 text-primary" /> {submission.fileName}
              <Button size="xs" variant="outline" className="ml-auto" onClick={() => toast.message("Opening file", { description: "In production the submission opens from storage." })}>
                Open
              </Button>
            </div>
          )}
          {submission?.text && <p className="rounded-lg bg-muted p-3 text-sm whitespace-pre-wrap">{submission.text}</p>}
          {a?.questions.map((q, i) => <QuestionPreview key={q.id} q={q} index={i} answer={submission?.answers[q.id] ?? ""} correct={Object.keys(submission?.answers ?? {}).length ? isCorrect(q) : null} />)}
          {!submission?.fileName && !submission?.text && Object.keys(submission?.answers ?? {}).length === 0 && <p className="text-sm text-muted-foreground">This grade was entered directly in the gradebook.</p>}
        </div>
        <div className="grid grid-cols-1 gap-3 border-t pt-3 sm:grid-cols-[140px_1fr]">
          <div>
            <label className="text-sm font-medium" htmlFor="g-score">
              Score / {a?.totalMarks}
            </label>
            <Input id="g-score" inputMode="decimal" value={score} onChange={(e) => setScore(e.target.value)} aria-invalid={score !== "" && !valid} />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="g-fb">
              Feedback
            </label>
            <Textarea id="g-fb" rows={2} value={feedback} onChange={(e) => setFeedback(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!valid}
            onClick={() => {
              if (!submission) return;
              gradeSubmission(submission, n, feedback.trim());
              useStore.getState().audit({ schoolId: a?.schoolId ?? null, action: "Grade updated", target: `${a?.title} — ${studentName(student)}`, category: "assessment" });
              toast.success("Grade saved — student notified");
              onClose();
              setLoaded(null);
            }}
          >
            Save grade
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

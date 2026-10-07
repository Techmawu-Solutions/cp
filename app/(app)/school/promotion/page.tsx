"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Check, Copy, GraduationCap, TriangleAlert, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { AppSelect } from "@/components/common/app-select";
import { LinkButton } from "@/components/common/link-button";
import { Field } from "@/components/forms/field";
import { GraduationFields, graduationDetails, graduationForm, type GraduationForm } from "@/components/academic/graduation";
import { RequirePermission } from "@/components/layout/app-shell";
import { useStore } from "@/lib/store";
import { sessionLabel, studentName, useScope } from "@/lib/session";
import { applyPromotion, copyStructure, undoPromotion } from "@/lib/actions";
import { fmtDateLong } from "@/lib/helpers";
import {
  OUTCOME_LABEL,
  defaultOutcome,
  isFinalLevel,
  levelsOf,
  needsClass,
  nextLevel,
  outcomesFor,
  progressionOf,
  suggestClassMap,
  tally,
  unplaced,
  type PlannedStudent,
} from "@/lib/promotion";
import type { AcademicSession, ID, PromotionOutcome, PromotionRun, School, SchoolClass } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Promotion, repeating and graduation (spec section 22.4). */
export default function PromotionPage() {
  return (
    <RequirePermission perm="students.promote">
      <Promotion />
    </RequirePermission>
  );
}

function Promotion() {
  const { schoolId, school } = useScope();
  if (!schoolId || !school) return null;
  return (
    <>
      <PageHeader
        title="Promotion & Graduation"
        description="At the end of the academic year, move each class up a level into the new year, keep back students who repeat, and graduate the final year. Last year's records don't change."
        breadcrumbs={[{ label: "Academic" }, { label: "Promotion & Graduation" }]}
      />
      {school.kind === "vacation" ? (
        <EmptyState title="Not used in Vacation Classes" description="Vacation Classes run in batches; students register again for each batch." />
      ) : progressionOf(school) === "credit" ? (
        <CreditSchool school={school} />
      ) : (
        <div className="space-y-4">
          <Runs schoolId={schoolId} />
          <Wizard school={school} />
        </div>
      )}
    </>
  );
}

function CreditSchool({ school }: { school: School }) {
  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>Students progress individually here</CardTitle>
        <CardDescription>{`${school.name} progresses each student on their own results, as universities and colleges do.`}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        <p>Each semester, students register for courses, and each course can mix levels, including students retaking it. A student moves up a level when their credits and results allow, and graduates when they complete their programme.</p>
        <p>Course registrations, levels and graduations come from the school&apos;s student records system at the start of each semester, so classes aren&apos;t promoted together here.</p>
        <p>The platform administrator sets how a school progresses.</p>
      </CardContent>
    </Card>
  );
}

// ------------------------------------------------------------------ applied promotions

function Runs({ schoolId }: { schoolId: ID }) {
  const runs = useStore((s) => s.promotionRuns);
  const sessions = useStore((s) => s.academicSessions);
  const years = useStore((s) => s.academicYears);
  const users = useStore((s) => s.users);
  const [undoing, setUndoing] = useState<PromotionRun | null>(null);
  const mine = runs.filter((r) => r.schoolId === schoolId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (mine.length === 0) return null;
  const label = (id: ID) => sessionLabel(sessions.find((s) => s.id === id), years);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Promotions</CardTitle>
        <CardDescription>A promotion can be undone until its session becomes active.</CardDescription>
      </CardHeader>
      <CardContent className="divide-y">
        {mine.map((r) => {
          const t = tally(r.outcomes);
          const target = sessions.find((s) => s.id === r.toSessionId);
          return (
            <div key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-1.5 font-medium">
                  {label(r.fromSessionId)} <ArrowRight className="size-3.5 text-muted-foreground" /> {label(r.toSessionId)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {`${t.promote} promoted · ${t.repeat} repeating · ${t.graduate} graduated · ${t.leave} left`} · {fmtDateLong(r.createdAt)} · {users.find((u) => u.id === r.createdBy)?.name}
                </p>
              </div>
              <Badge variant={r.status === "applied" ? "default" : "secondary"}>{r.status === "applied" ? "Applied" : "Undone"}</Badge>
              {r.status === "applied" && target?.status === "upcoming" && (
                <Button size="sm" variant="outline" onClick={() => setUndoing(r)}>
                  <Undo2 /> Undo
                </Button>
              )}
            </div>
          );
        })}
      </CardContent>
      <ConfirmDialog
        open={!!undoing}
        onOpenChange={(o) => !o && setUndoing(null)}
        title="Undo this promotion?"
        description="Students lose the class places and subject registrations it created in the new session. Graduates and leavers become current students of their old class again."
        confirmLabel="Undo promotion"
        destructive
        onConfirm={() => {
          if (!undoing) return;
          const r = undoPromotion(undoing.id);
          if (r.ok) toast.success("Promotion undone");
          else toast.error(r.error);
        }}
      />
    </Card>
  );
}

// ------------------------------------------------------------------ the wizard

const STEPS = ["Sessions", "Classes", "Students", "Review"] as const;

function Wizard({ school }: { school: School }) {
  const db = useStore();
  const levels = levelsOf(school);
  const yearStart = (s: AcademicSession) => db.academicYears.find((y) => y.id === s.academicYearId)?.startDate ?? s.startDate;
  const sessions = db.academicSessions.filter((s) => s.schoolId === school.id).sort((a, b) => b.startDate.localeCompare(a.startDate));
  const placedIn = (id: ID) => db.placements.filter((p) => p.sessionId === id).length;
  const filled = new Set(db.promotionRuns.filter((r) => r.status === "applied").map((r) => r.toSessionId));
  const sources = sessions.filter((s) => placedIn(s.id) > 0);
  const [fromId, setFromId] = useState(() => sources[0]?.id ?? "");
  const from = sessions.find((s) => s.id === fromId);
  // A year is promoted into once: none of its sessions may have students or a promotion already.
  const yearTaken = (yearId: ID) => sessions.some((x) => x.academicYearId === yearId && (filled.has(x.id) || placedIn(x.id) > 0));
  const targets = from ? sessions.filter((s) => s.status === "upcoming" && yearStart(s) > yearStart(from) && !yearTaken(s.academicYearId)).reverse() : [];
  const [pickedTo, setToId] = useState("");
  const toId = targets.some((t) => t.id === pickedTo) ? pickedTo : (targets[0]?.id ?? "");
  const to = sessions.find((s) => s.id === toId);
  const [step, setStep] = useState(0);
  const label = (s: AcademicSession | undefined) => sessionLabel(s, db.academicYears);
  const toClasses = db.classes.filter((c) => c.sessionId === toId);

  if (sources.length === 0) return <EmptyState title="No students to promote yet" description="Students are promoted from a session where they have classes." />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Promote students</CardTitle>
        <CardDescription>Usually done once a year, after the last term or semester and before the new year&apos;s first session becomes active.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <ol className="flex flex-wrap gap-2 text-sm">
          {STEPS.map((s, i) => (
            <li key={s} className={cn("flex items-center gap-1.5 rounded-full border px-3 py-1", i === step ? "border-primary bg-primary/10 font-medium text-primary" : i < step ? "text-foreground" : "text-muted-foreground")}>
              {i < step ? <Check className="size-3.5" /> : <span className="text-xs">{i + 1}</span>} {s}
            </li>
          ))}
        </ol>

        {step === 0 && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Promote from" hint="Normally the last session of the year that's ending">
                <AppSelect value={fromId} onChange={(v) => (setFromId(v), setToId(""))} options={sources.map((s) => ({ value: s.id, label: `${label(s)} (${placedIn(s.id)} students)` }))} aria-label="Promote from" />
              </Field>
              <Field label="Into" hint="The first session of the new academic year">
                <AppSelect value={toId} onChange={setToId} options={targets.map((s) => ({ value: s.id, label: label(s) }))} placeholder="No upcoming session" aria-label="Into" />
              </Field>
            </div>
            {from && targets.length === 0 && (
              <Notice>
                <span>Create the next academic year first. Its sessions start as Upcoming, and students are promoted into the first one.</span>
                <LinkButton href="/school/academic-sessions" size="sm" variant="outline">
                  Academic Sessions
                </LinkButton>
              </Notice>
            )}
            {to && toClasses.length === 0 && (
              <Notice>
                <span>{`${label(to)} has no classes yet. Copy last year's programmes, classes, subjects and teachers into it, then adjust them if anything changes next year.`}</span>
                <Button
                  size="sm"
                  onClick={() => {
                    const r = copyStructure(fromId, toId);
                    toast.success(`Copied ${r.programmes} programmes, ${r.classes} classes and ${r.subjects} subjects`);
                  }}
                >
                  <Copy /> Copy classes
                </Button>
              </Notice>
            )}
            <div className="flex justify-end">
              <Button disabled={!from || !to || toClasses.length === 0} onClick={() => setStep(1)}>
                Next <ArrowRight />
              </Button>
            </div>
          </div>
        )}

        {step > 0 && from && to && <Plan key={`${fromId}:${toId}`} school={school} levels={levels} from={from} to={to} step={step} setStep={setStep} label={label} />}
      </CardContent>
    </Card>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-200 [&>span]:min-w-0 [&>span]:flex-1">{children}</div>;
}

type Override = { outcome: PromotionOutcome; toClassId?: ID };

function Plan({ school, levels, from, to, step, setStep, label }: { school: School; levels: string[]; from: AcademicSession; to: AcademicSession; step: number; setStep: (n: number) => void; label: (s: AcademicSession | undefined) => string }) {
  const db = useStore();
  const programmeCode = useMemo(() => {
    const m = new Map(db.programmes.filter((p) => p.sessionId === from.id || p.sessionId === to.id).map((p) => [p.id, p.code]));
    return (id: ID) => m.get(id);
  }, [db.programmes, from.id, to.id]);
  const rank = (c: SchoolClass) => (levels.includes(c.level) ? levels.indexOf(c.level) : levels.length);
  const byLevel = (a: SchoolClass, b: SchoolClass) => rank(a) - rank(b) || a.name.localeCompare(b.name, undefined, { numeric: true });
  const fromClasses = useMemo(() => db.classes.filter((c) => c.sessionId === from.id).sort(byLevel), [db.classes, from.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const toClasses = useMemo(() => db.classes.filter((c) => c.sessionId === to.id).sort(byLevel), [db.classes, to.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const suggested = useMemo(() => suggestClassMap(fromClasses, toClasses, levels, programmeCode), [fromClasses, toClasses, levels, programmeCode]);
  const [classMap, setClassMap] = useState<Record<ID, ID | undefined>>(() => suggested.promote);
  const [overrides, setOverrides] = useState<Record<ID, Override>>({});
  const [form, setForm] = useState<GraduationForm>(() => graduationForm(from.endDate));
  const [viewClass, setViewClass] = useState(() => fromClasses[0]?.id ?? "");
  const [confirming, setConfirming] = useState(false);

  // Current students of each class; graduates and leavers stay in last year's records only.
  const roster = useMemo(() => {
    const students = new Map(db.students.map((s) => [s.id, s]));
    return db.placements
      .filter((p) => p.sessionId === from.id)
      .flatMap((p) => {
        const s = students.get(p.studentId);
        return s && s.status === "active" ? [{ student: s, classId: p.classId }] : [];
      });
  }, [db.placements, db.students, from.id]);
  const classById = useMemo(() => new Map([...fromClasses, ...toClasses].map((c) => [c.id, c])), [fromClasses, toClasses]);

  const rows: PlannedStudent[] = roster.map(({ student, classId }) => {
    const level = classById.get(classId)?.level ?? "";
    const o = overrides[student.id];
    const outcome = o?.outcome ?? defaultOutcome(levels, level);
    const toClassId = o?.toClassId ?? (outcome === "promote" ? classMap[classId] : outcome === "repeat" ? suggested.repeat[classId] : undefined);
    return { studentId: student.id, fromClassId: classId, outcome, toClassId: needsClass(outcome) ? toClassId : undefined };
  });
  const missing = unplaced(rows);
  const totals = tally(rows);
  const toOptions = toClasses.map((c) => ({ value: c.id, label: c.name, group: c.level }));
  const countIn = (classId: ID) => roster.filter((r) => r.classId === classId).length;
  const offLadder = [...new Set(fromClasses.filter((c) => !levels.includes(c.level)).map((c) => c.level))];

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {label(from)} <ArrowRight className="inline size-3.5" /> {label(to)}
      </p>

      {step === 1 && (
        <>
          {offLadder.length > 0 && (
            <Notice>
              <span>{`${offLadder.join(", ")} isn't one of the school's levels, so its students have no next level. Add it in School Settings → Class levels, or choose a class for each student.`}</span>
            </Notice>
          )}
          <div className="divide-y rounded-lg border">
            {fromClasses.map((c) => {
              const final = isFinalLevel(levels, c.level);
              const next = nextLevel(levels, c.level);
              return (
                <div key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5">
                  <div className="min-w-32 flex-1">
                    <p className="font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{`${c.level} · ${countIn(c.id)} students`}</p>
                  </div>
                  <ArrowRight className="size-4 text-muted-foreground" />
                  <div className="w-full sm:w-56">
                    {final ? (
                      <Badge variant="secondary" className="gap-1">
                        <GraduationCap className="size-3.5" /> Graduates
                      </Badge>
                    ) : (
                      <AppSelect
                        value={classMap[c.id] ?? ""}
                        onChange={(v) => setClassMap((m) => ({ ...m, [c.id]: v }))}
                        options={toOptions}
                        placeholder={next ? `Choose a ${next} class` : "Choose a class"}
                        aria-label={`Next year's class for ${c.name}`}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">Suggested from the class names: the same programme and stream one level up (2A1 → 3A1, SHS 2B → SHS 3B). Repeaters go to the same level next year.</p>
          <StepButtons back={() => setStep(0)} next={() => setStep(2)} />
        </>
      )}

      {step === 2 && (
        <>
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Class" className="w-full sm:w-64">
              <AppSelect value={viewClass} onChange={setViewClass} options={fromClasses.map((c) => ({ value: c.id, label: `${c.name} (${countIn(c.id)})`, group: c.level }))} aria-label="Class" />
            </Field>
            <Summary totals={tally(rows.filter((r) => r.fromClassId === viewClass))} />
          </div>
          <div className="divide-y rounded-lg border">
            {rows.filter((r) => r.fromClassId === viewClass).length === 0 && <p className="p-3 text-sm text-muted-foreground">No current students in this class.</p>}
            {rows
              .filter((r) => r.fromClassId === viewClass)
              .map((r) => {
                const student = roster.find((x) => x.student.id === r.studentId)!.student;
                const level = classById.get(r.fromClassId)?.level ?? "";
                const lost = needsClass(r.outcome) && !r.toClassId;
                return (
                  <div key={r.studentId} className={cn("flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2", lost && "bg-amber-500/10")}>
                    <div className="min-w-40 flex-1">
                      <p className="text-sm font-medium">{studentName(student)}</p>
                      <p className="text-xs text-muted-foreground">{student.studentNumber}</p>
                    </div>
                    <AppSelect
                      className="w-full sm:w-44"
                      value={r.outcome}
                      onChange={(v) => setOverrides((o) => ({ ...o, [r.studentId]: { outcome: v as PromotionOutcome } }))}
                      options={outcomesFor(levels, level).map((o) => ({ value: o, label: OUTCOME_LABEL[o] }))}
                      aria-label={`Outcome for ${studentName(student)}`}
                    />
                    {needsClass(r.outcome) ? (
                      <AppSelect
                        className="w-full sm:w-44"
                        value={r.toClassId ?? ""}
                        onChange={(v) => setOverrides((o) => ({ ...o, [r.studentId]: { outcome: r.outcome, toClassId: v } }))}
                        options={toOptions}
                        placeholder="Choose a class"
                        aria-label={`Class for ${studentName(student)}`}
                      />
                    ) : (
                      <span className="w-full text-sm text-muted-foreground sm:w-44">{r.outcome === "graduate" ? "Graduates" : "Leaves the school"}</span>
                    )}
                  </div>
                );
              })}
          </div>
          <StepButtons back={() => setStep(1)} next={() => setStep(3)} />
        </>
      )}

      {step === 3 && (
        <>
          <Summary totals={totals} />
          {missing.length > 0 && (
            <Notice>
              <TriangleAlert className="size-4" />
              <span>{`${missing.length} students have no class next year. Choose one for them under Classes or Students.`}</span>
            </Notice>
          )}
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {toClasses.map((c) => {
              const n = rows.filter((r) => r.toClassId === c.id).length;
              return (
                <div key={c.id} className={cn("rounded-lg border px-3 py-2", n > c.capacity && "border-amber-500/60")}>
                  <p className="font-medium">{c.name}</p>
                  <p className={cn("text-xs text-muted-foreground", n > c.capacity && "text-amber-700 dark:text-amber-300")}>{n > c.capacity ? `${n} students — over the capacity of ${c.capacity}` : `${n} of ${c.capacity} places`}</p>
                </div>
              );
            })}
          </div>
          {totals.graduate > 0 && (
            <div className="space-y-2 rounded-lg border p-3">
              <p className="flex items-center gap-1.5 font-medium">
                <GraduationCap className="size-4" /> {`${totals.graduate} graduates`}
              </p>
              <GraduationFields value={form} onChange={setForm} />
            </div>
          )}
          <p className="text-sm text-muted-foreground">{`Students are registered for their new class's core subjects and for the electives they took this year. Their records in ${label(from)} don't change.`}</p>
          <div className="flex flex-wrap justify-between gap-2">
            <Button variant="outline" onClick={() => setStep(2)}>
              Back
            </Button>
            <Button disabled={missing.length > 0 || rows.length === 0 || (totals.graduate > 0 && !form.graduatedOn)} onClick={() => setConfirming(true)}>
              <Check /> Apply promotion
            </Button>
          </div>
        </>
      )}

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`Promote ${rows.length} students into ${label(to)}?`}
        description={`${totals.promote} promoted, ${totals.repeat} repeating, ${totals.graduate} graduating and ${totals.leave} leaving. You can undo this until ${label(to)} becomes active.`}
        confirmLabel="Apply promotion"
        onConfirm={() => {
          const r = applyPromotion({ schoolId: school.id, fromSessionId: from.id, toSessionId: to.id, rows, graduation: graduationDetails(form) });
          if (!r.ok) return void toast.error(r.error);
          toast.success(`${rows.length} students moved into ${label(to)}`, { description: totals.graduate ? `${totals.graduate} graduated` : undefined });
          setStep(0);
        }}
      />
    </div>
  );
}

function StepButtons({ back, next }: { back: () => void; next: () => void }) {
  return (
    <div className="flex flex-wrap justify-between gap-2">
      <Button variant="outline" onClick={back}>
        Back
      </Button>
      <Button onClick={next}>
        Next <ArrowRight />
      </Button>
    </div>
  );
}

function Summary({ totals }: { totals: Record<PromotionOutcome, number> }) {
  const items: [PromotionOutcome, string][] = [
    ["promote", "promoted"],
    ["repeat", "repeating"],
    ["graduate", "graduating"],
    ["leave", "leaving"],
  ];
  return (
    <div className="flex flex-wrap gap-2 text-sm">
      {items.map(([k, word]) => (
        <span key={k} className="rounded-full border px-2.5 py-0.5">
          <strong>{totals[k]}</strong> {word}
        </span>
      ))}
    </div>
  );
}

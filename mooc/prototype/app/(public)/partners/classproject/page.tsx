"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Code2, School, ShieldCheck } from "lucide-react";
import { CourseCard } from "@/components/open/bits";
import { courseBySlug } from "@/lib/data/courses";
import { SUBJECT_NAMES, partnerRecommendations } from "@/lib/partner";
import { cn } from "@/lib/utils";

const LEVELS = ["JHS1", "JHS2", "JHS3", "SHS1", "SHS2", "SHS3"];

export default function ClassProjectLanding() {
  return (
    <Suspense>
      <Body />
    </Suspense>
  );
}

/** Landing for ClassProject students (spec section 25): subject-matched, secondary-friendly, free. */
function Body() {
  const params = useSearchParams();
  const [subjects, setSubjects] = useState<string[]>(() => params.get("subjects")?.split(",") ?? ["EMATH", "ICT"]);
  const [level, setLevel] = useState(params.get("level") ?? "SHS2");
  const items = partnerRecommendations({ subjects, level, limit: 12 });
  const toggle = (c: string) => setSubjects((s) => (s.includes(c) ? s.filter((x) => x !== c) : [...s, c]));
  return (
    <div className="space-y-8">
      <header>
        <p className="flex items-center gap-2 text-sm text-primary">
          <School className="size-4" /> For ClassProject students
        </p>
        <h1 className="mt-1 text-4xl font-semibold">Go further than the syllabus</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">Free courses matched to your school subjects, safe for students, and they work offline. Pick your subjects and level.</p>
      </header>

      <div className="space-y-3 rounded-2xl border bg-card p-4">
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(SUBJECT_NAMES).map(([code, name]) => (
            <button key={code} type="button" aria-pressed={subjects.includes(code)} onClick={() => toggle(code)} className={cn("rounded-full border px-2.5 py-1 text-xs", subjects.includes(code) ? "border-primary bg-primary text-primary-foreground" : "bg-card")}>
              {name}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {LEVELS.map((l) => (
            <button key={l} type="button" onClick={() => setLevel(l)} className={cn("rounded-full border px-3 py-1 text-sm", level === l ? "border-primary bg-primary text-primary-foreground" : "bg-card")}>
              {l.replace(/(\D+)(\d)/, "$1 $2")}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((it) => {
          const c = courseBySlug.get(it.slug)!;
          return <CourseCard key={it.slug} course={c} reason={it.reason.text} />;
        })}
        {items.length === 0 && <p className="text-muted-foreground">Pick at least one subject.</p>}
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border bg-card p-5 text-sm">
          <p className="flex items-center gap-2 font-semibold">
            <ShieldCheck className="size-4 text-primary" /> Your privacy
          </p>
          <p className="mt-2 text-muted-foreground">ClassProject only tells us your subjects and level — never your name, school or grades. If you sign up and you&apos;re under 18, we ask a guardian to approve your account, and it stays private. Learning here doesn&apos;t change your school grades.</p>
        </div>
        <div className="rounded-2xl border bg-card p-5 text-sm">
          <p className="flex items-center gap-2 font-semibold">
            <Code2 className="size-4 text-primary" /> For developers: the partner API
          </p>
          <p className="mt-2 text-muted-foreground">ClassProject calls a signed endpoint (spec section 25.3):</p>
          <code className="mt-2 block rounded bg-muted p-2 text-xs break-all">GET /api/v1/partner/recommendations?subjects={subjects.join(",")}&amp;level={level}</code>
          <p className="mt-2 text-xs text-muted-foreground">
            Headers: X-Partner-Key, X-Partner-Timestamp, X-Partner-Signature (HMAC-SHA256). In development,{" "}
            <a className="text-primary hover:underline" href={`/api/v1/partner/recommendations?subjects=${subjects.join(",")}&level=${level}&demo=1`} target="_blank" rel="noreferrer">
              add demo=1 to view it unsigned
            </a>
            .
          </p>
        </div>
      </section>
    </div>
  );
}

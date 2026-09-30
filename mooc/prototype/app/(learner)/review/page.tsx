"use client";

import { useState } from "react";
import Link from "next/link";
import { Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Empty, PageTitle } from "@/components/open/bits";
import { ItemQuestion } from "@/components/open/player/practice";
import { skillName } from "@/lib/data/graph";
import { itemById } from "@/lib/data/items";
import { dueReview, recordAnswer } from "@/lib/learning";
import { useOpen } from "@/lib/store";
import type { Item } from "@/lib/types";
import { useNow } from "@/lib/use-now";

/** Spaced review (spec section 6.9): due items, interleaved across skills, 5 at a time. */
export default function ReviewPage() {
  const s = useOpen();
  const [session, setSession] = useState<Item[] | null>(null);
  const [i, setI] = useState(0);
  const [right, setRight] = useState(0);
  const now = useNow();
  const due = dueReview(s, now);
  const upcoming = Object.entries(s.review).filter(([, r]) => Date.parse(r.due) > now).sort((a, b) => a[1].due.localeCompare(b[1].due));

  if (session) {
    const item = session[i];
    if (!item)
      return (
        <div className="mx-auto max-w-xl text-center">
          <h1 className="text-3xl font-semibold">Done — {right} of {session.length}</h1>
          <p className="mt-2 text-muted-foreground">Items you got right come back later; the ones you missed come back tomorrow. That spacing is what makes learning stick.</p>
          <div className="mt-6 flex justify-center gap-2">
            {due.length > 0 && <Button onClick={() => (setSession(due.slice(0, 5)), setI(0), setRight(0))}>Review {Math.min(5, due.length)} more</Button>}
            <Link href="/home" className="rounded-lg border px-3 py-1.5 text-sm">
              Back to Today
            </Link>
          </div>
        </div>
      );
    return (
      <div className="mx-auto max-w-2xl">
        <div className="mb-4 flex items-center gap-3 text-sm text-muted-foreground">
          <Repeat className="size-4" /> Review {i + 1} of {session.length} · {skillName(item.skill)}
          <Progress value={(i / session.length) * 100} className="flex-1" />
        </div>
        <div className="rounded-2xl border bg-card p-5">
          <ItemQuestion
            key={item.id}
            item={item}
            onDone={(ok, hints) => {
              if (ok) setRight((r) => r + 1);
              recordAnswer(item, ok, "review", hints);
            }}
            onContinue={() => setI(i + 1)}
            doneLabel={i + 1 >= session.length ? "Finish" : "Next"}
          />
        </div>
      </div>
    );
  }

  return (
    <>
      <PageTitle title="Review" description="Short, spaced practice that brings back what you're starting to forget — mixed across skills." />
      {due.length === 0 ? (
        <Empty title="Nothing due right now">Answers you practise are scheduled here automatically. Come back tomorrow.</Empty>
      ) : (
        <div className="rounded-2xl border bg-card p-6">
          <p className="font-heading text-2xl font-semibold">{due.length} item{due.length > 1 ? "s" : ""} due · about {Math.max(2, due.length)} minutes</p>
          <p className="mt-1 text-sm text-muted-foreground">From {[...new Set(due.map((d) => skillName(d.skill)))].join(", ")}.</p>
          <Button className="mt-4" size="lg" onClick={() => (setSession(due.slice(0, 5)), setI(0), setRight(0))}>
            Start review
          </Button>
        </div>
      )}
      {upcoming.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-2 text-lg font-semibold">Coming up</h2>
          <ul className="divide-y rounded-2xl border bg-card text-sm">
            {upcoming.slice(0, 8).map(([id, r]) => (
              <li key={id} className="flex justify-between px-4 py-2">
                <span>{skillName(itemById.get(id)?.skill ?? id)}</span>
                <span className="text-muted-foreground">{new Date(r.due).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

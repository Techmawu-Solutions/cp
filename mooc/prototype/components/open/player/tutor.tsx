"use client";

import { useState } from "react";
import Link from "next/link";
import { Bot, LifeBuoy, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { courseOfActivity } from "@/lib/data/courses";
import { setOpen, uid, useOpen } from "@/lib/store";
import { tutorReply, type TutorAction } from "@/lib/tutor";
import type { TutorMessage } from "@/lib/types";
import { cn } from "@/lib/utils";

const LABEL: Record<NonNullable<TutorMessage["label"]>, { text: string; cls: string }> = {
  course_content: { text: "From your course", cls: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100" },
  ai_explanation: { text: "AI explanation · instructor-approved example", cls: "bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-100" },
  external_knowledge: { text: "External knowledge", cls: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100" },
  hint: { text: "Hint", cls: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100" },
  cant_find: { text: "Not in your course", cls: "bg-muted text-muted-foreground" },
};

/** In-context tutor (FR-AI-1..8): grounded, cited, labelled, and escalates to a person. */
export function Tutor({ activityId }: { activityId: string }) {
  const profile = useOpen((s) => s.profile);
  const messages = useOpen((s) => s.tutor[activityId]) ?? [];
  const [q, setQ] = useState("");
  const course = courseOfActivity(activityId);
  const teen = profile?.ageBand === "teen";

  if (!profile) return <p className="text-sm text-muted-foreground">Sign in to use the tutor.</p>;
  if (!profile.aiTutor)
    return (
      <p className="text-sm text-muted-foreground">
        The AI tutor is off. <Link href="/settings" className="text-primary hover:underline">Turn it on in settings</Link> — everything else works without it.
      </p>
    );

  const push = (learner: string, input: { action?: TutorAction; question?: string }) => {
    const { reply, escalate } = tutorReply(activityId, input, messages, teen);
    setOpen((s) => ({
      tutor: { ...s.tutor, [activityId]: [...(s.tutor[activityId] ?? []), { role: "learner", text: learner }, reply] },
      helpRequests: escalate ? [{ id: uid("help"), activityId, question: escalate, at: new Date().toISOString(), status: "open" }, ...s.helpRequests] : s.helpRequests,
    }));
    if (escalate) toast("A mentor has been notified");
  };

  const askMentor = () => {
    const last = [...messages].reverse().find((m) => m.role === "learner")?.text ?? "I need help with this lesson.";
    setOpen((s) => ({ helpRequests: [{ id: uid("help"), activityId, question: last, at: new Date().toISOString(), status: "open" }, ...s.helpRequests] }));
    toast.success("Sent to a mentor with this lesson's context. You'll get a reply within a day.");
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex max-h-[26rem] flex-col gap-2 overflow-y-auto" aria-live="polite">
        {messages.length === 0 && (
          <p className="flex gap-2 text-sm text-muted-foreground">
            <Bot className="size-4 shrink-0" /> I answer from {course?.title ?? "your course"} and show you where. If it&apos;s not in your materials, I&apos;ll say so rather than guess.
          </p>
        )}
        {messages.map((m, i) =>
          m.role === "learner" ? (
            <p key={i} className="ml-6 rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground">
              {m.text}
            </p>
          ) : (
            <div key={i} className="mr-4 rounded-2xl rounded-bl-sm border bg-card px-3 py-2 text-sm">
              {m.label && <span className={cn("mb-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase", LABEL[m.label].cls)}>{LABEL[m.label].text}</span>}
              <p className="whitespace-pre-line">{m.text}</p>
              {m.citation && course && (
                <Link href={`/learn/${course.slug}/${m.citation.activityId}`} className="mt-1 block text-xs text-primary hover:underline">
                  Source: {m.citation.title}
                </Link>
              )}
            </div>
          ),
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {(
          [
            ["explain", "Explain this"],
            ["simpler", "Simpler"],
            ["example", "Another example"],
            ["quiz", "Quiz me"],
          ] as [TutorAction, string][]
        ).map(([a, label]) => (
          <Button key={a} size="xs" variant="outline" onClick={() => push(label, { action: a })}>
            {label}
          </Button>
        ))}
      </div>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!q.trim()) return;
          push(q.trim(), { question: q.trim() });
          setQ("");
        }}
      >
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask about this lesson" aria-label="Ask the tutor" />
        <Button type="submit" size="icon" aria-label="Send">
          <Send />
        </Button>
      </form>
      <Button variant="ghost" size="sm" className="self-start" onClick={askMentor}>
        <LifeBuoy /> Ask a person (mentor)
      </Button>
      {teen && <p className="text-xs text-muted-foreground">Student safety mode: the tutor sticks to your lessons, and anything worrying goes to a trained person.</p>}
    </div>
  );
}

"use client";

import { ArrowRight, CalendarDays, CheckCircle2, ChevronDown, CreditCard, GraduationCap, MonitorPlay, Star, UserPlus, Video } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { LinkButton } from "@/components/common/link-button";
import { UserAvatar } from "@/components/common/user-avatar";
import { EmptyState } from "@/components/common/empty-state";
import { useStore } from "@/lib/store";
import { fmtGhs, quote, useVacationCatalogue } from "@/lib/vacation";
import { fmtDateLong } from "@/lib/helpers";
import { cn } from "@/lib/utils";

const FAQ = [
  ["Who can join?", "Any student — whether or not your school uses EduMawu. If you already have an account from your school, sign in and your details are picked up; you only pay the vacation fee."],
  ["How are classes delivered?", "Live online classes with experienced teachers, plus recordings, notes, quizzes and assignments you can access any time during the vacation."],
  ["How do I pay?", "MTN Mobile Money, Telecel Cash, AirtelTigo Money or a debit/credit card. You're enrolled as soon as your payment is confirmed."],
  ["Can I choose only some subjects?", "Yes. Pick a bundle for the best value, or choose individual subjects and pay for just those."],
  ["What if I miss a live class?", "Every live class is recorded and added to your course so you can watch it later — including in picture-in-picture while you take notes."],
];

export default function VacationLandingPage() {
  const v = useVacationCatalogue();
  const db = useStore();
  if (!v.session) return <EmptyState title="No vacation classes are open right now" description="Check back before the next school vacation." className="m-8" />;
  const bundles = [...v.bundles].sort((a, b) => Number(b.featured) - Number(a.featured));
  const levelName = (ids: string[]) => (ids.length === 0 ? "All levels" : ids.map((id) => v.classes.find((c) => c.id === id)?.name).join(", "));

  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-orange-500 via-orange-600 to-rose-600 text-white">
        <div className="absolute -top-20 -right-20 size-80 rounded-full bg-white/10" />
        <div className="absolute -bottom-24 left-10 size-64 rounded-full bg-white/5" />
        <div className="relative mx-auto grid max-w-6xl gap-8 px-4 py-14 md:grid-cols-[1.3fr_1fr] md:py-20">
          <div>
            <Badge className="mb-4 bg-white/20 text-white">
              <CalendarDays /> {fmtDateLong(v.session.startDate)} – {fmtDateLong(v.session.endDate)}
            </Badge>
            <h1 className="text-3xl leading-tight font-bold sm:text-5xl">{v.session.name}</h1>
            <p className="mt-4 max-w-xl text-lg text-white/90">Live online revision for BECE, WASSCE and every SHS level. Learn from experienced teachers, watch recordings, take quizzes and track your progress — from anywhere in Ghana.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <LinkButton href="/vacation/register" size="lg" className="h-11 bg-white px-5 text-base text-orange-700 hover:bg-white/90">
                Register now <ArrowRight />
              </LinkButton>
              <LinkButton href="/vacation#bundles" size="lg" variant="outline" className="h-11 border-white/50 bg-transparent px-5 text-base text-white hover:bg-white/10">
                See bundles & prices
              </LinkButton>
            </div>
            <p className="mt-4 text-sm text-white/80">Already have an account from your school? Sign in during registration — your details are picked up automatically.</p>
          </div>
          <Card className="self-center bg-white/95 text-slate-900 ring-0">
            <CardContent className="space-y-3">
              <p className="text-sm font-semibold">Levels</p>
              {v.classes.map((c) => (
                <div key={c.id} className="flex items-center gap-3 rounded-lg bg-orange-50 p-2.5">
                  <GraduationCap className="size-5 text-orange-600" />
                  <span className="flex-1 text-sm font-medium">{c.name}</span>
                  <span className="text-xs text-slate-500">from {fmtGhs(Math.min(...v.subjectsFor(c.id).map((s) => v.priceOf(s.id))))}/subject</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-center text-2xl font-bold">How it works</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: GraduationCap, title: "Choose your level", text: "JHS 3 BECE prep through SHS 3 WASSCE prep." },
            { icon: Star, title: "Pick a bundle or subjects", text: "Bundles save you money; or pay only for the subjects you need." },
            { icon: CreditCard, title: "Pay securely", text: "Mobile Money or card. Enrolled the moment payment is confirmed." },
            { icon: MonitorPlay, title: "Start learning", text: "Live classes, recordings, notes, quizzes and a class forum." },
          ].map((s, i) => (
            <Card key={s.title}>
              <CardContent className="space-y-2">
                <span className="flex size-10 items-center justify-center rounded-full bg-orange-500/15 text-orange-600">
                  <s.icon className="size-5" />
                </span>
                <p className="text-xs font-semibold text-muted-foreground">STEP {i + 1}</p>
                <p className="font-semibold">{s.title}</p>
                <p className="text-sm text-muted-foreground">{s.text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Bundles */}
      <section id="bundles" className="scroll-mt-16 bg-muted/40 py-14">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-2xl font-bold">Subject bundles</h2>
          <p className="mt-1 text-muted-foreground">Everything you need for your exam, at a lower price than buying subjects separately.</p>
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {bundles.map((b) => {
              const q = quote(db, { bundleId: b.id, subjectIds: [] });
              return (
                <Card key={b.id} className={cn("relative", b.featured && "ring-2 ring-orange-500")}>
                  {b.featured && <Badge className="absolute top-3 right-3 bg-orange-600 text-white">Popular</Badge>}
                  <CardContent className="flex h-full flex-col gap-3">
                    <div>
                      <p className="text-lg font-semibold">{b.name}</p>
                      <p className="text-xs text-muted-foreground">{levelName(b.classIds)}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">{b.description}</p>
                    <ul className="space-y-1 text-sm">
                      {b.subjectIds.map((id) => (
                        <li key={id} className="flex items-center gap-2">
                          <CheckCircle2 className="size-4 text-emerald-600" /> {v.subjects.find((x) => x.id === id)?.name}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-auto flex items-end justify-between gap-2 border-t pt-3">
                      <div>
                        <p className="text-2xl font-bold">{fmtGhs(b.price)}</p>
                        {q.saving > 0 && (
                          <p className="text-xs text-emerald-700 dark:text-emerald-400">
                            Save {fmtGhs(q.saving)} <span className="text-muted-foreground line-through">{fmtGhs(q.full)}</span>
                          </p>
                        )}
                      </div>
                      <LinkButton href={`/vacation/register?bundle=${b.id}${b.classIds.length === 1 ? `&class=${b.classIds[0]}` : ""}`} className="bg-orange-600 text-white hover:bg-orange-500">
                        Choose
                      </LinkButton>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Subjects */}
      <section id="subjects" className="mx-auto max-w-6xl scroll-mt-16 px-4 py-14">
        <h2 className="text-2xl font-bold">Individual subjects</h2>
        <p className="mt-1 text-muted-foreground">Prefer to choose? Pay only for the subjects you want.</p>
        <div className="mt-6 overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground uppercase">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Subject</th>
                {v.classes.map((c) => (
                  <th key={c.id} className="px-3 py-2 text-center font-medium">
                    {c.level}
                  </th>
                ))}
                <th className="px-4 py-2 text-right font-medium">Fee</th>
              </tr>
            </thead>
            <tbody>
              {v.subjects.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="px-4 py-2 font-medium">
                    <span className="mr-2 inline-block size-2 rounded-full" style={{ background: s.color }} />
                    {s.name}
                  </td>
                  {v.classes.map((c) => (
                    <td key={c.id} className="px-3 py-2 text-center">
                      {v.subjectsFor(c.id).some((x) => x.id === s.id) ? <CheckCircle2 className="mx-auto size-4 text-emerald-600" /> : <span className="text-muted-foreground">—</span>}
                    </td>
                  ))}
                  <td className="px-4 py-2 text-right font-semibold tabular-nums">{fmtGhs(v.priceOf(s.id))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-6 text-center">
          <LinkButton href="/vacation/register?mode=subjects" size="lg" className="bg-orange-600 text-white hover:bg-orange-500">
            <UserPlus /> Choose my subjects
          </LinkButton>
        </div>
      </section>

      {/* Teachers */}
      <section className="bg-muted/40 py-14">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-2xl font-bold">Your teachers</h2>
          <p className="mt-1 text-muted-foreground">Experienced classroom teachers from schools across Ghana.</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {v.teachers.map((t) => (
              <Card key={t.id} size="sm">
                <CardContent className="flex items-center gap-3">
                  <UserAvatar name={`${t.firstName} ${t.lastName}`} color={db.users.find((u) => u.id === t.userId)?.avatarColor} />
                  <div>
                    <p className="font-medium">
                      {t.title} {t.firstName} {t.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">{t.specialization}</p>
                  </div>
                  <Video className="ml-auto size-4 text-orange-500" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl scroll-mt-16 px-4 py-14">
        <h2 className="mb-6 text-2xl font-bold">Frequently asked questions</h2>
        <div className="space-y-2">
          {FAQ.map(([q, a]) => (
            <Collapsible key={q} className="rounded-lg border">
              <CollapsibleTrigger className="group flex w-full items-center justify-between gap-3 px-4 py-3 text-left font-medium">
                {q}
                <ChevronDown className="size-4 shrink-0 transition-transform group-data-[panel-open]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <p className="px-4 pb-4 text-sm text-muted-foreground">{a}</p>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
        <div className="mt-10 text-center">
          <LinkButton href="/vacation/register" size="lg" className="h-11 bg-orange-600 px-6 text-base text-white hover:bg-orange-500">
            Register for {v.session.name} <ArrowRight />
          </LinkButton>
        </div>
      </section>
    </main>
  );
}

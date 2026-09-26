"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { CheckCircle2, ChevronDown, Circle, Eye, House, ListTree, PanelLeftClose, PanelLeftOpen, Video, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { LinkButton } from "@/components/common/link-button";
import { SchoolLogo } from "@/components/common/user-avatar";
import { EmptyState } from "@/components/common/empty-state";
import { NotificationBell } from "@/components/layout/notification-bell";
import { CONTENT_META } from "@/components/course/content-meta";
import { useLearnCourse, type LearnCourse } from "@/components/learn/use-learn-course";
import { PORTAL_HOME, teacherName, useCurrentUser, useTenant } from "@/lib/session";
import { sectionTerm } from "@/lib/helpers";
import { cn } from "@/lib/utils";

/**
 * Frame of the learning area: a slim top bar (exit, course, progress) and the
 * course index — every section with its items and completion ticks — on the
 * left, instead of the app's sidebar. On phones the index opens as a drawer.
 */
export function LearnShell({ children }: { children: React.ReactNode }) {
  const { courseId } = useParams<{ courseId: string }>();
  const c = useLearnCourse(courseId);
  const me = useCurrentUser();
  const { school } = useTenant();
  const [indexOpen, setIndexOpen] = useState(true);
  const [drawer, setDrawer] = useState(false);
  const pathname = usePathname();
  const exitHref = me?.portal === "student" ? "/student/subjects" : me?.portal === "teacher" ? `/teacher/courses/${courseId}?tab=content` : me ? `/school/courses/${courseId}` : "/";

  // Close the phone drawer after navigating.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setDrawer(false);
  }

  if (!c)
    return (
      <div className="flex min-h-dvh items-center justify-center p-6">
        <EmptyState title="Course not available" description="You can only open subjects you're registered for in the selected academic session." action={<LinkButton href={me ? PORTAL_HOME[me.portal] : "/"}>Back to dashboard</LinkButton>} />
      </div>
    );

  const live = c.liveSessions.find((l) => l.status === "live");
  return (
    <div className="flex h-dvh flex-col bg-background">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-2 sm:px-3">
        <LinkButton href={exitHref} variant="ghost" size="sm" aria-label="Leave the learning area" title="Leave the learning area">
          <X /> <span className="hidden sm:inline">Exit</span>
        </LinkButton>
        <Button variant="ghost" size="icon-sm" className="lg:hidden" onClick={() => setDrawer(true)} aria-label="Open course index">
          <ListTree />
        </Button>
        <Button variant="ghost" size="icon-sm" className="hidden lg:inline-flex" onClick={() => setIndexOpen((o) => !o)} aria-label={indexOpen ? "Hide course index" : "Show course index"} title={indexOpen ? "Hide course index" : "Show course index"}>
          {indexOpen ? <PanelLeftClose /> : <PanelLeftOpen />}
        </Button>
        {school && <SchoolLogo name={school.name} color={school.logoColor} src={school.logoUrl} size="sm" className="hidden size-8 sm:inline-flex" />}
        <Link href={`/learn/${c.course.id}`} className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-sm font-semibold">
            {c.subject?.name} — {c.cls?.name}
          </span>
          <span className="block truncate text-xs text-muted-foreground">{teacherName(c.teacher)}</span>
        </Link>
        {!c.preview && (
          <div className="hidden w-40 items-center gap-2 md:flex" title={`${c.progress.done} of ${c.progress.total} completed`}>
            <Progress value={c.progress.percent} className="flex-1" />
            <span className="text-xs font-medium tabular-nums">{c.progress.percent.toFixed(0)}%</span>
          </div>
        )}
        {live && (
          <LinkButton href={`/classroom/${live.id}/lobby`} size="sm" className="bg-red-600 text-white hover:bg-red-500">
            <Video /> <span className="hidden sm:inline">Join live class</span>
            <span className="sm:hidden">Live</span>
          </LinkButton>
        )}
        <NotificationBell />
      </header>
      {c.preview && (
        <p className="flex shrink-0 items-center justify-center gap-2 bg-amber-500/15 px-3 py-1.5 text-xs text-amber-900 dark:text-amber-200">
          <Eye className="size-3.5" /> Student preview — you see what students see. Hidden {sectionTerm(c.course).lower}s and items aren&apos;t shown.
        </p>
      )}
      <div className="flex min-h-0 flex-1">
        {indexOpen && (
          <aside className="app-sidebar hidden w-80 shrink-0 overflow-y-auto border-r bg-sidebar lg:block" aria-label="Course index">
            <CourseIndex c={c} />
          </aside>
        )}
        <Sheet open={drawer} onOpenChange={setDrawer}>
          <SheetContent side="left" className="app-sidebar w-[85vw] max-w-80 overflow-y-auto bg-sidebar p-0">
            <SheetTitle className="sr-only">Course index</SheetTitle>
            <CourseIndex c={c} />
          </SheetContent>
        </Sheet>
        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}

/** Moodle-style course index: sections → items, with the current item highlighted. */
function CourseIndex({ c }: { c: LearnCourse }) {
  const { itemId } = useParams<{ itemId?: string }>();
  const [closed, setClosed] = useState<Record<string, boolean>>({});
  const current = useRef<HTMLAnchorElement>(null);
  useEffect(() => current.current?.scrollIntoView({ block: "nearest" }), [itemId]);
  const term = sectionTerm(c.course);

  return (
    <nav className="py-3 text-sm">
      <Link href={`/learn/${c.course.id}`} className={cn("mx-2 flex items-center gap-2 rounded-lg px-2.5 py-2 font-medium hover:bg-sidebar-accent", !itemId && "bg-sidebar-accent text-sidebar-accent-foreground")}>
        <House className="size-4" /> Course home
      </Link>
      {!c.preview && (
        <div className="mx-4 mt-2 mb-3">
          <div className="mb-1 flex justify-between text-xs text-muted-foreground">
            <span>Your progress</span>
            <span className="tabular-nums">
              {c.progress.done}/{c.progress.total}
            </span>
          </div>
          <Progress value={c.progress.percent} />
        </div>
      )}
      {c.sections.length === 0 && <p className="px-4 py-3 text-muted-foreground">No {term.lower}s yet.</p>}
      {c.sections.map((m) => {
        const list = c.itemsBySection.get(m.id) ?? [];
        const done = list.filter((i) => c.done.has(i.id)).length;
        const hasCurrent = list.some((i) => i.id === itemId);
        const open = closed[m.id] === undefined ? true : !closed[m.id] || hasCurrent;
        return (
          <div key={m.id} className="mt-1">
            <button type="button" onClick={() => setClosed((x) => ({ ...x, [m.id]: open }))} className="flex w-full items-start gap-1.5 px-3 py-2 text-left hover:bg-sidebar-accent/60" aria-expanded={open}>
              <ChevronDown className={cn("mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform", !open && "-rotate-90")} />
              <span className="min-w-0 flex-1 font-semibold">{m.title}</span>
              {!c.preview && list.length > 0 && <span data-sidebar-icon={done === list.length ? "" : undefined} className={cn("shrink-0 text-xs tabular-nums", done === list.length ? "text-emerald-600" : "text-muted-foreground")}>{done}/{list.length}</span>}
            </button>
            {open && (
              <ul className="pb-1">
                {list.map((it) => {
                  const M = CONTENT_META[it.type];
                  const isCurrent = it.id === itemId;
                  const isDone = c.done.has(it.id);
                  return (
                    <li key={it.id}>
                      <Link
                        ref={isCurrent ? current : undefined}
                        href={`/learn/${c.course.id}/${it.id}`}
                        aria-current={isCurrent ? "page" : undefined}
                        className={cn("mx-2 flex items-center gap-2 rounded-md py-1.5 pr-2 pl-7 hover:bg-sidebar-accent", isCurrent && "bg-primary/10 font-medium text-primary")}
                      >
                        <M.icon data-sidebar-icon className={cn("size-3.5 shrink-0", M.color)} />
                        <span className="min-w-0 flex-1 truncate">{it.title}</span>
                        {!c.preview && (isDone ? <CheckCircle2 data-sidebar-icon className="size-3.5 shrink-0 text-emerald-600" aria-label="Completed" /> : <Circle className="size-3.5 shrink-0 text-muted-foreground/50" aria-label="Not completed" />)}
                      </Link>
                    </li>
                  );
                })}
                {list.length === 0 && <li className="py-1 pl-9 text-xs text-muted-foreground">Nothing here yet</li>}
              </ul>
            )}
          </div>
        );
      })}
    </nav>
  );
}

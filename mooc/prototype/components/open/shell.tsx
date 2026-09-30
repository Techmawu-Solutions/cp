"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BadgeCheck, CloudOff, Feather, LogOut, Settings, ShieldAlert, UserRound, Users, Wifi } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Logo } from "@/components/open/bits";
import { LanguageSwitcher } from "@/components/open/language-switcher";
import { dueReview, setOfflineMode } from "@/lib/learning";
import { signOut } from "@/lib/personas";
import { setOpen, useHydrated, useOpen } from "@/lib/store";
import { cn } from "@/lib/utils";

const LEARNER_NAV = [
  { href: "/home", label: "Today" },
  { href: "/path", label: "My path" },
  { href: "/skills", label: "Skills" },
  { href: "/explore", label: "Explore" },
  { href: "/review", label: "Review" },
  { href: "/portfolio", label: "Portfolio" },
];
const INSTRUCTOR_NAV = [
  { href: "/studio", label: "Studio" },
  { href: "/explore", label: "Explore" },
];

export function LinkButton({ href, children, variant, size, className, target }: { href: string; children: React.ReactNode; variant?: "default" | "outline" | "secondary" | "ghost" | "link"; size?: "default" | "sm" | "lg" | "xs"; className?: string; target?: string }) {
  return (
    <Link href={href} target={target} className={cn(buttonVariants({ variant, size }), className)}>
      {children}
    </Link>
  );
}

export function AppShell({ children, requireAuth }: { children: React.ReactNode; requireAuth: boolean }) {
  const hydrated = useHydrated();
  const router = useRouter();
  const pathname = usePathname();
  const s = useOpen();
  const signedIn = !!s.persona && !!s.profile;
  const mustSignIn = hydrated && requireAuth && !signedIn;

  useEffect(() => {
    if (mustSignIn) router.replace(s.persona === "new" ? "/start" : `/sign-in?next=${encodeURIComponent(pathname)}`);
  }, [mustSignIn, router, s.persona, pathname]);

  if (!hydrated || mustSignIn) return <div className="grid min-h-dvh place-items-center text-sm text-muted-foreground">Loading…</div>;

  const nav = s.profile?.role === "instructor" ? INSTRUCTOR_NAV : LEARNER_NAV;
  const due = signedIn ? dueReview(s).length : 0;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
          <Link href={signedIn ? (s.profile?.role === "instructor" ? "/studio" : "/home") : "/"} aria-label="ClassProject Open home">
            <Logo />
          </Link>
          {signedIn && (
            <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
              {nav.map((n) => (
                <Link key={n.href} href={n.href} aria-current={pathname.startsWith(n.href) ? "page" : undefined} className={cn("relative rounded-lg px-2.5 py-1.5 text-sm transition-colors hover:bg-muted", pathname.startsWith(n.href) && "bg-accent font-medium text-accent-foreground")}>
                  {n.label}
                  {n.href === "/review" && due > 0 && <span className="ml-1 rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">{due}</span>}
                </Link>
              ))}
            </nav>
          )}
          <div className="ml-auto flex items-center gap-1.5">
            <LanguageSwitcher />
            {signedIn ? (
              <>
                <Connectivity />
                <Button
                  variant={s.profile?.dataSaver ? "secondary" : "ghost"}
                  size="icon-sm"
                  aria-pressed={s.profile?.dataSaver}
                  aria-label={s.profile?.dataSaver ? "Data saver on" : "Data saver off"}
                  title="Data saver: text first, audio-only video"
                  onClick={() => (setOpen((st) => ({ profile: { ...st.profile!, dataSaver: !st.profile!.dataSaver } })), toast(s.profile?.dataSaver ? "Data saver off" : "Data saver on — videos play audio-only with slides"))}
                >
                  <Feather />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="ghost" size="sm" className="gap-2" aria-label="Account menu" />}>
                    <span className="grid size-6 place-items-center rounded-full bg-primary/15 text-xs font-semibold text-primary">{s.profile!.name[0]}</span>
                    <span className="hidden sm:inline">{s.profile!.name.replace(/^(Dr|Mr|Mrs|Ms|Prof)\.\s+/, "").split(" ")[0]}</span>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuGroup>
                      <DropdownMenuLabel>{s.profile!.name}</DropdownMenuLabel>
                    </DropdownMenuGroup>
                    <DropdownMenuItem onClick={() => router.push("/credentials")}>
                      <BadgeCheck /> Credentials
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push(`/p/${s.profile!.handle}`)}>
                      <UserRound /> Public portfolio
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push("/settings")}>
                      <Settings /> Privacy & settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => router.push("/sign-in")}>
                      <Users /> Switch demo learner
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => (signOut(), router.push("/"))}>
                      <LogOut /> Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <LinkButton href="/sign-in" variant="ghost" size="sm">
                  Sign in
                </LinkButton>
                <LinkButton href="/start" size="sm">
                  Get started
                </LinkButton>
              </>
            )}
          </div>
        </div>
        {signedIn && (
          <nav className="flex gap-1 overflow-x-auto border-t px-3 py-1.5 md:hidden" aria-label="Main (mobile)">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} className={cn("shrink-0 rounded-lg px-2.5 py-1 text-sm", pathname.startsWith(n.href) ? "bg-accent font-medium text-accent-foreground" : "text-muted-foreground")}>
                {n.label}
                {n.href === "/review" && due > 0 && ` (${due})`}
              </Link>
            ))}
          </nav>
        )}
      </header>

      {s.offline && (
        <div role="status" className="border-b bg-amber-50 px-4 py-2 text-center text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          <CloudOff className="mr-1.5 inline size-4" /> You&apos;re offline. Downloaded lessons still work; your progress is saved on this device
          {s.pendingSync > 0 && ` (${s.pendingSync} change${s.pendingSync > 1 ? "s" : ""} waiting to sync)`}.
        </div>
      )}
      {signedIn && s.profile?.ageBand === "teen" && s.profile.guardian === "pending" && (
        <div className="border-b bg-sky-50 px-4 py-2 text-sm text-sky-900 dark:bg-sky-950/40 dark:text-sky-100">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2">
            <ShieldAlert className="size-4 shrink-0" />
            <span className="flex-1">We&apos;ve asked your guardian to approve your account. Until then, community, live classes and a public portfolio are locked — learning works as normal.</span>
            <Button size="xs" variant="outline" onClick={() => (setOpen((st) => ({ profile: { ...st.profile!, guardian: "granted" } })), toast.success("Guardian approved (simulated) — community and live classes unlocked"))}>
              Simulate guardian approval
            </Button>
          </div>
        </div>
      )}

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        ClassProject Open — clickable prototype on mock data (spec section 22, phase P0). Everything you do is saved in this browser only.
      </footer>
    </div>
  );
}

function Connectivity() {
  const offline = useOpen((s) => s.offline);
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn("gap-1.5", offline && "text-amber-700 dark:text-amber-300")}
      title="Simulate losing and regaining connection (offline-first demo)"
      onClick={() => {
        const synced = setOfflineMode(!offline);
        if (offline) toast.success(synced ? `Back online — synced ${synced} change${synced > 1 ? "s" : ""}` : "Back online");
        else toast("Offline mode (simulated) — keep learning; changes sync later");
      }}
    >
      {offline ? <CloudOff /> : <Wifi />}
      <span className="hidden lg:inline">{offline ? "Offline" : "Online"}</span>
    </Button>
  );
}

"use client";

import Link from "next/link";
import { Logo } from "@/components/common/logo";
import { LinkButton } from "@/components/common/link-button";
import { useHydrated } from "@/lib/store";
import { PORTAL_HOME, useCurrentUser } from "@/lib/session";
import { FullPageLoader } from "@/components/common/full-page-loader";

/** Public Vacation Classes site (spec §49.1.2) — no sign-in required. */
export default function VacationLayout({ children }: { children: React.ReactNode }) {
  const hydrated = useHydrated();
  const me = useCurrentUser();
  if (!hydrated) return <FullPageLoader />;
  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          <Link href="/vacation" className="flex min-w-0 items-center gap-2">
            <Logo className="min-w-0 [&>span:last-child]:truncate" />
            <span className="hidden rounded-full bg-orange-500/15 px-2 py-0.5 text-xs font-semibold text-orange-700 sm:inline dark:text-orange-300">Vacation Classes</span>
          </Link>
          <nav className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
            <Link href="/vacation#bundles" className="hidden px-2 text-sm text-muted-foreground hover:text-foreground sm:inline">
              Bundles
            </Link>
            <Link href="/vacation#subjects" className="hidden px-2 text-sm text-muted-foreground hover:text-foreground sm:inline">
              Subjects
            </Link>
            <Link href="/vacation#faq" className="hidden px-2 text-sm text-muted-foreground hover:text-foreground md:inline">
              FAQ
            </Link>
            {me ? (
              <LinkButton href={PORTAL_HOME[me.portal]} variant="outline" size="sm">
                <span className="sm:hidden">Dashboard</span>
                <span className="hidden sm:inline">My dashboard</span>
              </LinkButton>
            ) : (
              <LinkButton href="/login?next=/vacation/register" variant="outline" size="sm">
                Sign in
              </LinkButton>
            )}
            <LinkButton href="/vacation/register" size="sm" className="bg-orange-600 text-white hover:bg-orange-500">
              Register
            </LinkButton>
          </nav>
        </div>
      </header>
      {children}
      <footer className="mt-16 border-t py-8 text-center text-sm text-muted-foreground">
        <p>ClassProject Vacation Classes · Live online classes with experienced teachers · vacation@classproject.com</p>
      </footer>
    </div>
  );
}

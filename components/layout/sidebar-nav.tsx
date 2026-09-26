"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ChevronRight, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { filterNav, NAV, PORTAL_LABEL, type NavItem } from "@/lib/nav";
import { useCurrentUser, useTenant, type Portal } from "@/lib/session";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/common/logo";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { WorkspaceSwitcher } from "@/components/layout/workspace-switcher";
import { AcademicSessionSelector } from "@/components/academic/academic-session-selector";
import { LiveDot } from "@/components/classroom/live-badge";
import { useLiveNow } from "@/lib/live";

function isActive(pathname: string, search: string, href: string) {
  const [path, query] = href.split("?");
  if (query) return pathname === path && search.includes(query);
  if (pathname === path) return !search || !href.includes("?");
  return pathname.startsWith(path + "/");
}

/**
 * Side navigation (spec §50.1). `collapsed` renders a compact icon rail with
 * tooltips; items with children open as a flyout menu in that mode.
 */
export function SidebarNav({ portal, onNavigate, collapsed = false, onToggle }: { portal: Portal; onNavigate?: () => void; collapsed?: boolean; onToggle?: () => void }) {
  const me = useCurrentUser();
  const pathname = usePathname();
  const params = useSearchParams();
  const search = params.toString();
  const { school } = useTenant();
  const items = filterNav(NAV[portal], (p) => !!me?.can(p), school?.kind === "vacation");
  const liveCount = useLiveNow().sessions.length;

  return (
    <div className="flex h-full flex-col">
      <div className={cn("flex h-14 shrink-0 items-center border-b", collapsed ? "justify-center px-2" : "px-4")}>
        <Link href="/" onClick={onNavigate} aria-label="Home">
          <Logo compact={collapsed} />
        </Link>
      </div>
      {/* School / workspace and academic session scope everything below (spec §6.5, §49.1.1). */}
      {school && portal !== "super-admin" && (
        <div className={cn("shrink-0 space-y-1.5 border-b", collapsed ? "px-2 py-2" : "p-3")} onClick={(e) => e.target instanceof HTMLElement && e.target.closest("[role=menuitem]") && onNavigate?.()}>
          <WorkspaceSwitcher collapsed={collapsed} />
          <AcademicSessionSelector collapsed={collapsed} />
        </div>
      )}
      {!collapsed && <div className="px-4 pt-4 pb-2 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">{PORTAL_LABEL[portal]}</div>}
      <nav className={cn("flex-1 space-y-0.5 overflow-y-auto pb-6", collapsed ? "px-2 pt-3" : "px-2")} aria-label="Main">
        {items.map((item) =>
          collapsed ? (
            <RailEntry key={item.href + item.label} item={item} pathname={pathname} search={search} liveCount={liveCount} />
          ) : (
            <NavEntry key={item.href + item.label} item={item} pathname={pathname} search={search} onNavigate={onNavigate} liveCount={liveCount} />
          ),
        )}
      </nav>
      {onToggle && (
        <div className="border-t p-2">
          <button
            type="button"
            onClick={onToggle}
            className={cn("flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground", collapsed && "justify-center px-0")}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
            {!collapsed && "Collapse sidebar"}
          </button>
        </div>
      )}
    </div>
  );
}

/** "3 live" pill beside a nav label. */
function LiveCount({ count }: { count: number }) {
  return (
    <span className="ml-auto flex items-center gap-1.5 rounded-full bg-red-600/10 px-2 py-0.5 text-[11px] font-semibold text-red-700 dark:text-red-400" title={`${count} live class${count === 1 ? "" : "es"} in progress`}>
      <LiveDot /> {count} live
    </span>
  );
}

function RailEntry({ item, pathname, search, liveCount }: { item: NavItem; pathname: string; search: string; liveCount: number }) {
  const router = useRouter();
  const active = isActive(pathname, search, item.href) || !!item.children?.some((c) => isActive(pathname, search, c.href));
  const Icon = item.icon;
  const live = item.live && liveCount > 0;
  const label = live ? `${item.label} (${liveCount} live now)` : item.label;
  const dot = live && <LiveDot className="absolute top-1.5 right-1.5" />;
  const cls = cn("relative flex size-10 items-center justify-center rounded-lg transition-colors", active ? "bg-sidebar-accent text-primary" : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground");
  if (item.children && item.children.length > 0) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger className={cn(cls, "mx-auto outline-none")} aria-label={label} title={label}>
          {Icon && <Icon className="size-[18px]" />}
          {dot}
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start" className="w-52">
          <DropdownMenuGroup>
            <DropdownMenuLabel>{item.label}</DropdownMenuLabel>
            {item.children.map((c) => (
              <DropdownMenuItem key={c.href + c.label} onClick={() => router.push(c.href)}>
                {c.label}
                {c.live && liveCount > 0 && <LiveDot className="ml-auto" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
  return (
    <Tooltip>
      <TooltipTrigger render={<Link href={item.href} className={cn(cls, "mx-auto")} aria-label={label} />}>
        {Icon && <Icon className="size-[18px]" />}
        {dot}
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

function NavEntry({ item, pathname, search, onNavigate, liveCount }: { item: NavItem; pathname: string; search: string; onNavigate?: () => void; liveCount: number }) {
  const childActive = item.children?.some((c) => isActive(pathname, search, c.href)) ?? false;
  const selfActive = isActive(pathname, search, item.href);
  const [open, setOpen] = useState(childActive || selfActive);
  const Icon = item.icon;
  const base = "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors";

  if (item.children && item.children.length > 0) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={cn(base, "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground", (childActive || selfActive) && "font-medium text-sidebar-foreground")}
          aria-expanded={open}
        >
          {Icon && <Icon className="size-4 shrink-0" />}
          <span className="flex-1 text-left">{item.label}</span>
          {item.live && liveCount > 0 && !open && <LiveCount count={liveCount} />}
          <ChevronRight className={cn("size-3.5 transition-transform", open && "rotate-90")} />
        </button>
        {open && (
          <div className="mt-0.5 mb-1 ml-[1.1rem] space-y-0.5 border-l pl-3">
            {item.children.map((c) => {
              const active = isActive(pathname, search, c.href) && (c.href.includes("?") || !item.children!.some((o) => o !== c && o.href.includes("?") && isActive(pathname, search, o.href)));
              return (
                <Link
                  key={c.href + c.label}
                  href={c.href}
                  onClick={onNavigate}
                  className={cn("flex items-center rounded-md px-2.5 py-1.5 text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground", active ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground" : "text-sidebar-foreground/70")}
                >
                  {c.label}
                  {c.live && liveCount > 0 && <LiveCount count={liveCount} />}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(base, selfActive ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground" : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground")}
    >
      {Icon && <Icon className={cn("size-4 shrink-0", selfActive && "text-primary")} />}
      {item.label}
      {item.live && liveCount > 0 && <LiveCount count={liveCount} />}
    </Link>
  );
}

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

  return (
    <div className="flex h-full flex-col">
      <div className={cn("flex h-14 shrink-0 items-center border-b", collapsed ? "justify-center px-2" : "px-4")}>
        <Link href="/" onClick={onNavigate} aria-label="Home">
          <Logo compact={collapsed} />
        </Link>
      </div>
      {!collapsed && <div className="px-4 pt-4 pb-2 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">{PORTAL_LABEL[portal]}</div>}
      <nav className={cn("flex-1 space-y-0.5 overflow-y-auto pb-6", collapsed ? "px-2 pt-3" : "px-2")} aria-label="Main">
        {items.map((item) =>
          collapsed ? (
            <RailEntry key={item.href + item.label} item={item} pathname={pathname} search={search} />
          ) : (
            <NavEntry key={item.href + item.label} item={item} pathname={pathname} search={search} onNavigate={onNavigate} />
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

function RailEntry({ item, pathname, search }: { item: NavItem; pathname: string; search: string }) {
  const router = useRouter();
  const active = isActive(pathname, search, item.href) || !!item.children?.some((c) => isActive(pathname, search, c.href));
  const Icon = item.icon;
  const cls = cn("flex size-10 items-center justify-center rounded-lg transition-colors", active ? "bg-sidebar-accent text-primary" : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground");
  if (item.children && item.children.length > 0) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger className={cn(cls, "mx-auto outline-none")} aria-label={item.label} title={item.label}>
          {Icon && <Icon className="size-[18px]" />}
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start" className="w-52">
          <DropdownMenuGroup>
            <DropdownMenuLabel>{item.label}</DropdownMenuLabel>
            {item.children.map((c) => (
              <DropdownMenuItem key={c.href + c.label} onClick={() => router.push(c.href)}>
                {c.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
  return (
    <Tooltip>
      <TooltipTrigger render={<Link href={item.href} className={cn(cls, "mx-auto")} aria-label={item.label} />}>{Icon && <Icon className="size-[18px]" />}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}

function NavEntry({ item, pathname, search, onNavigate }: { item: NavItem; pathname: string; search: string; onNavigate?: () => void }) {
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
                  className={cn("block rounded-md px-2.5 py-1.5 text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground", active ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground" : "text-sidebar-foreground/70")}
                >
                  {c.label}
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
    </Link>
  );
}

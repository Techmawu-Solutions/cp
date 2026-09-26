"use client";

import { useEffect } from "react";
import { brandVars } from "@/lib/brand";
import { useTenant } from "@/lib/session";

/**
 * Applies the current school's branding colours to the whole interface,
 * including dialogs and menus (which render outside the app shell), by
 * setting CSS variables on <html>. Renders nothing.
 */
export function SchoolTheme() {
  const { school } = useTenant();
  const primary = school?.branding?.primary;
  const sidebar = school?.branding?.sidebar;
  useEffect(() => {
    const root = document.documentElement;
    const vars = brandVars({ primary, sidebar });
    for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
    if (vars["--brand"]) root.dataset.brand = "";
    if (vars["--brand-sidebar"]) root.dataset.brandSidebar = "";
    return () => {
      for (const k of Object.keys(vars)) root.style.removeProperty(k);
      delete root.dataset.brand;
      delete root.dataset.brandSidebar;
    };
  }, [primary, sidebar]);
  return null;
}

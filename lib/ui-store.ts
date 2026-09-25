"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/** Per-browser UI preferences, kept apart from the demo database. */
interface UiState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  /**
   * Set while switching accounts: the new user is signed in before the router
   * reaches their portal, and the shell shows a loader instead of flashing
   * "access denied" for the old route.
   */
  navigatingTo: string | null;
  setNavigatingTo: (path: string | null) => void;
}

export const useUi = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      navigatingTo: null,
      setNavigatingTo: (navigatingTo) => set({ navigatingTo }),
    }),
    { name: "edumawu-ui", storage: createJSONStorage(() => localStorage), partialize: (s) => ({ sidebarCollapsed: s.sidebarCollapsed }) },
  ),
);

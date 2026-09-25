"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { del as idbDel, get as idbGet, set as idbSet } from "idb-keyval";
import type { AuditLog, AppNotification, ID } from "@/lib/types";
import { createSeed, DB_VERSION, DEMO_PASSWORD, type DB } from "@/lib/data/seed";
import { uid } from "@/lib/helpers";

/**
 * The prototype's "backend" (spec §65): an in-browser database persisted to
 * localStorage. Screens read it through selectors in lib/queries.ts and write
 * through the actions below, so replacing it with the Laravel API later means
 * swapping these functions for fetch calls rather than rewriting screens.
 */

type Collection = {
  [K in keyof DB]: DB[K] extends Array<{ id: string }> ? K : never;
}[keyof DB];
type Item<K extends Collection> = DB[K] extends Array<infer T> ? T : never;

export interface AuthState {
  userId: ID | null;
  /** Super Admin "enter school" — views a tenant as its administrator would. */
  actingSchoolId: ID | null;
  /** Selected academic session per school (spec §6.5). */
  sessionBySchool: Record<ID, ID>;
  /**
   * Workspace for users who belong to more than one tenant — e.g. a school
   * student also registered for Vacation Classes (spec §49.1.1).
   */
  workspaceSchoolId: ID | null;
}

interface Actions {
  login: (email: string, password: string) => { ok: true; userId: ID } | { ok: false; error: string };
  logout: () => void;
  setActingSchool: (schoolId: ID | null) => void;
  setSession: (schoolId: ID, sessionId: ID) => void;
  setWorkspace: (schoolId: ID | null) => void;
  setPassword: (userId: ID, password: string) => void;

  insert: <K extends Collection>(key: K, item: Item<K>) => void;
  insertMany: <K extends Collection>(key: K, items: Item<K>[]) => void;
  update: <K extends Collection>(key: K, id: ID, patch: Partial<Item<K>>) => void;
  remove: <K extends Collection>(key: K, id: ID) => void;
  removeWhere: <K extends Collection>(key: K, pred: (x: Item<K>) => boolean) => void;
  mutate: (fn: (db: DB) => Partial<DB>) => void;
  updateSettings: (patch: Partial<DB["settings"]>) => void;

  audit: (entry: Omit<AuditLog, "id" | "at" | "actorId" | "actorName">) => void;
  notify: (n: Omit<AppNotification, "id" | "createdAt" | "readBy">) => void;
  markRead: (notificationIds: ID[]) => void;
  completeContent: (studentId: ID, contentId: ID) => void;

  resetDemo: () => void;
}

export type Store = DB & AuthState & Actions;

const initialAuth: AuthState = { userId: null, actingSchoolId: null, sessionBySchool: {}, workspaceSchoolId: null };

const idbStorage: StateStorage = {
  getItem: async (name) => {
    // One-time cleanup of the earlier localStorage copy, which could exhaust its quota.
    if (typeof localStorage !== "undefined") localStorage.removeItem(name);
    return (await idbGet<string>(name)) ?? null;
  },
  setItem: (name, value) => idbSet(name, value),
  removeItem: (name) => idbDel(name),
};

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      ...createSeed(),
      ...initialAuth,

      login: (email, password) => {
        const user = get().users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
        if (!user) return { ok: false, error: "No account found for that email address." };
        if (user.status === "disabled") return { ok: false, error: "This account has been disabled. Contact your administrator." };
        const expected = get().passwords[user.id] ?? DEMO_PASSWORD;
        if (password !== expected) return { ok: false, error: "Incorrect password." };
        const school = user.schoolId ? get().schools.find((s) => s.id === user.schoolId) : null;
        if (school && (school.status === "suspended" || school.status === "archived")) return { ok: false, error: `${school.name} is currently ${school.status}. Contact the platform administrator.` };
        set((s) => ({
          userId: user.id,
          actingSchoolId: null,
          workspaceSchoolId: null,
          users: s.users.map((u) => (u.id === user.id ? { ...u, lastActive: new Date().toISOString(), status: u.status === "invited" ? "active" : u.status } : u)),
        }));
        return { ok: true, userId: user.id };
      },
      logout: () => set({ userId: null, actingSchoolId: null, workspaceSchoolId: null }),
      setActingSchool: (schoolId) => set({ actingSchoolId: schoolId }),
      setSession: (schoolId, sessionId) => set((s) => ({ sessionBySchool: { ...s.sessionBySchool, [schoolId]: sessionId } })),
      setWorkspace: (workspaceSchoolId) => set({ workspaceSchoolId }),
      setPassword: (userId, password) => set((s) => ({ passwords: { ...s.passwords, [userId]: password } })),

      insert: (key, item) => set((s) => ({ [key]: [...(s[key] as unknown[]), item] }) as Partial<Store>),
      insertMany: (key, items) => set((s) => ({ [key]: [...(s[key] as unknown[]), ...items] }) as Partial<Store>),
      update: (key, id, patch) =>
        set((s) => ({ [key]: (s[key] as { id: string }[]).map((x) => (x.id === id ? { ...x, ...patch } : x)) }) as Partial<Store>),
      remove: (key, id) => set((s) => ({ [key]: (s[key] as { id: string }[]).filter((x) => x.id !== id) }) as Partial<Store>),
      removeWhere: (key, pred) =>
        set((s) => ({ [key]: (s[key] as Item<typeof key>[]).filter((x) => !pred(x)) }) as Partial<Store>),
      mutate: (fn) => set((s) => fn(s) as Partial<Store>),
      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

      audit: (entry) => {
        const s = get();
        const actor = s.users.find((u) => u.id === s.userId);
        const log: AuditLog = { id: uid("aud"), at: new Date().toISOString(), actorId: actor?.id ?? "system", actorName: actor?.name ?? "System", ...entry };
        set({ auditLogs: [log, ...s.auditLogs] });
      },
      notify: (n) => set((s) => ({ notifications: [{ ...n, id: uid("ntf"), createdAt: new Date().toISOString(), readBy: [] }, ...s.notifications] })),
      markRead: (ids) => {
        const userId = get().userId;
        if (!userId) return;
        set((s) => ({ notifications: s.notifications.map((n) => (ids.includes(n.id) && !n.readBy.includes(userId) ? { ...n, readBy: [...n.readBy, userId] } : n)) }));
      },
      completeContent: (studentId, contentId) => {
        if (get().progress.some((p) => p.studentId === studentId && p.contentId === contentId)) return;
        set((s) => ({ progress: [...s.progress, { studentId, contentId, completedAt: new Date().toISOString() }] }));
      },

      resetDemo: () => set({ ...createSeed(), ...initialAuth }),
    }),
    {
      name: "edumawu-prototype",
      version: DB_VERSION,
      // IndexedDB rather than localStorage: the demo database is several MB,
      // close to localStorage's ~5 MB quota, and IndexedDB writes don't block.
      storage: createJSONStorage(() => idbStorage),
      // A schema bump discards old data instead of trying to migrate mock records.
      migrate: () => ({ ...createSeed(), ...initialAuth }) as unknown as Store,
      partialize: (s) => {
        const { login, logout, setActingSchool, setSession, setWorkspace, setPassword, insert, insertMany, update, remove, removeWhere, mutate, updateSettings, audit, notify, markRead, completeContent, resetDemo, ...data } = s;
        void [login, logout, setActingSchool, setSession, setWorkspace, setPassword, insert, insertMany, update, remove, removeWhere, mutate, updateSettings, audit, notify, markRead, completeContent, resetDemo];
        return data;
      },
    },
  ),
);

const subscribeHydration = (onChange: () => void) => useStore.persist?.onFinishHydration(onChange) ?? (() => {});

/** True once the persisted state has been read from IndexedDB. Always false on the server. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribeHydration,
    () => useStore.persist?.hasHydrated() ?? false,
    () => false,
  );
}

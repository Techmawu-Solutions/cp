"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { del as idbDel, get as idbGet, set as idbSet } from "idb-keyval";
import type { AuditLog, AppNotification, ID } from "@/lib/types";
import { createSeed, DB_VERSION, DEMO_PASSWORD, type DB } from "@/lib/data/seed";
import { fmtDateLong, uid } from "@/lib/helpers";
import { accessEnded } from "@/lib/promotion";
import { resolveSignIn, withIdentities } from "@/lib/usernames";
import { closedSessionWrite, SESSION_CLOSED_MESSAGE } from "@/lib/session-lock";
import { toast } from "sonner";

/**
 * The prototype's "backend" (spec section 65): an in-browser database persisted to
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
  /** Selected academic session per school (spec section 6.5). */
  sessionBySchool: Record<ID, ID>;
  /**
   * Workspace for users who belong to more than one tenant — e.g. a school
   * student also registered for Vacation Classes (spec section 49.1.1).
   */
  workspaceSchoolId: ID | null;
}

interface Actions {
  login: (identifier: string, password: string) => { ok: true; userId: ID } | { ok: false; error: string };
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

/**
 * Who is signed in is also remembered per browser tab, so a teacher and a
 * student can be signed in side by side in two tabs of one browser (the
 * live classroom demo relies on it). The shared database still persists
 * the last sign-in for new tabs.
 */
const TAB_USER_KEY = "classproject:tab-user";
const tabUser = {
  get: () => {
    try {
      return typeof sessionStorage === "undefined" ? null : sessionStorage.getItem(TAB_USER_KEY);
    } catch {
      return null;
    }
  },
  set: (id: string | null) => {
    try {
      if (typeof sessionStorage === "undefined") return;
      if (id) sessionStorage.setItem(TAB_USER_KEY, id);
      else sessionStorage.removeItem(TAB_USER_KEY);
    } catch {
      /* storage blocked: fall back to the shared sign-in */
    }
  },
};

export const useStore = create<Store>()(
  persist(
    (set, get) => {
      // Every change to the data passes here: a closed academic session is read-only (spec section 6.5).
      const write = (fn: (s: Store) => Partial<DB>) => {
        const s = get();
        const patch = fn(s);
        if (closedSessionWrite(s, patch)) {
          toast.error(SESSION_CLOSED_MESSAGE, { id: "session-closed" });
          return;
        }
        set(patch as Partial<Store>);
      };
      return {
        ...createSeed(),
        ...initialAuth,

        // Accepts email, platform username, student school username or teacher staff ID (spec section 10.1).
        login: (identifier, password) => {
          const match = resolveSignIn(identifier, get());
          if (!match.ok) return match;
          // A school code can belong to several administrators; the password picks the account.
          const candidates = get().users.filter((u) => match.userIds.includes(u.id) && (get().passwords[u.id] ?? DEMO_PASSWORD) === password);
          if (candidates.length === 0) return { ok: false, error: "Incorrect password." };
          if (candidates.length > 1) return { ok: false, error: "More than one administrator of this school uses that password. Ask the platform administrator to reset one of them." };
          const user = candidates[0]!;
          // A graduate signs in only while their alumni access lasts (spec section 22.4).
          const finished = user.roleId === "role_student" ? get().students.find((x) => x.userId === user.id && x.schoolId === user.schoolId) : undefined;
          if (finished && accessEnded(finished)) return { ok: false, error: finished.alumniAccessUntil ? `Your access ended on ${fmtDateLong(finished.alumniAccessUntil)}, after you completed school. Contact the school for your records.` : "You've completed school, so this account is closed. Contact the school for your records." };
          if (user.status === "disabled") return { ok: false, error: "This account has been disabled. Contact your administrator." };
          const school = user.schoolId ? get().schools.find((s) => s.id === user.schoolId) : null;
          if (school && (school.status === "suspended" || school.status === "archived")) return { ok: false, error: `${school.name} is currently ${school.status}. Contact the platform administrator.` };
          // Parents can sign in only where the platform turned parent access on for the school (spec section 22.3).
          if (school && user.roleId === "role_guardian" && !school.parentAccess) return { ok: false, error: `Parent access isn't available at ${school.name}. Contact the school.` };
          set((s) => ({
            userId: user.id,
            actingSchoolId: null,
            workspaceSchoolId: null,
            users: s.users.map((u) => (u.id === user.id ? { ...u, lastActive: new Date().toISOString(), status: u.status === "invited" ? "active" : u.status } : u)),
          }));
          tabUser.set(user.id);
          return { ok: true, userId: user.id };
        },
        logout: () => {
          tabUser.set(null);
          set({ userId: null, actingSchoolId: null, workspaceSchoolId: null });
        },
        setActingSchool: (schoolId) => set({ actingSchoolId: schoolId }),
        setSession: (schoolId, sessionId) => set((s) => ({ sessionBySchool: { ...s.sessionBySchool, [schoolId]: sessionId } })),
        setWorkspace: (workspaceSchoolId) => set({ workspaceSchoolId }),
        setPassword: (userId, password) => set((s) => ({ passwords: { ...s.passwords, [userId]: password } })),

        // New users get a platform username and new students a WAEC-prefixed school username (spec section 10.1).
        insert: (key, item) => write((s) => ({ [key]: [...(s[key] as unknown[]), ...withIdentities(key, [item], s)] }) as Partial<DB>),
        insertMany: (key, items) => write((s) => ({ [key]: [...(s[key] as unknown[]), ...withIdentities(key, items, s)] }) as Partial<DB>),
        update: (key, id, patch) =>
          write((s) => ({ [key]: (s[key] as { id: string }[]).map((x) => (x.id === id ? { ...x, ...patch } : x)) }) as Partial<DB>),
        remove: (key, id) => write((s) => ({ [key]: (s[key] as { id: string }[]).filter((x) => x.id !== id) }) as Partial<DB>),
        removeWhere: (key, pred) =>
          write((s) => ({ [key]: (s[key] as Item<typeof key>[]).filter((x) => !pred(x)) }) as Partial<DB>),
        mutate: (fn) => write(fn),
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
          // Graduates look back without leaving progress behind (spec section 22.4).
          if (get().students.find((x) => x.id === studentId)?.status === "graduated") return;
          write((s) => ({ progress: [...s.progress, { studentId, contentId, completedAt: new Date().toISOString() }] }));
        },

        resetDemo: () => set({ ...createSeed(), ...initialAuth }),
      };
    },
    {
      name: "classproject-prototype",
      version: DB_VERSION,
      // IndexedDB rather than localStorage: the demo database is several MB,
      // close to localStorage's ~5 MB quota, and IndexedDB writes don't block.
      storage: createJSONStorage(() => idbStorage),
      // A schema bump discards old data instead of trying to migrate mock records.
      migrate: () => ({ ...createSeed(), ...initialAuth }) as unknown as Store,
      // This tab's own sign-in wins over the one another tab saved last.
      merge: (persisted, current) => {
        const merged = { ...current, ...(persisted as Partial<Store>) };
        const mine = tabUser.get();
        if (mine && merged.users.some((u) => u.id === mine)) merged.userId = mine;
        return merged;
      },
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

/**
 * Access changes reach every open tab at once (spec section 9): when a Super
 * Administrator edits a role's permissions, assigns a role, disables a user
 * or changes a teacher's rights, the other tabs of this browser update
 * immediately instead of keeping the old permissions until a reload. In
 * production the server enforces permissions and pushes these changes.
 */
if (typeof window !== "undefined" && typeof BroadcastChannel !== "undefined") {
  const channel = new BroadcastChannel("classproject-access");
  type AccessPatch = Partial<Pick<Store, "roles" | "users" | "teachers">>;
  let applying = false;
  channel.onmessage = (e: MessageEvent<AccessPatch>) => {
    applying = true;
    useStore.setState(e.data);
    applying = false;
  };
  const start = () =>
    useStore.subscribe((s, prev) => {
      if (applying) return;
      const patch: AccessPatch = {};
      if (s.roles !== prev.roles) patch.roles = s.roles;
      if (s.users !== prev.users) patch.users = s.users;
      if (s.teachers !== prev.teachers) patch.teachers = s.teachers;
      if (Object.keys(patch).length) channel.postMessage(patch);
    });
  // Only changes made after loading are shared, so a tab never pushes the stored copy over a newer one.
  if (useStore.persist?.hasHydrated()) start();
  else useStore.persist?.onFinishHydration(() => start());
}

"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Goal, IssuedCredential, Mastery, PathStep, ProjectSubmission, TutorMessage } from "@/lib/types";

/**
 * The prototype's "backend": one learner's state, persisted in this browser
 * (localStorage). Screens read it with useOpen() and change it through
 * lib/learning.ts, which maps to the API calls of spec section 10.2.
 */

export type PersonaId = "kwesi" | "ama" | "new" | "mensah";

export interface Profile {
  name: string;
  handle: string;
  role: "learner" | "instructor";
  /** Age band drives the under-18 rules (spec FR-ID-4, decision D12). */
  ageBand: "adult" | "teen";
  guardian: "not_needed" | "pending" | "granted";
  country: string;
  hoursPerWeek: number;
  preferredDays: string[];
  connectivity: "slow" | "moderate" | "fast";
  dataSaver: boolean;
  aiTutor: boolean;
  aiPractice: boolean;
  personalisation: boolean;
  portfolioPublic: boolean;
  notifications: "instant" | "daily" | "weekly" | "off";
  /** Arrived from a partner (ClassProject) with a subject and level (spec section 25). */
  fromPartner?: { partner: "classproject"; subject?: string; level?: string };
}

export interface ActivityProgress {
  done: boolean;
  at: string;
  watchedPct?: number;
  resumeAt?: number;
  score?: number;
}

export interface Note {
  id: string;
  activityId: string;
  at?: number;
  text: string;
  createdAt: string;
}

export interface HelpRequest {
  id: string;
  activityId: string;
  question: string;
  at: string;
  status: "open" | "answered";
  answer?: string;
}

export interface Draft {
  id: string;
  courseSlug: string;
  kind: "practice_question" | "summary" | "rubric" | "alt_text";
  title: string;
  content: string;
  status: "draft" | "approved" | "rejected";
  createdAt: string;
}

export interface QualityFlag {
  id: string;
  courseSlug: string;
  kind: "ambiguous_item" | "broken_link" | "learner_confusion" | "accessibility" | "outdated";
  target: string;
  detail: string;
  source: "psychometrics" | "ai" | "learner_report" | "system";
  status: "open" | "fixed" | "dismissed";
}

export interface OpenState {
  version: number;
  persona: PersonaId | null;
  profile: Profile | null;
  goals: Goal[];
  activeGoal: string | null;
  path: PathStep[];
  planDeadline: string | null;
  planStartedAt: string | null;
  enrollments: Record<string, { at: string; source: "self" | "path" | "partner_referral" }>;
  progress: Record<string, ActivityProgress>;
  checks: Record<string, { pct: number; at: string }>;
  mastery: Record<string, Mastery>;
  review: Record<string, { due: string; interval: number; reps: number }>;
  notes: Note[];
  tutor: Record<string, TutorMessage[]>;
  submissions: Record<string, ProjectSubmission>;
  credentials: IssuedCredential[];
  downloads: Record<string, "saved">;
  dismissed: string[];
  helpRequests: HelpRequest[];
  referrals: { subject?: string; level?: string; course?: string; at: string }[];
  /** Simulated connectivity for the offline-first demo (spec section 7.6). */
  offline: boolean;
  pendingSync: number;
  drafts: Draft[];
  flags: QualityFlag[];
}

export const STATE_VERSION = 3;

export const EMPTY: OpenState = {
  version: STATE_VERSION,
  persona: null,
  profile: null,
  goals: [],
  activeGoal: null,
  path: [],
  planDeadline: null,
  planStartedAt: null,
  enrollments: {},
  progress: {},
  checks: {},
  mastery: {},
  review: {},
  notes: [],
  tutor: {},
  submissions: {},
  credentials: [],
  downloads: {},
  dismissed: [],
  helpRequests: [],
  referrals: [],
  offline: false,
  pendingSync: 0,
  drafts: [],
  flags: [],
};

export const useOpen = create<OpenState>()(
  persist(() => EMPTY, {
    name: "classproject-open",
    version: STATE_VERSION,
    migrate: () => EMPTY,
  }),
);

/** Replaces part of the state; while "offline", counts the change as waiting to sync. */
export function setOpen(patch: Partial<OpenState> | ((s: OpenState) => Partial<OpenState>), countsAsChange = true) {
  useOpen.setState((s) => {
    const p = typeof patch === "function" ? patch(s) : patch;
    return s.offline && countsAsChange ? { ...p, pendingSync: s.pendingSync + 1 } : p;
  });
}

/** True once the persisted state has loaded (avoids a flash of the signed-out view). */
export function useHydrated() {
  return useSyncExternalStore(
    (cb) => useOpen.persist.onFinishHydration(cb),
    () => useOpen.persist.hasHydrated(),
    () => false,
  );
}

export const uid = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;

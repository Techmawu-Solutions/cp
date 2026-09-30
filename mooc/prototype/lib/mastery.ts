import type { Evidence, EvidenceSource, Mastery, SkillState } from "@/lib/types";

/**
 * Mastery model (spec section 14.4, section 15.3): Bayesian knowledge tracing per skill,
 * blended by how much each source of evidence should count, and a visible
 * state machine — Exposed → Understood → Applied → Verified. Watching never
 * moves a skill past Exposed; AI-generated practice never past Understood.
 */

/** How much each kind of evidence counts, and the highest state it can reach. */
export const EVIDENCE: Record<EvidenceSource, { weight: number; cap: SkillState; label: string }> = {
  exposure: { weight: 0, cap: "exposed", label: "Watched or read" },
  ai_practice: { weight: 0.3, cap: "understood", label: "AI-generated practice" },
  practice: { weight: 0.6, cap: "understood", label: "Practice" },
  review: { weight: 0.6, cap: "understood", label: "Spaced review" },
  quiz: { weight: 0.6, cap: "understood", label: "Quiz" },
  video_question: { weight: 0.4, cap: "understood", label: "In-video question" },
  diagnostic: { weight: 0.7, cap: "understood", label: "Diagnostic" },
  project_peer: { weight: 0.8, cap: "applied", label: "Project (peer-reviewed)" },
  project_instructor: { weight: 1, cap: "verified", label: "Project (instructor-assessed)" },
  mastery_check: { weight: 1, cap: "verified", label: "Mastery check" },
};

const ORDER: SkillState[] = ["not_started", "exposed", "understood", "applied", "verified"];
export const stateRank = (s: SkillState) => ORDER.indexOf(s);
export const atLeast = (s: SkillState, min: SkillState) => stateRank(s) >= stateRank(min);

export const STATE_LABEL: Record<SkillState, string> = {
  not_started: "Not started",
  exposed: "Exposed",
  understood: "Understood",
  applied: "Applied",
  verified: "Verified",
};

/** Learner-facing meaning of each state (brief section 5: watched / understand / can apply). */
export const STATE_MEANING: Record<SkillState, string> = {
  not_started: "Not started yet",
  exposed: "I watched or read it",
  understood: "I understand it",
  applied: "I can apply it",
  verified: "I've proved it",
};

const BKT = { prior: 0.2, learn: 0.15, slip: 0.1, guess: 0.2 };

export const emptyMastery = (): Mastery => ({ p: BKT.prior, state: "not_started", evidence: [] });

/** Applies one observation and returns the updated mastery. */
export function applyEvidence(m: Mastery | undefined, source: EvidenceSource, outcome: number, label: string, at = new Date().toISOString()): Mastery {
  const cur = m ?? emptyMastery();
  const { weight, cap } = EVIDENCE[source];
  let p = cur.p;
  if (weight > 0) {
    // BKT posterior for a correct / incorrect observation, then learning.
    const correct = outcome >= 0.5;
    const post = correct ? (p * (1 - BKT.slip)) / (p * (1 - BKT.slip) + (1 - p) * BKT.guess) : (p * BKT.slip) / (p * BKT.slip + (1 - p) * (1 - BKT.guess));
    const learned = post + (1 - post) * BKT.learn;
    p = Math.min(0.999, Math.max(0.01, p + weight * (learned - p)));
  }
  const evidence: Evidence = { id: `ev_${Math.random().toString(36).slice(2, 10)}`, at, source, weight, outcome, label };
  const all = [evidence, ...cur.evidence].slice(0, 40);
  return { p, evidence: all, state: deriveState(p, all, cap, cur.state) };
}

function deriveState(p: number, evidence: Evidence[], cap: SkillState, previous: SkillState): SkillState {
  // Highest state the evidence supports.
  // Exposed means the learner has actually met the material — a failed diagnostic alone isn't exposure.
  let best: SkillState = evidence.some((e) => e.source === "exposure" || e.outcome >= 0.5) ? "exposed" : "not_started";
  const strong = (src: EvidenceSource[]) => evidence.some((e) => src.includes(e.source) && e.outcome >= 0.7);
  if (p >= 0.7 && evidence.some((e) => e.weight > 0 && e.outcome >= 0.5)) best = "understood";
  if (p >= 0.7 && strong(["project_peer", "project_instructor"])) best = "applied";
  if (p >= 0.75 && strong(["project_instructor", "mastery_check"])) best = "verified";
  // A single weak source can't lift a skill past its cap, but never demotes earned states either
  // (decay of Verified is handled separately in production).
  const capped = stateRank(best) > stateRank(cap) && !strong(["project_peer", "project_instructor", "mastery_check"]) ? cap : best;
  return stateRank(capped) >= stateRank(previous) ? capped : p < 0.5 && stateRank(previous) <= stateRank("understood") ? capped : previous;
}

/** Share of a set of skills at or above a state (for progress to a goal). */
export function coverage(mastery: Record<string, Mastery>, skills: string[], min: SkillState = "understood") {
  if (!skills.length) return 0;
  return skills.filter((s) => atLeast(mastery[s]?.state ?? "not_started", min)).length / skills.length;
}

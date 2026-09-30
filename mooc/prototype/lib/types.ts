/**
 * ClassProject Open prototype — domain types. They mirror the spec's domain
 * model (§9) and the database (mooc/database/schema.sql) in a simplified form,
 * so screens are built against the real concepts: skills, evidence, mastery,
 * objectives, activities, credentials.
 */

/** Mastery states shown to learners (spec §14.4, FR-AD-3). */
export type SkillState = "not_started" | "exposed" | "understood" | "applied" | "verified";

export interface Skill {
  id: string;
  name: string;
  domain: string;
  description: string;
  prereqs: string[];
}

export interface Competency {
  id: string;
  name: string;
  skills: string[];
}

export interface Career {
  id: string;
  name: string;
  tagline: string;
  description: string;
  competencies: string[];
  /** Courses in path order. */
  courses: string[];
  projects: string[];
  credential: string;
  /** Honest framing: evidence of readiness, not a job promise (brief §28). */
  roles: string[];
}

export type Bloom = "remember" | "understand" | "apply" | "analyse" | "evaluate" | "create";

export interface Objective {
  id: string;
  text: string;
  bloom: Bloom;
  skills: string[];
}

export type ActivityKind = "video" | "reading" | "practice" | "project" | "mastery_check";

export interface TranscriptLine {
  /** Seconds from the start. */
  t: number;
  text: string;
}

export interface Activity {
  id: string;
  kind: ActivityKind;
  title: string;
  minutes: number;
  objectives: string[];
  skills: string[];
  /** video */
  transcript?: TranscriptLine[];
  chapters?: { t: number; title: string }[];
  /** A question the player pauses on (FR-VP-4). */
  videoQuestion?: { at: number; itemId: string };
  /** Slides the simulated video shows, one per chapter. */
  slides?: { title: string; points: string[] }[];
  /** reading (light Markdown: ## headings, - bullets, **bold**, `code`) */
  body?: string;
  /** practice / mastery check */
  itemIds?: string[];
  projectId?: string;
  /** "Another example" answers for the tutor (labelled AI explanation). */
  examples?: string[];
}

export interface Lesson {
  id: string;
  title: string;
  concepts: string[];
  activities: Activity[];
}

export interface CourseModule {
  id: string;
  title: string;
  lessons: Lesson[];
}

export interface Course {
  slug: string;
  title: string;
  subtitle: string;
  provider: string;
  instructor: string;
  level: "beginner" | "intermediate" | "advanced";
  hours: number;
  weeks: number;
  free: boolean;
  /** Price in the learner's price book, when premium. */
  priceGhs?: number;
  offline: boolean;
  sizeMb: number;
  languages: string[];
  /** ClassProject catalogue subject codes (partner link, spec §25). */
  subjects: string[];
  topic: string;
  schoolLevels?: [string, string];
  minAge: number;
  secondaryFriendly: boolean;
  exam?: "WASSCE" | "BECE";
  skills: string[];
  objectives: Objective[];
  prerequisites: string;
  assessment: string[];
  credential?: string;
  lastUpdated: string;
  version: string;
  accessibility: { captions: boolean; transcripts: boolean; screenReaderTested: boolean; audioOnly: boolean };
  summary: string;
  modules: CourseModule[];
  masteryRate: number;
  learners: number;
  /** Fully authored in the prototype (vs. outline-only sample content). */
  authored: boolean;
}

export interface Item {
  id: string;
  skill: string;
  type: "mcq" | "numeric";
  stem: string;
  options?: string[];
  /** Index for mcq; the number (as a string) for numeric. */
  answer: string;
  tolerance?: number;
  /** Hint ladder: nudge → strategy → worked step (FR-AI-2). */
  hints: [string, string, string];
  explanation: string;
  difficulty: 1 | 2 | 3;
  /** Where the answer is taught — the tutor cites it. */
  source: { courseSlug: string; activityId: string };
}

export interface RubricCriterion {
  id: string;
  title: string;
  skill: string;
  max: number;
  levels: string[];
}

export interface Project {
  id: string;
  title: string;
  career?: string;
  courseSlug?: string;
  brief: string;
  requirements: string[];
  resources: string[];
  milestones: string[];
  rubric: RubricCriterion[];
}

export type CredentialCriterion =
  | { kind: "skill_state"; skill: string; min: Exclude<SkillState, "not_started" | "exposed"> }
  | { kind: "mastery_check"; courseSlug: string; minPct: number }
  | { kind: "project"; projectId: string };

export interface CredentialDef {
  id: string;
  name: string;
  kind: "certificate" | "competency" | "badge";
  issuer: string;
  description: string;
  criteria: CredentialCriterion[];
  skills: string[];
}

// ------------------------------------------------------------------ learner state

export type EvidenceSource =
  | "exposure"
  | "ai_practice"
  | "practice"
  | "quiz"
  | "video_question"
  | "diagnostic"
  | "review"
  | "project_peer"
  | "project_instructor"
  | "mastery_check";

export interface Evidence {
  id: string;
  at: string;
  source: EvidenceSource;
  weight: number;
  /** 0–1 */
  outcome: number;
  label: string;
}

export interface Mastery {
  p: number;
  state: SkillState;
  evidence: Evidence[];
}

export interface IssuedCredential {
  code: string;
  defId: string;
  issuedAt: string;
  evidence: string[];
  status: "active" | "revoked";
}

export interface PeerReview {
  reviewer: string;
  calibration: number;
  scores: Record<string, number>;
  comment: string;
}

export interface ProjectSubmission {
  projectId: string;
  revision: number;
  summary: string;
  link: string;
  submittedAt: string;
  status: "draft" | "in_review" | "passed" | "revision_requested";
  milestonesDone: number;
  reviews: PeerReview[];
  aiFeedback?: string;
  instructorScores?: Record<string, number>;
  finalPct?: number;
}

export interface TutorMessage {
  role: "learner" | "tutor";
  text: string;
  label?: "course_content" | "ai_explanation" | "external_knowledge" | "hint" | "cant_find";
  citation?: { activityId: string; title: string };
}

export interface Goal {
  id: string;
  kind: "career" | "skill" | "exam" | "curiosity";
  label: string;
  careerId?: string;
  skills: string[];
  deadline?: string;
  createdAt: string;
}

export interface PathStep {
  kind: "course" | "project" | "credential";
  ref: string;
  reason: string;
  /** Skills the diagnostic showed the learner already has (skipped). */
  skipped?: string[];
}

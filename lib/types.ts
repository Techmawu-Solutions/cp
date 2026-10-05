import type { GraphSpec } from "@/lib/graph-math";
/**
 * Core data entities (spec sections 58–60).
 *
 * Every tenant-owned record carries `schoolId`; every academic record also
 * carries `sessionId` so data from different academic years never mixes
 * (spec section 7, section 60). The mock store is shaped the way the future Laravel API
 * will respond, so swapping it for real endpoints is a data-layer change only.
 */

export type ID = string;

export type SchoolStatus = "active" | "suspended" | "pending" | "archived";
/** School category (level). "Primary" is shown as "Basic School (Primary 1–6)". */
export type SchoolType = "SHS" | "JHS" | "Primary" | "TVET" | "College" | "University";
/** Public (government) or private school — spec section 5. */
export type SchoolOwnership = "public" | "private";

/**
 * A country the platform serves (spec section 4.1). Each names its own first- and
 * second-level divisions: Region / District in Ghana, State / LGA in Nigeria.
 */
export interface Country {
  id: ID;
  /** ISO 3166-1 alpha-2, e.g. GH. */
  code: string;
  name: string;
  /** ISO 4217, e.g. GHS. */
  currency: string;
  regionLabel: string;
  districtLabel: string;
}

export interface Region {
  id: ID;
  countryId: ID;
  name: string;
  capital: string;
}

export interface District {
  id: ID;
  regionId: ID;
  name: string;
}

export interface School {
  id: ID;
  name: string;
  shortName: string;
  /** Category / level: SHS, JHS, Basic School (Primary 1–6)… */
  type: SchoolType;
  ownership: SchoolOwnership;
  /** Defaults to the country of the school's region; Ghana when neither is set (spec section 4.1). */
  countryId?: ID;
  waecCode: string;
  emisCode: string;
  regionId: ID;
  districtId: ID;
  address: string;
  phone: string;
  email: string;
  website?: string;
  logoColor: string;
  /** Uploaded logo as a data URL (production: a storage URL). Shown in place of the initials badge. */
  logoUrl?: string;
  /** Interface colours chosen by the school (spec section 5.2 branding). */
  branding?: SchoolBranding;
  /** What students may download. Recordings default to watch-only. */
  contentProtection?: ContentProtection;
  status: SchoolStatus;
  dateOnboarded: string;
  /** "semester" (2 per year) or "term" (3 per year) — spec section 6.3 */
  sessionStructure: SessionType;
  /** The platform-run Vacation Classes workspace is a tenant of kind "vacation" (spec section 49.1). */
  kind?: "school" | "vacation";
  /** Vacation Classes: SMS a student's guardian when they miss or leave a live class (spec section 49.1.8). */
  guardianAlerts?: GuardianAlertSettings;
  /**
   * Parents and guardians may sign in and follow their wards (spec section 22.3).
   * Set by the Super Administrator when the school is onboarded; the school cannot change it.
   * Undefined means off.
   */
  parentAccess?: boolean;
  /**
   * Headline counts for schools whose individual records aren't loaded in the
   * prototype. National/regional analytics aggregate these; the demo tenants
   * compute theirs from real records instead.
   */
  stats: SchoolStats;
}

export interface GuardianAlertSettings {
  enabled: boolean;
  /** Text the guardian if the student hasn't joined this many minutes after the class started. */
  lateAfterMinutes: number;
  /** Text the guardian if the student leaves and stays away this many minutes while the class is still on. */
  awayMinutes: number;
}

export interface SchoolBranding {
  /** Buttons, links and highlights, as #rrggbb. */
  primary?: string;
  /** Sidebar background, as #rrggbb; unset keeps the default light/dark sidebar. */
  sidebar?: string;
}

export interface ContentProtection {
  /** Students may download class recordings (default false: watch on the platform only). */
  recordingDownloads: boolean;
  /** Teachers may download their class recordings (default false: watch-only, unless allowed per teacher or by role). */
  teacherRecordingDownloads?: boolean;
  /** Students may download course documents (default true). */
  documentDownloads: boolean;
}

export interface SchoolStats {
  students: number;
  teachers: number;
  activeStudents: number;
  activeTeachers: number;
  liveClasses: number;
  assignments: number;
  quizzes: number;
  engagement: number;
}

export type SessionType = "semester" | "term" | "vacation";
export type SessionStatus = "active" | "upcoming" | "closed";

export interface AcademicYear {
  id: ID;
  schoolId: ID;
  name: string; // "2026/2027"
  startDate: string;
  endDate: string;
}

export interface AcademicSession {
  id: ID;
  schoolId: ID;
  academicYearId: ID;
  type: SessionType;
  name: string; // "Semester 1" / "Term 2"
  startDate: string;
  endDate: string;
  status: SessionStatus;
  /** Vacation Classes run in batches (cohorts); each batch is one session of the vacation workspace. */
  batch?: VacationBatch;
}

/** A vacation batch (spec section 49.1.7): registration window and, once closed, how it was wound up. */
export interface VacationBatch {
  number: number;
  /** Registration window (YYYY-MM-DD); registration is open between these dates. */
  registrationOpens?: string;
  registrationCloses?: string;
  closeout?: BatchCloseout;
}

export interface BatchCloseout {
  closedAt: string;
  closedBy: string;
  /** Students keep read-only access to this batch (recordings, grades) until then; null = no time limit. */
  accessUntil: string | null;
  studentsCompleted: number;
  unpaidCancelled: number;
  teachersReleased: number;
  teachersDeactivated: number;
  reportsSent: boolean;
  /** Batch whose registration the students were invited to. */
  invitedTo?: ID;
}

export type RecordStatus = "active" | "inactive";

/**
 * Platform catalogue (spec section 17.1): the programmes and subjects schools select
 * from, so names and codes are consistent across every tenant.
 */
/** Each country has its own catalogue (spec section 17.1); undefined means Ghana, the first country. */
export interface CatalogueProgramme {
  id: ID;
  countryId?: ID;
  name: string;
  code: string;
  description: string;
  active: boolean;
}

export interface CatalogueSubject {
  id: ID;
  countryId?: ID;
  name: string;
  code: string;
  description: string;
  category: "core" | "elective";
  /** Catalogue programme codes this elective usually belongs to. */
  programmeCodes: string[];
  active: boolean;
}

/** A school's request for a programme/subject missing from the catalogue (spec section 17.2). */
export interface CatalogueRequest {
  id: ID;
  kind: "programme" | "subject";
  name: string;
  code: string;
  description: string;
  reason: string;
  schoolId: ID;
  requestedBy: ID; // user ID
  status: "pending" | "approved" | "declined";
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: ID;
  note?: string;
  catalogueId?: ID;
}

export interface Programme {
  id: ID;
  schoolId: ID;
  sessionId: ID;
  catalogueId?: ID;
  name: string;
  code: string;
  description: string;
  status: RecordStatus;
}

export interface SchoolClass {
  id: ID;
  schoolId: ID;
  sessionId: ID;
  programmeId: ID;
  name: string;
  level: string;
  classTeacherId?: ID;
  capacity: number;
  status: RecordStatus;
}

export interface Subject {
  id: ID;
  schoolId: ID;
  sessionId: ID;
  catalogueId?: ID;
  programmeId?: ID;
  name: string;
  code: string;
  description: string;
  color: string;
}

/** Teacher ↔ subject ↔ class (spec section 20). One row per class taught. */
export interface TeachingAssignment {
  id: ID;
  schoolId: ID;
  sessionId: ID;
  subjectId: ID;
  classId: ID;
  teacherId: ID;
}

export type RoleKey = "super_admin" | "school_admin" | "teacher" | "student" | string;

export interface Role {
  id: ID;
  key: RoleKey;
  name: string;
  description: string;
  /** Built-in roles can have permissions edited but cannot be deleted. */
  system: boolean;
  /** Platform roles are not scoped to a school. */
  scope: "platform" | "school";
  permissions: string[];
}

export interface User {
  id: ID;
  name: string;
  email: string;
  /**
   * Platform username — generated by the system, unique platform-wide and never
   * changed; other products integrate against it (spec section 10.1). Filled in by the
   * store on insert.
   */
  username?: string;
  phone?: string;
  /** Every user has exactly one role (spec section 9). */
  roleId: ID;
  /** null for platform-level users (Super Admin, national officers). */
  schoolId: ID | null;
  status: "active" | "invited" | "disabled";
  /** Email alerts (e.g. a live class starting). Undefined means on. */
  emailNotifications?: boolean;
  lastActive?: string;
  avatarColor: string;
}

export type Gender = "M" | "F";

export interface Student {
  id: ID;
  userId: ID;
  schoolId: ID;
  studentNumber: string;
  /** School username: WAEC code, sequence within the admission year and the year, e.g. 0010712-0042-26 (matches the Student ID when that uses the WAEC code). Absent until the school has a WAEC code (spec section 10.1). */
  schoolUsername?: string;
  firstName: string;
  lastName: string;
  gender: Gender;
  dateOfBirth: string;
  guardianName: string;
  guardianPhone: string;
  /** 10-digit JHS (BECE) index number. */
  jhsIndexNumber?: string;
  /** Year the student was admitted, e.g. 2026. */
  admissionYear?: number;
  /** JHS index + two-digit admission year (12 digits); unique platform-wide (lib/students.ts). */
  indexNumber?: string;
  status: "active" | "withdrawn" | "graduated";
  /**
   * ClassProject Open recommendations (spec section 49.2): catalogue subject codes the
   * student is curious about beyond their own subjects, and own subjects they
   * don't want recommendations for.
   */
  moocInterests?: string[];
  moocHidden?: string[];
  createdAt: string;
}

export type GuardianRelationship = "mother" | "father" | "guardian" | "other";

/** A parent or guardian account linked to a student (spec section 22.3). One account can follow several wards. */
export interface GuardianLink {
  id: ID;
  schoolId: ID;
  /** The parent's user account (role "guardian"). */
  guardianUserId: ID;
  studentId: ID;
  relationship: GuardianRelationship;
  createdAt: string;
}

/** Student ↔ class placement for a given session. */
export interface ClassPlacement {
  id: ID;
  schoolId: ID;
  sessionId: ID;
  studentId: ID;
  classId: ID;
}

export interface Teacher {
  id: ID;
  userId: ID;
  schoolId: ID;
  /** Staff ID collected from the teacher; also a sign-in name (spec section 10.1). */
  staffNumber: string;
  title: "Mr." | "Mrs." | "Ms." | "Dr." | "Rev.";
  firstName: string;
  lastName: string;
  gender: Gender;
  specialization: string;
  phone: string;
  status: "active" | "on_leave" | "inactive";
  /** Granted by a school administrator: this teacher may download class recordings (default: watch-only). */
  canDownloadRecordings?: boolean;
}

/** Student subject registration (spec section 21). */
export interface Enrollment {
  id: ID;
  schoolId: ID;
  sessionId: ID;
  studentId: ID;
  classId: ID;
  subjectId: ID;
  enrolledAt: string;
}

/** A course is one subject taught to one class in one session (spec section 24). */
export interface Course {
  id: ID;
  schoolId: ID;
  sessionId: ID;
  subjectId: ID;
  classId: ID;
  teacherId: ID;
  title: string;
  description: string;
  /** What the teacher calls the course's sections (Moodle-style). Defaults to "Section". */
  sectionLabel?: SectionLabel;
}

export type SectionLabel = "Section" | "Module" | "Topic" | "Week" | "Unit";

/** A course section (Moodle's "section" / "topic"): a titled group of content items. */
export interface CourseModule {
  id: ID;
  courseId: ID;
  title: string;
  description: string;
  order: number;
  published: boolean;
  /** With `published`, students see it only from this time (scheduled release). */
  availableFrom?: string;
}

export type ContentType =
  | "text"
  | "video"
  | "pdf"
  | "ebook"
  | "presentation"
  | "assignment"
  | "quiz"
  | "assessment"
  | "link"
  | "file"
  | "live"
  | "recording"
  | "scorm";

export interface ContentItem {
  id: ID;
  moduleId: ID;
  courseId: ID;
  type: ContentType;
  title: string;
  description: string;
  body?: string;
  url?: string;
  fileName?: string;
  fileSize?: number;
  durationMinutes?: number;
  /** Links an item to an Assessment / LiveSession / Recording record. */
  refId?: ID;
  order: number;
  published: boolean;
  /** With `published`, students see it only from this time (scheduled release). */
  availableFrom?: string;
  /** SCORM package details, for type "scorm" (spec section 26.2). */
  scorm?: ScormPackageInfo;
  /** The video asset behind a video lesson that has (or had) interactive questions (spec section 26.3). */
  videoId?: ID;
  /**
   * The teacher's learning outcomes and learning indicators for this lesson
   * (spec section 25.2). For teachers and administrators only — never shown to students.
   */
  learningOutcomes?: string[];
  learningIndicators?: string[];
  /** When the outcomes/indicators were last saved, and by which user. */
  outcomesUpdatedAt?: string;
  outcomesUpdatedBy?: ID;
  createdAt: string;
}

/**
 * The ClassProject library (spec section 25.3): learning materials the Super
 * Administrator publishes for a catalogue subject at one level. Every class at
 * that level taking the subject — in every school — sees them inside its course.
 */
export interface LibraryTopic {
  id: ID;
  /** Catalogue subject code, e.g. "MATH" (spec section 17.1). */
  subjectCode: string;
  /** Level code: BASIC1–BASIC6, JHS1–JHS3, SHS1–SHS3. */
  level: string;
  title: string;
  description: string;
  order: number;
  published: boolean;
  createdAt: string;
}

export type LibraryMaterialType = "text" | "video" | "pdf" | "presentation" | "ebook" | "link" | "file";

export interface LibraryMaterial {
  id: ID;
  topicId: ID;
  type: LibraryMaterialType;
  title: string;
  description: string;
  body?: string;
  url?: string;
  fileName?: string;
  fileSize?: number;
  durationMinutes?: number;
  order: number;
  published: boolean;
  createdAt: string;
  createdBy?: ID;
}

/** A SCORM 1.2 / 2004 package as read from its imsmanifest.xml (spec section 26.2). */
export interface ScormPackageInfo {
  version: "1.2" | "2004";
  versionLabel: string;
  identifier: string;
  scos: { id: string; title: string; href: string; isAsset?: boolean; masteryScore?: number; scaledPassingScore?: number; completionThreshold?: number; launchData?: string }[];
}

/**
 * One learner's SCORM run-time data for one SCO (spec section 26.2): the full CMI data
 * model as the package set it, plus the headline results the platform reports.
 */
export interface ScormAttempt {
  id: ID;
  contentId: ID;
  courseId: ID;
  schoolId: ID;
  studentId: ID;
  userId: ID;
  scoId: string;
  version: "1.2" | "2004";
  /** CMI element → value, exactly as stored by the SCO (cmi.core.lesson_status, cmi.suspend_data…). */
  cmi: Record<string, string>;
  /** Normalised results. */
  completion: "not attempted" | "incomplete" | "completed" | "unknown";
  success: "passed" | "failed" | "unknown";
  /** 0–100 when the SCO reported a score. */
  scorePercent?: number;
  totalSeconds: number;
  sessions: number;
  firstLaunchedAt: string;
  updatedAt: string;
  completedAt?: string;
}

export type AssessmentType = "quiz" | "assignment" | "test" | "project" | "examination";
export type QuestionType =
  | "mcq"
  | "multi_select"
  | "true_false"
  | "fill_blank"
  | "numeric"
  | "matching"
  | "ordering"
  | "drag_words"
  | "short_answer"
  | "long_answer"
  | "essay"
  | "file";

/** See lib/questions.ts for how each type is answered and marked. */
export interface Question {
  id: ID;
  type: QuestionType;
  prompt: string;
  marks: number;
  /** Choices (mcq, multi_select), or the items in their correct order (ordering). */
  options?: string[];
  /** Index into options for mcq; "true"/"false"; text for short/fill ("a|b" accepts either); a number for numeric. */
  answer?: string;
  /** Correct option indices (multi_select) or the word for each blank, in order (drag_words). */
  answers?: string[];
  /** Extra wrong words in the word bank (drag_words). */
  distractors?: string[];
  /** Accepted ± difference for numeric answers. */
  tolerance?: number;
  /** Picture shown with the question (data URL in the prototype; a storage URL in production). */
  image?: string;
  /** Description of the picture for screen readers. */
  imageAlt?: string;
  /** Picture for each option (mcq, multi_select), parallel to `options`; an option may be picture-only. */
  optionImages?: (string | null)[];
  pairs?: { left: string; right: string }[];
}

export interface Assessment {
  id: ID;
  schoolId: ID;
  sessionId: ID;
  courseId: ID;
  subjectId: ID;
  classId: ID;
  teacherId: ID;
  title: string;
  description: string;
  type: AssessmentType;
  totalMarks: number;
  durationMinutes?: number;
  dueDate: string;
  status: "draft" | "published" | "closed";
  questions: Question[];
  /** Each student sees the questions in their own order. */
  shuffleQuestions?: boolean;
  /** Each student sees multiple choice / multiple select options in their own order. */
  shuffleOptions?: boolean;
  /** Set when this grade item records the score of a SCORM package (spec section 26.2); it has no questions of its own. */
  scormContentId?: ID;
  createdAt: string;
}

export interface Submission {
  id: ID;
  assessmentId: ID;
  studentId: ID;
  submittedAt: string;
  answers: Record<ID, string>;
  fileName?: string;
  text?: string;
  /** Auto-marked score for objective questions; null until graded. */
  score: number | null;
  feedback?: string;
  gradedAt?: string;
  status: "submitted" | "graded" | "late";
}

export type LiveStatus = "scheduled" | "live" | "ended" | "cancelled";

export interface LiveSession {
  id: ID;
  schoolId: ID;
  sessionId: ID;
  courseId: ID;
  subjectId: ID;
  classId: ID;
  teacherId: ID;
  title: string;
  /** What the class covers and how students should prepare (shown in the lobby and class lists). */
  description?: string;
  scheduledAt: string;
  /** Planned length; the scheduler sets it from the chosen start and end times. */
  durationMinutes: number;
  status: LiveStatus;
  startedAt?: string;
  endedAt?: string;
  recordingId?: ID;
  waitingRoom: boolean;
  /** What members (students) may do in the room; the host can change these during class. Defaults: both allowed. */
  controls?: LiveControls;
  /** Users the host removed. They can't rejoin until the host lets them back in. */
  removedUserIds?: ID[];
  /** Breaks taken during the class. Not counted in class length, recording or attendance minutes. */
  pauses?: { from: string; to: string }[];
  /** Set while the class is paused for a break; `pausedUntil` is when the teacher expects to resume. */
  pausedAt?: string | null;
  pausedUntil?: string | null;
  /** A class continued in several sittings: part number, and the part it continues. */
  part?: number;
  continuationOf?: ID;
  continuedBy?: ID;
  /** Breakout rounds held during the class. */
  breakouts?: { startedAt: string; endedAt: string; groups: number }[];
}

export interface LiveControls {
  /** Members may turn their camera on. Turning this off stops every member's video. */
  allowVideo: boolean;
  /** Members may unmute themselves. The host can still mute anyone. */
  allowUnmute: boolean;
}

export interface Recording {
  id: ID;
  schoolId: ID;
  sessionId: ID;
  liveSessionId: ID;
  courseId: ID;
  classId: ID;
  subjectId: ID;
  teacherId: ID;
  title: string;
  date: string;
  durationSeconds: number;
  sizeMb: number;
  status: "processing" | "ready";
  views: number;
  url: string;
}

export type AttendanceStatus = "present" | "late" | "absent" | "excused";

export interface AttendanceRecord {
  id: ID;
  schoolId: ID;
  sessionId: ID;
  classId: ID;
  studentId: ID;
  date: string;
  kind: "physical" | "live" | "activity";
  liveSessionId?: ID;
  /** Live classes: first join and last leave. */
  joinTime?: string;
  leaveTime?: string;
  /** Live classes: minutes actually in the room (sum of all segments). */
  durationMinutes?: number;
  /** Live classes: each time the student was in the room, when they dropped out and rejoined. */
  segments?: { joinTime: string; leaveTime: string }[];
  status: AttendanceStatus;
}

export type NotificationKind =
  | "assignment"
  | "quiz"
  | "material"
  | "live_upcoming"
  | "live_starting"
  | "graded"
  | "announcement"
  | "recording"
  | "system";

export interface AppNotification {
  id: ID;
  /** Target user; null + schoolId = broadcast to a school. */
  userId: ID | null;
  schoolId: ID | null;
  kind: NotificationKind;
  title: string;
  body: string;
  href?: string;
  createdAt: string;
  readBy: ID[];
}

/**
 * An email the platform sent. The prototype has no mail server, so this is
 * the outbox the Laravel backend will hand to its mailer.
 */
export interface EmailMessage {
  id: ID;
  userId: ID;
  schoolId: ID | null;
  to: string;
  subject: string;
  body: string;
  kind: NotificationKind;
  href?: string;
  sentAt: string;
}

/**
 * An SMS the platform sent (spec section 49.1.8). The prototype has no SMS
 * gateway, so this is the outbox the backend hands to its SMS provider.
 */
export interface SmsMessage {
  id: ID;
  schoolId: ID;
  studentId: ID;
  liveSessionId: ID;
  kind: "live_absent" | "live_left_early";
  to: string;
  body: string;
  sentAt: string;
  status: "sent" | "failed";
}

/** Direct messages (spec section 41.2). Participants always share a school. */
export interface Conversation {
  id: ID;
  schoolId: ID | null;
  participantIds: ID[]; // user IDs
  subject?: string;
  createdAt: string;
  lastMessageAt: string;
}

export interface Message {
  id: ID;
  conversationId: ID;
  senderId: ID;
  body: string;
  sentAt: string;
  readBy: ID[];
}

/**
 * Forums are one per course — i.e. per subject × class × session (spec section 41.3) —
 * so `courseId` is the forum. Access = teaching or being enrolled in that course.
 */
export interface ForumThread {
  id: ID;
  courseId: ID;
  schoolId: ID;
  sessionId: ID;
  authorId: ID; // user ID
  title: string;
  body: string;
  createdAt: string;
  lastActivityAt: string;
  pinned: boolean;
  locked: boolean;
  isQuestion: boolean;
  acceptedPostId?: ID;
  readBy: ID[];
}

export interface ForumPost {
  id: ID;
  threadId: ID;
  authorId: ID;
  body: string;
  createdAt: string;
}

export interface Announcement {
  id: ID;
  schoolId: ID;
  sessionId: ID;
  courseId?: ID;
  authorId: ID;
  title: string;
  body: string;
  createdAt: string;
}

export interface SchoolEvent {
  id: ID;
  schoolId: ID;
  sessionId: ID;
  title: string;
  date: string;
  kind: "event" | "holiday" | "exam";
}

export interface AuditLog {
  id: ID;
  at: string;
  actorId: ID;
  actorName: string;
  schoolId: ID | null;
  action: string;
  target: string;
  category: "school" | "user" | "academic" | "rbac" | "lms" | "assessment" | "live" | "system";
}

// ------------------------------------------------------------------ Vacation Classes (spec section 49.1)

/** Fee for one subject in a vacation session. */
export interface VacationPrice {
  id: ID;
  sessionId: ID;
  subjectId: ID;
  fee: number; // GHS
  /** Vacation classes (levels) this subject is offered to. */
  classIds: ID[];
}

/** A set of subjects sold together for one fee. */
export interface VacationBundle {
  id: ID;
  sessionId: ID;
  name: string;
  description: string;
  /** Class (level cohort) the bundle is for; empty = any level. */
  classIds: ID[];
  subjectIds: ID[];
  price: number; // GHS
  active: boolean;
  featured: boolean;
}

export type PaymentMethod = "momo_mtn" | "momo_telecel" | "momo_airteltigo" | "card" | "cash";

export interface VacationRegistration {
  id: ID;
  sessionId: ID;
  userId: ID;
  /** Student record inside the vacation workspace. */
  studentId: ID;
  classId: ID;
  bundleId?: ID;
  subjectIds: ID[];
  amount: number;
  status: "awaiting_payment" | "paid" | "cancelled" | "refunded";
  /** "existing" = already had an account (school-onboarded or earlier vacation). */
  source: "existing" | "new";
  homeSchoolId?: ID;
  homeSchoolName?: string;
  /** Level of the student's current school (new students state it; existing ones inherit it). */
  homeSchoolType?: SchoolType;
  createdAt: string;
  payment?: { method: PaymentMethod; reference: string; paidAt: string; phone?: string; last4?: string };
}

export interface LessonProgress {
  studentId: ID;
  contentId: ID;
  completedAt: string;
}

export interface PlatformSettings {
  platformName: string;
  supportEmail: string;
  defaultSessionStructure: SessionType;
  allowSelfRegistration: boolean;
  maintenanceMode: boolean;
  maxUploadMb: number;
  recordingRetentionDays: number;
  /** Students see subject-matched courses from ClassProject Open (spec section 49.2). Undefined means on. */
  moocRecommendations?: boolean;
}

// ---------------------------------------------------------------- whiteboard / flip charts (spec section 32)

export type StrokeKind = "pen" | "line" | "arrow" | "rect" | "ellipse" | "triangle" | "text" | "math" | "graph";

/** One item on the whiteboard: a pen stroke, a shape, a text label or a graph. */
export interface Stroke {
  id: string;
  /** User who drew it. */
  by: string;
  /** Default "pen". */
  kind?: StrokeKind;
  color: string;
  /** Line width (or text size) per 1000 px of board width, so boards of any size match. */
  size: number;
  eraser?: boolean;
  /** A see-through highlighter stroke (pen only). */
  highlight?: boolean;
  /**
   * In 0–1 board coordinates (the board is 16:9): pen — x0, y0, x1, y1…;
   * shapes — the two corners of the drag; text and maths — top-left; graph — x, y,
   * width, height of its box.
   */
  pts: number[];
  text?: string;
  /** LaTeX for a "math" item. */
  tex?: string;
  graph?: GraphSpec;
}

/** A whiteboard (flip chart) page. */
export interface BoardPage {
  id: string;
  strokes: Stroke[];
  /** A document page or picture under the annotations (e.g. an imported PDF page). */
  background?: PageBackground;
}

/**
 * The picture a page is drawn on (spec section 32 annotate PDFs). The prototype keeps
 * it as a JPEG data URL; production stores it and keeps the link.
 */
export interface PageBackground {
  url: string;
  /** Pixel size, for fitting it on the 16:9 board. */
  w: number;
  h: number;
  /** Where it came from, e.g. "worksheet.pdf · page 3 (top half)". */
  label?: string;
}

/**
 * A teacher's saved flip chart: whiteboard pages kept as editable items, so
 * they can be reopened in another class and carried on.
 */
export interface FlipChart {
  id: ID;
  schoolId: ID;
  /** The teacher's user id. */
  ownerUserId: ID;
  title: string;
  subjectId?: ID;
  pages: BoardPage[];
  /** The live class it was last saved from. */
  sourceLiveId?: ID;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Interactive video (spec section 26.3). The video is an ordinary asset; its
// questions are timestamped records in an interaction set, one set per lesson
// and version. Nothing is burnt into the file. Logic: lib/interactive-video/.
// ---------------------------------------------------------------------------

export type VideoProvider = "file" | "youtube" | "vimeo";

export interface VideoCaptionTrack {
  /** BCP 47 language: "en", "fr"… */
  language: string;
  label: string;
  /** A WebVTT file. */
  url: string;
  isDefault?: boolean;
}

/** A video lessons can use. Owned by one school; any of its courses can reuse it. */
export interface VideoAsset {
  id: ID;
  schoolId: ID;
  title: string;
  description?: string;
  provider: VideoProvider;
  /** The file's address, or the YouTube / Vimeo link. */
  url: string;
  /** The YouTube / Vimeo video id. */
  providerRef?: string;
  /** Interaction timestamps are checked against it. */
  durationSeconds: number;
  thumbnailUrl?: string;
  captions?: VideoCaptionTrack[];
  /** What is said in the video: read by question suggestion, shown to students as a transcript. */
  transcript?: string;
  createdBy?: ID;
  createdAt: string;
}

export type InteractionSetStatus = "draft" | "published" | "archived";

/** The questions one lesson puts on its video. Drafts are edited; publishing archives the previous version. */
export interface VideoInteractionSet {
  id: ID;
  schoolId: ID;
  courseId: ID;
  contentId: ID;
  videoId: ID;
  version: number;
  status: InteractionSetStatus;
  /** Students can't seek past a required question they haven't answered. */
  preventSkipping: boolean;
  /** How much of the video must be watched (with every required question answered) to complete the lesson. */
  completionPercent: number;
  /** The version this draft was copied from. */
  basedOnSetId?: ID;
  createdBy?: ID;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  publishedBy?: ID;
}

export type VideoInteractionType = "mcq" | "true_false" | "multi_select" | "poll" | "short_answer";
export type InteractionDisplay = "center" | "bottom" | "side";

export interface VideoInteractionOption {
  id: ID;
  text: string;
  /** Always false for polls. */
  correct: boolean;
  /** Why this option is right or wrong. */
  feedback?: string;
}

/** One question, poll or checkpoint at a moment in the video. */
export interface VideoInteraction {
  id: ID;
  setId: ID;
  type: VideoInteractionType;
  /** Seconds from the start: 0 to the video's duration. */
  timestamp: number;
  /** Order among interactions at the same moment. */
  order: number;
  /** Overlay heading; "Quick check" when empty. */
  title?: string;
  question: string;
  description?: string;
  /** Answer options. True / false has two: True and False. */
  options: VideoInteractionOption[];
  /** Short answer: what the teacher looks for when reviewing. */
  modelAnswer?: string;
  /** Shown with the feedback. */
  explanation?: string;
  /** 0 for polls. */
  points: number;
  required: boolean;
  allowRetry: boolean;
  /** null = unlimited. Ignored when retry is off (one attempt). */
  maxAttempts: number | null;
  showFeedback: boolean;
  pauseVideo: boolean;
  /** Carry on playing after the answer, without a "Continue" button. */
  resumeAfterSubmit: boolean;
  displayPosition: InteractionDisplay;
  /** AI suggestions get here only once a teacher accepts them. */
  source: "teacher" | "ai";
  /** The concept or learning outcome it checks, for mastery and review later. */
  concept?: string;
}

/** A student's answer: option ids for choice types and polls, text for short answer. */
export interface VideoInteractionResponse {
  optionIds?: ID[];
  text?: string;
}

/** One submitted answer, scored by the platform (never by what the browser claims). */
export interface VideoInteractionAttempt {
  id: ID;
  schoolId: ID;
  setId: ID;
  interactionId: ID;
  studentId: ID;
  /** From 1, per student and question. */
  attemptNumber: number;
  /** Made once per answer by the browser and resent on retry, so a double submit lands on one attempt. */
  clientAttemptId: string;
  response: VideoInteractionResponse;
  /** null for polls, and for short answers until reviewed. */
  correct: boolean | null;
  pointsEarned: number | null;
  pointsPossible: number;
  review: "auto" | "pending" | "reviewed";
  reviewedBy?: ID;
  reviewedAt?: string;
  reviewFeedback?: string;
  /** Where the student was in the video. */
  videoSeconds?: number;
  responseMs?: number;
  startedAt?: string;
  submittedAt: string;
}

/** One student's progress through one version of a lesson's questions. */
export interface VideoProgress {
  id: ID;
  schoolId: ID;
  setId: ID;
  contentId: ID;
  studentId: ID;
  startedAt: string;
  /** Where "Resume" starts, in seconds. */
  lastPosition: number;
  furthestPosition: number;
  /** Time spent playing, rewatches included. */
  watchSeconds: number;
  /** Parts actually played, as merged [start, end] pairs in seconds. */
  watchedRanges: [number, number][];
  completionPercent: number;
  /** Questions that reached the screen, and optional ones the student skipped. */
  encountered: ID[];
  skipped: ID[];
  status: "in_progress" | "completed";
  completedAt?: string;
  lastActivityAt: string;
}

/** A question a generator (an AI reading the transcript) suggested. A teacher must accept it. */
export interface VideoAiSuggestion {
  id: ID;
  schoolId: ID;
  videoId: ID;
  setId?: ID;
  generator: string;
  status: "pending" | "accepted" | "dismissed";
  suggestion: Omit<VideoInteraction, "id" | "setId" | "order" | "source">;
  /** The part of the transcript it came from. */
  rationale?: string;
  requestedBy?: ID;
  decidedBy?: ID;
  decidedAt?: string;
  acceptedAsId?: ID;
  createdAt: string;
}

/**
 * xAPI-style learning event ("student answered question"), written with attempts
 * and progress. The feed a mastery model and spaced-repetition review will use.
 */
export interface LearningEvent {
  id: ID;
  schoolId: ID;
  studentId: ID;
  courseId?: ID;
  contentId?: ID;
  verb: "started" | "answered" | "skipped" | "reviewed" | "completed";
  objectType: "video" | "video_interaction";
  objectId: ID;
  concept?: string;
  correct?: boolean | null;
  score?: number | null;
  maxScore?: number;
  attemptNumber?: number;
  responseMs?: number;
  at: string;
}

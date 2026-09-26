import { assignSchoolUsernames, withIdentities } from "@/lib/usernames";
import type {
  AcademicSession,
  AcademicYear,
  Announcement,
  AppNotification,
  EmailMessage,
  Assessment,
  AttendanceRecord,
  CatalogueProgramme,
  CatalogueRequest,
  CatalogueSubject,
  Conversation,
  ForumPost,
  ForumThread,
  Message,
  AuditLog,
  ClassPlacement,
  ContentItem,
  Course,
  CourseModule,
  Enrollment,
  Gender,
  LessonProgress,
  LiveSession,
  PlatformSettings,
  Programme,
  Question,
  Recording,
  Role,
  School,
  SchoolClass,
  SchoolEvent,
  SessionStatus,
  SessionType,
  Student,
  Subject,
  Submission,
  Teacher,
  TeachingAssignment,
  User,
  VacationBundle,
  VacationPrice,
  VacationRegistration,
} from "@/lib/types";
import { seedVacation } from "./seed-vacation";
import { DEFAULT_ROLE_PERMISSIONS, ALL_PERMISSIONS } from "@/lib/permissions";
import { AVATAR_COLORS, hashString, rng } from "@/lib/helpers";
import { DISTRICTS, DISTRICT_TOWNS, REGIONS } from "./geography";
import { CATALOGUE_PROGRAMMES, CATALOGUE_SUBJECTS, catProgrammeId, catSubjectId } from "./catalogue";
import { ICT_CURRICULUM, ICT_INTERACTIVE_QUESTIONS, ICT_QUIZ_QUESTIONS, MATH_QUIZ_QUESTIONS, SAMPLE_VIDEO_URL, genericModules } from "./content-library";

export interface DB {
  version: number;
  seededAt: string;
  settings: PlatformSettings;
  schools: School[];
  academicYears: AcademicYear[];
  academicSessions: AcademicSession[];
  programmes: Programme[];
  classes: SchoolClass[];
  subjects: Subject[];
  teachingAssignments: TeachingAssignment[];
  roles: Role[];
  users: User[];
  passwords: Record<string, string>;
  students: Student[];
  placements: ClassPlacement[];
  teachers: Teacher[];
  enrollments: Enrollment[];
  courses: Course[];
  modules: CourseModule[];
  contents: ContentItem[];
  assessments: Assessment[];
  submissions: Submission[];
  liveSessions: LiveSession[];
  recordings: Recording[];
  attendance: AttendanceRecord[];
  notifications: AppNotification[];
  emails: EmailMessage[];
  announcements: Announcement[];
  events: SchoolEvent[];
  auditLogs: AuditLog[];
  progress: LessonProgress[];
  conversations: Conversation[];
  messages: Message[];
  forumThreads: ForumThread[];
  forumPosts: ForumPost[];
  catalogueProgrammes: CatalogueProgramme[];
  catalogueSubjects: CatalogueSubject[];
  catalogueRequests: CatalogueRequest[];
  vacationPrices: VacationPrice[];
  vacationBundles: VacationBundle[];
  vacationRegistrations: VacationRegistration[];
}

export const DB_VERSION = 18;
export const DEMO_PASSWORD = "password";

const MALE = ["Kwame", "Kofi", "Kojo", "Kwabena", "Yaw", "Kwaku", "Kwesi", "Emmanuel", "Samuel", "Daniel", "Isaac", "Joseph", "Prince", "Richard", "Michael", "Felix", "Bernard", "Nana", "Selorm", "Edem", "Elikem", "Seth", "Godwin", "Ebo", "Fiifi", "Nii", "Mawuli", "Kelvin"];
const FEMALE = ["Ama", "Akosua", "Abena", "Adwoa", "Afua", "Yaa", "Esi", "Efua", "Akua", "Grace", "Mercy", "Gifty", "Priscilla", "Comfort", "Linda", "Beatrice", "Esther", "Vida", "Dzifa", "Enyonam", "Sena", "Naa", "Adjoa", "Nhyira", "Maame", "Mawusi", "Eyram", "Adzo"];
const LAST = ["Mensah", "Boateng", "Owusu", "Asante", "Osei", "Adjei", "Agyeman", "Amoah", "Appiah", "Ansah", "Addo", "Darko", "Tetteh", "Quaye", "Ofori", "Nkrumah", "Frimpong", "Kyei", "Danso", "Asamoah", "Opoku", "Bonsu", "Acheampong", "Sarpong", "Amankwah", "Agbeko", "Kpodo", "Ametepe", "Lartey", "Annan", "Sackey", "Yeboah", "Antwi", "Gyamfi", "Baah"];
const SUBJECT_COLORS = ["#2563eb", "#16a34a", "#db2777", "#ea580c", "#7c3aed", "#0891b2", "#ca8a04", "#dc2626", "#4f46e5", "#059669", "#9333ea", "#0d9488", "#c2410c", "#be185d", "#65a30d", "#0284c7"];

const CORE_SUBJECTS: [string, string][] = [
  ["English Language", "ENG"],
  ["Core Mathematics", "MATH"],
  ["Integrated Science", "ISCI"],
  ["Social Studies", "SOC"],
  ["ICT", "ICT"],
];
const ELECTIVE_NAMES: Record<string, string> = {
  PHY: "Physics",
  CHEM: "Chemistry",
  BIO: "Biology",
  EMATH: "Elective Mathematics",
  GOV: "Government",
  LIT: "Literature-in-English",
  ECON: "Economics",
  GEOG: "Geography",
  FACC: "Financial Accounting",
  BMGT: "Business Management",
  CACC: "Cost Accounting",
};

interface ProgrammeDef {
  code: string;
  name: string;
  description: string;
  section: string;
  electives: string[];
  /** Programmes with no classes yet — shows a school mid-setup. */
  noClasses?: boolean;
}

interface TeacherDef {
  key: string;
  title: Teacher["title"];
  first: string;
  last: string;
  gender: Gender;
  subjects: string[];
  email?: string;
}

interface SessionDef {
  key: string;
  name: string;
  start: string;
  end: string;
  status: SessionStatus;
}

interface YearDef {
  name: string;
  start: string;
  end: string;
  sessions: SessionDef[];
}

interface SchoolConfig {
  school: School;
  code: string; // short prefix used in IDs and student numbers
  domain: string;
  seed: number;
  years: YearDef[];
  /** Session keys that receive academic records, oldest first. The last one is current. */
  dataSessions: string[];
  levels: string[];
  studentsPerClass: number;
  programmes: ProgrammeDef[];
  teachers: TeacherDef[];
  /** subject code → class name → teacher key (otherwise round-robin). */
  overrides?: Record<string, Record<string, string>>;
  classTeachers?: Record<string, string>;
  admin: { name: string; email: string };
  /** Pinned first students of the first class (spec gradebook examples). */
  namedStudents?: { first: string; last: string; gender: Gender; email?: string }[];
  richContent: boolean;
}

export function createSeed(now = new Date()): DB {
  const at = (days: number, hour?: number, minute = 0) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    if (hour !== undefined) d.setHours(hour, minute, 0, 0);
    return d.toISOString();
  };
  const minutesFromNow = (mins: number) => {
    const d = new Date(now.getTime() + mins * 60_000);
    d.setSeconds(0, 0);
    return d.toISOString();
  };

  const db: DB = {
    version: DB_VERSION,
    seededAt: now.toISOString(),
    settings: {
      platformName: "ClassProject",
      supportEmail: "support@classproject.com",
      defaultSessionStructure: "semester",
      allowSelfRegistration: false,
      maintenanceMode: false,
      maxUploadMb: 100,
      recordingRetentionDays: 365,
    },
    schools: [],
    academicYears: [],
    academicSessions: [],
    programmes: [],
    classes: [],
    subjects: [],
    teachingAssignments: [],
    roles: [],
    users: [],
    passwords: {},
    students: [],
    placements: [],
    teachers: [],
    enrollments: [],
    courses: [],
    modules: [],
    contents: [],
    assessments: [],
    submissions: [],
    liveSessions: [],
    recordings: [],
    attendance: [],
    notifications: [],
    emails: [],
    announcements: [],
    events: [],
    auditLogs: [],
    progress: [],
    conversations: [],
    messages: [],
    forumThreads: [],
    forumPosts: [],
    catalogueProgrammes: CATALOGUE_PROGRAMMES.map((x) => ({ ...x })),
    catalogueSubjects: CATALOGUE_SUBJECTS.map((x) => ({ ...x })),
    catalogueRequests: [],
    vacationPrices: [],
    vacationBundles: [],
    vacationRegistrations: [],
  };

  // ---------------------------------------------------------------- roles
  db.roles = [
    { id: "role_super_admin", key: "super_admin", name: "Super Administrator", description: "Platform-wide access to every school, user and setting.", system: true, scope: "platform", permissions: DEFAULT_ROLE_PERMISSIONS.super_admin },
    { id: "role_school_admin", key: "school_admin", name: "School Administrator", description: "Manages one school's academic structure, people and reports.", system: true, scope: "school", permissions: DEFAULT_ROLE_PERMISSIONS.school_admin },
    { id: "role_teacher", key: "teacher", name: "Teacher", description: "Teaches assigned subjects, manages course content and grades.", system: true, scope: "school", permissions: DEFAULT_ROLE_PERMISSIONS.teacher },
    { id: "role_student", key: "student", name: "Student", description: "Learns in enrolled subjects, attends live classes and submits work.", system: true, scope: "school", permissions: DEFAULT_ROLE_PERMISSIONS.student },
    { id: "role_academic_coordinator", key: "academic_coordinator", name: "Academic Coordinator", description: "Oversees programmes, classes, subjects and assessment quality.", system: false, scope: "school", permissions: ALL_PERMISSIONS.filter((p) => /^(academic_sessions|programmes|classes|subjects|assessments)\./.test(p) || p === "analytics.school" || p === "teachers.view" || p === "students.view" || p === "courses.view") },
    { id: "role_regional_officer", key: "regional_officer", name: "Regional Officer", description: "Read-only view of regional and district analytics.", system: false, scope: "platform", permissions: ["schools.view", "analytics.region", "analytics.district", "analytics.school"] },
  ];

  const superAdmin: User = { id: "usr_super", name: "Platform Administrator", email: "superadmin@classproject.com", roleId: "role_super_admin", schoolId: null, status: "active", lastActive: minutesFromNow(-3), avatarColor: "#4f46e5" };
  db.users.push(superAdmin);
  db.users.push({ id: "usr_regional_gar", name: "Josephine Ankrah", email: "j.ankrah@ges.gov.gh", roleId: "role_regional_officer", schoolId: null, status: "active", lastActive: at(-2, 11), avatarColor: "#0891b2" });

  // ---------------------------------------------------------------- aggregate-only schools
  const gen = rng(20260925);
  const SUFFIXES = ["Senior High School", "Senior High School", "Senior High Technical School", "Secondary School", "Community SHS"];
  let seq = 0;
  for (const district of DISTRICTS) {
    const towns = DISTRICT_TOWNS[district.name] ?? [district.name];
    const count = gen.int(3, 6);
    for (let i = 0; i < count; i++) {
      seq++;
      const town = towns[i % towns.length];
      // Mix of levels and public/private schools (spec §5): roughly half SHS/TVET, the rest JHS and basic schools.
      const levelRoll = gen.next();
      const level: School["type"] = levelRoll < 0.5 ? "SHS" : levelRoll < 0.75 ? "JHS" : "Primary";
      const ownership: School["ownership"] = gen.chance(level === "SHS" ? 0.15 : 0.35) ? "private" : "public";
      const suffix =
        level === "SHS"
          ? ownership === "private" ? gen.pick(["Senior High School", "International College", "Academy SHS"]) : gen.pick(SUFFIXES)
          : level === "JHS"
            ? ownership === "private" ? gen.pick(["Preparatory JHS", "Montessori JHS", "Academy JHS"]) : gen.pick(["M/A JHS", "D/A JHS", "Junior High School"])
            : ownership === "private" ? gen.pick(["Preparatory School", "Montessori School", "International School"]) : gen.pick(["M/A Basic School", "D/A Primary School", "Primary School"]);
      const name = i >= towns.length ? `${town} ${["Presbyterian", "Methodist", "Catholic", "Islamic", "Anglican"][i % 5]} ${suffix}` : `${town} ${suffix}`;
      const regionIdx = REGIONS.findIndex((r) => r.id === district.regionId) + 1;
      const students = level === "SHS" ? gen.int(450, 3400) : level === "JHS" ? gen.int(120, 600) : gen.int(150, 900);
      const teachers = Math.round(students / gen.int(24, 34));
      const engagement = gen.int(52, 94);
      const statusRoll = gen.next();
      const status = statusRoll < 0.9 ? "active" : statusRoll < 0.95 ? "pending" : statusRoll < 0.98 ? "suspended" : "archived";
      db.schools.push({
        id: `sch_${seq.toString().padStart(4, "0")}`,
        name,
        shortName: name.split(" ").map((w) => w[0]).join("").slice(0, 4).toUpperCase(),
        type: suffix.includes("Technical") ? "TVET" : level,
        ownership,
        waecCode: `${String(regionIdx).padStart(3, "0")}${String(gen.int(1, 20)).padStart(2, "0")}${String(gen.int(1, 99)).padStart(2, "0")}`,
        emisCode: String(gen.int(10_000_000, 99_999_999)),
        regionId: district.regionId,
        districtId: district.id,
        address: `P.O. Box ${gen.int(10, 999)}, ${town}`,
        phone: `+233 ${gen.pick(["24", "20", "54", "55", "27", "30"])} ${gen.int(100, 999)} ${gen.int(1000, 9999)}`,
        email: `info@${name.toLowerCase().replace(/[^a-z]+/g, "").slice(0, 18)}.edu.gh`,
        logoColor: gen.pick(AVATAR_COLORS),
        status,
        dateOnboarded: at(-gen.int(20, 720)),
        sessionStructure: gen.chance(0.8) ? "semester" : "term",
        stats: status === "active" || status === "suspended"
          ? {
              students,
              teachers,
              activeStudents: Math.round(students * engagement / 100),
              activeTeachers: Math.round(teachers * Math.min(1, (engagement + gen.int(0, 10)) / 100)),
              liveClasses: Math.round(students / gen.int(6, 14)),
              assignments: Math.round(teachers * gen.int(8, 20)),
              quizzes: Math.round(teachers * gen.int(5, 14)),
              engagement,
            }
          : { students: 0, teachers: 0, activeStudents: 0, activeTeachers: 0, liveClasses: 0, assignments: 0, quizzes: 0, engagement: 0 },
      });
    }
  }

  // ---------------------------------------------------------------- demo tenants
  const emptyStats = { students: 0, teachers: 0, activeStudents: 0, activeTeachers: 0, liveClasses: 0, assignments: 0, quizzes: 0, engagement: 0 };

  const ridgeview: SchoolConfig = {
    code: "rv",
    domain: "ridgeview.edu.gh",
    seed: 101,
    richContent: true,
    school: {
      id: "sch_ridgeview",
      name: "Ridgeview Senior High School",
      shortName: "RSHS",
      type: "SHS",
      ownership: "public",
      waecCode: "0010712",
      emisCode: "10101203",
      regionId: "gar",
      districtId: DISTRICTS.find((x) => x.name === "Accra Metro")!.id,
      address: "12 Liberation Road, Ridge, Accra",
      phone: "+233 30 222 4410",
      email: "info@ridgeview.edu.gh",
      website: "https://ridgeview.edu.gh",
      logoColor: "#2563eb",
      status: "active",
      dateOnboarded: "2025-08-04T09:00:00.000Z",
      sessionStructure: "semester",
      stats: emptyStats,
    },
    years: [
      { name: "2025/2026", start: "2025-09-01", end: "2026-07-24", sessions: [
        { key: "2526s1", name: "Semester 1", start: "2025-09-01", end: "2025-12-19", status: "closed" },
        { key: "2526s2", name: "Semester 2", start: "2026-01-12", end: "2026-07-24", status: "closed" },
      ] },
      { name: "2026/2027", start: "2026-09-01", end: "2027-07-23", sessions: [
        { key: "2627s1", name: "Semester 1", start: "2026-09-01", end: "2026-12-18", status: "active" },
        { key: "2627s2", name: "Semester 2", start: "2027-01-11", end: "2027-07-23", status: "upcoming" },
      ] },
    ],
    dataSessions: ["2526s2", "2627s1"],
    levels: ["SHS 1", "SHS 2", "SHS 3"],
    studentsPerClass: 25,
    programmes: [
      { code: "GSCI", name: "General Science", description: "Physics, Chemistry, Biology and Elective Mathematics.", section: "A", electives: ["PHY", "CHEM", "BIO", "EMATH"] },
      { code: "GART", name: "General Arts", description: "Government, Literature, Economics and Geography.", section: "B", electives: ["GOV", "LIT", "ECON", "GEOG"] },
      { code: "BUS", name: "Business", description: "Accounting, Business Management and Economics.", section: "C", electives: ["FACC", "BMGT", "ECON", "CACC"] },
      { code: "HEC", name: "Home Economics", description: "Food & Nutrition, Management in Living and General Knowledge in Art.", section: "D", electives: [], noClasses: true },
      { code: "VART", name: "Visual Arts", description: "Graphic Design, Picture Making and Ceramics.", section: "E", electives: [], noClasses: true },
    ],
    teachers: [
      { key: "eric", title: "Mr.", first: "Eric", last: "Dzontoh", gender: "M", subjects: ["ICT"], email: "eric.dzontoh@ridgeview.edu.gh" },
      { key: "linda", title: "Ms.", first: "Linda", last: "Addo", gender: "F", subjects: ["ICT"] },
      { key: "mensah", title: "Mr.", first: "Kwame", last: "Mensah", gender: "M", subjects: ["MATH"] },
      { key: "ansah", title: "Mr.", first: "Prince", last: "Ansah", gender: "M", subjects: ["MATH"] },
      { key: "owusu", title: "Mrs.", first: "Akosua", last: "Owusu", gender: "F", subjects: ["ENG"] },
      { key: "kyei", title: "Mrs.", first: "Beatrice", last: "Kyei", gender: "F", subjects: ["ENG"] },
      { key: "frimpong", title: "Mrs.", first: "Adwoa", last: "Frimpong", gender: "F", subjects: ["ISCI"] },
      { key: "ofori", title: "Mr.", first: "Samuel", last: "Ofori", gender: "M", subjects: ["SOC"] },
      { key: "boateng", title: "Mr.", first: "Yaw", last: "Boateng", gender: "M", subjects: ["PHY"] },
      { key: "asante", title: "Dr.", first: "Abena", last: "Asante", gender: "F", subjects: ["CHEM"] },
      { key: "quaye", title: "Ms.", first: "Efua", last: "Quaye", gender: "F", subjects: ["BIO"] },
      { key: "adjei", title: "Mr.", first: "Kofi", last: "Adjei", gender: "M", subjects: ["EMATH"] },
      { key: "tetteh", title: "Mr.", first: "Emmanuel", last: "Tetteh", gender: "M", subjects: ["GOV"] },
      { key: "amoah", title: "Mrs.", first: "Gifty", last: "Amoah", gender: "F", subjects: ["LIT"] },
      { key: "osei", title: "Mr.", first: "Daniel", last: "Osei", gender: "M", subjects: ["ECON"] },
      { key: "nkrumah", title: "Ms.", first: "Priscilla", last: "Nkrumah", gender: "F", subjects: ["GEOG"] },
      { key: "appiah", title: "Mr.", first: "Isaac", last: "Appiah", gender: "M", subjects: ["FACC", "CACC"] },
      { key: "agyeman", title: "Mrs.", first: "Comfort", last: "Agyeman", gender: "F", subjects: ["BMGT"] },
    ],
    overrides: {
      ICT: { "SHS 1A": "eric", "SHS 1B": "eric", "SHS 2A": "eric", "SHS 2B": "eric", "SHS 3A": "eric", "SHS 1C": "linda", "SHS 2C": "linda", "SHS 3B": "linda", "SHS 3C": "linda" },
    },
    classTeachers: { "SHS 1A": "mensah", "SHS 1B": "owusu", "SHS 1C": "appiah", "SHS 2A": "boateng", "SHS 2B": "tetteh", "SHS 2C": "agyeman", "SHS 3A": "eric", "SHS 3B": "amoah", "SHS 3C": "osei" },
    admin: { name: "Grace Asamoah", email: "admin@ridgeview.edu.gh" },
    namedStudents: [
      { first: "John", last: "Mensah", gender: "M", email: "john.mensah@ridgeview.edu.gh" },
      { first: "Ama", last: "Boateng", gender: "F", email: "ama.boateng@ridgeview.edu.gh" },
      { first: "Kojo", last: "Mensah", gender: "M" },
    ],
  };

  const lakeside: SchoolConfig = {
    code: "ls",
    domain: "lakeside.edu.gh",
    seed: 202,
    richContent: false,
    school: {
      id: "sch_lakeside",
      name: "Lakeside Senior High School",
      shortName: "LSHS",
      type: "SHS",
      ownership: "public",
      // Imported without its WAEC code, GES EMIS code or district: its
      // administrator is prompted to complete the profile on sign-in (spec §5.2),
      // and its students sign in with platform usernames until the WAEC code is
      // added and school usernames are generated (spec §10.1).
      waecCode: "",
      emisCode: "",
      regionId: "ash",
      districtId: "",
      address: "Lake Road, Ejisu, Ashanti",
      phone: "+233 32 209 1182",
      email: "info@lakeside.edu.gh",
      logoColor: "#16a34a",
      status: "active",
      dateOnboarded: "2026-06-15T09:00:00.000Z",
      sessionStructure: "term",
      stats: emptyStats,
    },
    years: [
      { name: "2026/2027", start: "2026-09-08", end: "2027-07-30", sessions: [
        { key: "2627t1", name: "Term 1", start: "2026-09-08", end: "2026-12-11", status: "active" },
        { key: "2627t2", name: "Term 2", start: "2027-01-11", end: "2027-04-09", status: "upcoming" },
        { key: "2627t3", name: "Term 3", start: "2027-04-26", end: "2027-07-30", status: "upcoming" },
      ] },
    ],
    dataSessions: ["2627t1"],
    levels: ["SHS 1", "SHS 2"],
    studentsPerClass: 15,
    programmes: [
      { code: "GSCI", name: "General Science", description: "Science track.", section: "S", electives: ["PHY", "CHEM", "BIO", "EMATH"] },
      { code: "BUS", name: "Business", description: "Business track.", section: "B", electives: ["FACC", "BMGT", "ECON", "CACC"] },
    ],
    teachers: [
      { key: "baah", title: "Mr.", first: "Kwaku", last: "Baah", gender: "M", subjects: ["MATH", "EMATH"], email: "kwaku.baah@lakeside.edu.gh" },
      { key: "sarpong", title: "Mrs.", first: "Esther", last: "Sarpong", gender: "F", subjects: ["ENG", "SOC"] },
      { key: "gyamfi", title: "Mr.", first: "Kwesi", last: "Gyamfi", gender: "M", subjects: ["ISCI", "PHY"] },
      { key: "antwi", title: "Ms.", first: "Vida", last: "Antwi", gender: "F", subjects: ["CHEM", "BIO"] },
      { key: "yeboah", title: "Mr.", first: "Felix", last: "Yeboah", gender: "M", subjects: ["ICT"] },
      { key: "danso", title: "Mrs.", first: "Mercy", last: "Danso", gender: "F", subjects: ["FACC", "BMGT", "ECON", "CACC"] },
    ],
    admin: { name: "Kwabena Owusu", email: "admin@lakeside.edu.gh" },
  };

  const ericIds = buildSchool(db, ridgeview, { at, minutesFromNow, now });
  buildSchool(db, lakeside, { at, minutesFromNow, now });

  // ---------------------------------------------------------------- catalogue requests (spec §17.2)
  db.catalogueRequests.push(
    { id: "req_rv_robotics", kind: "subject", name: "Robotics", code: "ROBO", description: "Introductory robotics with microcontrollers and sensors.", reason: "We run a robotics club and want it as an elective for STEM-track students.", schoolId: "sch_ridgeview", requestedBy: "usr_rv_admin", status: "pending", createdAt: at(-2, 10, 15) },
    { id: "req_ls_perf", kind: "programme", name: "Performing Arts", code: "PART", description: "Music, dance and drama.", reason: "Approved by GES for our school from next year.", schoolId: "sch_lakeside", requestedBy: "usr_ls_admin", status: "pending", createdAt: at(-1, 14, 40) },
    { id: "req_rv_comp", kind: "subject", name: "Computing", code: "COMP", description: "Programming and computational thinking.", reason: "New STEM curriculum subject.", schoolId: "sch_ridgeview", requestedBy: "usr_rv_admin", status: "approved", createdAt: at(-40, 9), resolvedAt: at(-38, 11), resolvedBy: superAdmin.id, catalogueId: catSubjectId("COMP"), note: "Added to the catalogue." },
  );
  db.notifications.push({ id: "ntf_sa_req", userId: superAdmin.id, schoolId: null, kind: "system", title: "2 catalogue requests", body: "Ridgeview SHS requested the subject Robotics; Lakeside SHS requested the programme Performing Arts.", href: "/super-admin/catalogue?tab=requests", createdAt: at(-1, 14, 41), readBy: [] });

  // ---------------------------------------------------------------- platform notifications & audit
  db.notifications.push(
    { id: "ntf_sa_1", userId: superAdmin.id, schoolId: null, kind: "system", title: "School awaiting activation", body: `${db.schools.find((s) => s.status === "pending")?.name ?? "A school"} completed onboarding and is pending activation.`, href: "/super-admin/schools", createdAt: at(-1, 9, 12), readBy: [] },
    { id: "ntf_sa_2", userId: superAdmin.id, schoolId: null, kind: "system", title: "Monthly usage report ready", body: "August 2026 national usage report has been generated.", href: "/super-admin/analytics", createdAt: at(-3, 7, 0), readBy: [] },
    { id: "ntf_sa_3", userId: superAdmin.id, schoolId: null, kind: "recording", title: "Storage at 62%", body: "Recording storage is at 62% of the allocated quota.", href: "/super-admin/settings", createdAt: at(-6, 15, 30), readBy: [superAdmin.id] },
  );
  db.auditLogs.push(
    { id: "aud_p1", at: at(-120, 10), actorId: superAdmin.id, actorName: superAdmin.name, schoolId: "sch_lakeside", action: "Admin created school", target: "Lakeside Senior High School", category: "school" },
    { id: "aud_p2", at: at(-119, 10, 20), actorId: superAdmin.id, actorName: superAdmin.name, schoolId: null, action: "Role created", target: "Academic Coordinator", category: "rbac" },
    { id: "aud_p3", at: at(-60, 14), actorId: superAdmin.id, actorName: superAdmin.name, schoolId: null, action: "Permission modified", target: "Regional Officer → analytics.district", category: "rbac" },
    { id: "aud_p4", at: at(-12, 11), actorId: superAdmin.id, actorName: superAdmin.name, schoolId: db.schools[4]!.id, action: "School suspended", target: db.schools[4]!.name, category: "school" },
    { id: "aud_p5", at: at(-2, 16), actorId: superAdmin.id, actorName: superAdmin.name, schoolId: null, action: "Platform settings updated", target: "Recording retention → 365 days", category: "system" },
  );
  void ericIds;
  seedVacation(db, { at, minutesFromNow });

  // Sign-in identities (spec §10.1): platform usernames for everyone, and
  // WAEC-prefixed school usernames for students of schools that have a WAEC code.
  db.users = withIdentities("users", db.users, { users: [], students: [], schools: db.schools });
  for (const school of db.schools) if (school.kind !== "vacation") db.students = assignSchoolUsernames(db.students, school).students;
  db.auditLogs.sort((a, b) => b.at.localeCompare(a.at));
  return db;
}

interface TimeHelpers {
  at: (days: number, hour?: number, minute?: number) => string;
  minutesFromNow: (mins: number) => string;
  now: Date;
}

function buildSchool(db: DB, cfg: SchoolConfig, t: TimeHelpers) {
  const r = rng(cfg.seed);
  const { at, minutesFromNow, now } = t;
  const sid = cfg.school.id;
  db.schools.push(cfg.school);

  // ---- admin
  const adminUser: User = { id: `usr_${cfg.code}_admin`, name: cfg.admin.name, email: cfg.admin.email, roleId: "role_school_admin", schoolId: sid, status: "active", lastActive: minutesFromNow(-25), avatarColor: "#db2777" };
  db.users.push(adminUser);

  // ---- years & sessions
  const sessionIdByKey: Record<string, string> = {};
  const sessionType: SessionType = cfg.school.sessionStructure;
  for (const y of cfg.years) {
    const yearId = `ay_${cfg.code}_${y.name.replace("/", "")}`;
    db.academicYears.push({ id: yearId, schoolId: sid, name: y.name, startDate: y.start, endDate: y.end });
    for (const s of y.sessions) {
      const id = `ses_${cfg.code}_${s.key}`;
      sessionIdByKey[s.key] = id;
      db.academicSessions.push({ id, schoolId: sid, academicYearId: yearId, type: sessionType, name: s.name, startDate: s.start, endDate: s.end, status: s.status });
    }
  }
  const currentKey = cfg.dataSessions[cfg.dataSessions.length - 1]!;
  const currentSessionId = sessionIdByKey[currentKey]!;

  // ---- teachers
  const teacherIdByKey: Record<string, string> = {};
  cfg.teachers.forEach((td, i) => {
    const userId = `usr_${cfg.code}_t_${td.key}`;
    const teacherId = `tch_${cfg.code}_${td.key}`;
    teacherIdByKey[td.key] = teacherId;
    db.users.push({
      id: userId,
      name: `${td.title} ${td.first} ${td.last}`,
      email: td.email ?? `${td.first.toLowerCase()}.${td.last.toLowerCase()}@${cfg.domain}`,
      roleId: "role_teacher",
      schoolId: sid,
      status: "active",
      lastActive: at(-r.int(0, 4), r.int(7, 18)),
      avatarColor: AVATAR_COLORS[i % AVATAR_COLORS.length]!,
    });
    db.teachers.push({
      id: teacherId,
      userId,
      schoolId: sid,
      staffNumber: `${cfg.school.shortName}/STF/${String(i + 1).padStart(3, "0")}`,
      title: td.title,
      firstName: td.first,
      lastName: td.last,
      gender: td.gender,
      specialization: td.subjects.map((c) => subjectName(c)).join(", "),
      phone: `+233 ${r.pick(["24", "20", "54", "55"])} ${r.int(100, 999)} ${r.int(1000, 9999)}`,
      status: "active",
    });
  });
  const ericTeacherId = teacherIdByKey["eric"];

  // ---- students: cohort 0 is the newest intake
  const cohorts = cfg.levels.length + (cfg.dataSessions.length - 1);
  const studentsByCohortProg: Record<string, Student[]> = {};
  let studentSeq = 0;
  const classProgrammes = cfg.programmes.filter((p) => !p.noClasses);
  const currentYear = Number(cfg.years[cfg.years.length - 1]!.name.slice(0, 4));
  for (let c = 0; c < cohorts; c++) {
    const intakeYear = currentYear - c;
    const graduated = c >= cfg.levels.length;
    classProgrammes.forEach((p, pi) => {
      const list: Student[] = [];
      for (let n = 0; n < cfg.studentsPerClass; n++) {
        studentSeq++;
        const named = c === 0 && pi === 0 ? cfg.namedStudents?.[n] : undefined;
        const gender: Gender = named?.gender ?? (r.chance(0.5) ? "M" : "F");
        const first = named?.first ?? r.pick(gender === "M" ? MALE : FEMALE);
        const last = named?.last ?? r.pick(LAST);
        const num = `${cfg.school.shortName}/${String(intakeYear).slice(2)}/${String(studentSeq).padStart(4, "0")}`;
        const userId = `usr_${cfg.code}_s${studentSeq}`;
        const studentId = `stu_${cfg.code}_${studentSeq}`;
        db.users.push({
          id: userId,
          name: `${first} ${last}`,
          email: named?.email ?? `${first.toLowerCase()}.${last.toLowerCase()}${studentSeq}@students.${cfg.domain}`,
          roleId: "role_student",
          schoolId: sid,
          status: graduated ? "disabled" : "active",
          lastActive: graduated ? at(-80) : r.chance(0.85) ? at(-r.int(0, 6), r.int(6, 22)) : at(-r.int(10, 40)),
          avatarColor: AVATAR_COLORS[studentSeq % AVATAR_COLORS.length]!,
        });
        const s: Student = {
          id: studentId,
          userId,
          schoolId: sid,
          studentNumber: num,
          firstName: first,
          lastName: last,
          gender,
          dateOfBirth: `${intakeYear - 15}-${String(r.int(1, 12)).padStart(2, "0")}-${String(r.int(1, 28)).padStart(2, "0")}`,
          guardianName: `${r.pick(gender === "M" ? MALE : FEMALE)} ${last}`,
          guardianPhone: `+233 ${r.pick(["24", "20", "54", "55", "27"])} ${r.int(100, 999)} ${r.int(1000, 9999)}`,
          status: graduated ? "graduated" : "active",
          createdAt: `${intakeYear}-09-0${r.int(1, 9)}T09:00:00.000Z`,
        };
        db.students.push(s);
        list.push(s);
      }
      studentsByCohortProg[`${c}:${p.code}`] = list;
    });
  }

  // ---- ability per student drives consistent grades across assessments
  const ability = new Map<string, number>();
  db.students.filter((s) => s.schoolId === sid).forEach((s) => ability.set(s.id, 0.38 + rng(hashString(s.id)).next() * 0.6));

  // ---- per data session: programmes, subjects, classes, placements, enrollments, courses
  cfg.dataSessions.forEach((sessKey, si) => {
    const sessionId = sessionIdByKey[sessKey]!;
    const isCurrent = sessKey === currentKey;
    const shift = cfg.dataSessions.length - 1 - si; // 0 for current

    const progIdByCode: Record<string, string> = {};
    for (const p of cfg.programmes) {
      const id = `prg_${cfg.code}_${sessKey}_${p.code}`;
      progIdByCode[p.code] = id;
      db.programmes.push({ id, schoolId: sid, sessionId, catalogueId: catProgrammeId(p.code), name: p.name, code: p.code, description: p.description, status: "active" });
    }

    const subjIdByCode: Record<string, string> = {};
    const allCodes = [...CORE_SUBJECTS.map(([, c]) => c), ...new Set(classProgrammes.flatMap((p) => p.electives))];
    allCodes.forEach((code, i) => {
      const id = `sub_${cfg.code}_${sessKey}_${code}`;
      subjIdByCode[code] = id;
      const owners = classProgrammes.filter((p) => p.electives.includes(code));
      db.subjects.push({
        id,
        schoolId: sid,
        sessionId,
        catalogueId: catSubjectId(code),
        programmeId: owners.length === 1 ? progIdByCode[owners[0]!.code] : undefined,
        name: subjectName(code),
        code,
        description: owners.length === 0 ? "Core subject taken by all students." : `Elective for ${owners.map((o) => o.name).join(" and ")}.`,
        color: SUBJECT_COLORS[i % SUBJECT_COLORS.length]!,
      });
    });

    cfg.levels.forEach((level, li) => {
      classProgrammes.forEach((p, pi) => {
        const className = `${level}${p.section}`;
        const classId = `cls_${cfg.code}_${sessKey}_${className.replace(/\s/g, "")}`;
        const ctKey = cfg.classTeachers?.[className] ?? cfg.teachers[(li * 3 + pi) % cfg.teachers.length]!.key;
        db.classes.push({ id: classId, schoolId: sid, sessionId, programmeId: progIdByCode[p.code]!, name: className, level, classTeacherId: teacherIdByKey[ctKey], capacity: 50, status: "active" });

        const cohort = studentsByCohortProg[`${li + shift}:${p.code}`] ?? [];
        const subjectCodes = [...CORE_SUBJECTS.map(([, c]) => c), ...p.electives];
        for (const s of cohort) {
          db.placements.push({ id: `plc_${classId}_${s.id}`, schoolId: sid, sessionId, studentId: s.id, classId });
        }

        subjectCodes.forEach((code, ci) => {
          const subjectId = subjIdByCode[code]!;
          const candidates = cfg.teachers.filter((td) => td.subjects.includes(code));
          const tKey = cfg.overrides?.[code]?.[className] ?? candidates[(li + pi + ci) % candidates.length]!.key;
          const teacherId = teacherIdByKey[tKey]!;
          db.teachingAssignments.push({ id: `ta_${classId}_${code}`, schoolId: sid, sessionId, subjectId, classId, teacherId });
          for (const s of cohort) {
            db.enrollments.push({ id: `enr_${classId}_${code}_${s.id}`, schoolId: sid, sessionId, studentId: s.id, classId, subjectId, enrolledAt: `${db.academicSessions.find((x) => x.id === sessionId)!.startDate}T08:00:00.000Z` });
          }

          const courseId = `crs_${classId}_${code}`;
          const isIct = code === "ICT";
          // Seeded ICT content is organised in "Module N" sections and generic content in "Unit N".
          db.courses.push({ id: courseId, schoolId: sid, sessionId, subjectId, classId, teacherId, title: `${subjectName(code)} — ${className}`, description: `${subjectName(code)} for ${className} (${p.name}).`, sectionLabel: isIct && cfg.richContent && ICT_CURRICULUM[level] ? "Module" : "Unit" });
          const wantsContent = isCurrent || (isIct && cfg.richContent);
          if (wantsContent) {
            const mods = isIct && cfg.richContent ? ICT_CURRICULUM[level] ?? genericModules(subjectName(code)) : genericModules(subjectName(code));
            const contentIds: string[] = [];
            mods.forEach((m, mi) => {
              const moduleId = `mod_${courseId}_${mi}`;
              db.modules.push({ id: moduleId, courseId, title: m.title, description: m.description, order: mi, published: !(isCurrent && isIct && mi === mods.length - 1 && level !== "SHS 1") });
              m.items.forEach((it, ii) => {
                const contentId = `cnt_${moduleId}_${ii}`;
                contentIds.push(contentId);
                db.contents.push({ id: contentId, moduleId, courseId, type: it.type, title: it.title, description: it.description, body: it.body, url: it.url, fileName: it.fileName, fileSize: it.fileSize, durationMinutes: it.durationMinutes, order: ii, published: true, createdAt: at(-40 + mi * 7 + ii) });
              });
            });
            // Learning progress for current courses (drives dashboards and analytics).
            if (isCurrent) {
              for (const s of cohort) {
                const a = ability.get(s.id)!;
                const done = isIct && s.firstName === "John" && s.lastName === "Mensah" ? Math.round(contentIds.length * 0.78) : Math.round(contentIds.length * Math.min(1, a * r.next() * 1.4));
                contentIds.slice(0, done).forEach((cid, k) => db.progress.push({ studentId: s.id, contentId: cid, completedAt: at(-30 + k * 2, r.int(8, 21)) }));
              }
            }
          }

          // ---- graded assessments: core subjects in the current session, ICT history in the previous one
          const coreCodes = CORE_SUBJECTS.map(([, c]) => c);
          const gradedHere = isCurrent ? coreCodes.includes(code) : isIct && cfg.richContent;
          if (gradedHere) {
            const sessionStart = new Date(db.academicSessions.find((x) => x.id === sessionId)!.startDate);
            const due = (offsetFromNow: number) => (isCurrent ? at(offsetFromNow, 23, 59) : new Date(sessionStart.getTime() + (60 + offsetFromNow) * 86_400_000).toISOString());
            const specs: { type: Assessment["type"]; title: string; total: number; due: string; questions?: Question[] }[] = [
              { type: "assignment", title: isIct ? "Assignment 1 — ICT in Everyday Life" : `Assignment 1 — ${subjectName(code)}`, total: 20, due: due(-14) },
              { type: "quiz", title: "Quiz 1", total: 10, due: due(-7), questions: isIct ? ICT_QUIZ_QUESTIONS.slice(0, 4).map((q, qi) => ({ ...q, id: `q_${courseId}_q1_${qi}`, marks: 2.5 })) : undefined },
              { type: "test", title: "Mid-Semester Test", total: 50, due: due(-3) },
            ];
            specs.forEach((spec, k) => {
              const assessmentId = `asm_${courseId}_${k}`;
              db.assessments.push({ id: assessmentId, schoolId: sid, sessionId, courseId, subjectId, classId, teacherId, title: spec.title, description: `${spec.title} for ${className}.`, type: spec.type, totalMarks: spec.total, durationMinutes: spec.type === "quiz" ? 15 : spec.type === "test" ? 60 : undefined, dueDate: spec.due, status: "closed", questions: spec.questions ?? [], createdAt: new Date(new Date(spec.due).getTime() - 10 * 86_400_000).toISOString() });
              cohort.forEach((s, idx) => {
                const pinned = isCurrent && isIct && li === 0 && pi === 0 ? PINNED_SCORES[idx]?.[k] : undefined;
                const a = ability.get(s.id)!;
                const raw = pinned ?? Math.max(0, Math.min(spec.total, Math.round(spec.total * (a + (rng(hashString(s.id + assessmentId)).next() - 0.5) * 0.25))));
                const missed = pinned === undefined && rng(hashString(assessmentId + s.id)).next() < 0.04;
                if (missed) return;
                db.submissions.push({ id: `smb_${assessmentId}_${s.id}`, assessmentId, studentId: s.id, submittedAt: new Date(new Date(spec.due).getTime() - 86_400_000).toISOString(), answers: {}, score: raw, status: "graded", gradedAt: spec.due });
              });
            });
          }

          // ---- a maths quiz written with LaTeX (rendered by KaTeX)
          if (isCurrent && code === "MATH" && cfg.richContent) {
            const mqId = `asm_${courseId}_mq1`;
            db.assessments.push({ id: mqId, schoolId: sid, sessionId, courseId, subjectId, classId, teacherId, title: "Quiz — Algebra & Geometry", description: "Equations, indices, surds, angles and shapes. 20 minutes.", type: "quiz", totalMarks: 16, durationMinutes: 20, dueDate: at(4, 23, 59), status: "published", questions: MATH_QUIZ_QUESTIONS.map((q, qi) => ({ ...q, id: `q_${mqId}_${qi}` })), shuffleQuestions: true, shuffleOptions: true, createdAt: at(0, 8) });
          }

          // ---- open work for current ICT courses
          if (isCurrent && isIct) {
            const hwId = `asm_${courseId}_hw2`;
            db.assessments.push({ id: hwId, schoolId: sid, sessionId, courseId, subjectId, classId, teacherId, title: "Assignment 2 — Computer Hardware Report", description: "Write a one-page report describing the input, processing, output and storage devices in your school's computer lab. Upload as PDF or Word.", type: "assignment", totalMarks: 20, dueDate: at(5, 23, 59), status: "published", questions: [{ id: `q_${hwId}_0`, type: "file", prompt: "Upload your report (PDF or Word).", marks: 20 }], createdAt: at(-2, 9) });
            cohort.slice(3, 3 + Math.floor(cohort.length * 0.4)).forEach((s, k) => {
              db.submissions.push({ id: `smb_${hwId}_${s.id}`, assessmentId: hwId, studentId: s.id, submittedAt: minutesFromNow(-(30 + k * 97)), answers: {}, fileName: `${s.firstName.toLowerCase()}-${s.lastName.toLowerCase()}-hardware-report.pdf`, score: null, status: "submitted" });
            });
            const qzId = `asm_${courseId}_qz2`;
            db.assessments.push({ id: qzId, schoolId: sid, sessionId, courseId, subjectId, classId, teacherId, title: "Quiz 2 — Computer Software", description: "Five questions on system and application software. 15 minutes.", type: "quiz", totalMarks: 10, durationMinutes: 15, dueDate: at(3, 23, 59), status: "published", questions: ICT_QUIZ_QUESTIONS.map((q, qi) => ({ ...q, id: `q_${qzId}_${qi}` })), shuffleQuestions: true, shuffleOptions: true, createdAt: at(-1, 14) });
            const q3Id = `asm_${courseId}_qz3`;
            db.assessments.push({ id: q3Id, schoolId: sid, sessionId, courseId, subjectId, classId, teacherId, title: "Quiz 3 — Inside the Computer", description: "Drag, sort and select: one question of each interactive type. 20 minutes.", type: "quiz", totalMarks: 12, durationMinutes: 20, dueDate: at(6, 23, 59), status: "published", questions: ICT_INTERACTIVE_QUESTIONS.map((q, qi) => ({ ...q, id: `q_${q3Id}_${qi}` })), shuffleQuestions: true, shuffleOptions: true, createdAt: at(0, 7) });
          }
        });
      });
    });
  });

  // ---- live classes & recordings (current session)
  const currentCourses = db.courses.filter((c) => c.sessionId === currentSessionId);
  const classesNow = db.classes.filter((c) => c.sessionId === currentSessionId);
  const courseFor = (className: string, code: string) => currentCourses.find((c) => c.classId === classesNow.find((k) => k.name === className)?.id && c.id.endsWith(`_${code}`));

  type LiveSpec = { course?: Course; title: string; when: string; status: LiveSession["status"]; duration: number; recSeconds?: number };
  const live: LiveSpec[] = [];
  if (cfg.richContent) {
    const ict1a = courseFor("SHS 1A", "ICT");
    live.push(
      { course: ict1a, title: "Introduction to Networking", when: minutesFromNow(-5), status: "scheduled", duration: 60 },
      { course: courseFor("SHS 2B", "ICT"), title: "Spreadsheet formulas — live practice", when: minutesFromNow(180), status: "scheduled", duration: 60 },
      { course: ict1a, title: "Network devices Q&A", when: at(1, 10), status: "scheduled", duration: 45 },
      { course: courseFor("SHS 3A", "ICT"), title: "Cyber security clinic", when: at(2, 14), status: "scheduled", duration: 60 },
      { course: ict1a, title: "Computer Software — system vs application", when: at(-3, 10), status: "ended", duration: 90, recSeconds: 5072 },
      { course: ict1a, title: "Computer Hardware walkthrough", when: at(-8, 10), status: "ended", duration: 75, recSeconds: 4410 },
      { course: courseFor("SHS 2A", "ICT"), title: "Databases — keys and relationships", when: at(-5, 13), status: "ended", duration: 60, recSeconds: 3380 },
      { course: courseFor("SHS 1A", "MATH"), title: "Quadratic equations", when: minutesFromNow(60), status: "scheduled", duration: 60 },
      { course: courseFor("SHS 1B", "ENG"), title: "Comprehension techniques", when: minutesFromNow(120), status: "scheduled", duration: 60 },
      { course: courseFor("SHS 2A", "PHY"), title: "Motion and forces", when: minutesFromNow(240), status: "scheduled", duration: 60 },
      { course: courseFor("SHS 3C", "FACC"), title: "Final accounts revision", when: minutesFromNow(-240), status: "ended", duration: 60, recSeconds: 3510 },
      { course: courseFor("SHS 1A", "ISCI"), title: "States of matter", when: at(-2, 9), status: "ended", duration: 60, recSeconds: 3322 },
    );
  } else {
    live.push(
      { course: courseFor("SHS 1S", "MATH"), title: "Algebra refresher", when: minutesFromNow(90), status: "scheduled", duration: 60 },
      { course: courseFor("SHS 2B", "FACC"), title: "Trial balance", when: at(-2, 11), status: "ended", duration: 60, recSeconds: 3400 },
    );
  }
  live.forEach((l, i) => {
    if (!l.course) return;
    const liveId = `live_${cfg.code}_${i}`;
    const endedAt = l.status === "ended" ? new Date(new Date(l.when).getTime() + (l.recSeconds ?? l.duration * 60) * 1000).toISOString() : undefined;
    let recordingId: string | undefined;
    if (l.status === "ended" && l.recSeconds) {
      recordingId = `rec_${cfg.code}_${i}`;
      db.recordings.push({ id: recordingId, schoolId: sid, sessionId: currentSessionId, liveSessionId: liveId, courseId: l.course.id, classId: l.course.classId, subjectId: l.course.subjectId, teacherId: l.course.teacherId, title: l.title, date: l.when, durationSeconds: l.recSeconds, sizeMb: Math.round(l.recSeconds * 0.21), status: "ready", views: r.int(8, 40), url: SAMPLE_VIDEO_URL });
      const mod = db.modules.filter((m) => m.courseId === l.course!.id).sort((a, b) => b.order - a.order)[0];
      if (mod) db.contents.push({ id: `cnt_rec_${recordingId}`, moduleId: mod.id, courseId: l.course.id, type: "recording", title: `Recording — ${l.title}`, description: `Live class recorded ${new Date(l.when).toDateString()}.`, refId: recordingId, url: SAMPLE_VIDEO_URL, durationMinutes: Math.round(l.recSeconds / 60), order: 99, published: true, createdAt: endedAt! });
      // live attendance, auto-captured (spec §40)
      const roster = db.placements.filter((p) => p.classId === l.course!.classId);
      roster.forEach((p) => {
        const a = ability.get(p.studentId) ?? 0.7;
        const attended = rng(hashString(liveId + p.studentId)).next() < 0.55 + a * 0.45;
        const start = new Date(l.when);
        if (!attended) {
          db.attendance.push({ id: `att_${liveId}_${p.studentId}`, schoolId: sid, sessionId: currentSessionId, classId: l.course!.classId, studentId: p.studentId, date: l.when, kind: "live", liveSessionId: liveId, status: "absent" });
          return;
        }
        const lateBy = rng(hashString(p.studentId + liveId)).int(0, 14);
        const join = new Date(start.getTime() + lateBy * 60_000);
        const leave = new Date(start.getTime() + (l.recSeconds! - rng(hashString(liveId + p.studentId + "x")).int(0, 600)) * 1000);
        db.attendance.push({ id: `att_${liveId}_${p.studentId}`, schoolId: sid, sessionId: currentSessionId, classId: l.course!.classId, studentId: p.studentId, date: l.when, kind: "live", liveSessionId: liveId, joinTime: join.toISOString(), leaveTime: leave.toISOString(), durationMinutes: Math.round((leave.getTime() - join.getTime()) / 60_000), status: lateBy > 10 ? "late" : "present" });
      });
    }
    db.liveSessions.push({ id: liveId, schoolId: sid, sessionId: currentSessionId, courseId: l.course.id, subjectId: l.course.subjectId, classId: l.course.classId, teacherId: l.course.teacherId, title: l.title, scheduledAt: l.when, durationMinutes: l.duration, status: l.status, startedAt: l.status === "ended" ? l.when : undefined, endedAt, recordingId, waitingRoom: false });
  });

  // ---- physical attendance for the last 5 school days
  const days: string[] = [];
  for (let back = 1; days.length < 5 && back < 14; back++) {
    const d = new Date(now);
    d.setDate(d.getDate() - back);
    if (d.getDay() !== 0 && d.getDay() !== 6) days.push(d.toISOString().slice(0, 10));
  }
  for (const p of db.placements.filter((x) => x.sessionId === currentSessionId)) {
    for (const day of days) {
      const roll = rng(hashString(p.studentId + day)).next();
      const status = roll < 0.87 ? "present" : roll < 0.93 ? "late" : roll < 0.98 ? "absent" : "excused";
      db.attendance.push({ id: `att_${day}_${p.studentId}`, schoolId: sid, sessionId: currentSessionId, classId: p.classId, studentId: p.studentId, date: `${day}T07:30:00.000Z`, kind: "physical", status });
    }
  }

  // ---- announcements, events
  db.announcements.push(
    { id: `ann_${cfg.code}_1`, schoolId: sid, sessionId: currentSessionId, authorId: adminUser.id, title: "Welcome to the new academic year", body: "We welcome all students back for the 2026/2027 academic year. Please make sure you can log in to the learning platform and join your first live class.", createdAt: at(-20, 8) },
    { id: `ann_${cfg.code}_2`, schoolId: sid, sessionId: currentSessionId, authorId: adminUser.id, title: "Mid-semester examinations", body: "Mid-semester examinations begin in two weeks. Timetables are available from your class teacher.", createdAt: at(-4, 9) },
  );
  const cur = db.academicSessions.find((s) => s.id === currentSessionId)!;
  db.events.push(
    { id: `evt_${cfg.code}_1`, schoolId: sid, sessionId: currentSessionId, title: "PTA General Meeting", date: at(8, 10), kind: "event" },
    { id: `evt_${cfg.code}_2`, schoolId: sid, sessionId: currentSessionId, title: "Inter-house Sports Day", date: at(15, 8), kind: "event" },
    { id: `evt_${cfg.code}_3`, schoolId: sid, sessionId: currentSessionId, title: "Mid-semester examinations", date: at(14, 8), kind: "exam" },
    { id: `evt_${cfg.code}_4`, schoolId: sid, sessionId: currentSessionId, title: "Farmers' Day (holiday)", date: new Date(`${cur.startDate.slice(0, 4)}-12-05T00:00:00`).toISOString(), kind: "holiday" },
  );

  // ---- notifications for demo personas
  const firstStudent = db.students.find((s) => s.schoolId === sid && s.status === "active");
  if (cfg.richContent && firstStudent && ericTeacherId) {
    const studentUserId = firstStudent.userId;
    const ericUserId = db.teachers.find((x) => x.id === ericTeacherId)!.userId;
    db.notifications.push(
      { id: `ntf_${cfg.code}_s1`, userId: studentUserId, schoolId: sid, kind: "live_starting", title: "Live class starting", body: "ICT — SHS 1A: Introduction to Networking is starting now.", href: "/student/live", createdAt: minutesFromNow(-5), readBy: [] },
      { id: `ntf_${cfg.code}_s2`, userId: studentUserId, schoolId: sid, kind: "quiz", title: "New quiz", body: "Quiz 2 — Computer Software is due in 3 days.", href: "/student/quizzes", createdAt: at(-1, 14), readBy: [] },
      { id: `ntf_${cfg.code}_s3`, userId: studentUserId, schoolId: sid, kind: "assignment", title: "New assignment", body: "Assignment 2 — Computer Hardware Report is due in 5 days.", href: "/student/assignments", createdAt: at(-2, 9), readBy: [] },
      { id: `ntf_${cfg.code}_s4`, userId: studentUserId, schoolId: sid, kind: "graded", title: "Assignment graded", body: "Your Mid-Semester Test in ICT has been graded: 42/50.", href: "/student/grades", createdAt: at(-2, 16), readBy: [studentUserId] },
      { id: `ntf_${cfg.code}_s5`, userId: studentUserId, schoolId: sid, kind: "recording", title: "Recording available", body: "Computer Software — system vs application is now available to watch.", href: "/student/live", createdAt: at(-3, 12), readBy: [studentUserId] },
      { id: `ntf_${cfg.code}_t1`, userId: ericUserId, schoolId: sid, kind: "assignment", title: "New submissions", body: "10 students submitted Assignment 2 — Computer Hardware Report (SHS 1A).", href: "/teacher/assessments", createdAt: at(0, 7, 40), readBy: [] },
      { id: `ntf_${cfg.code}_t2`, userId: ericUserId, schoolId: sid, kind: "live_upcoming", title: "Upcoming live class", body: "Introduction to Networking (ICT — SHS 1A) starts soon.", href: "/teacher/live", createdAt: minutesFromNow(-30), readBy: [] },
    );
  }
  // ---- messages & forums (spec §41.2–41.3)
  if (cfg.richContent && firstStudent && ericTeacherId) {
    const ericUserId = db.teachers.find((x) => x.id === ericTeacherId)!.userId;
    const ict1a = courseFor("SHS 1A", "ICT")!;
    const roster1a = db.placements.filter((p) => p.classId === ict1a.classId).map((p) => db.students.find((s) => s.id === p.studentId)!);
    const [john, ama, kojo, s4, s5] = roster1a;
    const mensahUserId = db.teachers.find((x) => x.id === teacherIdByKey["mensah"])!.userId;
    const msgs = (conversationId: string, rows: [string, string, number][]) =>
      rows.forEach(([senderId, body, minsAgo], i) => db.messages.push({ id: `msg_${conversationId}_${i}`, conversationId, senderId, body, sentAt: minutesFromNow(-minsAgo), readBy: [senderId] }));
    const convo = (id: string, participantIds: string[], lastMinsAgo: number, subject?: string) =>
      db.conversations.push({ id, schoolId: sid, participantIds, subject, createdAt: minutesFromNow(-lastMinsAgo - 600), lastMessageAt: minutesFromNow(-lastMinsAgo) });

    convo("cnv_john_eric", [john!.userId, ericUserId], 35, "Assignment 2 question");
    msgs("cnv_john_eric", [
      [john!.userId, "Good morning Sir. For Assignment 2, should we include the printers in the lab as output devices?", 180],
      [ericUserId, "Good morning John. Yes — list every device you can see and say whether it is input, output or storage.", 150],
      [john!.userId, "Thank you Sir. Can we submit it as a Word document instead of PDF?", 40],
      [ericUserId, "Either is fine. Remember the deadline is Wednesday.", 35],
    ]);
    convo("cnv_eric_admin", [ericUserId, adminUser.id], 95, "Computer lab timetable");
    msgs("cnv_eric_admin", [
      [adminUser.id, "Mr. Dzontoh, the lab will be closed on Friday for maintenance. Please move your SHS 2B practical to Thursday.", 240],
      [ericUserId, "Noted, Madam. I'll inform the class and schedule a live session instead.", 95],
    ]);
    convo("cnv_john_mensah", [john!.userId, mensahUserId], 60 * 26);
    msgs("cnv_john_mensah", [
      [mensahUserId, "John, well done on the class test. Keep it up!", 60 * 27],
      [john!.userId, "Thank you Sir!", 60 * 26],
    ]);

    const thread = (id: string, course: Course, authorId: string, title: string, body: string, minsAgo: number, opts: Partial<ForumThread> = {}, replies: [string, string, number][] = []) => {
      replies.forEach(([a, b, m], i) => db.forumPosts.push({ id: `${id}_p${i}`, threadId: id, authorId: a, body: b, createdAt: minutesFromNow(-m) }));
      db.forumThreads.push({ id, courseId: course.id, schoolId: sid, sessionId: currentSessionId, authorId, title, body, createdAt: minutesFromNow(-minsAgo), lastActivityAt: minutesFromNow(-(replies.length ? Math.min(...replies.map((r) => r[2])) : minsAgo)), pinned: false, locked: false, isQuestion: false, readBy: [authorId], ...opts });
    };
    thread("thr_ict1a_welcome", ict1a, ericUserId, "Welcome to the ICT — SHS 1A forum", "Use this forum to ask questions about lessons, assignments and live classes. Be respectful, stay on topic, and help each other. Only students in SHS 1A taking ICT can see this forum.", 60 * 24 * 20, { pinned: true, locked: true });
    thread("thr_ict1a_ram", ict1a, ama!.userId, "Difference between RAM and ROM?", "I'm still confused about RAM and ROM. Which one keeps its data when the computer is switched off?", 60 * 30, { isQuestion: true, acceptedPostId: "thr_ict1a_ram_p1" }, [
      [kojo!.userId, "I think RAM keeps it because it is the main memory?", 60 * 29],
      [ericUserId, "Good question, Ama. **ROM** keeps its contents without power (it is non-volatile). **RAM** is volatile — everything in it is lost when the power goes off. That's why you must save your work to storage.", 60 * 28],
      [ama!.userId, "Thank you Sir, that's clear now.", 60 * 27],
    ]);
    thread("thr_ict1a_hw2", ict1a, john!.userId, "Assignment 2 — how long should the report be?", "Is one page the maximum or can we write more if we have pictures?", 120, { isQuestion: true }, [
      [s4!.userId, "The instructions say one page. I think pictures can go on a second page.", 90],
      [s5!.userId, "Same question here 🙏", 50],
    ]);
    thread("thr_ict1a_networking", ict1a, kojo!.userId, "Useful video on networks", "I found the lesson video on networking helpful. Does anyone have notes on network devices?", 60 * 5, {}, [[john!.userId, "I'll share mine after today's live class.", 60 * 4]]);

    const math1a = courseFor("SHS 1A", "MATH");
    if (math1a) thread("thr_math1a_quad", math1a, s4!.userId, "Quadratic formula question", "When do we use the quadratic formula instead of factorisation?", 60 * 8, { isQuestion: true }, [[mensahUserId, "Use factorisation when the expression factors easily. The formula always works — use it when factorising is difficult.", 60 * 7]]);
    const ict2b = courseFor("SHS 2B", "ICT");
    if (ict2b) thread("thr_ict2b_welcome", ict2b, ericUserId, "Welcome to the ICT — SHS 2B forum", "Post your spreadsheet questions here. Only SHS 2B ICT students can see this forum.", 60 * 24 * 20, { pinned: true });
  }

  db.notifications.push(
    { id: `ntf_${cfg.code}_a1`, userId: adminUser.id, schoolId: sid, kind: "system", title: "Student import completed", body: `${cfg.studentsPerClass * classProgrammes.length} students were imported into the ${cfg.levels[0]} intake.`, href: "/school/students", createdAt: at(-18, 11), readBy: [adminUser.id] },
    { id: `ntf_${cfg.code}_a2`, userId: null, schoolId: sid, kind: "announcement", title: "Mid-semester examinations", body: "Mid-semester examinations begin in two weeks.", href: "/notifications", createdAt: at(-4, 9), readBy: [] },
  );

  // ---- audit trail
  const log = (days: number, action: string, target: string, category: AuditLog["category"], actor: User = adminUser) =>
    db.auditLogs.push({ id: `aud_${cfg.code}_${db.auditLogs.length}`, at: at(days, r.int(8, 17), r.int(0, 59)), actorId: actor.id, actorName: actor.name, schoolId: sid, action, target, category });
  log(-26, "Academic session activated", `${cfg.years[cfg.years.length - 1]!.name} — ${cur.name}`, "academic");
  log(-25, "Programme created", "General Science", "academic");
  log(-24, "Class created", `${cfg.levels[0]}${classProgrammes[0]!.section}`, "academic");
  log(-22, "Teacher added", cfg.teachers[0] ? `${cfg.teachers[0].title} ${cfg.teachers[0].first} ${cfg.teachers[0].last}` : "Teacher", "user");
  log(-18, "Student imported", `${cfg.studentsPerClass * classProgrammes.length} records`, "user");
  log(-17, "Subjects assigned", "Core subjects → all classes", "academic");
  if (cfg.richContent) {
    const eric = db.users.find((u) => u.email === "eric.dzontoh@ridgeview.edu.gh")!;
    log(-14, "Assessment created", "Assignment 1 — ICT in Everyday Life", "assessment", eric);
    log(-8, "Live class started", "Computer Hardware walkthrough", "live", eric);
    log(-8, "Live class ended", "Computer Hardware walkthrough", "live", eric);
    log(-8, "Recording created", "Computer Hardware walkthrough", "live", eric);
    log(-3, "Grade updated", "Mid-Semester Test — SHS 1A", "assessment", eric);
    log(-2, "Grade exported", "ICT — SHS 1A gradebook (Excel)", "assessment", eric);
  }
  return ericTeacherId;
}

/** Spec §38 gradebook example: John 18/8/42, Ama 20/10/45, Kojo 15/7/38. */
const PINNED_SCORES: Record<number, number[]> = { 0: [18, 8, 42], 1: [20, 10, 45], 2: [15, 7, 38] };

function subjectName(code: string): string {
  return CORE_SUBJECTS.find(([, c]) => c === code)?.[0] ?? ELECTIVE_NAMES[code] ?? code;
}

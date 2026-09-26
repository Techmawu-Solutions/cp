import type { Course, Student, User, VacationBundle, VacationPrice, VacationRegistration } from "@/lib/types";
import type { DB } from "./seed";
import { AVATAR_COLORS, rng } from "@/lib/helpers";
import { DISTRICTS } from "./geography";
import { catProgrammeId, catSubjectId } from "./catalogue";
import { SAMPLE_VIDEO_URL, genericModules } from "./content-library";

/**
 * Vacation Classes (spec §49.1): a platform-run tenant with its own sessions,
 * bundles, pricing and paid registrations. Existing school students keep their
 * home account and gain a vacation Student record under the same user.
 */
export const VACATION_SCHOOL_ID = "sch_vacation";

const SUBJECTS: { code: string; name: string; fee: number; levels?: string[]; color: string }[] = [
  { code: "ENG", name: "English Language", fee: 200, color: "#2563eb" },
  { code: "MATH", name: "Core Mathematics", fee: 250, color: "#16a34a" },
  { code: "ISCI", name: "Integrated Science", fee: 220, color: "#0891b2" },
  { code: "SOC", name: "Social Studies", fee: 150, color: "#ca8a04" },
  { code: "ICT", name: "ICT", fee: 180, color: "#7c3aed" },
  { code: "PHY", name: "Physics", fee: 250, levels: ["shs1", "shs2", "shs3"], color: "#dc2626" },
  { code: "CHEM", name: "Chemistry", fee: 250, levels: ["shs1", "shs2", "shs3"], color: "#ea580c" },
  { code: "BIO", name: "Biology", fee: 220, levels: ["shs1", "shs2", "shs3"], color: "#059669" },
  { code: "EMATH", name: "Elective Mathematics", fee: 250, levels: ["shs1", "shs2", "shs3"], color: "#4f46e5" },
  { code: "ECON", name: "Economics", fee: 200, levels: ["shs1", "shs2", "shs3"], color: "#db2777" },
  { code: "FACC", name: "Financial Accounting", fee: 220, levels: ["shs1", "shs2", "shs3"], color: "#9333ea" },
];

const CLASSES = [
  { key: "jhs3", name: "JHS 3 — BECE Prep", level: "JHS 3" },
  { key: "shs1", name: "SHS 1", level: "SHS 1" },
  { key: "shs2", name: "SHS 2", level: "SHS 2" },
  { key: "shs3", name: "SHS 3 — WASSCE Prep", level: "SHS 3" },
];

const NEW_STUDENTS: [string, string, "M" | "F", string, string][] = [
  ["Nana", "Adomako", "M", "shs3", "Achimota Hills Academy"],
  ["Esi", "Quansah", "F", "shs3", "Cape Coast Methodist SHS"],
  ["Kelvin", "Owusu-Ansah", "M", "shs3", "Kumasi Academy"],
  ["Abigail", "Tetteh", "F", "shs3", "Tema Community SHS"],
  ["Samuel", "Nkansah", "M", "shs3", "Home-schooled"],
  ["Yaa", "Konadu", "F", "shs2", "Ejisu Presbyterian SHS"],
  ["Emmanuel", "Mensah", "M", "shs2", "Ho Technical Institute"],
  ["Dzifa", "Ahiable", "F", "shs2", "Keta Senior High School"],
  ["Prince", "Asamoah", "M", "shs1", "Obuasi SHS"],
  ["Mawuli", "Kpodo", "M", "shs1", "Aflao Community SHS"],
  ["Adwoa", "Sarpong", "F", "shs1", "Koforidua Secondary School"],
  ["Kojo", "Amankwah", "M", "jhs3", "Adenta Basic School"],
  ["Afua", "Boakye", "F", "jhs3", "St. Mary's JHS, Accra"],
  ["Ebo", "Hayford", "M", "jhs3", "Elmina Methodist JHS"],
  ["Naa", "Lamptey", "F", "jhs3", "La Presby JHS"],
  ["Eyram", "Dogbe", "F", "jhs3", "Hohoe E.P. JHS"],
  ["Fiifi", "Annan", "M", "shs3", "Mfantsipim"],
  ["Selorm", "Agbeko", "M", "shs2", "Sokode SHS"],
];

type Time = { at: (days: number, hour?: number, minute?: number) => string; minutesFromNow: (m: number) => string };

export function seedVacation(db: DB, t: Time) {
  const { at, minutesFromNow } = t;
  const r = rng(909);
  const sid = VACATION_SCHOOL_ID;
  db.schools.push({
    id: sid,
    kind: "vacation",
    name: "ClassProject Vacation Classes",
    shortName: "EVC",
    type: "SHS",
    ownership: "private",
    waecCode: "",
    emisCode: "",
    regionId: "gar",
    districtId: DISTRICTS.find((d) => d.name === "Accra Metro")!.id,
    address: "Online — live virtual classes",
    phone: "+233 30 290 0000",
    email: "vacation@classproject.com",
    website: "https://classproject.com/vacation",
    logoColor: "#ea580c",
    status: "active",
    dateOnboarded: "2026-06-01T09:00:00.000Z",
    sessionStructure: "vacation",
    stats: { students: 0, teachers: 0, activeStudents: 0, activeTeachers: 0, liveClasses: 0, assignments: 0, quizzes: 0, engagement: 0 },
  });
  const admin: User = { id: "usr_vac_admin", name: "Adwoa Mensah-Bonsu", email: "vacation@classproject.com", roleId: "role_school_admin", schoolId: sid, status: "active", lastActive: minutesFromNow(-12), avatarColor: "#ea580c" };
  db.users.push(admin);

  db.academicYears.push({ id: "ay_vac_2627", schoolId: sid, name: "2026/2027", startDate: "2026-09-01", endDate: "2027-08-31" });
  const sessionId = "ses_vac_oct26";
  db.academicSessions.push(
    { id: sessionId, schoolId: sid, academicYearId: "ay_vac_2627", type: "vacation", name: "October Vacation Classes", startDate: "2026-09-28", endDate: "2026-10-23", status: "active" },
    { id: "ses_vac_dec26", schoolId: sid, academicYearId: "ay_vac_2627", type: "vacation", name: "Christmas Vacation Classes", startDate: "2026-12-14", endDate: "2027-01-08", status: "upcoming" },
  );
  db.programmes.push({ id: "prg_vac", schoolId: sid, sessionId, catalogueId: catProgrammeId("GSCI"), name: "Vacation Classes", code: "VAC", description: "All vacation cohorts.", status: "active" });

  const classId = (key: string) => `cls_vac_${key}`;
  CLASSES.forEach((c) => db.classes.push({ id: classId(c.key), schoolId: sid, sessionId, programmeId: "prg_vac", name: c.name, level: c.level, capacity: 300, status: "active" }));
  const subjectId = (code: string) => `sub_vac_${code}`;
  SUBJECTS.forEach((s) => db.subjects.push({ id: subjectId(s.code), schoolId: sid, sessionId, catalogueId: catSubjectId(s.code), name: s.name, code: s.code, description: `${s.name} vacation revision.`, color: s.color }));

  db.vacationPrices = SUBJECTS.map((s) => ({ id: `vp_${s.code}`, sessionId, subjectId: subjectId(s.code), fee: s.fee, classIds: (s.levels ?? CLASSES.map((c) => c.key)).map(classId) }) as VacationPrice);
  const fee = (codes: string[]) => codes.reduce((a, c) => a + SUBJECTS.find((s) => s.code === c)!.fee, 0);
  const bundle = (id: string, name: string, description: string, classKeys: string[], codes: string[], price: number, featured = false): VacationBundle => ({ id, sessionId, name, description, classIds: classKeys.map(classId), subjectIds: codes.map(subjectId), price, active: true, featured });
  db.vacationBundles = [
    bundle("vb_wassce_sci", "WASSCE Science Bundle", "Core Maths, English, Integrated Science, Physics, Chemistry and Biology — full WASSCE revision.", ["shs3"], ["MATH", "ENG", "ISCI", "PHY", "CHEM", "BIO"], 1050, true),
    bundle("vb_wassce_bus", "WASSCE Business Bundle", "Core Maths, English, Social Studies, Economics and Financial Accounting.", ["shs3"], ["MATH", "ENG", "SOC", "ECON", "FACC"], 850),
    bundle("vb_bece", "BECE Core Bundle", "Maths, English, Integrated Science and Social Studies for JHS 3.", ["jhs3"], ["MATH", "ENG", "ISCI", "SOC"], 650, true),
    bundle("vb_sci_found", "Science Foundation", "Build strong foundations in Maths, Physics, Chemistry and Biology.", ["shs1", "shs2"], ["MATH", "PHY", "CHEM", "BIO"], 800, true),
    bundle("vb_core4", "Core Four", "The four core subjects, for any level.", [], ["MATH", "ENG", "ISCI", "SOC"], 700),
  ];
  void fee;

  // ---- teachers: new vacation teachers + existing school teachers linked in (same user account)
  const teachers: { id: string; userId: string; title: "Mr." | "Mrs." | "Ms." | "Dr."; first: string; last: string; spec: string; codes: string[]; existing?: boolean }[] = [
    { id: "tch_vac_arthur", userId: "usr_vac_t_arthur", title: "Mr.", first: "Kwesi", last: "Arthur", spec: "Mathematics, Elective Mathematics", codes: ["MATH", "EMATH"] },
    { id: "tch_vac_agbenu", userId: "usr_vac_t_agbenu", title: "Mrs.", first: "Dzifa", last: "Agbenu", spec: "English Language, Social Studies", codes: ["ENG", "SOC"] },
    { id: "tch_vac_boadu", userId: "usr_vac_t_boadu", title: "Dr.", first: "Kofi", last: "Boadu", spec: "Physics, Chemistry", codes: ["PHY", "CHEM"] },
    { id: "tch_vac_sarfo", userId: "usr_vac_t_sarfo", title: "Ms.", first: "Akua", last: "Sarfo", spec: "Biology, Integrated Science", codes: ["BIO", "ISCI"] },
    { id: "tch_vac_eric", userId: "usr_rv_t_eric", title: "Mr.", first: "Eric", last: "Dzontoh", spec: "ICT", codes: ["ICT"], existing: true },
    { id: "tch_vac_osei", userId: "usr_rv_t_osei", title: "Mr.", first: "Daniel", last: "Osei", spec: "Economics, Financial Accounting", codes: ["ECON", "FACC"], existing: true },
  ];
  teachers.forEach((tc, i) => {
    if (!tc.existing) db.users.push({ id: tc.userId, name: `${tc.title} ${tc.first} ${tc.last}`, email: `${tc.first.toLowerCase()}.${tc.last.toLowerCase()}@vacation.classproject.com`, roleId: "role_teacher", schoolId: sid, status: "active", lastActive: at(-r.int(0, 3), r.int(8, 20)), avatarColor: AVATAR_COLORS[(i + 3) % AVATAR_COLORS.length]! });
    db.teachers.push({ id: tc.id, userId: tc.userId, schoolId: sid, staffNumber: `EVC/T/${String(i + 1).padStart(3, "0")}`, title: tc.title, firstName: tc.first, lastName: tc.last, gender: tc.title === "Mr." ? "M" : "F", specialization: tc.spec, phone: `+233 24 ${r.int(100, 999)} ${r.int(1000, 9999)}`, status: "active" });
  });

  // ---- registrations
  let n = 0;
  const register = (u: { userId: string; first: string; last: string; gender: "M" | "F"; homeSchoolId?: string; homeSchoolName?: string }, classKey: string, pick: { bundleId?: string; codes?: string[] }, status: VacationRegistration["status"], source: VacationRegistration["source"], daysAgo: number) => {
    n++;
    const b = db.vacationBundles.find((x) => x.id === pick.bundleId);
    const subjectIds = b ? b.subjectIds : pick.codes!.map(subjectId);
    const amount = b ? b.price : subjectIds.reduce((a, id) => a + db.vacationPrices.find((p) => p.subjectId === id)!.fee, 0);
    const studentId = `stu_vac_${n}`;
    const st: Student = { id: studentId, userId: u.userId, schoolId: sid, studentNumber: `EVC/26/${String(n).padStart(4, "0")}`, firstName: u.first, lastName: u.last, gender: u.gender, dateOfBirth: "2009-05-10", guardianName: `Parent of ${u.first}`, guardianPhone: `+233 20 ${r.int(100, 999)} ${r.int(1000, 9999)}`, status: "active", createdAt: at(-daysAgo, 10) };
    db.students.push(st);
    const createdAt = at(-daysAgo, r.int(8, 20), r.int(0, 59));
    const methods = ["momo_mtn", "momo_mtn", "momo_telecel", "momo_airteltigo", "card"] as const;
    const method = methods[n % methods.length]!;
    db.vacationRegistrations.push({
      id: `vreg_${n}`,
      sessionId,
      userId: u.userId,
      studentId,
      classId: classId(classKey),
      bundleId: pick.bundleId,
      subjectIds,
      amount,
      status,
      source,
      homeSchoolId: u.homeSchoolId,
      homeSchoolName: u.homeSchoolName,
      homeSchoolType: u.homeSchoolName ? (classKey === "jhs3" ? "JHS" : "SHS") : undefined,
      createdAt,
      payment: status === "paid" ? { method, reference: `EVC${(2600000 + n * 7919).toString(36).toUpperCase()}`, paidAt: createdAt, phone: method === "card" ? undefined : `024${r.int(1000000, 9999999)}`, last4: method === "card" ? String(r.int(1000, 9999)) : undefined } : undefined,
    });
    if (status === "paid") {
      db.placements.push({ id: `plc_vac_${n}`, schoolId: sid, sessionId, studentId, classId: classId(classKey) });
      subjectIds.forEach((subId) => db.enrollments.push({ id: `enr_vac_${n}_${subId}`, schoolId: sid, sessionId, studentId, classId: classId(classKey), subjectId: subId, enrolledAt: createdAt }));
    }
  };

  // Existing Ridgeview / Lakeside students: account and details picked up, still pay.
  const existing = (first: string, last: string) => db.students.find((s) => s.firstName === first && s.lastName === last && s.status === "active");
  const ama = existing("Ama", "Boateng");
  if (ama) register({ userId: ama.userId, first: ama.firstName, last: ama.lastName, gender: ama.gender, homeSchoolId: ama.schoolId, homeSchoolName: db.schools.find((s) => s.id === ama.schoolId)?.name }, "shs1", { bundleId: "vb_sci_found" }, "paid", "existing", 6);
  const rvShs3 = db.students.filter((s) => s.schoolId === "sch_ridgeview" && s.status === "active" && db.placements.some((p) => p.studentId === s.id && p.classId === "cls_rv_2627s1_SHS3A")).slice(0, 4);
  rvShs3.forEach((s, i) => register({ userId: s.userId, first: s.firstName, last: s.lastName, gender: s.gender, homeSchoolId: s.schoolId, homeSchoolName: "Ridgeview Senior High School" }, "shs3", i % 2 ? { codes: ["MATH", "PHY", "CHEM"] } : { bundleId: "vb_wassce_sci" }, "paid", "existing", 5 - i));
  const ls = db.students.find((s) => s.schoolId === "sch_lakeside" && s.status === "active");
  if (ls) register({ userId: ls.userId, first: ls.firstName, last: ls.lastName, gender: ls.gender, homeSchoolId: ls.schoolId, homeSchoolName: "Lakeside Senior High School" }, "shs1", { codes: ["MATH", "ENG"] }, "awaiting_payment", "existing", 0);

  // New students who aren't on the platform through a school.
  NEW_STUDENTS.forEach(([first, last, gender, classKey, homeSchoolName], i) => {
    const userId = `usr_vac_s${i + 1}`;
    db.users.push({ id: userId, name: `${first} ${last}`, email: `${first.toLowerCase()}.${last.toLowerCase().replace(/[^a-z]/g, "")}@gmail.com`, phone: `+233 24 ${r.int(100, 999)} ${r.int(1000, 9999)}`, roleId: "role_student", schoolId: sid, status: "active", lastActive: at(-r.int(0, 3), r.int(8, 22)), avatarColor: AVATAR_COLORS[i % AVATAR_COLORS.length]! });
    const pick = classKey === "jhs3" ? { bundleId: "vb_bece" } : classKey === "shs3" ? (i % 2 ? { bundleId: "vb_wassce_bus" } : { bundleId: "vb_wassce_sci" }) : i % 3 === 0 ? { codes: ["MATH", "EMATH", "ICT"] } : { bundleId: "vb_sci_found" };
    register({ userId, first, last, gender, homeSchoolName }, classKey, pick, i === 4 || i === 13 ? "awaiting_payment" : "paid", "new", r.int(0, 12));
  });

  // ---- courses: teacher matched per subject × class; two left unmatched to show Teacher Matching.
  const unmatched = new Set([`${classId("shs3")}:${subjectId("BIO")}`, `${classId("shs2")}:${subjectId("EMATH")}`]);
  const pairs = new Set(db.enrollments.filter((e) => e.schoolId === sid).map((e) => `${e.classId}:${e.subjectId}`));
  const courses: Course[] = [];
  for (const pair of pairs) {
    if (unmatched.has(pair)) continue;
    const [cId, sId] = pair.split(":") as [string, string];
    const code = sId.replace("sub_vac_", "");
    const tc = teachers.find((x) => x.codes.includes(code));
    if (!tc) continue;
    db.teachingAssignments.push({ id: `ta_vac_${cId}_${code}`, schoolId: sid, sessionId, subjectId: sId, classId: cId, teacherId: tc.id });
    const cls = CLASSES.find((c) => classId(c.key) === cId)!;
    const subject = SUBJECTS.find((s) => s.code === code)!;
    const course: Course = { id: `crs_vac_${cls.key}_${code}`, schoolId: sid, sessionId, subjectId: sId, classId: cId, teacherId: tc.id, title: `${subject.name} — ${cls.name}`, description: `Vacation revision: ${subject.name}.` };
    courses.push(course);
    db.courses.push(course);
    genericModules(subject.name).forEach((m, mi) => {
      const moduleId = `mod_${course.id}_${mi}`;
      db.modules.push({ id: moduleId, courseId: course.id, title: m.title.replace("Unit", "Week"), description: m.description, order: mi, published: true });
      m.items.forEach((it, ii) => db.contents.push({ id: `cnt_${moduleId}_${ii}`, moduleId, courseId: course.id, type: it.type, title: it.title, description: it.description, body: it.body, url: it.url, fileName: it.fileName, fileSize: it.fileSize, durationMinutes: it.durationMinutes, order: ii, published: true, createdAt: at(-3 + mi) }));
    });
  }

  // ---- live classes, a recording and an assessment
  const math3 = courses.find((c) => c.id === "crs_vac_shs3_MATH");
  if (math3) {
    db.liveSessions.push({ id: "live_vac_0", schoolId: sid, sessionId, courseId: math3.id, subjectId: math3.subjectId, classId: math3.classId, teacherId: math3.teacherId, title: "WASSCE past questions: Algebra", scheduledAt: minutesFromNow(45), durationMinutes: 90, status: "scheduled", waitingRoom: false });
    db.liveSessions.push({ id: "live_vac_1", schoolId: sid, sessionId, courseId: math3.id, subjectId: math3.subjectId, classId: math3.classId, teacherId: math3.teacherId, title: "Orientation & diagnostic test review", scheduledAt: at(-1, 17), durationMinutes: 60, status: "ended", startedAt: at(-1, 17), endedAt: at(-1, 18), recordingId: "rec_vac_1", waitingRoom: false });
    db.recordings.push({ id: "rec_vac_1", schoolId: sid, sessionId, liveSessionId: "live_vac_1", courseId: math3.id, classId: math3.classId, subjectId: math3.subjectId, teacherId: math3.teacherId, title: "Orientation & diagnostic test review", date: at(-1, 17), durationSeconds: 3540, sizeMb: 740, status: "ready", views: 9, url: SAMPLE_VIDEO_URL });
    db.assessments.push({ id: "asm_vac_math3_q1", schoolId: sid, sessionId, courseId: math3.id, subjectId: math3.subjectId, classId: math3.classId, teacherId: math3.teacherId, title: "Diagnostic Quiz — Algebra", description: "Ten-minute check before we start.", type: "quiz", totalMarks: 6, durationMinutes: 10, dueDate: at(3, 23, 59), status: "published", createdAt: at(-1, 9), questions: [
      { id: "vq1", type: "mcq", prompt: "Solve 2x + 3 = 11.", options: ["x = 3", "x = 4", "x = 7", "x = 8"], answer: "1", marks: 2 },
      { id: "vq2", type: "true_false", prompt: "(a + b)² = a² + b²", answer: "false", marks: 2 },
      { id: "vq3", type: "fill_blank", prompt: "The value of 3² × 2 is ____.", answer: "18", marks: 2 },
    ] });
  }

  const pending = db.vacationRegistrations.filter((x) => x.status === "awaiting_payment").length;
  db.notifications.push({ id: "ntf_vac_admin", userId: admin.id, schoolId: sid, kind: "system", title: `${pending} registrations awaiting payment`, body: "Follow up with students who started registering but haven't paid.", href: "/school/vacation/registrations", createdAt: at(0, 8), readBy: [] });
  if (ama) db.notifications.push({ id: "ntf_vac_ama", userId: ama.userId, schoolId: null, kind: "system", title: "Vacation Classes: payment received", body: "You're registered for the Science Foundation bundle. Switch to Vacation Classes from the top bar.", href: "/student/dashboard", createdAt: at(-6, 11), readBy: [] });
  db.auditLogs.push(
    { id: "aud_vac_1", at: at(-30, 10), actorId: "usr_super", actorName: "Platform Administrator", schoolId: sid, action: "Vacation session opened", target: "October Vacation Classes 2026", category: "academic" },
    { id: "aud_vac_2", at: at(-29, 11), actorId: admin.id, actorName: admin.name, schoolId: sid, action: "Bundles published", target: `${db.vacationBundles.length} bundles`, category: "academic" },
  );
}

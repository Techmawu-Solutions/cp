"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "@/components/common/status-badge";
import { ImportWizard, type ImportIssue } from "@/components/tables/import-wizard";
import { createStudents, createTeachers, importCatalogueProgrammes, importCatalogueSubjects } from "@/lib/actions";
import { downloadBlob, toCsv } from "@/lib/helpers";
import { useStore } from "@/lib/store";
import { admissionYearProblem, indexNumberOf, takenIndexNumbers } from "@/lib/students";
import { inCatalogueOf } from "@/lib/data/geography";
import type { ID, SchoolClass, Teacher } from "@/lib/types";

/**
 * Bulk imports from CSV or Excel (spec section 23). Used by school administrators for their
 * own school, and by the Super Administrator for any school (students, teachers) and the
 * platform catalogue (programmes, subjects).
 */

const key = (s: string | undefined) => (s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
const status = (issues: ImportIssue[]) => (issues.length ? <StatusBadge tone={issues.every((i) => i.kind === "warning") ? "amber" : "red"}>{issues.map((i) => i.message).join(", ")}</StatusBadge> : <StatusBadge status="ready">Ready</StatusBadge>);
const csv = (rows: string[][], filename: string) => downloadBlob(new Blob([toCsv(rows)], { type: "text/csv" }), filename);

export function TemplateButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="outline" onClick={onClick}>
      <Download /> Download template
    </Button>
  );
}

function Done({ count, label, note, viewHref, viewLabel, onAgain }: { count: number; label: string; note: string; viewHref?: string; viewLabel?: string; onAgain: () => void }) {
  const router = useRouter();
  return (
    <Card>
      <CardContent className="py-8 text-center">
        <p className="text-lg font-semibold">
          {count} {label}
        </p>
        <p className="text-sm text-muted-foreground">{note}</p>
        <div className="mt-4 flex justify-center gap-2">
          <Button variant="outline" onClick={onAgain}>
            Import another file
          </Button>
          {viewHref && <Button onClick={() => router.push(viewHref)}>{viewLabel}</Button>}
        </div>
      </CardContent>
    </Card>
  );
}

// ------------------------------------------------------------------ students

export const STUDENT_COLUMNS = ["first_name", "last_name", "gender", "date_of_birth", "admission_year", "jhs_index_number", "class", "guardian_name", "guardian_phone", "email"] as const;
type StudentRow = Record<(typeof STUDENT_COLUMNS)[number] | "index_number", string>;

/** Header names schools commonly use for these columns. */
const STUDENT_ALIASES: Record<string, string[]> = {
  jhs_index_number: ["jhs_index", "jhs_index_no", "bece_index", "bece_index_number", "bece_index_no", "index_no", "jhs_number"],
  admission_year: ["year_of_admission", "admitted", "admission", "year_admitted", "intake_year"],
  date_of_birth: ["dob", "birth_date"],
  first_name: ["firstname", "given_name"],
  last_name: ["lastname", "surname", "family_name"],
};

/**
 * The JHS index from a row: digits only, with leading zeros Excel may have
 * dropped put back. A full 12-digit index number (JHS index + admission year)
 * is accepted too and trimmed back to the JHS index.
 */
const jhsOf = (r: StudentRow) => {
  const digits = (r.jhs_index_number ?? "").replace(/\D/g, "");
  if (digits.length === 12 && digits.endsWith((r.admission_year ?? "").trim().slice(-2))) return digits.slice(0, 10);
  return digits.length >= 7 && digits.length < 10 ? digits.padStart(10, "0") : digits;
};
const rowIndex = (r: StudentRow) => (/^\d{10}$/.test(jhsOf(r)) && !admissionYearProblem((r.admission_year ?? "").trim()) ? indexNumberOf(jhsOf(r), r.admission_year.trim()) : "");

export function studentTemplate(classes: SchoolClass[]) {
  const c1 = classes[0]?.name ?? "SHS 1A";
  const y = String(new Date().getFullYear());
  csv([[...STUDENT_COLUMNS], ["Akosua", "Mensah", "F", "2010-04-12", y, "0012345678", c1, "Yaw Mensah", "+233 24 555 0101", ""], ["Kwabena", "Asare", "M", "2010-08-30", y, "0012345679", c1, "Ama Asare", "+233 20 555 0192", ""]], "students-import-template.csv");
}

/** Students for one school, placed into that session's classes by class name. Student IDs are generated; the index number matches existing students. */
export function StudentImport({ schoolId, sessionId, classes, viewHref }: { schoolId: ID; sessionId: ID | null; classes: SchoolClass[]; viewHref?: string }) {
  const [autoEnroll, setAutoEnroll] = useState(true);
  const [done, setDone] = useState<number | null>(null);
  const allStudents = useStore((s) => s.students);
  const schools = useStore((s) => s.schools);
  const classByName = new Map(classes.map((c) => [key(c.name), c]));

  const validate = useCallback(
    (rows: StudentRow[]): ImportIssue[][] => {
      // Index numbers already on the platform — a match means the student is already registered.
      const existing = takenIndexNumbers(allStudents, schools);
      const seen = new Map<string, number>();
      rows.forEach((r) => {
        const k = rowIndex(r);
        if (k) seen.set(k, (seen.get(k) ?? 0) + 1);
      });
      return rows.map((r) => {
        const issues: ImportIssue[] = [];
        const jhs = jhsOf(r);
        if (admissionYearProblem((r.admission_year ?? "").trim())) issues.push({ field: "admission_year", message: r.admission_year ? "Invalid admission year" : "Missing admission year" });
        if (!/^\d{10}$/.test(jhs)) issues.push({ field: "jhs_index_number", message: r.jhs_index_number ? "JHS index must be 10 digits" : "Missing JHS index number" });
        else if ((r.jhs_index_number ?? "").replace(/\D/g, "").length < 10) issues.push({ field: "jhs_index_number", message: "Leading zeros restored", kind: "warning" });
        const idx = rowIndex(r);
        if (idx && existing.has(idx)) issues.push({ field: "jhs_index_number", message: `Already registered: ${existing.get(idx)}`, kind: "duplicate" });
        else if (idx && (seen.get(idx) ?? 0) > 1) issues.push({ field: "jhs_index_number", message: "Same index number twice in this file", kind: "duplicate" });
        if (!r.first_name || !r.last_name) issues.push({ field: "first_name", message: "Missing name" });
        if (r.class && !classByName.has(key(r.class))) issues.push({ field: "class", message: "Invalid class" });
        if (r.gender && !/^(m|f|male|female)$/i.test(r.gender)) issues.push({ field: "gender", message: "Invalid gender" });
        if (r.date_of_birth && Number.isNaN(Date.parse(r.date_of_birth))) issues.push({ field: "date_of_birth", message: "Invalid date of birth" });
        return issues;
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allStudents, schools, classes],
  );

  if (done !== null) return <Done count={done} label="students created" note={`They've been invited to sign in${autoEnroll ? " and registered for their class subjects" : ""}.`} viewHref={viewHref} viewLabel="View students" onAgain={() => setDone(null)} />;
  return (
    <ImportWizard<StudentRow>
      columns={[...STUDENT_COLUMNS]}
      requiredColumns={["first_name", "last_name", "admission_year", "jhs_index_number"]}
      aliases={STUDENT_ALIASES}
      prepare={(r) => ({ ...r, index_number: rowIndex(r) })}
      validate={validate}
      entityLabel="students"
      previewColumns={[
        { key: "first_name", label: "First name" },
        { key: "jhs_index_number", label: "JHS index" },
        { key: "admission_year", label: "Admitted" },
        { key: "index_number", label: "Index number" },
        { key: "last_name", label: "Last name" },
        { key: "gender", label: "Gender" },
        { key: "class", label: "Class" },
        { key: "guardian_phone", label: "Guardian phone" },
      ]}
      renderStatus={status}
      extraOptions={
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={autoEnroll} onCheckedChange={(c) => setAutoEnroll(!!c)} /> Register imported students for all subjects taught in their class
        </label>
      }
      onConfirm={(rows) => {
        const created = createStudents(
          schoolId,
          sessionId,
          rows.map((r) => ({
            jhsIndexNumber: jhsOf(r),
            admissionYear: Number(r.admission_year),
            firstName: r.first_name.trim(),
            lastName: r.last_name.trim(),
            gender: /^f/i.test(r.gender ?? "") ? "F" : "M",
            dateOfBirth: r.date_of_birth || "",
            guardianName: r.guardian_name ?? "",
            guardianPhone: r.guardian_phone ?? "",
            email: r.email,
            classId: r.class ? classByName.get(key(r.class))?.id : undefined,
          })),
          { autoEnroll, source: "import" },
        );
        toast.success(`${created.length} students imported`);
        setDone(created.length);
      }}
    />
  );
}

// ------------------------------------------------------------------ teachers

const TEACHER_COLUMNS = ["title", "first_name", "last_name", "gender", "email", "phone", "staff_id", "specialization"] as const;
type TeacherRow = Record<(typeof TEACHER_COLUMNS)[number], string>;
const TITLES: Teacher["title"][] = ["Mr.", "Mrs.", "Ms.", "Dr.", "Rev."];
const titleOf = (v: string) => TITLES.find((t) => key(t) === key(v));

export function teacherTemplate() {
  csv([[...TEACHER_COLUMNS], ["Mrs.", "Abena", "Owusu", "F", "abena.owusu@school.edu.gh", "+233 24 555 0110", "", "English Language"], ["Mr.", "Kofi", "Asante", "M", "kofi.asante@school.edu.gh", "+233 20 555 0120", "", "Physics, Chemistry"]], "teachers-import-template.csv");
}

/** Teachers for one school. They're invited by email; subjects and classes are assigned afterwards (spec section 20). */
export function TeacherImport({ schoolId, viewHref }: { schoolId: ID; viewHref?: string }) {
  const [done, setDone] = useState<number | null>(null);
  const users = useStore((s) => s.users);
  const teachers = useStore((s) => s.teachers);

  const validate = useCallback(
    (rows: TeacherRow[]): ImportIssue[][] => {
      const emails = new Set(users.map((u) => u.email.toLowerCase()));
      const staffIds = new Set(teachers.filter((t) => t.schoolId === schoolId).map((t) => t.staffNumber.toLowerCase()));
      const count = (f: (r: TeacherRow) => string) => rows.reduce((m, r) => (f(r) ? m.set(f(r), (m.get(f(r)) ?? 0) + 1) : m), new Map<string, number>());
      const fileEmails = count((r) => (r.email ?? "").trim().toLowerCase());
      const fileStaff = count((r) => (r.staff_id ?? "").trim().toLowerCase());
      return rows.map((r) => {
        const issues: ImportIssue[] = [];
        const email = (r.email ?? "").trim().toLowerCase();
        const staff = (r.staff_id ?? "").trim().toLowerCase();
        if (!r.first_name || !r.last_name) issues.push({ field: "first_name", message: "Missing name" });
        if (!/^\S+@\S+\.\S+$/.test(email)) issues.push({ field: "email", message: email ? "Invalid email" : "Missing email" });
        else if (emails.has(email)) issues.push({ field: "email", message: "A user with this email already exists", kind: "duplicate" });
        else if ((fileEmails.get(email) ?? 0) > 1) issues.push({ field: "email", message: "Same email twice in this file", kind: "duplicate" });
        if (staff && staffIds.has(staff)) issues.push({ field: "staff_id", message: "Staff ID already used at this school", kind: "duplicate" });
        else if (staff && (fileStaff.get(staff) ?? 0) > 1) issues.push({ field: "staff_id", message: "Same staff ID twice in this file", kind: "duplicate" });
        if (r.title && !titleOf(r.title)) issues.push({ field: "title", message: "Title must be Mr., Mrs., Ms., Dr. or Rev." });
        if (r.gender && !/^(m|f|male|female)$/i.test(r.gender)) issues.push({ field: "gender", message: "Invalid gender" });
        if (!staff) issues.push({ field: "staff_id", message: "Staff ID will be generated", kind: "warning" });
        return issues;
      });
    },
    [users, teachers, schoolId],
  );

  if (done !== null) return <Done count={done} label="teachers created" note="They've been invited by email. Assign their subjects and classes from the school's Subjects page." viewHref={viewHref} viewLabel="View teachers" onAgain={() => setDone(null)} />;
  return (
    <ImportWizard<TeacherRow>
      columns={[...TEACHER_COLUMNS]}
      requiredColumns={["first_name", "last_name", "email"]}
      aliases={{ first_name: ["firstname", "given_name"], last_name: ["lastname", "surname"], staff_id: ["staff_number", "staff_no", "staffid"], specialization: ["specialisation", "subjects", "subject"], phone: ["phone_number", "mobile", "telephone"] }}
      validate={validate}
      entityLabel="teachers"
      previewColumns={[
        { key: "title", label: "Title" },
        { key: "first_name", label: "First name" },
        { key: "last_name", label: "Last name" },
        { key: "email", label: "Email" },
        { key: "staff_id", label: "Staff ID" },
        { key: "specialization", label: "Specialisation" },
      ]}
      renderStatus={status}
      onConfirm={(rows) => {
        const created = createTeachers(
          schoolId,
          rows.map((r) => {
            const female = /^f/i.test(r.gender ?? "") || /^(mrs|ms)/i.test(r.title ?? "");
            return { title: titleOf(r.title ?? "") ?? (female ? "Ms." : "Mr."), firstName: r.first_name.trim(), lastName: r.last_name.trim(), gender: female ? "F" : "M", email: r.email.trim().toLowerCase(), phone: r.phone ?? "", staffNumber: r.staff_id, specialization: r.specialization ?? "", status: "active" };
          }),
        );
        toast.success(`${created.length} teachers imported`);
        setDone(created.length);
      }}
    />
  );
}

// ------------------------------------------------------------------ catalogue programmes & subjects

/*
 * Programmes and subjects are imported into one country's catalogue only (spec section 17.1).
 * That country's schools then choose from it; nothing is added to a school directly. A code or
 * name already in that country's catalogue is a duplicate and skipped.
 */

const PROGRAMME_COLUMNS = ["code", "name", "description"] as const;
type ProgrammeRow = Record<(typeof PROGRAMME_COLUMNS)[number], string>;
const SUBJECT_COLUMNS = ["code", "name", "category", "programme_codes", "description"] as const;
type SubjectRow = Record<(typeof SUBJECT_COLUMNS)[number], string>;

export function programmeTemplate() {
  csv([[...PROGRAMME_COLUMNS], ["HOSP", "Hospitality and Tourism", "Catering, front office and tourism with work placements."], ["CREART", "Creative Arts and Design", "Music, drama, dance and digital design."]], "programmes-import-template.csv");
}
export function subjectTemplate() {
  csv([[...SUBJECT_COLUMNS], ["ROBO", "Robotics", "elective", "STEM; GSCI", "Building and programming simple robots."], ["ENTR", "Entrepreneurship", "elective", "BUS", "Starting and running a small business."]], "subjects-import-template.csv");
}

/** Flags rows whose code or name repeats in the file, or is already in the catalogue. */
function catalogueIssues<R extends { code: string; name: string }>(rows: R[], existing: { code: string; name: string }[], what: string): ImportIssue[][] {
  const seen = new Map<string, number>();
  rows.forEach((r) => seen.set(key(r.code || r.name), (seen.get(key(r.code || r.name)) ?? 0) + 1));
  return rows.map((r) => {
    const issues: ImportIssue[] = [];
    if (!r.name) issues.push({ field: "name", message: "Missing name" });
    if (!r.code) issues.push({ field: "code", message: "Missing code" });
    const hit = existing.find((c) => key(c.code) === key(r.code)) ?? existing.find((c) => key(c.name) === key(r.name));
    if (hit) issues.push({ field: "code", message: `Already in the catalogue as ${hit.name}`, kind: "duplicate" });
    else if ((seen.get(key(r.code || r.name)) ?? 0) > 1) issues.push({ field: "code", message: `Same ${what} twice in this file`, kind: "duplicate" });
    return issues;
  });
}

export function ProgrammeImport({ countryId, viewHref }: { countryId: ID; viewHref?: string }) {
  const [done, setDone] = useState<number | null>(null);
  const catalogue = useStore((s) => s.catalogueProgrammes).filter(inCatalogueOf(countryId));

  if (done !== null) return <Done count={done} label="programmes added to the catalogue" note="Every school can now choose them." viewHref={viewHref} viewLabel="View catalogue" onAgain={() => setDone(null)} />;
  return (
    <ImportWizard<ProgrammeRow>
      columns={[...PROGRAMME_COLUMNS]}
      requiredColumns={["code", "name"]}
      aliases={{ name: ["programme", "programme_name", "program", "title"], code: ["programme_code", "short_code"] }}
      validate={(rows) => catalogueIssues(rows, catalogue, "programme")}
      entityLabel="programmes"
      previewColumns={[
        { key: "code", label: "Code" },
        { key: "name", label: "Name" },
        { key: "description", label: "Description" },
      ]}
      renderStatus={status}
      onConfirm={(rows) => {
        const n = importCatalogueProgrammes(countryId, rows.map((r) => ({ code: r.code.trim().toUpperCase(), name: r.name.trim(), description: r.description ?? "" }))).length;
        toast.success(`${n} programmes imported`);
        setDone(n);
      }}
    />
  );
}

/** Catalogue subjects. Electives list the catalogue programme codes they usually belong to ("GSCI; STEM"). */
export function SubjectImport({ countryId, viewHref }: { countryId: ID; viewHref?: string }) {
  const [done, setDone] = useState<number | null>(null);
  const catalogue = useStore((s) => s.catalogueSubjects).filter(inCatalogueOf(countryId));
  const catalogueProgrammes = useStore((s) => s.catalogueProgrammes).filter(inCatalogueOf(countryId));
  const codesOf = (r: SubjectRow) => (r.programme_codes ?? "").split(/[;,|]/).map((c) => c.trim().toUpperCase()).filter(Boolean);

  const validate = (rows: SubjectRow[]): ImportIssue[][] => {
    const programmeCodes = new Set(catalogueProgrammes.map((p) => p.code.toUpperCase()));
    return catalogueIssues(rows, catalogue, "subject").map((issues, i) => {
      const r = rows[i]!;
      if (r.category && !/^(core|elective)$/i.test(r.category)) issues.push({ field: "category", message: "Category must be core or elective" });
      const unknown = codesOf(r).filter((c) => !programmeCodes.has(c));
      if (unknown.length) issues.push({ field: "programme_codes", message: `Not a programme in this country's catalogue: ${unknown.join(", ")}` });
      return issues;
    });
  };

  if (done !== null) return <Done count={done} label="subjects added to the catalogue" note="Every school can now choose them." viewHref={viewHref} viewLabel="View catalogue" onAgain={() => setDone(null)} />;
  return (
    <ImportWizard<SubjectRow>
      columns={[...SUBJECT_COLUMNS]}
      requiredColumns={["code", "name"]}
      aliases={{ name: ["subject", "subject_name", "title"], code: ["subject_code", "short_code"], category: ["type", "core_elective"], programme_codes: ["programmes", "programme", "programme_code"] }}
      validate={validate}
      entityLabel="subjects"
      previewColumns={[
        { key: "code", label: "Code" },
        { key: "name", label: "Name" },
        { key: "category", label: "Category" },
        { key: "programme_codes", label: "Programmes" },
      ]}
      renderStatus={status}
      onConfirm={(rows) => {
        const n = importCatalogueSubjects(countryId, rows.map((r) => ({ code: r.code.trim().toUpperCase(), name: r.name.trim(), description: r.description ?? "", category: /^elective$/i.test(r.category ?? "") || codesOf(r).length ? "elective" : "core", programmeCodes: codesOf(r) }))).length;
        toast.success(`${n} subjects imported`);
        setDone(n);
      }}
    />
  );
}

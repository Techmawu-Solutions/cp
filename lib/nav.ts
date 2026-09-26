import {
  BarChart3,
  Bell,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  FileSpreadsheet,
  FolderKanban,
  GraduationCap,
  KeyRound,
  LayoutDashboard,
  Library,
  ListChecks,
  type LucideIcon,
  PlayCircle,
  School,
  ScrollText,
  Settings,
  ShieldCheck,
  UserCog,
  Users,
  Video,
  Layers,
  BookMarked,
  Presentation,
  Rocket,
  MessageSquare,
  MessagesSquare,
  Sun,
} from "lucide-react";
import type { Portal } from "@/lib/session";

export interface NavItem {
  label: string;
  href: string;
  icon?: LucideIcon;
  /** Any one of these grants access. Omit for always-visible items. */
  perm?: string[];
  /** Shows a pulsing "live" count while one of the user's live classes is in progress. */
  live?: boolean;
  /** Shown only inside the Vacation Classes workspace (spec §49.1.6). */
  vacationOnly?: boolean;
  children?: NavItem[];
}

export const NAV: Record<Portal, NavItem[]> = {
  "super-admin": [
    { label: "Dashboard", href: "/super-admin/dashboard", icon: LayoutDashboard },
    {
      label: "Schools",
      href: "/super-admin/schools",
      icon: School,
      perm: ["schools.view"],
      children: [
        { label: "All Schools", href: "/super-admin/schools" },
        { label: "Add School", href: "/super-admin/schools/new", perm: ["schools.create"] },
        { label: "Import Schools", href: "/super-admin/schools/import", perm: ["schools.create"] },
        { label: "School Administrators", href: "/super-admin/administrators", perm: ["users.view"] },
      ],
    },
    {
      label: "Users",
      href: "/super-admin/users",
      icon: Users,
      perm: ["users.view"],
      children: [
        { label: "Students", href: "/super-admin/users?role=student" },
        { label: "Teachers", href: "/super-admin/users?role=teacher" },
        { label: "Administrators", href: "/super-admin/users?role=school_admin" },
        { label: "All Users", href: "/super-admin/users" },
      ],
    },
    {
      label: "Academic",
      href: "/super-admin/academic",
      icon: GraduationCap,
      perm: ["programmes.view", "classes.view", "subjects.view"],
      children: [
        { label: "Academic Sessions", href: "/super-admin/academic?tab=sessions" },
        { label: "Programmes", href: "/super-admin/academic?tab=programmes" },
        { label: "Classes", href: "/super-admin/academic?tab=classes" },
        { label: "Subjects", href: "/super-admin/academic?tab=subjects" },
        { label: "Programme & Subject Catalogue", href: "/super-admin/catalogue?tab=programmes" },
        { label: "Catalogue Requests", href: "/super-admin/catalogue?tab=requests" },
      ],
    },
    { label: "Vacation Classes", href: "/super-admin/vacation", icon: Sun, perm: ["schools.view"] },
    {
      label: "Content",
      href: "/super-admin/content",
      icon: Library,
      perm: ["courses.view"],
      children: [
        { label: "Courses", href: "/super-admin/content?tab=courses" },
        { label: "Resources", href: "/super-admin/content?tab=resources" },
        { label: "Content Library", href: "/super-admin/content?tab=library" },
      ],
    },
    {
      label: "Live Classroom",
      href: "/super-admin/live",
      icon: Video,
      live: true,
      perm: ["live_classes.view"],
      children: [
        { label: "Live Sessions", href: "/super-admin/live", live: true },
        { label: "Recordings", href: "/super-admin/live?tab=recordings" },
        { label: "Attendance", href: "/super-admin/live?tab=attendance" },
      ],
    },
    {
      label: "Assessments",
      href: "/super-admin/assessments",
      icon: ClipboardCheck,
      perm: ["assessments.view"],
      children: [
        { label: "Assessments", href: "/super-admin/assessments" },
        { label: "Results", href: "/super-admin/assessments?tab=results" },
        { label: "Reports", href: "/super-admin/assessments?tab=reports" },
      ],
    },
    {
      label: "Analytics",
      href: "/super-admin/analytics",
      icon: BarChart3,
      perm: ["analytics.national", "analytics.region", "analytics.district"],
      children: [
        { label: "National", href: "/super-admin/analytics", perm: ["analytics.national"] },
        { label: "Regions", href: "/super-admin/analytics/regions", perm: ["analytics.region", "analytics.national"] },
        { label: "Districts", href: "/super-admin/analytics/districts", perm: ["analytics.district", "analytics.region", "analytics.national"] },
        { label: "Schools", href: "/super-admin/analytics/schools", perm: ["analytics.school", "analytics.national"] },
      ],
    },
    {
      label: "Access Control",
      href: "/super-admin/roles",
      icon: ShieldCheck,
      perm: ["users.update"],
      children: [
        { label: "Roles", href: "/super-admin/roles" },
        { label: "Permissions", href: "/super-admin/permissions" },
        { label: "Role Assignments", href: "/super-admin/role-assignments" },
      ],
    },
    {
      label: "System",
      href: "/super-admin/settings",
      icon: Settings,
      children: [
        { label: "Notifications", href: "/notifications" },
        { label: "Messages", href: "/messages" },
        { label: "Audit Logs", href: "/super-admin/audit-logs" },
        { label: "Email Outbox", href: "/super-admin/emails" },
        { label: "Settings", href: "/super-admin/settings" },
      ],
    },
  ],
  school: [
    { label: "Dashboard", href: "/school/dashboard", icon: LayoutDashboard },
    {
      label: "Vacation Classes",
      href: "/school/vacation",
      icon: Sun,
      vacationOnly: true,
      perm: ["students.view"],
      children: [
        { label: "Overview", href: "/school/vacation" },
        { label: "Bundles & Pricing", href: "/school/vacation/pricing" },
        { label: "Registrations & Payments", href: "/school/vacation/registrations" },
        { label: "Teacher Matching", href: "/school/vacation/matching" },
        { label: "Landing Page", href: "/vacation" },
      ],
    },
    { label: "Setup Guide", href: "/school/setup", icon: Rocket, perm: ["academic_sessions.create"] },
    {
      label: "Academic",
      href: "/school/academic-sessions",
      icon: GraduationCap,
      perm: ["academic_sessions.view", "programmes.view", "classes.view", "subjects.view"],
      children: [
        { label: "Academic Sessions", href: "/school/academic-sessions", perm: ["academic_sessions.view"] },
        { label: "Programmes", href: "/school/programmes", perm: ["programmes.view"] },
        { label: "Classes", href: "/school/classes", perm: ["classes.view"] },
        { label: "Subjects", href: "/school/subjects", perm: ["subjects.view"] },
      ],
    },
    {
      label: "Students",
      href: "/school/students",
      icon: Users,
      perm: ["students.view"],
      children: [
        { label: "All Students", href: "/school/students" },
        { label: "Import Students", href: "/school/students/import", perm: ["students.import"] },
        { label: "Enrolments", href: "/school/enrolments", perm: ["subjects.assign"] },
      ],
    },
    { label: "Teachers", href: "/school/teachers", icon: UserCog, perm: ["teachers.view"] },
    { label: "Courses", href: "/school/courses", icon: BookOpen, perm: ["courses.view"] },
    { label: "Live Classes", href: "/school/live-classes", icon: Video, perm: ["live_classes.view"], live: true },
    { label: "Assessments", href: "/school/assessments", icon: ClipboardCheck, perm: ["assessments.view"] },
    { label: "Grades", href: "/school/grades", icon: FileSpreadsheet, perm: ["assessments.grade", "assessments.export"] },
    { label: "Attendance", href: "/school/attendance", icon: ListChecks, perm: ["students.view"] },
    { label: "Forums", href: "/forums", icon: MessagesSquare, perm: ["courses.view"] },
    { label: "Messages", href: "/messages", icon: MessageSquare },
    { label: "Analytics", href: "/school/analytics", icon: BarChart3, perm: ["analytics.school"] },
    { label: "Calendar", href: "/calendar", icon: CalendarDays },
    { label: "Audit Logs", href: "/school/audit-logs", icon: ScrollText, perm: ["users.update"] },
    { label: "School Settings", href: "/school/settings", icon: Settings, perm: ["academic_sessions.update"] },
  ],
  teacher: [
    { label: "Dashboard", href: "/teacher/dashboard", icon: LayoutDashboard },
    { label: "My Classes", href: "/teacher/classes", icon: Presentation },
    { label: "My Subjects", href: "/teacher/subjects", icon: BookMarked },
    { label: "Content", href: "/teacher/content", icon: FolderKanban },
    { label: "Live Classes", href: "/teacher/live", icon: Video, live: true },
    {
      label: "Assessments",
      href: "/teacher/assessments",
      icon: ClipboardList,
      children: [
        { label: "All Assessments", href: "/teacher/assessments" },
        { label: "Assignments", href: "/teacher/assessments?type=assignment" },
        { label: "Quizzes", href: "/teacher/assessments?type=quiz" },
      ],
    },
    { label: "Grades", href: "/teacher/grades", icon: FileSpreadsheet },
    { label: "Students", href: "/teacher/students", icon: Users },
    { label: "Forums", href: "/forums", icon: MessagesSquare },
    { label: "Messages", href: "/messages", icon: MessageSquare },
    { label: "Analytics", href: "/teacher/analytics", icon: BarChart3 },
    { label: "Calendar", href: "/calendar", icon: CalendarDays },
  ],
  student: [
    { label: "Dashboard", href: "/student/dashboard", icon: LayoutDashboard },
    { label: "My Classes", href: "/student/classes", icon: Presentation },
    { label: "My Subjects", href: "/student/subjects", icon: BookMarked },
    { label: "Learning", href: "/student/learning", icon: Layers },
    { label: "Live Classes", href: "/student/live", icon: PlayCircle, live: true },
    {
      label: "Assessments",
      href: "/student/assignments",
      icon: ClipboardList,
      children: [
        { label: "Assignments & Tests", href: "/student/assignments" },
        { label: "Quizzes", href: "/student/quizzes" },
      ],
    },
    { label: "Grades", href: "/student/grades", icon: FileSpreadsheet },
    { label: "Forums", href: "/forums", icon: MessagesSquare },
    { label: "Messages", href: "/messages", icon: MessageSquare },
    { label: "Calendar", href: "/calendar", icon: CalendarDays },
    { label: "Notifications", href: "/notifications", icon: Bell },
  ],
};

export const PORTAL_LABEL: Record<Portal, string> = {
  "super-admin": "Platform Administration",
  school: "School Administration",
  teacher: "Teacher",
  student: "Student",
};

export const ROLE_ICON = { KeyRound };

export function filterNav(items: NavItem[], can: (p: string[]) => boolean, isVacation = false): NavItem[] {
  return items
    .filter((i) => (!i.perm || can(i.perm)) && (!i.vacationOnly || isVacation))
    .map((i) => (i.children ? { ...i, children: filterNav(i.children, can, isVacation) } : i));
}

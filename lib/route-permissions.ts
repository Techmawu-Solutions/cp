/**
 * The permission each page needs (spec §9–10). One table drives both the
 * page guard in the app shell and which menu items appear, so removing a
 * permission from a role hides the page from the menu *and* blocks it when
 * opened directly by its address. School and Super Admin pages guard
 * themselves (and their menu items carry their permissions); this table
 * covers the teacher and student portals, recordings, the live classroom and
 * the learning area.
 *
 * Longest matching prefix wins. A page listed with several permissions needs
 * any one of them. Pages not listed (dashboards, messages, forums, calendar,
 * notifications, profile, settings) are open to every signed-in user.
 */
const ROUTES: [prefix: string, perms: string[]][] = [
  // Teacher
  ["/teacher/classes", ["classes.view"]],
  ["/teacher/subjects", ["subjects.view"]],
  ["/teacher/content", ["courses.view"]],
  ["/teacher/courses", ["courses.view"]],
  ["/teacher/live", ["live_classes.view"]],
  ["/teacher/assessments/new", ["assessments.create"]],
  ["/teacher/assessments", ["assessments.view"]],
  ["/teacher/grades", ["assessments.view"]],
  ["/teacher/students", ["students.view"]],
  ["/teacher/analytics", ["courses.view"]],
  ["/teacher/academic-sessions", ["academic_sessions.view"]],
  // Student
  ["/student/classes", ["classes.view"]],
  ["/student/subjects", ["subjects.view"]],
  ["/student/learning", ["courses.view"]],
  ["/student/courses", ["courses.view"]],
  ["/student/live", ["live_classes.view"]],
  ["/student/assignments", ["assessments.view"]],
  ["/student/quizzes", ["assessments.view"]],
  ["/student/assessments", ["assessments.view"]],
  ["/student/grades", ["assessments.view"]],
  ["/student/academic-sessions", ["academic_sessions.view"]],
  // Shared
  ["/recordings", ["live_classes.recordings"]],
  ["/live-report", ["live_classes.view"]],
  ["/classroom", ["live_classes.view"]],
  ["/learn", ["courses.view"]],
];

const BY_LENGTH = [...ROUTES].sort((a, b) => b[0].length - a[0].length);

/** Permissions a path needs (any one of them), or null if it's open to every signed-in user. */
export function requiredPermissions(path: string): string[] | null {
  const clean = path.split(/[?#]/)[0]!;
  const hit = BY_LENGTH.find(([prefix]) => clean === prefix || clean.startsWith(prefix + "/"));
  return hit ? hit[1] : null;
}

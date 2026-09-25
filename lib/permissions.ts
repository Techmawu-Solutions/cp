/**
 * Permission catalogue (spec §10). Roles hold permission keys; the UI gates
 * navigation and actions on permissions, never on role names (spec §9), so a
 * custom role such as "Academic Coordinator" works without code changes.
 */

export interface PermissionGroup {
  key: string;
  label: string;
  permissions: { key: string; label: string }[];
}

const group = (key: string, label: string, actions: [string, string][]): PermissionGroup => ({
  key,
  label,
  permissions: actions.map(([action, text]) => ({ key: `${key}.${action}`, label: text })),
});

export const PERMISSION_GROUPS: PermissionGroup[] = [
  group("schools", "Schools", [
    ["view", "View schools"],
    ["create", "Create schools"],
    ["update", "Edit schools"],
    ["delete", "Delete schools"],
    ["suspend", "Suspend schools"],
  ]),
  group("users", "Users", [
    ["view", "View users"],
    ["create", "Create users"],
    ["update", "Edit users"],
    ["delete", "Delete users"],
    ["import", "Import users"],
  ]),
  group("students", "Students", [
    ["view", "View students"],
    ["create", "Create students"],
    ["update", "Edit students"],
    ["delete", "Delete students"],
    ["import", "Import students"],
    ["export", "Export students"],
  ]),
  group("teachers", "Teachers", [
    ["view", "View teachers"],
    ["create", "Create teachers"],
    ["update", "Edit teachers"],
    ["delete", "Delete teachers"],
  ]),
  group("academic_sessions", "Academic sessions", [
    ["view", "View sessions"],
    ["create", "Create sessions"],
    ["update", "Edit sessions"],
    ["activate", "Activate sessions"],
  ]),
  group("programmes", "Programmes", [
    ["view", "View programmes"],
    ["create", "Create programmes"],
    ["update", "Edit programmes"],
    ["delete", "Delete programmes"],
  ]),
  group("classes", "Classes", [
    ["view", "View classes"],
    ["create", "Create classes"],
    ["update", "Edit classes"],
    ["delete", "Delete classes"],
  ]),
  group("subjects", "Subjects", [
    ["view", "View subjects"],
    ["create", "Create subjects"],
    ["update", "Edit subjects"],
    ["delete", "Delete subjects"],
    ["assign", "Assign teachers & students"],
  ]),
  group("courses", "Courses", [
    ["view", "View courses"],
    ["create", "Create courses"],
    ["update", "Edit courses"],
    ["delete", "Delete courses"],
  ]),
  group("modules", "Modules", [
    ["create", "Create modules"],
    ["update", "Edit modules"],
    ["delete", "Delete modules"],
  ]),
  group("content", "Content", [
    ["create", "Create content"],
    ["update", "Edit content"],
    ["delete", "Delete content"],
    ["publish", "Publish content"],
  ]),
  group("live_classes", "Live classroom", [
    ["view", "View live classes"],
    ["create", "Create live classes"],
    ["schedule", "Schedule live classes"],
    ["start", "Start live classes"],
    ["end", "End live classes"],
    ["recordings", "Access recordings"],
  ]),
  group("assessments", "Assessments", [
    ["view", "View assessments"],
    ["create", "Create assessments"],
    ["update", "Edit assessments"],
    ["delete", "Delete assessments"],
    ["grade", "Grade students"],
    ["export", "Export grades"],
  ]),
  group("analytics", "Analytics", [
    ["school", "School analytics"],
    ["district", "District analytics"],
    ["region", "Regional analytics"],
    ["national", "National analytics"],
  ]),
];

export const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap((g) => g.permissions.map((p) => p.key));

const pick = (...prefixes: string[]) =>
  ALL_PERMISSIONS.filter((p) => prefixes.some((prefix) => p === prefix || p.startsWith(prefix + ".")));

export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin: [...ALL_PERMISSIONS],
  school_admin: [
    ...pick(
      "students",
      "teachers",
      "academic_sessions",
      "programmes",
      "classes",
      "subjects",
      "courses",
      "modules",
      "content",
      "live_classes",
      "assessments",
    ),
    "users.view",
    "users.create",
    "users.update",
    "users.import",
    "analytics.school",
  ],
  teacher: [
    "students.view",
    "classes.view",
    "subjects.view",
    "courses.view",
    "courses.update",
    ...pick("modules", "content"),
    ...pick("live_classes"),
    ...pick("assessments"),
    "academic_sessions.view",
  ],
  student: [
    "courses.view",
    "subjects.view",
    "classes.view",
    "live_classes.view",
    "live_classes.recordings",
    "assessments.view",
    "academic_sessions.view",
  ],
};

export function permissionLabel(key: string): string {
  for (const g of PERMISSION_GROUPS) {
    const hit = g.permissions.find((p) => p.key === key);
    if (hit) return hit.label;
  }
  return key;
}

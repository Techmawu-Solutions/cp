/** One-click personas for the prototype (password for all: "password"). */
export const DEMO_ACCOUNTS = [
  { email: "superadmin@classproject.com", label: "Super Administrator", description: "Platform-wide: schools, RBAC, national analytics" },
  { email: "admin@ridgeview.edu.gh", label: "School Administrator", description: "Grace Asamoah · Ridgeview SHS (semesters)" },
  { email: "eric.dzontoh@ridgeview.edu.gh", label: "Teacher", description: "Mr. Eric Dzontoh · ICT, Ridgeview SHS" },
  { email: "john.mensah@ridgeview.edu.gh", label: "Student", description: "John Mensah · SHS 1A, Ridgeview SHS" },
  { email: "admin@lakeside.edu.gh", label: "School Administrator (2nd tenant)", description: "Kwabena Owusu · Lakeside SHS (terms) · profile incomplete" },
  { email: "vacation@classproject.com", label: "Vacation Classes Coordinator", description: "Bundles, registrations, payments, teacher matching" },
  { email: "ama.boateng@ridgeview.edu.gh", label: "Student in school + Vacation", description: "Ama Boateng · switch between Ridgeview and Vacation Classes" },
  { email: "j.ankrah@ges.gov.gh", label: "Regional Officer (custom role)", description: "Read-only regional & district analytics" },
] as const;

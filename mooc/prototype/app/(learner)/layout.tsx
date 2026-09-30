import { AppShell } from "@/components/open/shell";

/** Signed-in learner and instructor pages. */
export default function LearnerLayout({ children }: { children: React.ReactNode }) {
  return <AppShell requireAuth>{children}</AppShell>;
}

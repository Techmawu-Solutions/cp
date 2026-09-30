import { AppShell } from "@/components/open/shell";

/** Pages anyone can open: course pages, careers, credential verification, public portfolios, partner landing. */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <AppShell requireAuth={false}>{children}</AppShell>;
}

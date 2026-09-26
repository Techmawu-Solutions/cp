import { CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/common/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden overflow-hidden bg-primary p-10 text-primary-foreground lg:flex lg:flex-col">
        <div className="absolute -top-24 -right-24 size-96 rounded-full bg-white/10" />
        <div className="absolute -bottom-32 -left-16 size-80 rounded-full bg-white/5" />
        <Logo className="relative [&>span:first-child]:bg-white [&>span:first-child]:text-primary" />
        <div className="relative mt-auto max-w-lg">
          <h2 className="text-3xl leading-tight font-semibold">One platform for every school — from the classroom to the national dashboard.</h2>
          <ul className="mt-8 space-y-3 text-primary-foreground/90">
            {[
              "Academic sessions, programmes, classes and subjects",
              "Courses, lessons, assignments, quizzes and gradebooks",
              "Live virtual classrooms with recordings and attendance",
              "School, district, regional and national analytics",
            ].map((t) => (
              <li key={t} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0" />
                {t}
              </li>
            ))}
          </ul>
          <p className="mt-10 text-sm text-primary-foreground/70">Built for Ghana: WAEC & GES EMIS codes, 16 regions, semesters and terms.</p>
        </div>
      </div>
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <Logo className="mb-8 lg:hidden" />
          {children}
        </div>
      </div>
    </div>
  );
}

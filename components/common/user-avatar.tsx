import { cn } from "@/lib/utils";
import { initials } from "@/lib/helpers";

export function UserAvatar({ name, color = "#2563eb", size = "md", className }: { name: string; color?: string; size?: "xs" | "sm" | "md" | "lg" | "xl"; className?: string }) {
  const sizes = { xs: "size-6 text-[10px]", sm: "size-8 text-xs", md: "size-9 text-sm", lg: "size-12 text-base", xl: "size-20 text-2xl" };
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white select-none", sizes[size], className)}
      style={{ backgroundColor: color }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

/** A school's uploaded logo, or its initials on the school colour when it has none. */
export function SchoolLogo({ name, color, src, size = "md", className }: { name: string; color: string; src?: string; size?: "sm" | "md" | "lg"; className?: string }) {
  const sizes = { sm: "size-8 text-xs", md: "size-10 text-sm", lg: "size-14 text-lg" };
  if (src)
    return (
      // eslint-disable-next-line @next/next/no-img-element -- data URL uploaded by the school
      <img src={src} alt="" className={cn("inline-flex shrink-0 rounded-lg bg-white object-contain", sizes[size], className)} aria-hidden />
    );
  return (
    <span className={cn("inline-flex shrink-0 items-center justify-center rounded-lg font-bold text-white", sizes[size], className)} style={{ backgroundColor: color }} aria-hidden>
      {initials(name.replace(/Senior High( Technical)? School|Secondary School|Community SHS/g, "").trim() || name)}
    </span>
  );
}

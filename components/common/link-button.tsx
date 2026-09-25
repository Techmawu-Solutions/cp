import Link from "next/link";
import type { VariantProps } from "class-variance-authority";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** A Next.js link styled as a button (Base UI buttons render <button>, not anchors). */
export function LinkButton({
  href,
  variant,
  size,
  className,
  children,
  target,
  ...rest
}: { href: string; className?: string; children: React.ReactNode; target?: string } & VariantProps<typeof buttonVariants> & Omit<React.ComponentProps<typeof Link>, "href" | "className">) {
  return (
    <Link href={href} target={target} className={cn(buttonVariants({ variant, size }), className)} {...rest}>
      {children}
    </Link>
  );
}

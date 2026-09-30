import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "cn"

/**
 * What a numeric field accepts. Anything else typed or pasted is dropped as
 * it's entered, so digit fields never hold letters.
 * - integer: digits only (IDs, index numbers, years, codes, card numbers)
 * - decimal: digits and one decimal point (marks, prices, durations)
 * - signed: like decimal, with an optional leading minus (maths answers)
 * - phone: digits, spaces and a leading +
 */
export type NumericKind = "integer" | "decimal" | "signed" | "phone"

export function sanitizeNumeric(value: string, kind: NumericKind): string {
  if (kind === "integer") return value.replace(/\D/g, "")
  if (kind === "phone") return value.replace(/[^\d+ ]/g, "").replace(/(?!^)\+/g, "")
  const negative = kind === "signed" && value.trimStart().startsWith("-")
  const [whole, ...rest] = value.replace(/[^\d.]/g, "").split(".")
  const cleaned = rest.length ? `${whole}.${rest.join("")}` : whole!
  return negative ? `-${cleaned}` : cleaned
}

function kindFor(type: string | undefined, inputMode: string | undefined, numeric: NumericKind | undefined): NumericKind | undefined {
  if (numeric) return numeric
  if (type === "tel") return "phone"
  if (type === "number" || inputMode === "decimal") return "decimal"
  if (inputMode === "numeric") return "integer"
  return undefined
}

function Input({ className, type, numeric, inputMode, onChange, ...props }: React.ComponentProps<"input"> & { numeric?: NumericKind }) {
  const kind = kindFor(type, inputMode, numeric)
  return (
    <InputPrimitive
      // Browser number inputs still accept "e", "+" and "-" (and letters on some phones), so numeric fields are
      // plain text inputs with a numeric keyboard, filtered as the user types.
      type={type === "number" ? "text" : type}
      inputMode={inputMode ?? (kind === "integer" ? "numeric" : kind === "decimal" || kind === "signed" ? "decimal" : kind === "phone" ? "tel" : undefined)}
      data-slot="input"
      onChange={
        kind
          ? (e: React.ChangeEvent<HTMLInputElement>) => {
              const clean = sanitizeNumeric(e.target.value, kind)
              if (clean !== e.target.value) e.target.value = clean
              onChange?.(e)
            }
          : onChange
      }
      className={cn(
        "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 read-only:bg-muted/50 read-only:text-muted-foreground md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }

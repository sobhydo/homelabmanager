import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-primary/15 text-primary border-primary/20",
        secondary: "bg-secondary text-secondary-foreground border-secondary",
        destructive:
          "bg-destructive/15 text-destructive border-destructive/20",
        outline: "text-foreground border-border",
        // Colour variants used by legacy pages
        gray: "bg-muted text-muted-foreground border-border",
        blue: "bg-blue-500/15 text-blue-400 border-blue-500/20",
        green: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
        yellow: "bg-amber-500/15 text-amber-400 border-amber-500/20",
        red: "bg-red-500/15 text-red-400 border-red-500/20",
        indigo: "bg-indigo-500/15 text-indigo-400 border-indigo-500/20",
        purple: "bg-purple-500/15 text-purple-400 border-purple-500/20",
        orange: "bg-orange-500/15 text-orange-400 border-orange-500/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

// ---------------------------------------------------------------------------
// Legacy colour-to-variant map (pages pass `color` prop)
// ---------------------------------------------------------------------------
const colorToVariant: Record<string, string> = {
  gray: "gray",
  blue: "blue",
  green: "green",
  yellow: "yellow",
  red: "red",
  indigo: "indigo",
  purple: "purple",
  orange: "orange",
}

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  /** Legacy colour prop – mapped to the matching `variant` automatically. */
  color?:
    | "gray"
    | "blue"
    | "green"
    | "yellow"
    | "red"
    | "indigo"
    | "purple"
    | "orange"
  /** When true, renders a small dot before the children. */
  dot?: boolean
}

function Badge({
  className,
  variant,
  color,
  dot = false,
  children,
  ...props
}: BadgeProps) {
  // If the legacy `color` prop is supplied, use it as the variant.
  const resolvedVariant = color
    ? (colorToVariant[color] as VariantProps<typeof badgeVariants>["variant"])
    : variant

  return (
    <span
      className={cn(badgeVariants({ variant: resolvedVariant }), className)}
      {...props}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
}

export { Badge, badgeVariants }
export default Badge

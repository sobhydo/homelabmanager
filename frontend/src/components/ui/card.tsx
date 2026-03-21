import * as React from "react"
import { type ReactNode } from "react"

import { cn } from "@/lib/utils"

function Card({ className, ref, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      ref={ref}
      className={cn(
        "bg-card text-card-foreground border border-border rounded-xl shadow-sm hover:border-border/80 transition-colors",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ref, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      ref={ref}
      className={cn("flex flex-col space-y-1.5 p-6", className)}
      {...props}
    />
  )
}

function CardTitle({ className, ref, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      ref={ref}
      className={cn("font-semibold leading-none tracking-tight", className)}
      {...props}
    />
  )
}

function CardDescription({
  className,
  ref,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      ref={ref}
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function CardContent({
  className,
  ref,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
  )
}

function CardFooter({
  className,
  ref,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      ref={ref}
      className={cn("flex items-center p-6 pt-0", className)}
      {...props}
    />
  )
}

// ---------------------------------------------------------------------------
// Legacy Card wrapper (default export)
// Pages may use: <Card title="..." subtitle="..." actions={...} padding>
// ---------------------------------------------------------------------------
interface LegacyCardProps {
  title?: string
  subtitle?: string
  actions?: ReactNode
  children: ReactNode
  className?: string
  padding?: boolean
}

function LegacyCard({
  title,
  subtitle,
  actions,
  children,
  className = "",
  padding = true,
}: LegacyCardProps) {
  return (
    <Card className={className}>
      {(title || actions) && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            {title && (
              <h3 className="text-base font-semibold text-foreground">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={padding ? "p-6" : ""}>{children}</div>
    </Card>
  )
}

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
export default LegacyCard

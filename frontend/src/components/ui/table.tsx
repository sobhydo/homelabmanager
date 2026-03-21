import * as React from "react"
import { type ReactNode } from "react"
import {
  ChevronUpIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline"

import { cn } from "@/lib/utils"

function Table({ className, ref, ...props }: React.ComponentProps<"table">) {
  return (
    <div className="relative w-full overflow-auto bg-card border border-border rounded-xl">
      <table
        ref={ref}
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  )
}

function TableHeader({
  className,
  ref,
  ...props
}: React.ComponentProps<"thead">) {
  return (
    <thead
      ref={ref}
      className={cn("[&_tr]:border-b", className)}
      {...props}
    />
  )
}

function TableBody({
  className,
  ref,
  ...props
}: React.ComponentProps<"tbody">) {
  return (
    <tbody
      ref={ref}
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  )
}

function TableFooter({
  className,
  ref,
  ...props
}: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      ref={ref}
      className={cn(
        "border-t border-border bg-muted/50 font-medium [&>tr]:last:border-b-0",
        className
      )}
      {...props}
    />
  )
}

function TableRow({ className, ref, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      ref={ref}
      className={cn(
        "border-b border-border hover:bg-muted/50 transition-colors data-[state=selected]:bg-muted",
        className
      )}
      {...props}
    />
  )
}

function TableHead({ className, ref, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      ref={ref}
      className={cn(
        "h-10 px-4 text-left align-middle text-muted-foreground text-xs uppercase tracking-wider font-semibold [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, ref, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      ref={ref}
      className={cn(
        "p-4 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className
      )}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ref,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      ref={ref}
      className={cn("mt-4 text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

// ---------------------------------------------------------------------------
// Legacy data-table wrapper (default export)
// Pages use: <Table columns={...} data={...} rowKey={...} onSort={...} />
// Also exports Column<T> type for typing columns.
// ---------------------------------------------------------------------------
export interface Column<T> {
  key: string
  header: string
  sortable?: boolean
  render?: (item: T) => ReactNode
  className?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  loading?: boolean
  emptyMessage?: string
  sortBy?: string
  sortOrder?: "asc" | "desc"
  onSort?: (key: string) => void
  onRowClick?: (item: T) => void
  rowKey: (item: T) => string | number
}

function DataTable<T>({
  columns,
  data,
  loading = false,
  emptyMessage = "No data found",
  sortBy,
  sortOrder,
  onSort,
  onRowClick,
  rowKey,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="animate-pulse">
          <div className="h-12 bg-muted" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 border-t border-border">
              <div className="flex items-center gap-4 px-6 py-4">
                <div className="h-4 bg-muted animate-pulse rounded w-1/4" />
                <div className="h-4 bg-muted animate-pulse rounded w-1/6" />
                <div className="h-4 bg-muted animate-pulse rounded w-1/5" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-16 text-center">
        <svg
          className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
          />
        </svg>
        <p className="text-muted-foreground text-sm">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/50 border-b border-border">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "px-6 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider",
                  col.sortable &&
                    "cursor-pointer select-none hover:text-foreground transition-colors",
                  col.className
                )}
                onClick={() => col.sortable && onSort?.(col.key)}
              >
                <div className="flex items-center gap-1">
                  {col.header}
                  {col.sortable &&
                    sortBy === col.key &&
                    (sortOrder === "asc" ? (
                      <ChevronUpIcon className="h-4 w-4 text-primary" />
                    ) : (
                      <ChevronDownIcon className="h-4 w-4 text-primary" />
                    ))}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {data.map((item) => (
            <tr
              key={rowKey(item)}
              onClick={() => onRowClick?.(item)}
              className={cn(
                "transition-colors",
                onRowClick && "cursor-pointer hover:bg-muted/50"
              )}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn(
                    "px-6 py-4 text-sm text-foreground whitespace-nowrap",
                    col.className
                  )}
                >
                  {col.render
                    ? col.render(item)
                    : String(
                        (item as Record<string, unknown>)[col.key] ?? ""
                      )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
export default DataTable

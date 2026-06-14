import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { ArrowLeft, ArrowRight, Inbox } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  action,
  backHref,
}: {
  eyebrow?: string
  title: string
  description?: string
  action?: { label: string; href: string }
  backHref?: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm md:flex-row md:items-start md:justify-between md:p-6">
      <div>
        {backHref && (
          <Link
            href={backHref}
            className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-700 transition-colors group"
          >
            <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
            Back
          </Link>
        )}
        {eyebrow && (
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-indigo-500">
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl font-bold tracking-tight text-slate-950 md:text-2xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 text-sm leading-6 text-slate-500">
            {description}
          </p>
        )}
      </div>
      {action && (
        <Link
          href={action.href}
          className="mt-4 md:mt-0 inline-flex h-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white transition hover:bg-slate-800 active:scale-[0.98] shadow-sm"
        >
          {action.label}
          <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  )
}

export function AdminStatCard({
  label,
  value,
  href,
  tone = "default",
  icon: Icon,
}: {
  label: string
  value: string | number
  href?: string
  tone?: "default" | "warning" | "success" | "danger"
  icon?: LucideIcon
}) {
  const content = (
    <Card className={cn(
      "rounded-xl border border-slate-200/60 bg-white transition-all duration-200 hover:shadow-md hover:-translate-y-0.5",
      tone === "warning" && "bg-amber-50/60 border-amber-200/50",
      tone === "success" && "bg-emerald-50/60 border-emerald-200/50",
      tone === "danger" && "bg-red-50/60 border-red-200/50"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</p>
            <p className="mt-1.5 text-2xl font-bold tracking-tight text-slate-950 tabular-nums">{value}</p>
          </div>
          {Icon && (
            <span className={cn(
              "grid h-9 w-9 shrink-0 place-items-center rounded-lg",
              tone === "warning" ? "bg-amber-100 text-amber-600" :
              tone === "success" ? "bg-emerald-100 text-emerald-600" :
              tone === "danger" ? "bg-red-100 text-red-500" :
              "bg-slate-100 text-slate-500"
            )}>
              <Icon className="h-4 w-4" />
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )

  return href ? <Link href={href} className="block">{content}</Link> : content
}

export function AdminSectionCard({
  title,
  description,
  children,
  className,
}: {
  title?: string
  description?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <Card className={cn("overflow-hidden rounded-xl border border-slate-200/60 bg-white shadow-sm", className)}>
      {(title || description) && (
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-4 py-3">
          <div>
            {title && <CardTitle className="text-sm font-semibold text-slate-800">{title}</CardTitle>}
            {description && <p className="text-xs leading-relaxed text-slate-500 mt-0.5">{description}</p>}
          </div>
        </CardHeader>
      )}
      <CardContent className="p-4">{children}</CardContent>
    </Card>
  )
}

const STATUS_STYLES: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; className: string }> = {
  active: { variant: "default", className: "bg-emerald-500 text-white hover:bg-emerald-500" },
  live: { variant: "default", className: "bg-emerald-500 text-white hover:bg-emerald-500" },
  inactive: { variant: "outline", className: "text-slate-400 border-slate-200 hover:text-slate-400" },
  disabled: { variant: "outline", className: "text-slate-400 border-slate-200 hover:text-slate-400" },
  draft: { variant: "secondary", className: "bg-amber-100 text-amber-700 hover:bg-amber-100" },
  hidden: { variant: "outline", className: "text-slate-400 border-dashed border-slate-300" },
  archived: { variant: "secondary", className: "bg-slate-100 text-slate-500 hover:bg-slate-100" },
  default: { variant: "secondary", className: "bg-amber-100 text-amber-700 hover:bg-amber-100" },
  sandbox: { variant: "secondary", className: "bg-blue-100 text-blue-700 hover:bg-blue-100" },
  subcategory: { variant: "secondary", className: "bg-slate-100 text-slate-600 hover:bg-slate-100" },
  parent: { variant: "secondary", className: "bg-indigo-100 text-indigo-700 hover:bg-indigo-100" },
  contacted: { variant: "default", className: "bg-emerald-500 text-white hover:bg-emerald-500" },
  configured: { variant: "default", className: "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10" },
  "not configured": { variant: "outline", className: "text-slate-400 border-slate-200 hover:text-slate-400" },
}

export function AdminStatusBadge({
  status,
  type = "default",
}: {
  status: string | boolean
  type?: "default" | "payment" | "order" | "stock"
}) {
  const value = typeof status === "boolean" ? (status ? "Active" : "Inactive") : status
  const normalized = value.toLowerCase()
  const style = STATUS_STYLES[normalized]

  const variant = style?.variant ?? (
    normalized.includes("cancel") || normalized.includes("expired") || normalized.includes("unpaid") || normalized.includes("returned")
      ? "destructive"
      : normalized.includes("pending") || normalized.includes("sandbox") || normalized.includes("processing")
        ? "secondary"
        : "default"
  )

  return (
    <Badge variant={variant} className={cn(
      "rounded-md px-2 py-0.5 text-[10px] font-semibold tracking-wide",
      style?.className,
      type === "payment" && normalized.includes("paid") && "bg-emerald-500 hover:bg-emerald-500",
      type === "payment" && normalized.includes("pending") && "bg-amber-500 text-white hover:bg-amber-500",
      type === "stock" && normalized.includes("low") && "bg-amber-500 text-white hover:bg-amber-500"
    )}>
      {value}
    </Badge>
  )
}

export function AdminEmptyState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: { label: string; href: string }
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/40 p-10 text-center">
      <Inbox className="mx-auto mb-3 h-8 w-8 text-slate-300" />
      <h2 className="text-sm font-semibold text-slate-700">{title}</h2>
      {description && <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-slate-400">{description}</p>}
      {action && (
        <Link href={action.href} className="mt-4 inline-flex h-8 items-center justify-center rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800 transition shadow-sm">
          {action.label}
        </Link>
      )}
    </div>
  )
}

export function AdminTableShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200/60 bg-white shadow-sm">
      <div className="overflow-x-auto">{children}</div>
    </div>
  )
}

export function AdminHubCard({
  href,
  title,
  description,
  icon: Icon,
  badge,
}: {
  href: string
  title: string
  description: string
  icon: LucideIcon
  badge?: string
}) {
  const badgeStyle = badge
    ? badge.toLowerCase().includes("active") || badge.toLowerCase().includes("ready")
      ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
      : badge.toLowerCase().includes("inactive") || badge.toLowerCase().includes("disabled")
        ? "bg-slate-100 text-slate-400 border border-slate-200"
        : "bg-slate-50 text-slate-400 border border-slate-200"
    : null

  return (
    <Link href={href}>
      <Card className="h-full rounded-xl border border-slate-200/60 bg-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-slate-900 text-white">
              <Icon className="h-4.5 w-4.5" />
            </span>
            {badge && (
              <span className={cn(
                "rounded-md px-2 py-0.5 text-[10px] font-semibold",
                badgeStyle
              )}>
                {badge}
              </span>
            )}
          </div>
          <h3 className="mt-3 text-sm font-semibold text-slate-900">{title}</h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">{description}</p>
        </CardContent>
      </Card>
    </Link>
  )
}

export function AdminBackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-700 transition-colors group"
    >
      <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
      {label}
    </Link>
  )
}

export function AdminPageShell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-5", className)}>
      {children}
    </div>
  )
}

export function AdminFormLayout({ children, sidebar }: { children: React.ReactNode; sidebar?: React.ReactNode }) {
  return (
    <div className={cn("grid gap-5", sidebar ? "lg:grid-cols-[1fr_280px]" : "lg:grid-cols-1")}>
      <div className="space-y-5">{children}</div>
      {sidebar && (
        <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          {sidebar}
        </div>
      )}
    </div>
  )
}

export function AdminFormSection({ title, description, children }: {
  title?: string; description?: string; children: React.ReactNode
}) {
  return (
    <Card className="overflow-hidden rounded-xl border border-slate-200/60 bg-white shadow-sm">
      {(title || description) && (
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-4 py-3">
          <div>
            {title && <CardTitle className="text-sm font-semibold text-slate-800">{title}</CardTitle>}
            {description && <p className="text-xs leading-relaxed text-slate-500 mt-0.5">{description}</p>}
          </div>
        </CardHeader>
      )}
      <CardContent className="p-4">{children}</CardContent>
    </Card>
  )
}
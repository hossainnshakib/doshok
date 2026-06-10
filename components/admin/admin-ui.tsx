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
    <div className="flex flex-col gap-4 rounded-2xl border border-black/[0.06] bg-white p-5 md:flex-row md:items-start md:justify-between md:p-6 shadow-sm">
      <div>
        {backHref && (
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-400 hover:text-neutral-950 transition-colors mb-3 group"
          >
            <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
            Back
          </Link>
        )}
        {eyebrow && (
          <p className="mb-1.5 text-[10px] font-black uppercase tracking-[0.25em] text-neutral-400">
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl font-black tracking-[-0.03em] text-neutral-950 md:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-neutral-500">
            {description}
          </p>
        )}
      </div>
      {action && (
        <Link
          href={action.href}
          className="inline-flex h-10 shrink-0 items-center justify-center rounded-full bg-neutral-950 px-5 text-sm font-bold text-white transition hover:bg-black hover:scale-[1.02] active:scale-[0.98]"
        >
          {action.label}
          <ArrowRight className="ml-2 h-4 w-4" />
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
      "rounded-2xl border border-black/[0.05] bg-white transition hover:-translate-y-0.5 hover:shadow-md",
      tone === "warning" && "bg-amber-50/80 border-amber-100/50",
      tone === "success" && "bg-emerald-50/80 border-emerald-100/50",
      tone === "danger" && "bg-red-50/80 border-red-100/50"
    )}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">{label}</p>
            <p className="mt-2 text-2xl font-black tracking-[-0.03em] text-neutral-950">{value}</p>
          </div>
          {Icon && (
            <span className={cn(
              "grid h-11 w-11 place-items-center rounded-2xl",
              tone === "warning" ? "bg-amber-100 text-amber-600" :
              tone === "success" ? "bg-emerald-100 text-emerald-600" :
              tone === "danger" ? "bg-red-100 text-red-500" :
              "bg-neutral-100 text-neutral-500"
            )}>
              <Icon className="h-5 w-5" />
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )

  return href ? <Link href={href}>{content}</Link> : content
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
    <Card className={cn("overflow-hidden rounded-2xl border border-black/[0.05] bg-white shadow-sm", className)}>
      {(title || description) && (
        <CardHeader className="border-b border-black/[0.04] bg-[#faf9f7] px-5 py-4">
          {title && <CardTitle className="text-sm font-black tracking-[-0.02em] text-neutral-950">{title}</CardTitle>}
          {description && <p className="text-xs leading-5 text-neutral-500 mt-0.5">{description}</p>}
        </CardHeader>
      )}
      <CardContent className="p-5">{children}</CardContent>
    </Card>
  )
}

const STATUS_STYLES: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; className: string }> = {
  active: { variant: "default", className: "bg-emerald-600 hover:bg-emerald-600 text-white" },
  inactive: { variant: "outline", className: "text-neutral-400 border-neutral-200" },
  draft: { variant: "secondary", className: "bg-amber-100 text-amber-800 hover:bg-amber-100" },
  hidden: { variant: "outline", className: "text-muted-foreground border-dashed" },
  archived: { variant: "destructive", className: "bg-neutral-200 text-neutral-600 hover:bg-neutral-200" },
  default: { variant: "secondary", className: "bg-amber-100 text-amber-800 hover:bg-amber-100" },
  sandbox: { variant: "secondary", className: "bg-blue-100 text-blue-700 hover:bg-blue-100" },
  live: { variant: "default", className: "bg-emerald-600 hover:bg-emerald-600 text-white" },
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
    normalized.includes("cancel") || normalized.includes("expired") || normalized.includes("unpaid")
      ? "destructive"
      : normalized.includes("pending") || normalized.includes("sandbox")
        ? "secondary"
        : "default"
  )

  return (
    <Badge variant={variant} className={cn(
      "rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.12em]",
      style?.className,
      type === "payment" && normalized.includes("paid") && "bg-emerald-600 hover:bg-emerald-600",
      type === "stock" && normalized.includes("low") && "bg-amber-500 hover:bg-amber-500"
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
    <div className="rounded-2xl border border-dashed border-black/[0.08] bg-white/80 p-12 text-center">
      <Inbox className="mx-auto mb-4 h-10 w-10 text-neutral-300" />
      <h2 className="text-base font-bold text-neutral-800">{title}</h2>
      {description && <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-neutral-500">{description}</p>}
      {action && (
        <Link href={action.href} className="mt-5 inline-flex h-10 items-center justify-center rounded-full bg-neutral-950 px-6 text-sm font-bold text-white hover:bg-black transition">
          {action.label}
        </Link>
      )}
    </div>
  )
}

export function AdminTableShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-black/[0.05] bg-white shadow-sm">
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
      ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
      : badge.toLowerCase().includes("inactive") || badge.toLowerCase().includes("disabled")
        ? "bg-neutral-100 text-neutral-500 border border-neutral-200"
        : "bg-neutral-50 text-neutral-400 border border-neutral-100"
    : null

  return (
    <Link href={href}>
      <Card className="h-full rounded-2xl border border-black/[0.05] bg-white transition hover:-translate-y-1 hover:shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-neutral-950 text-white">
              <Icon className="h-5 w-5" />
            </span>
            {badge && (
              <span className={cn(
                "rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em]",
                badgeStyle
              )}>
                {badge}
              </span>
            )}
          </div>
          <h3 className="mt-4 text-lg font-black tracking-[-0.02em] text-neutral-950">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-neutral-500">{description}</p>
        </CardContent>
      </Card>
    </Link>
  )
}

export function AdminBackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group"
    >
      <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
      {label}
    </Link>
  )
}

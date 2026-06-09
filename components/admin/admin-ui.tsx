import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { ArrowRight, Inbox } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string
  title: string
  description?: string
  action?: { label: string; href: string }
}) {
  return (
    <div className="flex flex-col gap-4 rounded-[1.75rem] border border-black/5 bg-white p-5 shadow-sm md:flex-row md:items-end md:justify-between md:p-7">
      <div>
        {eyebrow && (
          <p className="mb-2 text-xs font-black uppercase tracking-[0.24em] text-neutral-400">
            {eyebrow}
          </p>
        )}
        <h1 className="text-3xl font-black tracking-[-0.045em] text-neutral-950 md:text-4xl">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">
            {description}
          </p>
        )}
      </div>
      {action && (
        <Link
          href={action.href}
          className="inline-flex h-11 items-center justify-center rounded-full bg-neutral-950 px-5 text-sm font-bold text-white transition hover:bg-black"
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
      "rounded-[1.35rem] border-black/5 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg",
      tone === "warning" && "bg-amber-50/70",
      tone === "success" && "bg-emerald-50/70",
      tone === "danger" && "bg-red-50/70"
    )}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-neutral-400">{label}</p>
            <p className="mt-3 text-3xl font-black tracking-[-0.04em] text-neutral-950">{value}</p>
          </div>
          {Icon && (
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-neutral-950 text-white">
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
    <Card className={cn("overflow-hidden rounded-[1.5rem] border-black/5 bg-white shadow-sm", className)}>
      {(title || description) && (
        <CardHeader className="border-b border-black/5 bg-[#fbfaf7]">
          {title && <CardTitle className="text-base font-black tracking-[-0.02em]">{title}</CardTitle>}
          {description && <p className="text-sm leading-6 text-neutral-500">{description}</p>}
        </CardHeader>
      )}
      <CardContent className="p-5 md:p-6">{children}</CardContent>
    </Card>
  )
}

const STATUS_STYLES: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; className: string }> = {
  active: { variant: "default", className: "bg-emerald-600 hover:bg-emerald-600 text-white" },
  draft: { variant: "secondary", className: "bg-amber-100 text-amber-800 hover:bg-amber-100" },
  hidden: { variant: "outline", className: "text-muted-foreground border-dashed" },
  archived: { variant: "destructive", className: "bg-neutral-200 text-neutral-600 hover:bg-neutral-200" },
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
    <div className="rounded-[1.5rem] border border-dashed border-black/10 bg-white p-10 text-center">
      <Inbox className="mx-auto mb-4 h-10 w-10 text-neutral-300" />
      <h2 className="text-lg font-black tracking-[-0.02em]">{title}</h2>
      {description && <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-neutral-500">{description}</p>}
      {action && (
        <Link href={action.href} className="mt-5 inline-flex h-10 items-center justify-center rounded-full bg-neutral-950 px-5 text-sm font-bold text-white">
          {action.label}
        </Link>
      )}
    </div>
  )
}

export function AdminTableShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-black/5 bg-white shadow-sm">
      <div className="overflow-x-auto">{children}</div>
    </div>
  )
}

export function AdminHubCard({
  href,
  title,
  description,
  icon: Icon,
}: {
  href: string
  title: string
  description: string
  icon: LucideIcon
}) {
  return (
    <Link href={href}>
      <Card className="h-full rounded-[1.5rem] border-black/5 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
        <CardContent className="p-6">
          <span className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-neutral-950 text-white">
            <Icon className="h-5 w-5" />
          </span>
          <h3 className="text-lg font-black tracking-[-0.02em]">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-neutral-500">{description}</p>
        </CardContent>
      </Card>
    </Link>
  )
}

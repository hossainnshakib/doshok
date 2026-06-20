"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"
import { Pencil, Trash2 } from "lucide-react"
import { AdminEmptyState, AdminPageHeader, AdminStatusBadge, AdminTableShell } from "@/components/admin/admin-ui"

type Coupon = {
  id: string
  code: string
  discount: number
  type: string
  scope: string
  minOrder: number
  maxUses: number | null
  usedCount: number
  expiresAt: string | null
  active: boolean
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([])

  async function load() {
    const res = await fetch("/api/coupons")
    const d = await res.json()
    if (d.success) setCoupons(d.data)
  }

  useEffect(() => { queueMicrotask(() => { void load() }) }, [])

  async function handleDelete(id: string, code: string) {
    if (!confirm(`Delete coupon "${code}"?`)) return
    const res = await fetch(`/api/coupons/${id}`, { method: "DELETE" })
    const d = await res.json()
    if (d.success) {
      toast.success("Coupon deleted")
      load()
    } else {
      toast.error(d.error ?? "Failed")
    }
  }

  async function toggleActive(id: string, current: boolean) {
    const res = await fetch(`/api/coupons/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !current }),
    })
    const d = await res.json()
    if (d.success) {
      toast.success(current ? "Deactivated" : "Activated")
      load()
    }
  }

  function isExpired(c: Coupon): boolean {
    if (!c.expiresAt) return false
    return new Date(c.expiresAt) < new Date()
  }

  return (
    <div className="space-y-5">
      <AdminPageHeader eyebrow="Commerce" title="Coupons" description={`${coupons.length} promotion code${coupons.length === 1 ? "" : "s"} available for campaigns.`} action={{ label: "New Coupon", href: "/admin/coupons/new" }} backHref="/admin/commerce" />

      {coupons.length === 0 ? (
        <AdminEmptyState title="No coupons yet" description="Create a campaign-friendly code for launches, sale periods, or loyalty offers." action={{ label: "New Coupon", href: "/admin/coupons/new" }} />
      ) : (
      <AdminTableShell>
      <Table>
        <TableHeader>
          <TableRow className="border-slate-100">
            <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Code</TableHead>
            <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Discount</TableHead>
            <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Type</TableHead>
            <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Scope</TableHead>
            <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Min Order</TableHead>
            <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold text-center">Used</TableHead>
            <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Expires</TableHead>
            <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Status</TableHead>
            <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {coupons.map((c) => {
            const expired = isExpired(c)
            return (
              <TableRow key={c.id} className="border-slate-50 hover:bg-slate-50/60">
                <TableCell className="font-mono text-[11px] font-bold text-slate-800">{c.code}</TableCell>
                <TableCell className="text-xs font-semibold tabular-nums text-slate-800">
                  {c.type === "percent" ? `${c.discount}%` : `৳${c.discount}`}
                </TableCell>
                <TableCell className="text-xs text-slate-500">{c.type}</TableCell>
                <TableCell className="text-xs">
                  <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                    c.scope === "delivery"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-blue-100 text-blue-700"
                  }`}>
                    {c.scope === "delivery" ? "Delivery" : "Product"}
                  </span>
                </TableCell>
                <TableCell className="text-xs tabular-nums text-slate-600">৳{c.minOrder.toLocaleString()}</TableCell>
                <TableCell className="text-center text-xs tabular-nums text-slate-600">
                  {c.usedCount}{c.maxUses ? ` / ${c.maxUses}` : ""}
                </TableCell>
                <TableCell className="text-xs">
                  {c.expiresAt ? (
                    <span className={expired ? "text-red-500 font-medium" : "text-slate-600"}>
                      {new Date(c.expiresAt).toLocaleDateString()}
                    </span>
                  ) : <span className="text-slate-400">—</span>}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    <button onClick={() => toggleActive(c.id, c.active)} className="cursor-pointer">
                      <AdminStatusBadge status={c.active} />
                    </button>
                    {expired && <AdminStatusBadge status="Expired" />}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Link
                      href={`/admin/coupons/${c.id}`}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Link>
                    <button
                      onClick={() => handleDelete(c.id, c.code)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      </AdminTableShell>
      )}
    </div>
  )
}

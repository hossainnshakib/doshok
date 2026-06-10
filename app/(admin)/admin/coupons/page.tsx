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

  useEffect(() => { load() }, [])

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
    <div className="space-y-6">
      <AdminPageHeader eyebrow="Commerce" title="Coupons" description={`${coupons.length} promotion code${coupons.length === 1 ? "" : "s"} available for campaigns.`} action={{ label: "New Coupon", href: "/admin/coupons/new" }} backHref="/admin/commerce" />

      {coupons.length === 0 ? (
        <AdminEmptyState title="No coupons yet" description="Create a campaign-friendly code for launches, sale periods, or loyalty offers." action={{ label: "New Coupon", href: "/admin/coupons/new" }} />
      ) : (
      <AdminTableShell>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Discount</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Min Order</TableHead>
            <TableHead>Used</TableHead>
            <TableHead>Expires</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {coupons.map((c) => {
            const expired = isExpired(c)
            return (
              <TableRow key={c.id}>
                <TableCell className="font-mono font-bold">{c.code}</TableCell>
                <TableCell>
                  {c.type === "percent" ? `${c.discount}%` : `৳${c.discount}`}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{c.type}</TableCell>
                <TableCell>৳{c.minOrder.toLocaleString()}</TableCell>
                <TableCell>
                  {c.usedCount}{c.maxUses ? ` / ${c.maxUses}` : ""}
                </TableCell>
                <TableCell className="text-sm">
                  {c.expiresAt ? (
                    <span className={expired ? "text-destructive" : ""}>
                      {new Date(c.expiresAt).toLocaleDateString()}
                    </span>
                  ) : "-"}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    <button onClick={() => toggleActive(c.id, c.active)} className="cursor-pointer">
                      <AdminStatusBadge status={c.active} />
                    </button>
                    {expired && (
                      <AdminStatusBadge status="Expired" />
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Link
                      href={`/admin/coupons/${c.id}`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-xl hover:bg-muted"
                    >
                      <Pencil className="h-4 w-4" />
                    </Link>
                    <button
                      onClick={() => handleDelete(c.id, c.code)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-xl hover:bg-destructive/10 text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
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

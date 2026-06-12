"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { AdminPageHeader, AdminTableShell, AdminStatusBadge } from "@/components/admin/admin-ui"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ClipboardList } from "lucide-react"

const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  manual_adjustment: "Manual Adjustment",
  order_reserved: "Order Reserved",
  order_reservation_released: "Reservation Released",
  order_confirmed_deducted: "Confirmed Deduction",
  order_delivered_deducted: "Delivered Deduction",
  order_cancelled_restored: "Cancelled Restore",
  order_returned_restored: "Returned Restore",
  stock_correction: "Stock Correction",
}

const MOVEMENT_TYPE_TONES: Record<string, string> = {
  manual_adjustment: "neutral",
  order_reserved: "warning",
  order_reservation_released: "success",
  order_confirmed_deducted: "default",
  order_delivered_deducted: "default",
  order_cancelled_restored: "success",
  order_returned_restored: "success",
  stock_correction: "neutral",
}

type Movement = {
  id: string
  productId: string
  variantId: string | null
  orderId: string | null
  type: string
  quantity: number
  beforeStock: number | null
  afterStock: number | null
  beforeReserved: number | null
  afterReserved: number | null
  reason: string | null
  note: string | null
  createdAt: string
  product: { name: string }
  variant: { size: string; color: string } | null
}

export default function InventoryMovementsPage() {
  const [movements, setMovements] = useState<Movement[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState("all")
  const page = 1
  const limit = 50

  useEffect(() => {
    const params = new URLSearchParams()
    params.set("limit", String(limit))
    params.set("offset", String((page - 1) * limit))
    if (typeFilter !== "all") params.set("type", typeFilter)

    fetch(`/api/admin/inventory/movements?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setMovements(d.data.movements ?? [])
          setTotal(d.data.total ?? 0)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [typeFilter, page])

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Inventory"
        title="Stock Movements"
        description="Track all stock changes: manual adjustments, order deductions, cancellations, and returns."
      />

      <div className="flex flex-wrap gap-3">
        <Select value={typeFilter} onValueChange={(v) => v && setTypeFilter(v)}>
          <SelectTrigger className="w-48 h-9 rounded-lg text-xs font-semibold">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All Movements</SelectItem>
            {Object.entries(MOVEMENT_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value} className="text-xs">{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center text-xs text-slate-500">
          {total} total movement{total !== 1 ? "s" : ""}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-slate-400">Loading...</div>
      ) : movements.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
            <ClipboardList className="h-6 w-6 text-slate-400" />
          </div>
          <h2 className="text-lg font-bold text-slate-800">No stock movements yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
            Stock movements will appear here when orders are placed, cancelled, or delivered.
          </p>
        </div>
      ) : (
        <AdminTableShell>
          <Table>
            <TableHeader>
              <TableRow className="border-slate-100">
                <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Date</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Product</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Variant</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Type</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold text-right">Qty</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold text-right">Stock</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold text-right">Reserved</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Order</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements.map((m) => (
                <TableRow key={m.id} className="border-slate-50 hover:bg-slate-50/60">
                  <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                    {new Date(m.createdAt).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </TableCell>
                  <TableCell className="text-xs font-semibold text-slate-800 max-w-[160px] truncate">
                    {m.product.name}
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {m.variant ? `${m.variant.size} / ${m.variant.color}` : "—"}
                  </TableCell>
                  <TableCell>
                    <AdminStatusBadge
                      status={MOVEMENT_TYPE_LABELS[m.type] ?? m.type}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={`text-xs font-bold tabular-nums ${
                      m.quantity < 0 ? "text-red-500" : "text-emerald-600"
                    }`}>
                      {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-xs tabular-nums text-slate-600">
                    {m.beforeStock !== null && m.afterStock !== null
                      ? `${m.beforeStock} → ${m.afterStock}`
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right text-xs tabular-nums text-slate-500">
                    {m.beforeReserved !== null && m.afterReserved !== null
                      ? `${m.beforeReserved} → ${m.afterReserved}`
                      : "—"}
                  </TableCell>
                  <TableCell className="text-xs">
                    {m.orderId ? (
                      <Link
                        href={`/admin/orders/${m.orderId}`}
                        className="font-mono text-[11px] text-indigo-600 hover:text-indigo-800"
                      >
                        View
                      </Link>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-slate-500 max-w-[120px] truncate">
                    {m.reason || m.note || "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </AdminTableShell>
      )}
    </div>
  )
}
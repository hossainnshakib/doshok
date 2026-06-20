"use client"

import Link from "next/link"
import { Suspense, startTransition, useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AdminEmptyState, AdminPageHeader, AdminStatusBadge, AdminTableShell } from "@/components/admin/admin-ui"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { getPhoneDisplayE164 } from "@/lib/utils"

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "processing", label: "Processing" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
  { value: "returned", label: "Returned" },
]

function AdminOrdersContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [data, setData] = useState<{
    orders: Array<{
      id: string
      orderNumber: string
      customerName: string
      customerPhone: string
      total: number
      paymentStatus: string
      paymentMethod: string
      orderStatus: string
      createdAt: Date
      items: { quantity: number }[]
    }>
    total: number
    page: number
    pages: number
  } | null>(null)
  const orders = data?.orders ?? []
  const [loading, setLoading] = useState(true)

  const status = searchParams.get("status") ?? "all"
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10))

  useEffect(() => {
    startTransition(() => {
      setLoading(true)
    })
    fetch(`/api/orders?status=${status}&page=${page}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setData(d.data)
      })
      .finally(() => setLoading(false))
  }, [status, page])

  function setFilter(s: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("status", s)
    params.delete("page")
    router.push(`/admin/orders?${params.toString()}`)
  }

  function setPage(p: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", String(p))
    router.push(`/admin/orders?${params.toString()}`)
  }

  const total = data?.total ?? 0
  const totalPages = data?.pages ?? 1

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Sales"
        title="Orders"
        description={`${total} total order${total === 1 ? "" : "s"}${status !== "all" ? ` in "${status}"` : ""}.`}
        backHref="/admin/sales"
      />

      <div className="flex flex-wrap gap-1.5">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all ${
              status === f.value
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-white border border-slate-200/60 text-slate-500 hover:bg-slate-50"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-slate-400">Loading...</div>
      ) : orders.length === 0 ? (
        <AdminEmptyState title="No orders found" description="Orders matching this filter will appear here." />
      ) : (
        <>
          <AdminTableShell>
            <Table>
              <TableHeader>
                <TableRow className="border-slate-100">
                  <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Order</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Customer</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold text-center">Items</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold text-right">Total</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Payment</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Method</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Status</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Date</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id} className="border-slate-50 hover:bg-slate-50/60">
                    <TableCell className="font-mono text-[11px] font-semibold text-slate-700">{order.orderNumber}</TableCell>
                    <TableCell>
                      <div className="text-xs font-semibold text-slate-800">{order.customerName}</div>
                      <div className="text-[10px] text-slate-400">{getPhoneDisplayE164(order.customerPhone)}</div>
                    </TableCell>
                    <TableCell className="text-center text-xs tabular-nums text-slate-600">{order.items.reduce((s, i) => s + i.quantity, 0)}</TableCell>
                    <TableCell className="text-right text-xs font-semibold tabular-nums text-slate-800">৳{order.total.toLocaleString()}</TableCell>
                    <TableCell>
                      <AdminStatusBadge status={order.paymentStatus === "paid" ? "Paid" : "Pending"} type="payment" />
                    </TableCell>
                    <TableCell className="text-[10px] text-slate-500 font-medium">
                      {order.paymentMethod.toUpperCase()}
                    </TableCell>
                    <TableCell>
                      <AdminStatusBadge status={order.orderStatus} type="order" />
                    </TableCell>
                    <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/admin/orders/${order.id}`} className="inline-flex items-center justify-center rounded-md text-[11px] font-semibold h-7 px-2.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors">View</Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </AdminTableShell>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(page - 1)} disabled={page <= 1} className="h-8 rounded-lg text-xs">
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xs font-medium text-slate-500">
                Page {page} of {totalPages}
              </span>
              <Button variant="outline" size="sm" onClick={() => setPage(page + 1)} disabled={page >= totalPages} className="h-8 rounded-lg text-xs">
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-16 text-slate-400"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <AdminOrdersContent />
    </Suspense>
  )
}

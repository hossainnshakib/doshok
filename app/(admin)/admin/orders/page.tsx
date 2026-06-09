"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AdminEmptyState, AdminPageHeader, AdminStatusBadge, AdminTableShell } from "@/components/admin/admin-ui"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

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

export default function AdminOrdersPage() {
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
    setLoading(true)
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
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Sales"
        title="Orders"
        description={`${total} total order${total === 1 ? "" : "s"}${status !== "all" ? ` in "${status}"` : ""}.`}
      />

      <div className="flex flex-wrap gap-1.5">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
              status === f.value
                ? "bg-neutral-950 text-white"
                : "bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-sm text-neutral-400">Loading...</div>
      ) : orders.length === 0 ? (
        <AdminEmptyState title="No orders found" description="Orders matching this filter will appear here." />
      ) : (
        <>
          <AdminTableShell>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-sm">{order.orderNumber}</TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{order.customerName}</div>
                      <div className="text-xs text-muted-foreground">{order.customerPhone}</div>
                    </TableCell>
                    <TableCell>{order.items.reduce((s, i) => s + i.quantity, 0)}</TableCell>
                    <TableCell>৳{order.total.toLocaleString()}</TableCell>
                    <TableCell>
                      <AdminStatusBadge status={order.paymentStatus === "paid" ? "Paid" : "Pending"} type="payment" />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {order.paymentMethod.toUpperCase()}
                    </TableCell>
                    <TableCell>
                      <AdminStatusBadge status={order.orderStatus} type="order" />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/admin/orders/${order.id}`} className="inline-flex items-center justify-center rounded-md text-sm font-medium h-7 px-2.5 hover:bg-muted hover:text-foreground">View</Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </AdminTableShell>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(page - 1)} disabled={page <= 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium text-neutral-500">
                Page {page} of {totalPages}
              </span>
              <Button variant="outline" size="sm" onClick={() => setPage(page + 1)} disabled={page >= totalPages}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getCustomerPhone } from "@/lib/customer"
import { Package, ShoppingBag } from "lucide-react"

type Order = {
  id: string
  orderNumber: string
  total: number
  orderStatus: string
  paymentStatus: string
  paymentMethod: string
  createdAt: string
  items: { quantity: number }[]
}

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  confirmed: "default",
  shipped: "default",
  delivered: "outline",
  cancelled: "destructive",
}

export default function AccountOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const phone = getCustomerPhone()
    if (!phone) return
    fetch(`/api/orders?phone=${encodeURIComponent(phone)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setOrders(d.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="text-center py-12 text-sm text-muted-foreground animate-pulse">Loading orders...</div>
  )

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2 font-medium">History</p>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">My Orders</h1>
      </div>

      {orders.length === 0 ? (
        <Card className="border-border/50 rounded-2xl shadow-sm">
          <CardContent className="py-16 text-center">
            <div className="w-20 h-20 bg-muted rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Package className="h-8 w-8 text-muted-foreground/60" />
            </div>
            <h2 className="text-lg font-semibold mb-2">No orders yet</h2>
            <p className="text-sm text-muted-foreground mb-8 max-w-xs mx-auto">
              When you place an order, it will appear here.
            </p>
            <Link
              href="/products"
              className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-8 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Browse Products
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Link key={order.id} href={`/account/orders/${order.orderNumber}`}>
              <Card className="border-border/50 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
                <CardContent className="flex items-center justify-between p-4 md:p-5">
                  <div className="min-w-0">
                    <p className="font-mono font-medium truncate text-sm">{order.orderNumber}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(order.createdAt).toLocaleDateString()} &middot;{" "}
                      {order.items.reduce((s, i) => s + i.quantity, 0)} item(s)
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {order.paymentMethod === "cod" ? "Cash on Delivery" : order.paymentMethod}
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="font-bold">৳{order.total.toLocaleString()}</p>
                    <Badge variant={statusColors[order.orderStatus] ?? "secondary"} className="mt-1 rounded-full text-[10px] px-2.5">
                      {order.orderStatus}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

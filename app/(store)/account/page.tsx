"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getCustomerPhone } from "@/lib/customer"
import { Package, ShoppingBag, ArrowRight } from "lucide-react"

type Order = {
  id: string
  orderNumber: string
  total: number
  orderStatus: string
  paymentStatus: string
  createdAt: string
  items: { quantity: number }[]
}

export default function AccountDashboardPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [phone, setPhone] = useState("")

  useEffect(() => {
    const p = getCustomerPhone()
    if (!p) return
    setPhone(p)
    fetch(`/api/orders?phone=${encodeURIComponent(p)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setOrders(d.data.slice(0, 5))
      })
      .catch(() => {})
  }, [])

  const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    pending: "secondary",
    confirmed: "default",
    shipped: "default",
    delivered: "outline",
    cancelled: "destructive",
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2 font-medium">Welcome back</p>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">My Account</h1>
        <p className="text-muted-foreground mt-1 text-sm">{phone}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border/50 rounded-2xl shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Package className="h-4 w-4" />
              Total Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{orders.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 rounded-2xl shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" />
              Account Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium text-green-600">Active</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 rounded-2xl shadow-sm overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between px-6 pt-6 pb-4">
          <CardTitle className="text-lg">Recent Orders</CardTitle>
          <Link href="/account/orders" className="text-sm text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
            View All <ArrowRight className="h-3 w-3" />
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {orders.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 px-6">No orders yet. Start shopping to see your orders here.</p>
          ) : (
            <div className="divide-y divide-border/50">
              {orders.map((order) => (
                <Link
                  key={order.id}
                  href={`/account/orders/${order.orderNumber}`}
                  className="flex items-center justify-between py-4 px-6 text-sm hover:bg-muted/30 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-mono font-medium truncate text-xs">{order.orderNumber}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(order.createdAt).toLocaleDateString()} &middot;{" "}
                      {order.items.reduce((s, i) => s + i.quantity, 0)} item(s)
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="font-semibold">৳{order.total.toLocaleString()}</p>
                    <Badge variant={statusColors[order.orderStatus] ?? "secondary"} className="mt-1 text-[10px] rounded-full px-2">
                      {order.orderStatus}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

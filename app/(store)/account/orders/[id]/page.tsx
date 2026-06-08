"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Package, MapPin, CreditCard } from "lucide-react"

type Order = {
  id: string
  orderNumber: string
  customerName: string
  customerPhone: string
  subtotal: number
  deliveryFee: number
  total: number
  paidAmount: number
  paymentMethod: string
  paymentStatus: string
  orderStatus: string
  createdAt: string
  items: {
    id: string
    name: string
    size: string | null
    color: string | null
    quantity: number
    price: number
  }[]
  address: {
    division: string
    district: string
    thana: string
    fullAddress: string
  } | null
}

export default function AccountOrderDetailPage() {
  const params = useParams()
  const orderNumber = params.id as string
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/orders/number/${orderNumber}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setOrder(d.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [orderNumber])

  if (loading) return (
    <div className="text-center py-12 text-sm text-muted-foreground animate-pulse">Loading...</div>
  )
  if (!order) return (
    <div className="text-center py-12">
      <p className="text-muted-foreground">Order not found.</p>
    </div>
  )

  const dueAmount = order.total - order.paidAmount

  return (
    <div className="space-y-6">
      <Link href="/account/orders" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 transition-colors group">
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" /> Back to Orders
      </Link>

      <div>
        <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground mb-2 font-medium">Order Details</p>
        <h1 className="text-2xl font-bold font-mono">{order.orderNumber}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Placed on {new Date(order.createdAt).toLocaleDateString()}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-border/50 rounded-2xl shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Package className="h-4 w-4" /> Status
            </CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Badge variant={order.orderStatus === "cancelled" ? "destructive" : "default"} className="rounded-full">
              {order.orderStatus}
            </Badge>
            <Badge variant={order.paymentStatus === "paid" ? "default" : "secondary"} className="rounded-full">
              {order.paymentStatus === "paid" ? "Paid" : "Pending"}
            </Badge>
          </CardContent>
        </Card>

        <Card className="border-border/50 rounded-2xl shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <MapPin className="h-4 w-4" /> Delivery Address
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-0.5">
            <p className="font-medium">{order.customerName}</p>
            <p className="text-muted-foreground">{order.customerPhone}</p>
            {order.address && (
              <>
                <p>{order.address.fullAddress}</p>
                <p className="text-muted-foreground">
                  {order.address.thana}, {order.address.district}, {order.address.division}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 rounded-2xl shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <CreditCard className="h-4 w-4" /> Items
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border/50">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between py-3 text-sm first:pt-0 last:pb-0">
                <div>
                  <p className="font-medium">{item.name}</p>
                  {[item.size, item.color].filter(Boolean).length > 0 && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {[item.size, item.color].filter(Boolean).join(" / ")}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">Qty: {item.quantity}</p>
                </div>
                <p className="font-medium">৳{(item.price * item.quantity).toLocaleString()}</p>
              </div>
            ))}
          </div>
          <Separator className="my-4" />
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>৳{order.subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Delivery Fee</span>
              <span>৳{order.deliveryFee.toLocaleString()}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-bold text-base">
              <span>Total</span>
              <span>৳{order.total.toLocaleString()}</span>
            </div>
            {order.paymentMethod === "cod" && dueAmount > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Due at delivery</span>
                <span>৳{dueAmount.toLocaleString()}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

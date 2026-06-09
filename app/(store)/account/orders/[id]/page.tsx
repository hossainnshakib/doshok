"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Package, MapPin, CreditCard, ShoppingCart, RotateCcw, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { addToCart } from "@/lib/cart"
import { OrderTimeline } from "@/components/store/order-timeline"

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

type ReorderResult = {
  note: string
  reorderable: {
    productId: string
    variantId?: string
    name: string
    price: number
    size?: string
    color?: string
    colorHex?: string
    image?: string
    slug?: string
    quantity: number
  }[]
  skipped: {
    productId: string
    variantId?: string
    name: string
    size?: string
    color?: string
    reason: string
  }[]
  orderNumber: string
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pending", variant: "secondary" },
  confirmed: { label: "Confirmed", variant: "default" },
  processing: { label: "Processing", variant: "default" },
  shipped: { label: "Shipped", variant: "default" },
  delivered: { label: "Delivered", variant: "outline" },
  cancelled: { label: "Cancelled", variant: "destructive" },
}

export default function AccountOrderDetailPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const orderNumber = params.id as string
  const phone = searchParams.get("phone") ?? ""
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [reordering, setReordering] = useState(false)
  const [reorderResult, setReorderResult] = useState<ReorderResult | null>(null)

  useEffect(() => {
    if (!phone) return
    fetch(`/api/orders/number/${encodeURIComponent(orderNumber)}?phone=${encodeURIComponent(phone)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setOrder(d.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [orderNumber, phone])

  async function handleReorder(mode: "cart" | "checkout") {
    setReordering(true)
    setReorderResult(null)
    try {
      const res = await fetch(`/api/account/orders/${orderNumber}/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      })
      const d = await res.json()
      if (!d.success) {
        toast.error(d.error ?? "Failed to reorder")
        return
      }

      setReorderResult(d.data)

      for (const item of d.data.reorderable) {
        addToCart({
          productId: item.productId,
          variantId: item.variantId,
          name: item.name,
          price: item.price,
          size: item.size,
          color: item.color,
          image: item.image,
          slug: item.slug,
          quantity: item.quantity,
        })
      }
      window.dispatchEvent(new Event("cart-update"))

      if (d.data.skipped.length > 0) {
        toast.warning(
          `${d.data.reorderable.length} item(s) added to cart. ${d.data.skipped.length} item(s) skipped.`,
          { duration: 5000 }
        )
      } else {
        toast.success("Items added to cart.")
      }

      if (mode === "checkout") {
        router.push("/checkout")
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setReordering(false)
    }
  }

  if (loading) return (
    <div className="text-center py-12 text-sm text-muted-foreground animate-pulse">Loading...</div>
  )
  if (!order) return (
    <div className="text-center py-12">
      <p className="text-muted-foreground">Order not found.</p>
    </div>
  )

  const dueAmount = order.total - order.paidAmount
  const statusInfo = statusConfig[order.orderStatus] ?? { label: order.orderStatus, variant: "secondary" as const }

  return (
    <div className="space-y-6">
      <Link href="/account/orders" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 transition-colors group">
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" /> Back to Orders
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground mb-2 font-medium">Order Details</p>
          <h1 className="text-2xl font-bold font-mono">{order.orderNumber}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Placed on {new Date(order.createdAt).toLocaleDateString()}
          </p>
        </div>

        <div className="flex gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            disabled={reordering}
            onClick={() => handleReorder("cart")}
            className="rounded-full"
          >
            <ShoppingCart className="h-4 w-4 mr-1.5" />
            {reordering ? "Adding..." : "Add to Cart"}
          </Button>
          <Button
            size="sm"
            disabled={reordering}
            onClick={() => handleReorder("checkout")}
            className="rounded-full"
          >
            <RotateCcw className="h-4 w-4 mr-1.5" />
            {reordering ? "Adding..." : "Buy Again"}
          </Button>
        </div>
      </div>

      {reorderResult && reorderResult.note && reorderResult.reorderable.length > 0 && (
        <div className="text-xs text-muted-foreground bg-muted/50 rounded-xl px-4 py-2.5">
          {reorderResult.note}
        </div>
      )}

      {reorderResult && reorderResult.skipped.length > 0 && (
        <Card className="border-amber-200/50 bg-amber-50/50 dark:border-amber-800/50 dark:bg-amber-950/20 rounded-2xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4" /> Unavailable Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-amber-200/30 text-sm">
              {reorderResult.skipped.map((item, i) => (
                <div key={i} className="flex justify-between py-2 first:pt-0 last:pb-0">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    {[item.size, item.color].filter(Boolean).length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {[item.size, item.color].filter(Boolean).join(" / ")}
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground ml-4 shrink-0">{item.reason}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-border/50 rounded-2xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Package className="h-4 w-4" /> Order Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <OrderTimeline currentStatus={order.orderStatus} />
          <div className="flex flex-wrap gap-2">
            <Badge variant={statusInfo.variant} className="rounded-full">
              {statusInfo.label}
            </Badge>
            <Badge variant={order.paymentStatus === "paid" ? "default" : "secondary"} className="rounded-full">
              {order.paymentStatus === "paid" ? "Paid" : "Payment Pending"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {order.address && (
          <Card className="border-border/50 rounded-2xl shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <MapPin className="h-4 w-4" /> Delivery Address
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-0.5">
              <p className="font-medium">{order.customerName}</p>
              <p className="text-muted-foreground">{order.customerPhone}</p>
              <p>{order.address.fullAddress}</p>
              <p className="text-muted-foreground">
                {order.address.thana}, {order.address.district}, {order.address.division}
              </p>
            </CardContent>
          </Card>
        )}
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

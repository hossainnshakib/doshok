"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Package, RotateCcw, ShoppingBag, BadgeCheck, Truck, Home, X } from "lucide-react"
import { toast } from "sonner"
import { addToCart } from "@/lib/cart"
import { getPhoneServerValue } from "@/lib/utils"

type Order = {
  id: string
  orderNumber: string
  customerPhone: string
  total: number
  orderStatus: string
  paymentStatus: string
  paymentMethod: string
  createdAt: string
  items: { quantity: number }[]
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Package }> = {
  pending: { label: "Pending", variant: "secondary", icon: Package },
  confirmed: { label: "Confirmed", variant: "default", icon: BadgeCheck },
  processing: { label: "Processing", variant: "default", icon: Package },
  shipped: { label: "Shipped", variant: "default", icon: Truck },
  delivered: { label: "Delivered", variant: "outline", icon: Home },
  cancelled: { label: "Cancelled", variant: "destructive", icon: X },
  returned: { label: "Returned", variant: "destructive", icon: RotateCcw },
}

export default function AccountOrdersPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [reordering, setReordering] = useState<string | null>(null)

  useEffect(() => {
    if (!session?.user?.id) return
    fetch(`/api/orders?userId=${session.user.id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success && Array.isArray(d.data.orders)) setOrders(d.data.orders)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [session])

  async function handleReorder(orderNumber: string, mode: "cart" | "checkout") {
    setReordering(orderNumber)
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
      setReordering(null)
    }
  }

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
              <ShoppingBag className="h-8 w-8 text-muted-foreground/60" />
            </div>
            <h2 className="text-lg font-semibold mb-2">You haven&apos;t placed any orders yet.</h2>
            <p className="text-sm text-muted-foreground mb-8 max-w-xs mx-auto">
              Browse products and place your first order today.
            </p>
            <Link
              href="/products"
              className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-8 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Start Shopping
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const cfg = statusConfig[order.orderStatus] ?? { label: order.orderStatus, variant: "secondary" as const, icon: Package }
            const StatusIcon = cfg.icon
            return (
              <div key={order.id} className="group relative">
                <Link href={`/account/orders/${order.orderNumber}?phone=${encodeURIComponent(getPhoneServerValue(order.customerPhone))}`}>
                  <Card className="border-border/50 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
                    <CardContent className="flex items-center justify-between p-4 md:p-5">
                      <div className="min-w-0 flex items-center gap-3 md:gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-muted">
                          <StatusIcon className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-mono font-medium text-xs md:text-sm">{order.orderNumber}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {new Date(order.createdAt).toLocaleDateString()} &middot;{" "}
                            {order.items.reduce((s, i) => s + i.quantity, 0)} item(s)
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {order.paymentMethod === "cod" ? "Cash on Delivery" : order.paymentMethod}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-4 flex flex-col items-end gap-2">
                        <p className="font-bold text-sm md:text-base">৳{order.total.toLocaleString()}</p>
                        <Badge variant={cfg.variant} className="rounded-full text-[10px] px-2.5">
                          {cfg.label}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={reordering === order.orderNumber}
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            handleReorder(order.orderNumber, "cart")
                          }}
                          className="rounded-full text-xs h-7 px-3 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          {reordering === order.orderNumber ? "Adding..." : "Reorder"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

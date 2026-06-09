"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Package, ShoppingBag, ArrowRight, BadgeCheck, AlertTriangle,
  Loader2, Mail, RotateCcw, MapPin, User, ListOrdered, ShoppingCart
} from "lucide-react"
import { toast } from "sonner"
import { addToCart } from "@/lib/cart"

type Order = {
  id: string
  orderNumber: string
  total: number
  orderStatus: string
  paymentStatus: string
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

export default function AccountDashboardPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [orders, setOrders] = useState<Order[]>([])
  const [addressCount, setAddressCount] = useState(0)
  const [reordering, setReordering] = useState<string | null>(null)
  const [resending, setResending] = useState(false)

  useEffect(() => {
    if (!session?.user?.id) return
    fetch(`/api/orders?userId=${session.user.id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setOrders(d.data.slice(0, 5))
      })
      .catch(() => {})
    fetch("/api/account/addresses")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setAddressCount(d.data.length)
      })
      .catch(() => {})
  }, [session])

  const handleResend = useCallback(async () => {
    if (!session?.user?.email) return
    setResending(true)
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: session.user.email }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Verification email sent. Check your inbox.")
      } else {
        toast.error(data.error ?? "Failed to send")
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setResending(false)
    }
  }, [session])

  async function handleReorder(orderNumber: string) {
    setReordering(orderNumber)
    try {
      const res = await fetch(`/api/account/orders/${orderNumber}/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "cart" }),
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
    } catch {
      toast.error("Something went wrong")
    } finally {
      setReordering(null)
    }
  }

  const activeOrders = orders.filter(
    (o) => !["delivered", "cancelled"].includes(o.orderStatus)
  ).length
  const deliveredOrders = orders.filter(
    (o) => o.orderStatus === "delivered"
  ).length
  const recentOrder = orders[0]

  const displayName = session?.user?.firstName || session?.user?.name || "there"
  const isVerified = !!session?.user?.emailVerified

  const quickActions = [
    { href: "/account/orders", label: "View Orders", icon: ListOrdered },
    { href: "/account/addresses", label: "Manage Addresses", icon: MapPin },
    { href: "/account/profile", label: "Edit Profile", icon: User },
    { href: "/products", label: "Continue Shopping", icon: ShoppingBag },
  ]

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2 font-medium">Welcome back</p>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Hello, {displayName}</h1>
          {isVerified && (
            <BadgeCheck className="h-6 w-6 text-primary shrink-0" />
          )}
        </div>
        <p className="text-muted-foreground mt-1 text-sm">{session?.user?.email}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
        <Card className="border-border/50 rounded-2xl shadow-sm">
          <CardHeader className="pb-2 md:pb-3 px-3 md:px-6 pt-3 md:pt-6">
            <CardTitle className="text-[10px] md:text-sm font-medium text-muted-foreground flex items-center gap-1.5 md:gap-2">
              <Package className="h-3 w-3 md:h-4 md:w-4" />
              Total Orders
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
            <p className="text-xl md:text-3xl font-bold">{orders.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 rounded-2xl shadow-sm">
          <CardHeader className="pb-2 md:pb-3 px-3 md:px-6 pt-3 md:pt-6">
            <CardTitle className="text-[10px] md:text-sm font-medium text-muted-foreground flex items-center gap-1.5 md:gap-2">
              <ShoppingBag className="h-3 w-3 md:h-4 md:w-4" />
              Active
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
            <p className="text-xl md:text-3xl font-bold">{activeOrders}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 rounded-2xl shadow-sm">
          <CardHeader className="pb-2 md:pb-3 px-3 md:px-6 pt-3 md:pt-6">
            <CardTitle className="text-[10px] md:text-sm font-medium text-muted-foreground flex items-center gap-1.5 md:gap-2">
              <BadgeCheck className="h-3 w-3 md:h-4 md:w-4" />
              Delivered
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
            <p className="text-xl md:text-3xl font-bold">{deliveredOrders}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 rounded-2xl shadow-sm">
          <CardHeader className="pb-2 md:pb-3 px-3 md:px-6 pt-3 md:pt-6">
            <CardTitle className="text-[10px] md:text-sm font-medium text-muted-foreground flex items-center gap-1.5 md:gap-2">
              <MapPin className="h-3 w-3 md:h-4 md:w-4" />
              Addresses
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
            <p className="text-xl md:text-3xl font-bold">{addressCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 rounded-2xl shadow-sm overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between px-4 md:px-6 pt-4 md:pt-6 pb-3 md:pb-4">
          <CardTitle className="text-base md:text-lg">Recent Order</CardTitle>
          {orders.length > 1 && (
            <Link href="/account/orders" className="text-xs md:text-sm text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
              View All <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {!recentOrder ? (
            <p className="text-sm text-muted-foreground py-8 px-4 md:px-6">
              You haven&apos;t placed any orders yet.
            </p>
          ) : (
            <div className="px-4 md:px-6 pb-4 md:pb-6">
              <Card className="border-border/50 rounded-2xl shadow-sm">
                <CardContent className="p-3 md:p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <Link href={`/account/orders/${recentOrder.orderNumber}`} className="hover:underline">
                        <p className="font-mono font-medium text-xs md:text-sm">{recentOrder.orderNumber}</p>
                      </Link>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(recentOrder.createdAt).toLocaleDateString()} &middot;{" "}
                        {recentOrder.items.reduce((s, i) => s + i.quantity, 0)} item(s)
                      </p>
                      <p className="font-semibold text-sm md:text-base mt-1">৳{recentOrder.total.toLocaleString()}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <Badge variant={statusColors[recentOrder.orderStatus] ?? "secondary"} className="rounded-full text-[10px] px-2.5">
                        {recentOrder.orderStatus}
                      </Badge>
                      <div className="flex gap-1.5">
                        <Link
                          href={`/account/orders/${recentOrder.orderNumber}`}
                          className="inline-flex h-7 items-center justify-center rounded-full border border-border bg-background px-3 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                        >
                          View
                        </Link>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={reordering === recentOrder.orderNumber}
                          onClick={() => handleReorder(recentOrder.orderNumber)}
                          className="rounded-full h-7 text-xs px-3"
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          {reordering === recentOrder.orderNumber ? "Adding..." : "Reorder"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>

      <div>
        <h2 className="text-sm font-semibold mb-3 md:mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon
            return (
              <Link key={action.href} href={action.href}>
                <Card className="border-border/50 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 h-full">
                  <CardContent className="flex flex-col items-center justify-center py-5 md:py-8 gap-2 md:gap-3">
                    <div className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-2xl bg-primary/5">
                      <Icon className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                    </div>
                    <p className="text-xs md:text-sm font-medium text-center">{action.label}</p>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      </div>

      {!isVerified && (
        <Card className="border-amber-200/50 bg-amber-50/50 dark:border-amber-800/50 dark:bg-amber-950/20 rounded-2xl shadow-sm">
          <CardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-3 py-4 md:py-5 px-4 md:px-6">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
            <p className="text-sm flex-1 text-amber-800 dark:text-amber-300">
              Your email is not verified. Please check your inbox or resend the verification email.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs rounded-xl shrink-0"
              onClick={handleResend}
              disabled={resending}
            >
              {resending ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
              ) : (
                <Mail className="h-3 w-3 mr-1.5" />
              )}
              {resending ? "Sending..." : "Resend Verification"}
            </Button>
          </CardContent>
        </Card>
      )}

      {!session?.user?.phone && isVerified && (
        <Card className="border-border/50 rounded-2xl shadow-sm">
          <CardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-3 py-4 md:py-5 px-4 md:px-6">
            <AlertTriangle className="h-5 w-5 text-muted-foreground shrink-0" />
            <p className="text-sm flex-1 text-muted-foreground">
              Add a phone number to your profile for faster checkout.
            </p>
            <Link
              href="/account/profile"
              className="inline-flex h-8 items-center justify-center rounded-xl border border-border bg-background px-3 text-xs font-medium text-foreground hover:bg-muted transition-colors shrink-0"
            >
              Add Phone
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

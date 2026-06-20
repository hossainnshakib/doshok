import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { validateSuccessToken } from "@/lib/checkout/success-token"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { CheckCircle, Package, MapPin, CreditCard, Truck, HeadphonesIcon, ShoppingBag } from "lucide-react"
import { getPhoneDisplayE164 } from "@/lib/utils"
import { getEffectiveDeliveryFee, getOrderProductSubtotal, inferDeliveryZoneLabelFromDistrictName } from "@/lib/order-delivery"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Order Placed — Doshok",
  robots: { index: false, follow: false },
}

export default async function OrderSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderNumber: string }>
  searchParams: Promise<{ token?: string }>
}) {
  const { orderNumber } = await params
  const sp = await searchParams
  const token = sp.token

  if (!token) {
    redirect("/")
  }

  if (!validateSuccessToken(token, orderNumber)) {
    redirect("/")
  }

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: {
      items: true,
      address: true,
      transactions: {
        select: { id: true, trxId: true, status: true, amount: true, verifiedAt: true },
        orderBy: { verifiedAt: "desc" },
      },
    },
  })

  if (!order) notFound()

  const productSubtotal = getOrderProductSubtotal(order)
  const effectiveDeliveryFee = getEffectiveDeliveryFee(order)
  const deliveryZoneLabel = order.address
    ? inferDeliveryZoneLabelFromDistrictName(order.address.district)
    : null

  const hasScopedDiscountFields = (order.productDiscount ?? 0) > 0 || (order.deliveryDiscount ?? 0) > 0

  const orderDate = new Date(order.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  const hasInvoiceAccess = !!order.userId

  return (
    <div className="container mx-auto container-px py-8 md:py-12 max-w-3xl">
      <div className="text-center mb-10">
        <div className="w-20 h-20 bg-green-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="h-10 w-10 text-green-600" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">Thank You!</h1>
        <p className="text-muted-foreground text-lg">Your order has been placed successfully.</p>
      </div>

      <Card className="mb-6 border-border/50 rounded-2xl shadow-sm overflow-hidden">
        <CardContent className="p-6 md:p-8 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Order Number</span>
            <span className="font-mono font-bold text-lg">{order.orderNumber}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Order Date</span>
            <span className="text-sm font-medium">{orderDate}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <Badge variant="secondary" className="rounded-full capitalize">{order.orderStatus}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Payment</span>
            <Badge variant={order.paymentStatus === "paid" ? "default" : "secondary"} className="rounded-full capitalize">
              {order.paymentMethod === "cod" ? "Cash on Delivery" : order.paymentMethod}
            </Badge>
          </div>
          <Separator />
          <div className="flex items-center justify-between font-bold text-xl">
            <span>Total</span>
            <span>৳{order.total.toLocaleString()}</span>
          </div>
          {order.discount > 0 && (
            <div className="flex items-center justify-between text-sm text-green-600">
              <span>Discount</span>
              <span>-৳{order.discount.toLocaleString()}</span>
            </div>
          )}
          {order.paidAmount > 0 && (
            <div className="flex items-center justify-between text-sm text-green-600">
              <span>Paid</span>
              <span>৳{order.paidAmount.toLocaleString()}</span>
            </div>
          )}
          {order.dueAmount > 0 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Due on Delivery</span>
              <span>৳{order.dueAmount.toLocaleString()}</span>
            </div>
          )}
          {order.transactions?.[0] && order.paymentStatus === "paid" && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Transaction ID</span>
              <span className="font-mono text-sm">{order.transactions[0].trxId}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mb-6 border-border/50 rounded-2xl shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <CreditCard className="h-4 w-4" /> Customer Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p className="font-medium">{order.customerName}</p>
          <p className="text-muted-foreground">{getPhoneDisplayE164(order.customerPhone)}</p>
          {order.customerEmail && <p className="text-muted-foreground">{order.customerEmail}</p>}
        </CardContent>
      </Card>

      <Card className="mb-6 border-border/50 rounded-2xl shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="h-4 w-4" /> Delivery Address
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          {order.address && (
            <>
              <p>{order.address.fullAddress}</p>
              <p className="text-muted-foreground">
                {order.address.thana}, {order.address.district}, {order.address.division}
              </p>
              {deliveryZoneLabel && (
                <p className="text-muted-foreground">Delivery area: {deliveryZoneLabel}</p>
              )}
            </>
          )}
          {order.notes && (
            <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-500 mb-1">Order Note</p>
              <p className="text-sm text-amber-800">{order.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mb-8 border-border/50 rounded-2xl shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="h-4 w-4" /> Items ({order.items.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border/50">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between py-3 text-sm first:pt-0 last:pb-0">
                <div>
                  <p className="font-medium">{item.name}</p>
                  {item.size || item.color ? (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {[item.size, item.color].filter(Boolean).join(" / ")}
                    </p>
                  ) : null}
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
              <span>৳{productSubtotal.toLocaleString()}</span>
            </div>
            {order.productDiscount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Product Discount</span>
                <span>-৳{order.productDiscount.toLocaleString()}</span>
              </div>
            )}
            {order.discount > 0 && !hasScopedDiscountFields && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span>-৳{order.discount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Delivery Fee</span>
              <span>৳{order.deliveryFee.toLocaleString()}</span>
            </div>
            {order.deliveryDiscount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Delivery Discount</span>
                <span>-৳{order.deliveryDiscount.toLocaleString()}</span>
              </div>
            )}
            {effectiveDeliveryFee !== order.deliveryFee && (
              <div className="flex justify-between text-muted-foreground">
                <span>Final Delivery Fee</span>
                <span>৳{effectiveDeliveryFee.toLocaleString()}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-bold text-base">
              <span>Total</span>
              <span>৳{order.total.toLocaleString()}</span>
            </div>
            {order.paidAmount > 0 && (
              <div className="flex justify-between text-green-600 text-sm">
                <span>Paid Amount</span>
                <span>৳{order.paidAmount.toLocaleString()}</span>
              </div>
            )}
            {order.dueAmount > 0 && (
              <div className="flex justify-between text-muted-foreground text-sm">
                <span>Due on Delivery</span>
                <span>৳{order.dueAmount.toLocaleString()}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap items-center justify-center">
        <Link
          href={`/track-order?order=${order.orderNumber}`}
          className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-8 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98] gap-2"
        >
          <Truck className="h-4 w-4" />
          Track Order
        </Link>

        {hasInvoiceAccess ? (
          <Link
            href={`/order/${order.orderNumber}/invoice`}
            className="inline-flex h-12 items-center justify-center rounded-full border border-border bg-background px-8 text-sm font-medium hover:bg-muted transition-all hover:scale-[1.02] active:scale-[0.98] gap-2"
          >
            <ShoppingBag className="h-4 w-4" />
            View Invoice
          </Link>
        ) : (
          <span className="inline-flex h-12 items-center justify-center rounded-full border border-border bg-muted/30 px-8 text-sm text-muted-foreground gap-2 cursor-not-allowed">
            <ShoppingBag className="h-4 w-4" />
            Invoice available after login or track order verification
          </span>
        )}

        <Link
          href="/"
          className="inline-flex h-12 items-center justify-center rounded-full border border-border bg-background px-8 text-sm font-medium hover:bg-muted transition-all hover:scale-[1.02] active:scale-[0.98] gap-2"
        >
          <Package className="h-4 w-4" />
          Continue Shopping
        </Link>

        <Link
          href="/contact"
          className="inline-flex h-12 items-center justify-center rounded-full border border-border bg-background px-8 text-sm font-medium hover:bg-muted transition-all hover:scale-[1.02] active:scale-[0.98] gap-2"
        >
          <HeadphonesIcon className="h-4 w-4" />
          Contact Support
        </Link>
      </div>
    </div>
  )
}

import { notFound } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { CheckCircle, Package, MapPin, CreditCard, Truck, UserPlus, AlertTriangle, Clock } from "lucide-react"
import { getPhoneDisplayE164 } from "@/lib/utils"
import type { Metadata } from "next"

const COURIER_NAMES: Record<string, string> = {
  PATHAO: "Pathao",
  STEADFAST: "Steadfast",
  REDX: "RedX",
}

const SHIPMENT_STATUS_NAMES: Record<string, string> = {
  NOT_CREATED: "Not Created",
  SETUP_READY: "Setup Ready",
  PENDING: "Pending",
  DISPATCHED: "Dispatched",
  IN_TRANSIT: "In Transit",
  DELIVERED: "Delivered",
  FAILED: "Failed",
  RETURNED: "Returned",
  CANCELLED: "Cancelled",
}

export default async function OrderConfirmationPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderNumber: string }>
  searchParams: Promise<{ payment?: string; orderId?: string }>
}) {
  const { orderNumber } = await params
  const sp = await searchParams

  let order = await prisma.order.findUnique({
    where: { orderNumber },
    include: {
      items: true,
      address: true,
      shipment: {
        select: {
          courierProvider: true,
          status: true,
          trackingCode: true,
          customerNote: true,
        },
      },
    },
  })

  if (!order && sp.orderId) {
    order = await prisma.order.findUnique({
      where: { id: sp.orderId },
      include: {
        items: true,
        address: true,
        shipment: {
          select: {
            courierProvider: true,
            status: true,
            trackingCode: true,
            customerNote: true,
          },
        },
      },
    })
  }

  if (!order) notFound()

  const isBkashPayment = order.paymentMethod.toLowerCase() === "bkash"
  const isOnlinePayment = isBkashPayment
  const requiresAdvancePayment = order.payNow > 0
  const showSuccessBanner = sp.payment === "success" && order.paymentStatus === "paid"
  const showPendingBanner = isOnlinePayment && order.paymentStatus === "pending"

  const canRetryPayment = isOnlinePayment
    && order.paymentStatus === "pending"
    && order.orderStatus === "pending"
    && order.paymentExpiresAt
    && new Date(order.paymentExpiresAt) > new Date()

  const expiryInfo = order.paymentExpiresAt ? (() => {
    const diff = new Date(order.paymentExpiresAt!).getTime() - Date.now()
    if (diff <= 0) return null
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    return hours > 0 ? `${hours}h ${minutes}m remaining` : `${minutes}m remaining`
  })() : null

  const paymentInfo = await (async () => {
    if (order.paymentStatus !== "paid") return null
    const tx = await prisma.paymentTransaction.findFirst({
      where: { orderId: order.id },
      orderBy: { verifiedAt: "desc" },
    })
    return tx
  })()

  return (
    <div className="container mx-auto container-px py-8 md:py-12 max-w-3xl">
      {showSuccessBanner ? (
        <div className="mb-8 rounded-2xl border border-green-200 bg-green-50 p-5 text-center">
          <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <CheckCircle className="h-7 w-7 text-green-600" />
          </div>
          <h2 className="text-lg font-semibold text-green-800">Payment Successful!</h2>
          <p className="text-sm text-green-700 mt-1">Your bKash payment has been verified. Your order is confirmed.</p>
        </div>
      ) : null}

      {showPendingBanner && (
        <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-center">
          <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Clock className="h-7 w-7 text-amber-600" />
          </div>
          <h2 className="text-lg font-semibold text-amber-800">Awaiting Payment</h2>
          <p className="text-sm text-amber-700 mt-1">
            Your order is created but payment is pending.{expiryInfo ? ` Payment expires in ${expiryInfo}.` : ""}
          </p>
          {canRetryPayment && (
            <Link
              href={`/order/payment-retry?orderId=${order.id}`}
              className="inline-flex items-center gap-2 mt-3 px-5 py-2.5 rounded-xl bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 transition-colors"
            >
              Retry Payment — ৳{order.payNow.toLocaleString()}
            </Link>
          )}
        </div>
      )}

      {order.orderStatus === "cancelled" && order.paymentMethod !== "cod" && (
        <div className="mb-8 rounded-2xl border border-red-200 bg-red-50 p-5 text-center">
          <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <AlertTriangle className="h-7 w-7 text-red-600" />
          </div>
          <h2 className="text-lg font-semibold text-red-800">Order Cancelled</h2>
          <p className="text-sm text-red-700 mt-1">
            {order.stockRestoredAt
              ? "Payment was not completed and your reserved inventory has been returned to the product."
              : "This order was cancelled."}
          </p>
        </div>
      )}

      <div className="text-center mb-12">
        <div className="w-20 h-20 bg-green-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="h-10 w-10 text-green-600" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
          {order.paymentStatus === "paid"
            ? "Order Confirmed!"
            : requiresAdvancePayment
              ? "Awaiting Payment"
              : "Order Placed!"}
        </h1>
        <p className="text-muted-foreground">
          {order.paymentStatus === "paid"
            ? "Your payment is confirmed. We'll prepare your order shortly."
            : requiresAdvancePayment
              ? "Please complete your payment to confirm the order."
              : "Thank you for your order. We'll confirm it shortly."}
        </p>
      </div>

      <Card className="mb-6 border-border/50 rounded-2xl shadow-sm overflow-hidden">
        <CardContent className="p-6 md:p-8 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Order Number</span>
            <span className="font-mono font-bold text-lg">{order.orderNumber}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <Badge variant="secondary" className="rounded-full">{order.orderStatus}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Payment</span>
            <Badge variant={order.paymentStatus === "paid" ? "default" : "secondary"} className="rounded-full">
              {order.paymentMethod === "cod" ? "Cash on Delivery" : order.paymentMethod.toUpperCase()}
            </Badge>
          </div>
          {paymentInfo && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Transaction ID</span>
                <span className="font-mono text-sm">{paymentInfo.trxId}</span>
              </div>
              {paymentInfo.verifiedAt && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Verified</span>
                  <span className="text-sm">{new Date(paymentInfo.verifiedAt).toLocaleString()}</span>
                </div>
              )}
            </>
          )}
          <Separator />
          <div className="flex items-center justify-between font-bold text-xl">
            <span>Total</span>
            <span>৳{order.total.toLocaleString()}</span>
          </div>
          {requiresAdvancePayment && order.payNow > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span>Pay Now</span>
              <span className="font-medium text-primary">৳{order.payNow.toLocaleString()}</span>
            </div>
          )}
          {order.paidAmount > 0 && (
            <div className="flex items-center justify-between text-sm text-green-600">
              <span>Paid Amount</span>
              <span>৳{order.paidAmount.toLocaleString()}</span>
            </div>
          )}
          {order.dueAmount > 0 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Due on Delivery</span>
              <span>৳{order.dueAmount.toLocaleString()}</span>
            </div>
          )}
          {canRetryPayment && (
            <>
              <Separator />
              <div className="pt-2">
                <Link
                  href={`/order/payment-retry?orderId=${order.id}`}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <Clock className="h-4 w-4" />
                  Retry Payment — ৳{order.payNow.toLocaleString()}
                </Link>
                {expiryInfo && (
                  <p className="text-xs text-center text-muted-foreground mt-2">Payment expires {expiryInfo}</p>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {order.shipment && order.shipment.status !== "NOT_CREATED" && (
        <Card className="mb-6 border-border/50 rounded-2xl shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Truck className="h-4 w-4" /> Shipment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-xs font-semibold text-muted-foreground">Courier</p>
                <p className="font-medium">{COURIER_NAMES[order.shipment.courierProvider] || order.shipment.courierProvider}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground">Status</p>
                <p className="font-medium">{SHIPMENT_STATUS_NAMES[order.shipment.status] || order.shipment.status}</p>
              </div>
              {order.shipment.trackingCode && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">Tracking</p>
                  <p className="font-mono text-sm font-medium">{order.shipment.trackingCode}</p>
                </div>
              )}
            </div>
            {order.shipment.customerNote && (
              <p className="text-sm text-muted-foreground">{order.shipment.customerNote}</p>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="mb-6 border-border/50 rounded-2xl shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="h-4 w-4" /> Delivery Address
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p className="font-medium">{order.customerName}</p>
          <p className="text-muted-foreground">{getPhoneDisplayE164(order.customerPhone)}</p>
          {order.address && (
            <>
              <p>{order.address.fullAddress}</p>
              <p>
                {order.address.thana}, {order.address.district}, {order.address.division}
              </p>
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
            <Package className="h-4 w-4" /> Items
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
            {requiresAdvancePayment && order.payNow > 0 && (
              <div className="flex justify-between text-sm">
                <span>Pay Now</span>
                <span className="font-medium text-primary">৳{order.payNow.toLocaleString()}</span>
              </div>
            )}
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

      {!order.userId && (
        <Card className="mb-8 border-border/50 rounded-2xl shadow-sm bg-primary/[0.02]">
          <CardContent className="p-6 md:p-8 text-center">
            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <UserPlus className="h-7 w-7 text-primary" />
            </div>
            <h2 className="text-lg font-semibold mb-2">Track future orders faster</h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              Create an account to save your details, track all orders in one place, and enjoy a faster checkout next time.
            </p>
            <Link
              href="/auth/register"
              className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-8 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Create an Account
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="text-center">
        <Link
          href="/"
          className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-10 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          Continue Shopping
        </Link>
      </div>
    </div>
  )
}

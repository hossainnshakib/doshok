"use client"

import { Suspense, useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { CreditCard, MapPin, Package, Search, Truck, RefreshCw, Clock, AlertTriangle, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import Link from "next/link"
import { getPhoneDisplayE164, getPhoneServerValue } from "@/lib/utils"
import { getEffectiveDeliveryFee, getOrderProductSubtotal, inferDeliveryZoneLabelFromDistrictName } from "@/lib/order-delivery"

type Order = {
  id: string
  orderNumber: string
  customerName: string
  customerPhone: string
  subtotal: number
  deliveryFee: number
  productSubtotal?: number
  productDiscount?: number
  deliveryDiscount?: number
  finalDeliveryFee?: number
  discount?: number
  total: number
  paidAmount: number
  dueAmount?: number
  paymentMethod: string
  paymentStatus: string
  orderStatus: string
  paymentExpiresAt: string | null
  paymentVerifiedAt: string | null
  createdAt: string
  notes: string | null
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
  transactions?: {
    id: string
    trxId: string
    status: string
    amount: number
    verifiedAt: string | null
  }[]
}

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  confirmed: "default",
  processing: "default",
  shipped: "default",
  delivered: "outline",
  cancelled: "destructive",
  returned: "destructive",
}

function TrackOrderContent() {
  const searchParams = useSearchParams()
  const [orderNumber, setOrderNumber] = useState(searchParams.get("order") ?? "")
  const [phone, setPhone] = useState("")
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const retrying = false

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!orderNumber || !phone) {
      toast.error("Please enter both order number and phone number")
      return
    }

    setLoading(true)
    setSearched(true)
    try {
      const e164Phone = getPhoneServerValue(phone)
      const response = await fetch(`/api/orders/number/${encodeURIComponent(orderNumber)}?phone=${encodeURIComponent(e164Phone)}`)
      const data = await response.json()
      if (data.success) {
        setOrder(data.data)
      } else {
        setOrder(null)
        toast.error("Order not found. Please check your order number and phone number.")
      }
    } catch {
      setOrder(null)
      toast.error("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  const handleRetryPayment = async () => {
    toast.error("Online payments are not available.")
  }

const ORDER_STEPS = ["Pending", "Confirmed", "Processing", "Shipped", "Delivered"] as const
const TERMINAL_STATUSES = ["cancelled", "returned"] as const
const ORDER_STEP_LABELS: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
}

function Timeline({ currentStatus }: { currentStatus: string }) {
  const normalized = currentStatus.toLowerCase()

  if (TERMINAL_STATUSES.includes(normalized as any)) {
    return (
      <div className="py-6">
        <div className="flex items-center justify-center">
          <div className="flex flex-col items-center">
            <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 ring-2 ring-red-200">
              <span className="text-base font-bold">✕</span>
            </div>
            <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-red-600">
              {ORDER_STEP_LABELS[normalized] || currentStatus}
            </p>
          </div>
        </div>
        <div className="relative mx-[calc(50%-20px)] mt-4 h-[2px] bg-muted">
          <div className="h-[2px] bg-red-400" style={{ width: "100%" }} />
        </div>
      </div>
    )
  }

  const currentIndex = ORDER_STEPS.findIndex((s) => s.toLowerCase() === normalized)
  if (currentIndex === -1) return null

  return (
    <div className="py-6">
      <div className="flex items-start justify-between">
        {ORDER_STEPS.map((step, i) => {
          const done = i <= currentIndex
          const isCurrent = i === currentIndex
          return (
            <div key={step} className="flex flex-col items-center flex-1 relative">
              <div className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all duration-500 ${
                done
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/30"
                  : "bg-muted text-muted-foreground"
              } ${isCurrent ? "ring-2 ring-primary/30 ring-offset-2" : ""}`}>
                {done ? "✓" : i + 1}
              </div>
              <p className={`mt-2 text-[10px] font-semibold uppercase tracking-wider text-center leading-tight ${
                done ? "text-foreground" : "text-muted-foreground/60"
              }`}>
                {ORDER_STEP_LABELS[step.toLowerCase()] || step}
              </p>
            </div>
          )
        })}
      </div>
      <div className="relative -mt-8 mx-[12px]">
        <div className="h-[2px] bg-muted" />
        <div
          className="h-[2px] bg-primary transition-all duration-700"
          style={{ width: `${(currentIndex / (ORDER_STEPS.length - 1)) * 100}%` }}
        />
      </div>
    </div>
  )
}

  return (
    <main className="bg-[#f7f5f1]">
      <section className="container mx-auto container-px pt-8 md:pt-12">
        <div className="overflow-hidden rounded-[2rem] bg-[#15191c] text-white shadow-2xl shadow-black/10">
          <div className="grid gap-8 p-7 md:grid-cols-[1.05fr_0.95fr] md:p-12 lg:p-16">
            <div>
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.28em] text-white/55">Track Order</p>
              <h1 className="max-w-3xl text-4xl font-black tracking-tight md:text-6xl lg:text-7xl">
                Follow your Doshok delivery.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-white/68 md:text-lg">
                Enter your order number and phone number to view live order status, delivery details, payment state, and item summary.
              </p>
            </div>
            <form onSubmit={handleSubmit} className="rounded-[1.6rem] border border-white/10 bg-white p-5 text-neutral-950 shadow-xl md:p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-neutral-950 text-white">
                  <Truck className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-black tracking-tight">Order Lookup</h2>
                  <p className="text-xs text-neutral-500">Use the phone from checkout.</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="orderNumber">Order Number</Label>
                  <Input
                    id="orderNumber"
                    value={orderNumber}
                    onChange={(event) => setOrderNumber(event.target.value)}
                    placeholder="DSK-2026-000001"
                    required
                    className="h-12 rounded-2xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value.replace(/\D/g, ""))}
                    placeholder="01XXXXXXXXX"
                    required
                    className="h-12 rounded-2xl"
                  />
                </div>
                <Button type="submit" disabled={loading} className="h-12 w-full rounded-full">
                  <Search className="mr-2 h-4 w-4" />
                  {loading ? "Searching..." : "Track Order"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </section>

      <section className="container mx-auto container-px py-8 md:py-12">
        {searched && !order && (
          <div className="rounded-[1.75rem] border border-black/5 bg-white px-6 py-20 text-center shadow-sm">
            <Package className="mx-auto mb-4 h-10 w-10 text-neutral-400" />
            <h2 className="text-xl font-black tracking-tight">Order not found</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-neutral-500">
              We could not match those details. Check the order number and phone number, then try again.
            </p>
          </div>
        )}

        {order && (() => {
          const productSubtotal = getOrderProductSubtotal(order)
          const effectiveDeliveryFee = getEffectiveDeliveryFee(order)
          const deliveryZoneLabel = order.address
            ? inferDeliveryZoneLabelFromDistrictName(order.address.district)
            : null

          return (
          <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
            <div className="space-y-6">
              <div className="rounded-[1.75rem] border border-black/5 bg-white p-5 shadow-sm md:p-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-400">Order</p>
                    <h2 className="mt-1 font-mono text-xl font-black">{order.orderNumber}</h2>
                  </div>
                  <Badge variant={statusColors[order.orderStatus] ?? "secondary"} className="rounded-full px-4 py-1">
                    {order.orderStatus}
                  </Badge>
                </div>
                <Timeline currentStatus={order.orderStatus} />
                <div className="mt-2 grid gap-3 sm:grid-cols-3">
                  {[
                    ["Placed", new Date(order.createdAt).toLocaleDateString()],
                    ["Payment", order.paymentStatus === "paid" ? "Paid" : "Pending"],
                    ["Method", order.paymentMethod === "cod" ? "Cash on Delivery" : order.paymentMethod.toUpperCase()],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl bg-neutral-50 p-4">
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-400">{label}</p>
                      <p className="mt-1 text-sm font-bold">{value}</p>
                    </div>
                  ))}
                </div>

                {order.transactions && order.transactions.length > 0 && order.paymentStatus === "paid" && (
                  <div className="mt-3 rounded-2xl bg-neutral-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-400 mb-2">Transaction ID</p>
                    <p className="font-mono text-sm font-bold">{order.transactions[0].trxId}</p>
                  </div>
                )}

                {order.paymentMethod.toLowerCase() !== "cod" && order.paymentStatus === "pending" && order.orderStatus === "pending" && (
                  <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <div className="flex items-center gap-2 text-sm text-amber-700">
                      <AlertTriangle className="h-4 w-4" />
                      <span>This order uses an unsupported payment method. Please contact support.</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-[1.75rem] border border-black/5 bg-white p-5 shadow-sm md:p-8">
                <h3 className="flex items-center gap-2 font-black tracking-tight">
                  <MapPin className="h-4 w-4" />
                  Delivery Address
                </h3>
                <div className="mt-4 text-sm leading-6">
                  <p className="font-bold">{order.customerName}</p>
                  <p className="text-neutral-500">{getPhoneDisplayE164(order.customerPhone)}</p>
                  {order.address && (
                    <>
                      <p className="mt-2">{order.address.fullAddress}</p>
                      <p className="text-neutral-500">
                        {order.address.thana}, {order.address.district}, {order.address.division}
                      </p>
                      {deliveryZoneLabel && (
                        <p className="text-neutral-500">Delivery area: {deliveryZoneLabel}</p>
                      )}
                    </>
                  )}
                </div>
                {order.notes && (
                  <div className="mt-4 rounded-2xl bg-amber-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-500 mb-1">Order Note</p>
                    <p className="text-sm text-amber-800">{order.notes}</p>
                  </div>
                )}
              </div>
            </div>

            <aside className="rounded-[1.75rem] border border-black/5 bg-white p-5 shadow-sm md:p-6 lg:sticky lg:top-24 lg:self-start">
              <h3 className="flex items-center gap-2 font-black tracking-tight">
                <CreditCard className="h-4 w-4" />
                Items ({order.items.length})
              </h3>
              <div className="mt-4 divide-y divide-black/5">
                {order.items.map((item) => (
                  <div key={item.id} className="flex justify-between gap-4 py-3 text-sm first:pt-0 last:pb-0">
                    <div>
                      <p className="font-bold leading-5">{item.name}</p>
                      <p className="mt-1 text-xs text-neutral-500">
                        {[item.size, item.color].filter(Boolean).join(" / ") || "Standard"} × {item.quantity}
                      </p>
                    </div>
                    <p className="font-bold">৳{(item.price * item.quantity).toLocaleString()}</p>
                  </div>
                ))}
              </div>
              <Separator className="my-4" />
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Subtotal</span>
                  <span>৳{productSubtotal.toLocaleString()}</span>
                </div>
                {(order.productDiscount ?? 0) > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Product Discount</span>
                    <span>-৳{(order.productDiscount ?? 0).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-neutral-500">Delivery</span>
                  <span>৳{order.deliveryFee.toLocaleString()}</span>
                </div>
                {(order.deliveryDiscount ?? 0) > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Delivery Discount</span>
                    <span>-৳{(order.deliveryDiscount ?? 0).toLocaleString()}</span>
                  </div>
                )}
                {effectiveDeliveryFee !== order.deliveryFee && (
                  <div className="flex justify-between text-neutral-500">
                    <span>Final Delivery</span>
                    <span>৳{effectiveDeliveryFee.toLocaleString()}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-lg font-black">
                  <span>Total</span>
                  <span>৳{order.total.toLocaleString()}</span>
                </div>
                {(order.dueAmount ?? order.total) > 0 && order.paymentStatus !== "paid" && (
                  <div className="flex justify-between text-sm text-amber-700">
                    <span>Due on Delivery</span>
                    <span>৳{(order.dueAmount ?? order.total).toLocaleString()}</span>
                  </div>
                )}
                {order.paidAmount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Paid</span>
                    <span>৳{order.paidAmount.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </aside>
          </div>
          )
        })()}
      </section>
    </main>
  )
}

export default function TrackOrderPage() {
  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-20 text-center text-muted-foreground"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div>}>
      <TrackOrderContent />
    </Suspense>
  )
}

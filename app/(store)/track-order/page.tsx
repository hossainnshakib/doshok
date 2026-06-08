"use client"

import { useState } from "react"
import { CreditCard, MapPin, Package, Search, Truck } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

type Order = {
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

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  confirmed: "default",
  shipped: "default",
  delivered: "outline",
  cancelled: "destructive",
}

export default function TrackOrderPage() {
  const [orderNumber, setOrderNumber] = useState("")
  const [phone, setPhone] = useState("")
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!orderNumber || !phone) {
      toast.error("Please enter both order number and phone number")
      return
    }

    setLoading(true)
    setSearched(true)
    try {
      const response = await fetch(`/api/orders/number/${encodeURIComponent(orderNumber)}`)
      const data = await response.json()
      if (data.success && data.data.customerPhone === phone) {
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
                    onChange={(event) => setPhone(event.target.value)}
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

        {order && (
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
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {[
                    ["Placed", new Date(order.createdAt).toLocaleDateString()],
                    ["Payment", order.paymentStatus === "paid" ? "Paid" : "Pending"],
                    ["Method", order.paymentMethod === "cod" ? "Cash on Delivery" : order.paymentMethod],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl bg-neutral-50 p-4">
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-400">{label}</p>
                      <p className="mt-1 text-sm font-bold">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-black/5 bg-white p-5 shadow-sm md:p-8">
                <h3 className="flex items-center gap-2 font-black tracking-tight">
                  <MapPin className="h-4 w-4" />
                  Delivery Address
                </h3>
                <div className="mt-4 text-sm leading-6">
                  <p className="font-bold">{order.customerName}</p>
                  <p className="text-neutral-500">{order.customerPhone}</p>
                  {order.address && (
                    <>
                      <p className="mt-2">{order.address.fullAddress}</p>
                      <p className="text-neutral-500">
                        {order.address.thana}, {order.address.district}, {order.address.division}
                      </p>
                    </>
                  )}
                </div>
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
                  <span>৳{order.subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Delivery</span>
                  <span>৳{order.deliveryFee.toLocaleString()}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-black">
                  <span>Total</span>
                  <span>৳{order.total.toLocaleString()}</span>
                </div>
              </div>
            </aside>
          </div>
        )}
      </section>
    </main>
  )
}

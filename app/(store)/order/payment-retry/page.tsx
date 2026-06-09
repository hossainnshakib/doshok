"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Clock, RefreshCw, ArrowLeft, AlertTriangle, CheckCircle } from "lucide-react"
import { toast } from "sonner"

type Order = {
  id: string
  orderNumber: string
  customerName: string
  total: number
  paymentMethod: string
  paymentStatus: string
  paymentExpiresAt: string | null
  orderStatus: string
}

export default function PaymentRetryPage() {
  const searchParams = useSearchParams()
  const orderId = searchParams.get("orderId")

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [retrying, setRetrying] = useState(false)

  useEffect(() => {
    if (!orderId) {
      setLoading(false)
      return
    }
    fetch(`/api/orders/${orderId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setOrder(d.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [orderId])

  async function handleRetry() {
    if (!orderId) return
    setRetrying(true)
    try {
      const res = await fetch("/api/payment/bkash/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      })
      const d = await res.json()
      if (d.success && d.data?.paymentUrl) {
        window.location.href = d.data.paymentUrl
      } else {
        toast.error(d.error ?? "Failed to initialize payment")
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setRetrying(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto container-px py-8 md:py-12 max-w-2xl">
        <div className="text-center py-12">
          <p className="text-muted-foreground animate-pulse">Loading...</p>
        </div>
      </div>
    )
  }

  if (!orderId || !order) {
    return (
      <div className="container mx-auto container-px py-8 md:py-12 max-w-2xl">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 group mb-8">
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" /> Back to Home
        </Link>
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Order Not Found</h1>
          <p className="text-muted-foreground">We couldn't find this order.</p>
        </div>
      </div>
    )
  }

  if (order.paymentStatus === "paid") {
    return (
      <div className="container mx-auto container-px py-8 md:py-12 max-w-2xl">
        <div className="text-center py-12">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Already Paid</h1>
          <p className="text-muted-foreground">This order has already been paid.</p>
          <Link href={`/order/${order.orderNumber}`} className="mt-4 inline-flex h-10 items-center justify-center rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground">
            View Order
          </Link>
        </div>
      </div>
    )
  }

  if (order.orderStatus === "cancelled" || order.orderStatus === "returned") {
    return (
      <div className="container mx-auto container-px py-8 md:py-12 max-w-2xl">
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Order Unavailable</h1>
          <p className="text-muted-foreground">This order can no longer be paid.</p>
          <Link href="/" className="mt-4 inline-flex h-10 items-center justify-center rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground">
            Continue Shopping
          </Link>
        </div>
      </div>
    )
  }

  const expiryInfo = order.paymentExpiresAt ? (() => {
    const diff = new Date(order.paymentExpiresAt).getTime() - Date.now()
    if (diff <= 0) return null
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    return hours > 0 ? `${hours}h ${minutes}m remaining` : `${minutes}m remaining`
  })() : null

  const isExpired = order.paymentExpiresAt && new Date(order.paymentExpiresAt) <= new Date()

  return (
    <div className="container mx-auto container-px py-8 md:py-12 max-w-2xl">
      <Link href={`/order/${order.orderNumber}`} className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 group mb-8">
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" /> Back to Order
      </Link>

      <div className="text-center mb-10">
        <div className="w-20 h-20 bg-amber-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <Clock className="h-10 w-10 text-amber-600" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">Retry Payment</h1>
        <p className="text-muted-foreground">Complete your bKash payment to confirm your order.</p>
      </div>

      <Card className="mb-6 border-border/50 rounded-2xl shadow-sm">
        <CardContent className="p-6 md:p-8 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Order Number</span>
            <span className="font-mono font-bold text-lg">{order.orderNumber}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total Amount</span>
            <span className="font-bold text-lg">৳{order.total.toLocaleString()}</span>
          </div>
          {expiryInfo && !isExpired && (
            <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-amber-700">
              <Clock className="h-4 w-4 shrink-0" />
              <span className="text-sm font-medium">Payment expires in {expiryInfo}</span>
            </div>
          )}
          {isExpired && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-red-700">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span className="text-sm font-medium">Payment window has expired. Contact support to reschedule.</span>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        {!isExpired && (
          <Button
            size="lg"
            className="w-full h-12 md:h-14 text-base rounded-xl"
            onClick={handleRetry}
            disabled={retrying}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {retrying ? "Loading..." : "Pay with bKash"}
          </Button>
        )}
        <Link href="/" className="inline-flex h-12 md:h-14 items-center justify-center rounded-xl border border-input bg-background px-6 text-base font-medium w-full">
          Continue Shopping
        </Link>
      </div>

      <div className="mt-10 text-center">
        <p className="text-xs text-muted-foreground">
          Need help?{" "}
          <Link href="/contact" className="text-primary hover:underline">
            Contact Support
          </Link>
        </p>
      </div>
    </div>
  )
}
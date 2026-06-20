"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { AlertTriangle, RefreshCw, ArrowLeft, Clock, RotateCcw, Loader2 } from "lucide-react"
import { toast } from "sonner"

type PendingOrder = {
  id: string
  orderNumber: string
  customerName: string
  customerPhone: string
  total: number
  paymentMethod: string
  paymentStatus: string
  paymentExpiresAt: string | null
  orderStatus: string
  stockRestoredAt: string | null
} | null

const REASON_MESSAGES: Record<string, { title: string; description: string }> = {
  payment_not_success: {
    title: "Payment Not Completed",
    description: "Your payment was not completed. Please try again.",
  },
  verification_failed: {
    title: "Verification Failed",
    description: "We couldn't verify your payment. Please try again.",
  },
  payment_not_completed: {
    title: "Payment Incomplete",
    description: "Your payment was not completed. Please try again.",
  },
  invoice_mismatch: {
    title: "Order Mismatch",
    description: "There was a mismatch with your order details. Please contact support.",
  },
  amount_mismatch: {
    title: "Amount Mismatch",
    description: "The payment amount didn't match the order total. Please contact support.",
  },
  transaction_failed: {
    title: "Transaction Failed",
    description: "Your transaction failed. Please try again.",
  },
  expired: {
    title: "Payment Session Expired",
    description: "Your payment session has expired. Please place a new order to continue.",
  },
  missing_order_id: {
    title: "Order Not Found",
    description: "We couldn't find the order associated with this payment.",
  },
  order_not_found: {
    title: "Order Not Found",
    description: "The order for this payment was not found in our system.",
  },
  unknown: {
    title: "Something Went Wrong",
    description: "An unexpected error occurred. Please try again.",
  },
  callback_error: {
    title: "Processing Error",
    description: "We encountered an error processing your payment. Please try again.",
  },
}

function getExpiryInfo(expiresAt: string | null): { expired: boolean; remaining: string } | null {
  if (!expiresAt) return null
  const expiry = new Date(expiresAt)
  const now = new Date()
  const diff = expiry.getTime() - now.getTime()
  if (diff <= 0) return { expired: true, remaining: "Expired" }

  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  if (hours > 0) return { expired: false, remaining: `${hours}h ${minutes}m remaining` }
  return { expired: false, remaining: `${minutes}m remaining` }
}

function PaymentFailedContent() {
  const searchParams = useSearchParams()
  const orderId = searchParams.get("orderId")
  const reason = searchParams.get("reason") || "unknown"

  const [pendingOrder, setPendingOrder] = useState<PendingOrder>(null)
  const [loadingOrder, setLoadingOrder] = useState(false)
  const [retrying, setRetrying] = useState(false)

  const reasonInfo = REASON_MESSAGES[reason] ?? REASON_MESSAGES["unknown"]

  useEffect(() => {
    if (!orderId) return
    setLoadingOrder(true)
    fetch(`/api/orders/${orderId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setPendingOrder(d.data)
      })
      .catch(() => {})
      .finally(() => setLoadingOrder(false))
  }, [orderId])

  const handleRetryPayment = async () => {
    toast.error("Online payments are not available.")
  }

  const canRetry = false

  const expiryInfo = pendingOrder ? getExpiryInfo(pendingOrder.paymentExpiresAt) : null
  const isExpired = expiryInfo?.expired ?? false

  return (
    <div className="container mx-auto container-px py-8 md:py-12 max-w-2xl">
      <Link href="/" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 transition-colors group mb-8">
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" /> Back to Home
      </Link>

      <div className="text-center mb-10">
        <div className="w-20 h-20 bg-red-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="h-10 w-10 text-red-500" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">{reasonInfo.title}</h1>
        <p className="text-muted-foreground leading-relaxed max-w-md mx-auto">{reasonInfo.description}</p>
      </div>

      {pendingOrder && (
        <Card className="mb-6 border-border/50 rounded-2xl shadow-sm">
          <CardContent className="p-6 md:p-8 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Order Number</span>
              <span className="font-mono font-bold text-lg">{pendingOrder.orderNumber}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Amount</span>
              <span className="font-bold text-lg">৳{pendingOrder.total.toLocaleString()}</span>
            </div>
            {expiryInfo && (
              <div className={`flex items-center gap-2 rounded-xl px-4 py-3 ${
                isExpired ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"
              }`}>
                <Clock className="h-4 w-4 shrink-0" />
                <span className="text-sm font-medium">
                  {isExpired ? "Payment window has expired" : `Payment expires in ${expiryInfo.remaining}`}
                </span>
              </div>
            )}
            {pendingOrder.stockRestoredAt && (
              <div className="flex items-center gap-2 rounded-xl bg-green-50 px-4 py-3 text-green-700">
                <RotateCcw className="h-4 w-4 shrink-0" />
                <span className="text-sm font-medium">Inventory has been restored to the product.</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-3">
        {canRetry && !isExpired && (
          <Button
            size="lg"
            className="w-full h-12 md:h-14 text-base rounded-xl"
            onClick={handleRetryPayment}
            disabled={retrying}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {retrying ? "Loading..." : "Retry Payment"}
          </Button>
        )}
        {isExpired && (
          <div className="text-center text-sm text-muted-foreground bg-muted/30 rounded-xl px-5 py-4">
            Your payment window has expired. Please contact support to reschedule your order.
          </div>
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

export default function PaymentFailedPage() {
  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-20 text-center text-muted-foreground"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div>}>
      <PaymentFailedContent />
    </Suspense>
  )
}

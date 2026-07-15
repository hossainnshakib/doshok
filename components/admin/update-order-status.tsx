"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { ORDER_STATUSES, ORDER_STATUS_LABELS } from "@/types"

const PAYMENT_STATUSES = ["unpaid", "paid", "refunded"]

type Props = {
  orderId: string
  currentOrderStatus: string
  currentPaymentStatus: string
}

export function UpdateOrderStatus({ orderId, currentOrderStatus, currentPaymentStatus }: Props) {
  const router = useRouter()
  const [orderStatus, setOrderStatus] = useState(currentOrderStatus)
  const [paymentStatus, setPaymentStatus] = useState(currentPaymentStatus)
  const [loading, setLoading] = useState(false)

  async function handleUpdate() {
    setLoading(true)
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderStatus, paymentStatus }),
      })
      let data
      try {
        data = await res.json()
      } catch {
        toast.error(`Server error: ${res.status} ${res.statusText}`)
        setLoading(false)
        return
      }
      if (data.success) {
        toast.success("Order updated")
        router.refresh()
      } else {
        toast.error(data.error ?? `Update failed (${res.status})`)
      }
    } catch (err) {
      toast.error(`Network error: ${err instanceof Error ? err.message : "Failed to connect"}`)
    }
    setLoading(false)
  }

  const hasChanges = orderStatus !== currentOrderStatus || paymentStatus !== currentPaymentStatus

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Order Status</p>
          <Select value={orderStatus} onValueChange={(v) => v && setOrderStatus(v)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ORDER_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {ORDER_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Payment Status</p>
          <Select value={paymentStatus} onValueChange={(v) => v && setPaymentStatus(v)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button
        size="sm"
        onClick={handleUpdate}
        disabled={loading || !hasChanges}
        className="rounded-full"
      >
        {loading ? "Updating..." : "Update Status"}
      </Button>
    </div>
  )
}

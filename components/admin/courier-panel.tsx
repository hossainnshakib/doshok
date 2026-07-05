"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Truck, RefreshCw, Send, AlertCircle } from "lucide-react"
import { AdminSectionCard, AdminStatusBadge } from "@/components/admin/admin-ui"

type Consignment = {
  consignmentId: string | null
  trackingCode: string | null
  courierStatus: string | null
  courierMessage: string | null
  deliveryFee: number | null
  syncedAt: string | null
  storeId: string | null
  providerCode: string
}

type Store = {
  storeId: string
  name: string | null
}

type CourierOrderStatus = {
  consignmentId: string | null
  trackingCode: string | null
  status: string
  statusId: string | number | null
  deliveryFee: number | null
  merchantReceivedAmount?: number | null
  message?: string | null
  syncedAt?: string | null
}

export function CourierPanel({ orderId }: { orderId: string }) {
  const [consignment, setConsignment] = useState<Consignment | null>(null)
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [showSendForm, setShowSendForm] = useState(false)
  const [orderStatus, setOrderStatus] = useState<CourierOrderStatus | null>(null)

  const [selectedStore, setSelectedStore] = useState("")
  const [deliveryType, setDeliveryType] = useState<"normal" | "express" | "partial">("normal")
  const [itemType, setItemType] = useState<"parcel" | "document" | "electronics" | "food" | "liquid" | "fragile">("parcel")
  const [itemWeight, setItemWeight] = useState("0.5")

  async function loadConsignment() {
    try {
      const res = await fetch(`/api/admin/courier/pathao/orders?orderId=${orderId}`)
      const d = await res.json()
      if (d.success) {
        setConsignment(d.data)
        setOrderStatus(d.data)
      }
    } finally {
      setLoading(false)
    }
  }

  async function loadStores() {
    try {
      const res = await fetch("/api/admin/courier/pathao/stores")
      const d = await res.json()
      if (d.success) {
        setStores(d.data)
      }
    } catch {
    }
  }

  useEffect(() => {
    queueMicrotask(async () => {
      await loadConsignment()
      await loadStores()
    })
  }, [orderId])

  async function handleSendToPathao() {
    if (!selectedStore) {
      toast.error("Please select a store")
      return
    }

    setSending(true)
    try {
      const res = await fetch("/api/admin/courier/pathao/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          storeId: selectedStore,
          deliveryType,
          itemType,
          itemWeight: parseFloat(itemWeight),
        }),
      })
      const d = await res.json()
      if (d.success) {
        toast.success("Order sent to Pathao")
        setShowSendForm(false)
        loadConsignment()
      } else {
        toast.error(d.error || "Failed to send to Pathao")
      }
    } catch {
      toast.error("Failed to send to Pathao")
    } finally {
      setSending(false)
    }
  }

  async function handleRefreshStatus() {
    setRefreshing(true)
    try {
      const res = await fetch(`/api/admin/courier/pathao/orders?orderId=${orderId}`)
      const d = await res.json()
      if (d.success) {
        setOrderStatus(d.data)
        toast.success("Status refreshed")
      } else {
        toast.error(d.error || "Failed to refresh status")
      }
    } catch {
      toast.error("Failed to refresh status")
    } finally {
      setRefreshing(false)
    }
  }

  if (loading) {
    return (
      <AdminSectionCard title="Courier" description="Courier shipment information.">
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="h-5 w-5 animate-spin text-slate-400" />
        </div>
      </AdminSectionCard>
    )
  }

  const hasConsignment = !!consignment?.consignmentId

  return (
    <AdminSectionCard title="Courier" description="Courier shipment information and actions.">
      <div className="space-y-4">
        {hasConsignment ? (
          <>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-slate-50/60 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Provider</p>
                <p className="font-semibold text-slate-800 uppercase">Pathao</p>
              </div>
              <div className="rounded-lg bg-slate-50/60 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Store</p>
                <p className="font-semibold text-slate-800">{consignment?.storeId || "—"}</p>
              </div>
              <div className="rounded-lg bg-slate-50/60 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Consignment ID</p>
                <p className="font-mono font-semibold text-slate-800">{consignment?.consignmentId || "—"}</p>
              </div>
              <div className="rounded-lg bg-slate-50/60 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Tracking Code</p>
                <p className="font-mono font-semibold text-slate-800">{consignment?.trackingCode || "—"}</p>
              </div>
              <div className="rounded-lg bg-slate-50/60 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Status</p>
                <div className="mt-0.5">
                  <AdminStatusBadge status={orderStatus?.status || consignment?.courierStatus || "Pending"} />
                </div>
              </div>
              <div className="rounded-lg bg-slate-50/60 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Delivery Fee</p>
                <p className="font-semibold text-slate-800">
                  {orderStatus?.deliveryFee || consignment?.deliveryFee ? `৳${(orderStatus?.deliveryFee || consignment?.deliveryFee)?.toLocaleString()}` : "—"}
                </p>
              </div>
              {consignment?.syncedAt && (
                <div className="col-span-2 rounded-lg bg-slate-50/60 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Last Synced</p>
                  <p className="text-[11px] text-slate-700">
                    {new Date(consignment.syncedAt).toLocaleString()}
                  </p>
                </div>
              )}
              {consignment?.courierMessage && (
                <div className="col-span-2 rounded-lg bg-amber-50/60 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 mb-1">Message</p>
                  <p className="text-xs text-amber-800">{consignment.courierMessage}</p>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleRefreshStatus}
                disabled={refreshing}
                className="h-9 rounded-lg px-3 text-xs font-semibold"
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${refreshing ? "animate-spin" : ""}`} />
                {refreshing ? "Refreshing..." : "Refresh Status"}
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/60 p-3">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-amber-800">Not sent to courier</p>
                <p className="text-[10px] text-amber-700 mt-0.5">
                  This order has not been sent to Pathao yet.
                </p>
              </div>
            </div>

            {showSendForm ? (
              <div className="space-y-3 rounded-lg border border-slate-200 p-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600">Store</Label>
                  <Select value={selectedStore} onValueChange={(v) => { if (v) setSelectedStore(v) }}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Select store" />
                    </SelectTrigger>
                    <SelectContent>
                      {stores.map((store) => (
                        <SelectItem key={store.storeId} value={store.storeId}>
                          {store.name || store.storeId}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-600">Delivery Type</Label>
                    <Select value={deliveryType} onValueChange={(v) => setDeliveryType(v as typeof deliveryType)}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="express">Express</SelectItem>
                        <SelectItem value="partial">Partial</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-600">Item Type</Label>
                    <Select value={itemType} onValueChange={(v) => setItemType(v as typeof itemType)}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="parcel">Parcel</SelectItem>
                        <SelectItem value="document">Document</SelectItem>
                        <SelectItem value="electronics">Electronics</SelectItem>
                        <SelectItem value="food">Food</SelectItem>
                        <SelectItem value="liquid">Liquid</SelectItem>
                        <SelectItem value="fragile">Fragile</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600">Item Weight (kg)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="50"
                    value={itemWeight}
                    onChange={(e) => setItemWeight(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleSendToPathao}
                    disabled={sending}
                    className="h-9 rounded-lg px-3 text-xs font-semibold"
                  >
                    <Send className="h-3.5 w-3.5 mr-1.5" />
                    {sending ? "Sending..." : "Send to Pathao"}
                  </Button>
                  <Button
                    onClick={() => setShowSendForm(false)}
                    variant="outline"
                    className="h-9 rounded-lg px-3 text-xs font-semibold"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                onClick={() => setShowSendForm(true)}
                className="h-9 rounded-lg px-3 text-xs font-semibold"
              >
                <Send className="h-3.5 w-3.5 mr-1.5" />
                Send to Pathao
              </Button>
            )}
          </>
        )}
      </div>
    </AdminSectionCard>
  )
}

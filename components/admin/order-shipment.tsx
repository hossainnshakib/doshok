"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { Package, Truck, Send, Ban, CheckCircle, XCircle, RotateCcw } from "lucide-react"
import { AdminSectionCard, AdminStatusBadge } from "@/components/admin/admin-ui"
import {
  COURIER_LABELS,
  SHIPMENT_STATUS_LABELS,
  type CourierProvider,
  type ShipmentStatus,
} from "@/types"

type Shipment = {
  id: string
  orderId: string
  courierProvider: string
  status: string
  trackingCode: string | null
  consignmentId: string | null
  customerNote: string | null
  adminNote: string | null
  createdAt: string | Date
  updatedAt: string | Date
}

type OrderShipmentProps = {
  orderId: string
  initialShipment: Shipment | null
}

const PROVIDER_OPTIONS: CourierProvider[] = ["PATHAO", "STEADFAST", "REDX"]

const STATUS_ACTIONS: { label: string; status: ShipmentStatus; icon: React.ReactNode; variant?: "default" | "destructive" | "outline" | "secondary" }[] = [
  { label: "Create Parcel", status: "SETUP_READY", icon: <Send className="size-3.5" />, variant: "default" },
  { label: "Mark Dispatched", status: "DISPATCHED", icon: <Truck className="size-3.5" />, variant: "default" },
  { label: "Mark Delivered", status: "DELIVERED", icon: <CheckCircle className="size-3.5" />, variant: "outline" },
  { label: "Mark Failed", status: "FAILED", icon: <XCircle className="size-3.5" />, variant: "destructive" },
  { label: "Mark Returned", status: "RETURNED", icon: <RotateCcw className="size-3.5" />, variant: "secondary" },
  { label: "Cancel Shipment", status: "CANCELLED", icon: <Ban className="size-3.5" />, variant: "destructive" },
]

export function OrderShipment({ orderId, initialShipment }: OrderShipmentProps) {
  const [shipment, setShipment] = useState<Shipment | null>(initialShipment)
  const [loading, setLoading] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<string>("PATHAO")
  const [customerNote, setCustomerNote] = useState("")
  const [adminNote, setAdminNote] = useState("")

  async function fetchShipment() {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/shipment`)
      const d = await res.json()
      if (d.success) {
        setShipment(d.data)
      }
    } catch {
      // ignore
    }
  }

  async function handleCreateShipment() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/shipment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courierProvider: selectedProvider,
          customerNote: customerNote,
          adminNote: adminNote,
        }),
      })
      const d = await res.json()
      if (d.success) {
        toast.success("Shipment created")
        fetchShipment()
      } else {
        toast.error(d.error ?? "Failed to create shipment")
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  async function handleStatusUpdate(newStatus: string) {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/shipment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      const d = await res.json()
      if (d.success) {
        toast.success(`Shipment status updated to ${SHIPMENT_STATUS_LABELS[newStatus as ShipmentStatus] || newStatus}`)
        fetchShipment()
      } else {
        toast.error(d.error ?? "Failed to update shipment")
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  if (!shipment) {
    return (
      <AdminSectionCard title="Shipment" description="No courier shipment assigned yet.">
        <div className="space-y-4">
          <div className="rounded-2xl border border-dashed border-black/10 bg-neutral-50 p-6 text-center">
            <Package className="mx-auto mb-3 h-8 w-8 text-neutral-300" />
            <p className="text-sm font-medium text-neutral-500">No shipment record</p>
            <p className="mt-1 text-xs text-neutral-400">
              Assign a courier and create a parcel to begin fulfillment.
            </p>
          </div>

          <div className="space-y-3">
            <Label>Courier provider</Label>
            <Select value={selectedProvider} onValueChange={(val) => setSelectedProvider(val ?? "PATHAO")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROVIDER_OPTIONS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {COURIER_LABELS[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Customer Note (optional)</Label>
            <Textarea
              value={customerNote}
              onChange={(e) => setCustomerNote(e.target.value)}
              rows={2}
              placeholder="Note visible to customer"
            />
          </div>

          <div className="space-y-2">
            <Label>Admin Note (optional)</Label>
            <Textarea
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              rows={2}
              placeholder="Internal note"
            />
          </div>

          <Button onClick={handleCreateShipment} disabled={loading} className="w-full">
            <Package className="size-4 mr-1.5" />
            {loading ? "Creating..." : "Assign Courier & Create Parcel"}
          </Button>

          <p className="text-center text-xs text-amber-600 font-medium">
            Live courier API not connected yet. Parcel will be created locally with SETUP_READY status.
          </p>
        </div>
      </AdminSectionCard>
    )
  }

  return (
    <AdminSectionCard title="Shipment" description="Courier fulfillment and tracking details.">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-2xl bg-neutral-50 p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-400">Provider</p>
            <p className="mt-1 font-bold">{COURIER_LABELS[shipment.courierProvider as CourierProvider] || shipment.courierProvider}</p>
          </div>
          <div className="rounded-2xl bg-neutral-50 p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-400">Status</p>
            <p className="mt-1">
              <AdminStatusBadge status={SHIPMENT_STATUS_LABELS[shipment.status as ShipmentStatus] || shipment.status} />
            </p>
          </div>
          {shipment.trackingCode && (
            <div className="rounded-2xl bg-neutral-50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-400">Tracking Code</p>
              <p className="mt-1 font-mono text-xs font-bold">{shipment.trackingCode}</p>
            </div>
          )}
          {shipment.consignmentId && (
            <div className="rounded-2xl bg-neutral-50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-400">Consignment ID</p>
              <p className="mt-1 font-mono text-xs font-bold">{shipment.consignmentId}</p>
            </div>
          )}
        </div>

        {shipment.customerNote && (
          <div className="text-sm">
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-400">Customer Note</span>
            <p className="mt-0.5 text-neutral-600">{shipment.customerNote}</p>
          </div>
        )}

        {shipment.adminNote && (
          <div className="text-sm">
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-400">Admin Note</span>
            <p className="mt-0.5 text-neutral-600">{shipment.adminNote}</p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {STATUS_ACTIONS.map((action) => {
            const isCurrent = shipment.status === action.status
            const isDisabled = isCurrent || loading || shipment.status === "CANCELLED"
            return (
              <Button
                key={action.status}
                size="sm"
                variant={action.variant || "outline"}
                disabled={isDisabled}
                onClick={() => handleStatusUpdate(action.status)}
              >
                {action.icon}
                <span className="ml-1.5">{action.label}</span>
              </Button>
            )
          })}
        </div>

        <p className="text-center text-xs text-amber-600 font-medium">
          Live courier API not connected yet. Status updates are local only.
        </p>
      </div>
    </AdminSectionCard>
  )
}

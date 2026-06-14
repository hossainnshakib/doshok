"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { Package, Truck, Send, Ban, CheckCircle, XCircle, RotateCcw, ExternalLink, RefreshCw, Clock } from "lucide-react"
import { AdminSectionCard, AdminStatusBadge } from "@/components/admin/admin-ui"
import {
  COURIER_LABELS,
  COURIER_TRACKING_URLS,
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
  collectionAmount: number
  courierResponseJson: string | null
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
  const [cityId, setCityId] = useState("")
  const [areaId, setAreaId] = useState("")

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
      const body: Record<string, string> = {
        courierProvider: selectedProvider,
        customerNote,
        adminNote,
      }
      if (selectedProvider === "PATHAO") {
        if (cityId) body.cityId = cityId
        if (areaId) body.areaId = areaId
      }
      const res = await fetch(`/api/admin/orders/${orderId}/shipment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const d = await res.json()
      if (d.success) {
        const provider = d.data?.courierProvider
        if (provider === "PATHAO") {
          toast.success("Parcel created in Pathao successfully")
        } else if (provider === "STEADFAST") {
          toast.success("Parcel created in Steadfast successfully")
        } else if (provider === "REDX") {
          toast.success("Parcel created in RedX successfully")
        } else {
          toast.success("Shipment created (manual fulfillment)")
        }
        setCityId("")
        setAreaId("")
        setCustomerNote("")
        setAdminNote("")
        fetchShipment()
      } else {
        if (res.status === 409) {
          toast.error("Shipment already exists.")
        } else {
          toast.error(d.error ?? "Failed to create shipment")
        }
        fetchShipment()
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

  async function handleRetry() {
    setLoading(true)
    try {
      const body: Record<string, string> = {
        courierProvider: shipment!.courierProvider,
        customerNote,
        adminNote,
      }
      const res = await fetch(`/api/admin/orders/${orderId}/shipment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const d = await res.json()
      if (d.success) {
        toast.success("Shipment retry successful")
        setCustomerNote("")
        setAdminNote("")
        fetchShipment()
      } else {
        toast.error(d.error ?? "Retry failed")
        fetchShipment()
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  function getTrackingUrl(s: Shipment): string | null {
    const baseUrl = COURIER_TRACKING_URLS[s.courierProvider as CourierProvider]
    if (!baseUrl || !s.trackingCode) return null
    return baseUrl.replace("{trackingCode}", s.trackingCode)
  }

  function getShipmentError(s: Shipment): { error: string; detail?: string } | null {
    if (s.status !== "FAILED") return null
    if (s.consignmentId) return null
    if (!s.courierResponseJson) return null
    try {
      return JSON.parse(s.courierResponseJson)
    } catch {
      return null
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

          {selectedProvider === "PATHAO" && (
            <div className="grid grid-cols-2 gap-3 rounded-2xl border border-primary/10 bg-primary/[0.03] p-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Pathao City ID</Label>
                <Input
                  value={cityId}
                  onChange={(e) => setCityId(e.target.value)}
                  placeholder="e.g. 1 (Dhaka)"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Pathao Area/Zone ID</Label>
                <Input
                  value={areaId}
                  onChange={(e) => setAreaId(e.target.value)}
                  placeholder="e.g. 1"
                />
              </div>
              <div className="col-span-2">
                <p className="text-[10px] text-muted-foreground">
                  Enter Pathao city and zone/area IDs. In LIVE mode, these are required. Leave blank to use sandbox defaults.
                </p>
              </div>
            </div>
          )}

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

          {selectedProvider === "PATHAO" ? (
            <p className="text-center text-xs text-green-600 font-medium">
              Creating a real Pathao parcel via the Pathao API.
            </p>
          ) : selectedProvider === "STEADFAST" ? (
            <p className="text-center text-xs text-green-600 font-medium">
              Creating a real Steadfast parcel via the Steadfast API.
            </p>
          ) : (
            <p className="text-center text-xs text-green-600 font-medium">
              Creating a real RedX parcel via the RedX API.
            </p>
          )}
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
              {getTrackingUrl(shipment) && (
                <a href={getTrackingUrl(shipment)!} target="_blank" rel="noopener noreferrer" className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 hover:text-blue-800">
                  <ExternalLink className="size-3" />
                  Track Shipment
                </a>
              )}
            </div>
          )}
          {shipment.consignmentId && (
            <div className="rounded-2xl bg-neutral-50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-400">Consignment ID</p>
              <p className="mt-1 font-mono text-xs font-bold">{shipment.consignmentId}</p>
            </div>
          )}
          {shipment.collectionAmount > 0 && (
            <div className="rounded-2xl bg-amber-50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-amber-500">Collection Amount (Courier Collects)</p>
              <p className="mt-1 text-base font-black text-amber-800">৳{shipment.collectionAmount.toLocaleString()}</p>
            </div>
          )}
          <div className="rounded-2xl bg-slate-50 p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-400">
              <Clock className="inline size-3 mr-1" />
              Created
            </p>
            <p className="mt-1 text-xs font-medium text-slate-600">
              {new Date(shipment.createdAt).toLocaleString()}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-400">
              <Clock className="inline size-3 mr-1" />
              Last Updated
            </p>
            <p className="mt-1 text-xs font-medium text-slate-600">
              {new Date(shipment.updatedAt).toLocaleString()}
            </p>
          </div>
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

        {(() => {
          const error = getShipmentError(shipment)
          if (error) {
            return (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                <p className="text-xs font-bold text-red-700 mb-1">Shipment Creation Failed</p>
                <p className="text-xs text-red-600">{error.error}</p>
                {error.detail && <p className="text-xs text-red-500 mt-0.5">{error.detail}</p>}
                <Button size="sm" variant="destructive" onClick={handleRetry} disabled={loading} className="mt-3">
                  <RefreshCw className={`size-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
                  {loading ? "Retrying..." : "Retry Shipment"}
                </Button>
              </div>
            )
          }
          return null
        })()}

        {shipment.courierProvider === "PATHAO" ? (
            <p className="text-center text-xs text-muted-foreground">
              Pathao parcel. Use manual status updates or implement webhooks for auto-sync.
            </p>
          ) : shipment.courierProvider === "STEADFAST" ? (
            <p className="text-center text-xs text-muted-foreground">
              Steadfast parcel. Use manual status updates or implement webhooks for auto-sync.
            </p>
          ) : shipment.courierProvider === "REDX" ? (
            <p className="text-center text-xs text-muted-foreground">
              RedX parcel. Use manual status updates or implement webhooks for auto-sync.
            </p>
          ) : (
            <p className="text-center text-xs text-amber-600 font-medium">
              {shipment.courierProvider} integration pending. Status updates are local only.
            </p>
          )}
      </div>
    </AdminSectionCard>
  )
}

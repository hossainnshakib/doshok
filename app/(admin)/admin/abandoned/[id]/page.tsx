"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import Link from "next/link"
import { AdminPageHeader, AdminSectionCard } from "@/components/admin/admin-ui"

type AbandonedCheckout = {
  id: string
  landingSlug: string | null
  name: string | null
  email: string | null
  phone: string | null
  address: string | null
  productId: string | null
  variantId: string | null
  quantity: number | null
  size: string | null
  color: string | null
  deliveryZone: string | null
  step: string
  contacted: boolean
  notes: string | null
  data: string
  createdAt: string
  updatedAt: string
}

export default function AdminAbandonedDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [item, setItem] = useState<AbandonedCheckout | null>(null)
  const [contacted, setContacted] = useState(false)
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch(`/api/abandoned/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data) {
          setItem(d.data)
          setContacted(d.data.contacted)
          setNotes(d.data.notes ?? "")
        }
      })
      .catch(() => {})
  }, [id])

  async function handleSave() {
    setSaving(true)
    const res = await fetch(`/api/abandoned/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contacted, notes }),
    })
    const d = await res.json()
    if (d.success) {
      toast.success("Updated")
      router.refresh()
    } else {
      toast.error(d.error ?? "Failed")
    }
    setSaving(false)
  }

  if (!item) return <div className="text-muted-foreground py-10">Loading...</div>

  let parsedData: Record<string, unknown> = {}
  try { parsedData = JSON.parse(item.data) } catch {}

  return (
    <div className="space-y-6 max-w-3xl">
      <AdminPageHeader eyebrow="Sales" title="Abandoned Checkout" description={`Lead ID ${item.id}. Review checkout details and record recovery follow-up.`} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <AdminSectionCard title="Customer Info">
          <div className="space-y-2 text-sm">
            <div><span className="font-medium">Name:</span> {item.name || "-"}</div>
            <div><span className="font-medium">Phone:</span> {item.phone || "-"}</div>
            <div><span className="font-medium">Email:</span> {item.email || "-"}</div>
            <div><span className="font-medium">Address:</span> {item.address || "-"}</div>
          </div>
        </AdminSectionCard>

        <AdminSectionCard title="Checkout Details">
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-medium">Step:</span>{" "}
              <Badge variant="secondary">{item.step}</Badge>
            </div>
            <div><span className="font-medium">Landing:</span> {item.landingSlug ? `/${item.landingSlug}` : "-"}</div>
            <div><span className="font-medium">Product ID:</span> {item.productId ? <span className="font-mono text-xs">{item.productId}</span> : "-"}</div>
            <div><span className="font-medium">Variant:</span> {[item.size, item.color].filter(Boolean).join(" / ") || "-"}</div>
            <div><span className="font-medium">Quantity:</span> {item.quantity ?? "-"}</div>
            <div><span className="font-medium">Delivery Zone:</span> {item.deliveryZone || "-"}</div>
            <Separator />
            <div>
              <span className="font-medium">Created:</span>{" "}
              {new Date(item.createdAt).toLocaleString()}
            </div>
            <div>
              <span className="font-medium">Updated:</span>{" "}
              {new Date(item.updatedAt).toLocaleString()}
            </div>
          </div>
        </AdminSectionCard>
      </div>

      {Object.keys(parsedData).length > 0 && (
        <AdminSectionCard title="Additional Data">
            <pre className="bg-muted rounded-md p-4 text-xs overflow-auto max-h-60">
              {JSON.stringify(parsedData, null, 2)}
            </pre>
        </AdminSectionCard>
      )}

      <AdminSectionCard title="Follow-up" description="Mark contacted state and keep internal recovery notes.">
          <div className="flex items-center gap-3">
            <Switch id="contacted" checked={contacted} onCheckedChange={setContacted} />
            <Label htmlFor="contacted">Contacted</Label>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this abandoned checkout..."
              rows={4}
            />
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
      </AdminSectionCard>
    </div>
  )
}

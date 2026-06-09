"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import Link from "next/link"
import { Copy, RefreshCw, ExternalLink, Clock } from "lucide-react"
import { AdminPageHeader, AdminSectionCard } from "@/components/admin/admin-ui"

type AbandonedCheckout = {
  id: string
  draftToken: string
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
  couponCode: string | null
  subtotal: number
  discount: number
  total: number
  contacted: boolean
  notes: string | null
  data: string
  source: string | null
  lastSeenAt: string | null
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

  const [recoveryUrl, setRecoveryUrl] = useState<string | null>(null)
  const [recoveryExpiresAt, setRecoveryExpiresAt] = useState<string | null>(null)
  const [generatingLink, setGeneratingLink] = useState(false)
  const [copied, setCopied] = useState(false)

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

  async function handleGenerateRecoveryLink() {
    setGeneratingLink(true)
    try {
      const res = await fetch(`/api/admin/abandoned/${id}/recovery-link`, { method: "POST" })
      const d = await res.json()
      if (d.success) {
        setRecoveryUrl(d.data.recoveryUrl)
        setRecoveryExpiresAt(d.data.expiresAt)
        toast.success("Recovery link generated")
      } else {
        toast.error(d.error ?? "Failed to generate link")
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setGeneratingLink(false)
    }
  }

  async function handleCopyLink() {
    if (!recoveryUrl) return
    try {
      await navigator.clipboard.writeText(recoveryUrl)
      setCopied(true)
      toast.success("Link copied to clipboard")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Failed to copy")
    }
  }

  if (!item) return <div className="text-muted-foreground py-10">Loading...</div>

  let parsedData: Record<string, unknown> = {}
  try { parsedData = JSON.parse(item.data) } catch {}

  return (
    <div className="space-y-6 max-w-3xl">
      <AdminPageHeader eyebrow="Sales" title="Abandoned Checkout" description={`Review checkout details and track recovery follow-up for this lead.`} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <AdminSectionCard title="Customer Info" description="Contact details captured during the abandoned checkout.">
          <div className="space-y-2 text-sm">
            <div><span className="font-medium">Name:</span> {item.name || "-"}</div>
            <div><span className="font-medium">Phone:</span> {item.phone || "-"}</div>
            <div><span className="font-medium">Email:</span> {item.email || "-"}</div>
            <div><span className="font-medium">Address:</span> {item.address || "-"}</div>
          </div>
        </AdminSectionCard>

        <AdminSectionCard title="Checkout Details" description="Step at which the customer abandoned and what was in their cart.">
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-medium">Step:</span>{" "}
              <Badge variant="secondary">{item.step}</Badge>
            </div>
            <div><span className="font-medium">Landing:</span> {item.landingSlug ? `/${item.landingSlug}` : "-"}</div>
            <div><span className="font-medium">Product:</span> {item.productId ? <span className="font-mono text-xs">{item.productId}</span> : "-"}</div>
            <div><span className="font-medium">Variant:</span> {[item.size, item.color].filter(Boolean).join(" / ") || "-"}</div>
            <div><span className="font-medium">Quantity:</span> {item.quantity ?? "-"}</div>
            <div><span className="font-medium">Delivery zone:</span> {item.deliveryZone || "-"}</div>
            {item.couponCode && <div><span className="font-medium">Coupon:</span> {item.couponCode}</div>}
            {item.subtotal > 0 && <div><span className="font-medium">Subtotal:</span> ৳{item.subtotal.toLocaleString()}</div>}
            {item.total > 0 && <div><span className="font-medium">Total:</span> ৳{item.total.toLocaleString()}</div>}
            <div><span className="font-medium">Source:</span> {item.source || "unknown"}</div>
            {item.lastSeenAt && (
              <div><span className="font-medium">Last seen:</span> {new Date(item.lastSeenAt).toLocaleString()}</div>
            )}
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

      <AdminSectionCard title="Recovery Link" description="Generate a secure link so the customer can return to a prefilled checkout.">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Send this secure link to the customer via WhatsApp, SMS, or email so they can continue checkout.
          </p>

          {recoveryUrl ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 p-3">
                <Input
                  value={recoveryUrl}
                  readOnly
                  className="flex-1 border-0 bg-transparent p-0 text-sm font-mono shadow-none focus-visible:ring-0"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyLink}
                  className="shrink-0 gap-1.5 rounded-lg"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {copied ? "Copied!" : "Copy"}
                </Button>
                <a
                  href={recoveryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex shrink-0 items-center justify-center rounded-lg border border-border bg-background h-7 px-2.5 text-sm hover:bg-muted hover:text-foreground transition-all"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
              {recoveryExpiresAt && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Expires {new Date(recoveryExpiresAt).toLocaleString()}</span>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateRecoveryLink}
                disabled={generatingLink}
                className="gap-1.5 rounded-lg"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Regenerate link
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleGenerateRecoveryLink}
              disabled={generatingLink}
              className="gap-1.5 rounded-xl"
            >
              {generatingLink ? "Generating..." : "Generate Recovery Link"}
            </Button>
          )}
        </div>
      </AdminSectionCard>
    </div>
  )
}

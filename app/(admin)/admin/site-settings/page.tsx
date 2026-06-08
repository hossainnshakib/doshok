"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { AdminPageHeader, AdminSectionCard } from "@/components/admin/admin-ui"

type Settings = {
  brandName: string
  supportEmail: string
  phone: string
  whatsapp: string
  facebookUrl: string
  instagramUrl: string
  address: string
  footerText: string
}

export default function SiteSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch("/api/site-settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          const cleaned = {} as Settings
          for (const key of Object.keys(d.data) as (keyof Settings)[]) {
            cleaned[key] = d.data[key] ?? ""
          }
          setSettings(cleaned)
        }
      })
      .catch(() => toast.error("Failed to load settings"))
      .finally(() => setLoading(false))
  }, [])

  function update(field: keyof Settings, value: string) {
    setSettings((prev) => prev ? { ...prev, [field]: value } : prev)
  }

  async function handleSave() {
    if (!settings) return
    setSaving(true)
    try {
      const res = await fetch("/api/site-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      })
      const d = await res.json()
      if (d.success) {
        toast.success("Settings saved")
      } else {
        toast.error(d.error ?? "Failed to save")
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="text-muted-foreground py-8">Loading settings...</p>
  }

  if (!settings) {
    return <p className="text-destructive py-8">Failed to load settings.</p>
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <AdminPageHeader eyebrow="Settings" title="Site Settings" description="Manage public contact information used across footer, support, and content pages." />

      <AdminSectionCard title="Brand Info" description="Public brand label and short footer copy.">
          <div className="space-y-2">
            <Label htmlFor="brandName">Brand Name</Label>
            <Input id="brandName" value={settings.brandName} onChange={(e) => update("brandName", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="footerText">Footer Short Description</Label>
            <Textarea id="footerText" value={settings.footerText} onChange={(e) => update("footerText", e.target.value)} rows={2} />
          </div>
      </AdminSectionCard>

      <AdminSectionCard title="Contact Information" description="Used by public support pages and footer contact blocks.">
          <div className="space-y-2">
            <Label htmlFor="supportEmail">Support Email</Label>
            <Input id="supportEmail" type="email" value={settings.supportEmail} onChange={(e) => update("supportEmail", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input id="phone" value={settings.phone} onChange={(e) => update("phone", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="whatsapp">WhatsApp Number (optional)</Label>
            <Input id="whatsapp" value={settings.whatsapp} onChange={(e) => update("whatsapp", e.target.value)} placeholder="+8801XXXXXXXXX" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Service Area / Address</Label>
            <Textarea id="address" value={settings.address} onChange={(e) => update("address", e.target.value)} rows={2} />
          </div>
      </AdminSectionCard>

      <AdminSectionCard title="Social Media Links" description="Optional public social links; blank values stay hidden.">
          <div className="space-y-2">
            <Label htmlFor="facebookUrl">Facebook URL (optional)</Label>
            <Input id="facebookUrl" value={settings.facebookUrl} onChange={(e) => update("facebookUrl", e.target.value)} placeholder="https://facebook.com/doshok" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="instagramUrl">Instagram URL (optional)</Label>
            <Input id="instagramUrl" value={settings.instagramUrl} onChange={(e) => update("instagramUrl", e.target.value)} placeholder="https://instagram.com/doshok" />
          </div>
      </AdminSectionCard>

      <div className="flex gap-3">
        <Button onClick={handleSave} disabled={saving} className="h-11 rounded-full px-8">
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  )
}

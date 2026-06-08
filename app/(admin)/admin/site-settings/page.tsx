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
      <AdminPageHeader eyebrow="Settings" title="Site Settings" description="Set the brand details customers see across the storefront." />

      <AdminSectionCard title="Brand Info" description="Storefront brand label and short footer description.">
          <div className="space-y-2">
            <Label htmlFor="brandName">Brand name</Label>
            <Input id="brandName" value={settings.brandName} onChange={(e) => update("brandName", e.target.value)} placeholder="DOSHOK" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="footerText">Footer short description</Label>
            <Textarea id="footerText" value={settings.footerText} onChange={(e) => update("footerText", e.target.value)} rows={3} placeholder="A short tagline shown site-wide in the footer." />
          </div>
      </AdminSectionCard>

      <AdminSectionCard title="Contact Information" description="Add the support channels customers can use for order and delivery help.">
          <div className="space-y-2">
            <Label htmlFor="supportEmail">Support email</Label>
            <Input id="supportEmail" type="email" value={settings.supportEmail} onChange={(e) => update("supportEmail", e.target.value)} placeholder="hello@doshok.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone number</Label>
            <Input id="phone" value={settings.phone} onChange={(e) => update("phone", e.target.value)} placeholder="+880 17XXXXXXXX" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="whatsapp">WhatsApp number <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input id="whatsapp" value={settings.whatsapp} onChange={(e) => update("whatsapp", e.target.value)} placeholder="+880 17XXXXXXXX" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Service area</Label>
            <Textarea id="address" value={settings.address} onChange={(e) => update("address", e.target.value)} rows={2} placeholder="e.g. All districts across Bangladesh" />
          </div>
      </AdminSectionCard>

      <AdminSectionCard title="Social Media Links" description="Optional public social links. Leave blank to hide from the storefront.">
          <div className="space-y-2">
            <Label htmlFor="facebookUrl">Facebook URL <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input id="facebookUrl" value={settings.facebookUrl} onChange={(e) => update("facebookUrl", e.target.value)} placeholder="https://facebook.com/doshok" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="instagramUrl">Instagram URL <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input id="instagramUrl" value={settings.instagramUrl} onChange={(e) => update("instagramUrl", e.target.value)} placeholder="https://instagram.com/doshok" />
          </div>
      </AdminSectionCard>

      <div className="flex gap-3 pt-2">
        <Button onClick={handleSave} disabled={saving} className="h-11 rounded-full px-8">
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  )
}

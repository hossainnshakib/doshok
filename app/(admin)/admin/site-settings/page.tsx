"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { AdminPageHeader, AdminSectionCard } from "@/components/admin/admin-ui"
import { Plus, Trash2 } from "lucide-react"

type FooterLink = { label: string; href: string; group: string }
type Settings = {
  brandName: string
  supportEmail: string
  phone: string
  whatsapp: string
  facebookUrl: string
  instagramUrl: string
  tiktokUrl: string
  youtubeUrl: string
  address: string
  footerText: string
  footerLinks: string
  accentColor: string
  buttonRadius: string
  cardRadius: string
  storefrontTone: string
  adminAccentTone: string
}

const ACCENT_COLORS = [
  { value: "#364152", label: "Charcoal (Default)" },
  { value: "#1a1a1a", label: "Pure Black" },
  { value: "#2d3748", label: "Dark Slate" },
  { value: "#4a5568", label: "Cool Gray" },
  { value: "#1e3a5f", label: "Navy" },
  { value: "#2d4a3e", label: "Forest" },
  { value: "#4a1942", label: "Plum" },
  { value: "#3d2914", label: "Espresso" },
  { value: "#364958", label: "Steel Blue" },
  { value: "#1f2937", label: "Graphite" },
]

const BUTTON_RADII = [
  { value: "none", label: "None (Sharp)" },
  { value: "sm", label: "Small (4px)" },
  { value: "md", label: "Medium (6px)" },
  { value: "lg", label: "Large (8px)" },
  { value: "xl", label: "Extra Large (12px)" },
  { value: "full", label: "Full (Pill)" },
  { value: "2xl", label: "2XL (16px)" },
  { value: "3xl", label: "3XL (20px)" },
]

const CARD_RADII = [
  { value: "none", label: "None (Sharp)" },
  { value: "sm", label: "Small (8px)" },
  { value: "md", label: "Medium (12px)" },
  { value: "lg", label: "Large (16px)" },
  { value: "xl", label: "Extra Large (20px)" },
  { value: "1.5rem", label: "1.5rem (24px)" },
  { value: "2rem", label: "2rem (32px)" },
  { value: "3rem", label: "3rem (48px)" },
]

const STOREFRONT_TONES = [
  { value: "light", label: "Light (Off-white)" },
  { value: "warm", label: "Warm (Cream)" },
  { value: "cool", label: "Cool (Blue-gray)" },
  { value: "neutral", label: "Neutral (Gray)" },
]

const ADMIN_TONES = [
  { value: "neutral", label: "Neutral (Gray)" },
  { value: "slate", label: "Slate" },
  { value: "zinc", label: "Zinc" },
  { value: "stone", label: "Stone" },
]

const LINK_GROUPS = ["Shop", "Help", "Policy"]

export default function SiteSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [footerLinks, setFooterLinks] = useState<FooterLink[]>([])

  useEffect(() => {
    fetch("/api/site-settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          const cleaned = {} as Settings
          const defaults: Settings = {
            brandName: "",
            supportEmail: "",
            phone: "",
            whatsapp: "",
            facebookUrl: "",
            instagramUrl: "",
            tiktokUrl: "",
            youtubeUrl: "",
            address: "",
            footerText: "",
            footerLinks: "[]",
            accentColor: "#364152",
            buttonRadius: "xl",
            cardRadius: "1.5rem",
            storefrontTone: "light",
            adminAccentTone: "neutral",
          }
          for (const key of Object.keys(defaults) as (keyof Settings)[]) {
            cleaned[key] = d.data[key] ?? defaults[key]
          }
          setSettings(cleaned)
          try {
            const parsed = JSON.parse(cleaned.footerLinks || "[]")
            setFooterLinks(Array.isArray(parsed) ? parsed : [])
          } catch {
            setFooterLinks([])
          }
        }
      })
      .catch(() => toast.error("Failed to load settings"))
      .finally(() => setLoading(false))
  }, [])

  function update(field: keyof Settings, value: string) {
    setSettings((prev) => prev ? { ...prev, [field]: value } : prev)
  }

  function addFooterLink() {
    setFooterLinks([...footerLinks, { label: "", href: "", group: "Shop" }])
  }

  function updateFooterLink(index: number, field: keyof FooterLink, value: string) {
    const updated = [...footerLinks]
    updated[index] = { ...updated[index], [field]: value }
    setFooterLinks(updated)
  }

  function removeFooterLink(index: number) {
    setFooterLinks(footerLinks.filter((_, i) => i !== index))
  }

  async function handleSave() {
    if (!settings) return
    setSaving(true)
    try {
      const res = await fetch("/api/site-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...settings, footerLinks: JSON.stringify(footerLinks) }),
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
      <AdminPageHeader eyebrow="Settings" title="Site Settings" description="Set the brand details and theme preferences customers and admin see across the store." backHref="/admin/settings" />

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

      <AdminSectionCard title="Theme Settings" description="Customize the visual appearance of the storefront and admin panel.">
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label htmlFor="accentColor">Accent Color</Label>
              <div className="flex gap-3 items-center">
                <input
                  type="color"
                  id="accentColor"
                  value={settings.accentColor}
                  onChange={(e) => update("accentColor", e.target.value)}
                  className="w-12 h-10 rounded-lg border cursor-pointer"
                />
                <Select value={settings.accentColor} onValueChange={(v) => { if (v) update("accentColor", v) }}>
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCENT_COLORS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: c.value }} />
                          {c.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">Primary color used for buttons, links, and accents.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="buttonRadius">Button Style</Label>
              <Select value={settings.buttonRadius} onValueChange={(v) => { if (v) update("buttonRadius", v) }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BUTTON_RADII.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Corner radius for buttons and interactive elements.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label htmlFor="cardRadius">Card Radius</Label>
              <Select value={settings.cardRadius} onValueChange={(v) => { if (v) update("cardRadius", v) }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CARD_RADII.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Corner radius for cards and container elements.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="storefrontTone">Storefront Background</Label>
              <Select value={settings.storefrontTone} onValueChange={(v) => { if (v) update("storefrontTone", v) }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STOREFRONT_TONES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Overall background tone of the storefront.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label htmlFor="adminAccentTone">Admin Accent</Label>
              <Select value={settings.adminAccentTone} onValueChange={(v) => { if (v) update("adminAccentTone", v) }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ADMIN_TONES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Color tone for admin panel accent elements.</p>
            </div>
          </div>
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
            <Label htmlFor="address">Service area / Address</Label>
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
          <div className="space-y-2">
            <Label htmlFor="tiktokUrl">TikTok URL <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input id="tiktokUrl" value={settings.tiktokUrl} onChange={(e) => update("tiktokUrl", e.target.value)} placeholder="https://tiktok.com/@doshok" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="youtubeUrl">YouTube URL <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input id="youtubeUrl" value={settings.youtubeUrl} onChange={(e) => update("youtubeUrl", e.target.value)} placeholder="https://youtube.com/@doshok" />
          </div>
      </AdminSectionCard>

      <AdminSectionCard title="Footer Menu Links" description="Custom links shown in the footer columns. Link to internal paths or external URLs.">
        <div className="space-y-3">
          {footerLinks.length === 0 && (
            <p className="text-sm text-muted-foreground">No custom links added yet. Footer will show default links.</p>
          )}
          {footerLinks.map((link, i) => (
            <div key={i} className="flex gap-2 items-end">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Group</Label>
                <Select value={link.group} onValueChange={(v) => v && updateFooterLink(i, "group", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LINK_GROUPS.map((g) => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Label</Label>
                <Input value={link.label} onChange={(e) => updateFooterLink(i, "label", e.target.value)} placeholder="e.g. Privacy Policy" />
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-xs">URL</Label>
                <Input value={link.href} onChange={(e) => updateFooterLink(i, "href", e.target.value)} placeholder="/privacy or https://..." />
              </div>
              <Button type="button" size="icon" variant="ghost" onClick={() => removeFooterLink(i)} className="shrink-0 mb-1 text-muted-foreground hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addFooterLink} className="mt-2">
            <Plus className="h-4 w-4 mr-1" /> Add Link
          </Button>
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

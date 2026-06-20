"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { AdminPageHeader, AdminSectionCard } from "@/components/admin/admin-ui"
import { Plus, Trash2, Eye } from "lucide-react"
import { ImageUploader } from "@/components/admin/image-uploader"
import { cn } from "@/lib/utils"

type FooterLink = { label: string; href: string; group: string }
type Settings = {
  brandName: string; supportEmail: string; phone: string; whatsapp: string
  facebookUrl: string; instagramUrl: string; tiktokUrl: string; youtubeUrl: string
  address: string; footerText: string; footerLinks: string
  accentColor: string; buttonRadius: string; cardRadius: string
  storefrontTone: string; adminAccentTone: string
  headerLogo: string; footerLogo: string; favicon: string; appleTouchIcon: string
  defaultSeoTitle: string; defaultSeoDescription: string; defaultSeoImage: string; defaultSeoKeywords: string
}

const ACCENT_COLORS = [
  { value: "#364152", label: "Charcoal (Default)" }, { value: "#1a1a1a", label: "Pure Black" },
  { value: "#2d3748", label: "Dark Slate" }, { value: "#4a5568", label: "Cool Gray" },
  { value: "#1e3a5f", label: "Navy" }, { value: "#2d4a3e", label: "Forest" },
  { value: "#4a1942", label: "Plum" }, { value: "#3d2914", label: "Espresso" },
  { value: "#364958", label: "Steel Blue" }, { value: "#1f2937", label: "Graphite" },
]

const BUTTON_RADII = [
  { value: "none", label: "None (Sharp)" }, { value: "sm", label: "Small (4px)" },
  { value: "md", label: "Medium (6px)" }, { value: "lg", label: "Large (8px)" },
  { value: "xl", label: "Extra Large (12px)" }, { value: "full", label: "Full (Pill)" },
  { value: "2xl", label: "2XL (16px)" }, { value: "3xl", label: "3XL (20px)" },
]

const CARD_RADII = [
  { value: "none", label: "None (Sharp)" }, { value: "sm", label: "Small (8px)" },
  { value: "md", label: "Medium (12px)" }, { value: "lg", label: "Large (16px)" },
  { value: "xl", label: "Extra Large (20px)" }, { value: "1.5rem", label: "1.5rem (24px)" },
  { value: "2rem", label: "2rem (32px)" }, { value: "3rem", label: "3rem (48px)" },
]

const STOREFRONT_TONES = [
  { value: "light", label: "Light (Off-white)" }, { value: "warm", label: "Warm (Cream)" },
  { value: "cool", label: "Cool (Blue-gray)" }, { value: "neutral", label: "Neutral (Gray)" },
]

const ADMIN_TONES = [
  { value: "neutral", label: "Neutral (Gray)" }, { value: "slate", label: "Slate" },
  { value: "zinc", label: "Zinc" }, { value: "stone", label: "Stone" },
]

const LINK_GROUPS = ["Shop", "Help", "Policy"]

export default function SiteSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [footerLinks, setFooterLinks] = useState<FooterLink[]>([])
  const [headerLogoArr, setHeaderLogoArr] = useState<string[]>([])
  const [footerLogoArr, setFooterLogoArr] = useState<string[]>([])
  const [faviconArr, setFaviconArr] = useState<string[]>([])
  const [appleTouchIconArr, setAppleTouchIconArr] = useState<string[]>([])
  const [defaultSeoImageArr, setDefaultSeoImageArr] = useState<string[]>([])

  useEffect(() => {
    fetch("/api/site-settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          const cleaned = {} as Settings
          const defaults: Settings = {
            brandName: "", supportEmail: "", phone: "", whatsapp: "",
            facebookUrl: "", instagramUrl: "", tiktokUrl: "", youtubeUrl: "",
            address: "", footerText: "", footerLinks: "[]",
            accentColor: "#364152", buttonRadius: "xl", cardRadius: "1.5rem",
            storefrontTone: "light", adminAccentTone: "neutral",
            headerLogo: "", footerLogo: "", favicon: "", appleTouchIcon: "",
            defaultSeoTitle: "", defaultSeoDescription: "", defaultSeoImage: "", defaultSeoKeywords: "",
          }
          for (const key of Object.keys(defaults) as (keyof Settings)[]) {
            cleaned[key] = d.data[key] ?? defaults[key]
          }
          setSettings(cleaned)
          setHeaderLogoArr(cleaned.headerLogo ? [cleaned.headerLogo] : [])
          setFooterLogoArr(cleaned.footerLogo ? [cleaned.footerLogo] : [])
          setFaviconArr(cleaned.favicon ? [cleaned.favicon] : [])
          setAppleTouchIconArr(cleaned.appleTouchIcon ? [cleaned.appleTouchIcon] : [])
          setDefaultSeoImageArr(cleaned.defaultSeoImage ? [cleaned.defaultSeoImage] : [])
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

  function syncImage(field: keyof Settings, arr: string[], setArr: (v: string[]) => void) {
    const value = arr[0] || ""
    setArr(arr)
    update(field, value)
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
      if (d.success) toast.success("Settings saved")
      else toast.error(d.error ?? "Failed to save")
    } catch {
      toast.error("Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-sm text-slate-400 py-8">Loading settings...</p>
  if (!settings) return <p className="text-sm text-red-500 py-8">Failed to load settings.</p>

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Settings"
        title="Site Settings"
        description="Set the brand details and theme preferences customers and admin see across the store."
        backHref="/admin/settings"
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
        <div className="space-y-5">
          <AdminSectionCard title="Brand Info" description="Storefront brand label and short footer description.">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="brandName" className="text-xs font-medium text-slate-600">Brand Name</Label>
                <Input id="brandName" value={settings.brandName} onChange={(e) => update("brandName", e.target.value)} placeholder="DOSHOK" className="text-xs h-9" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="footerText" className="text-xs font-medium text-slate-600">Footer Short Description</Label>
                <Input id="footerText" value={settings.footerText} onChange={(e) => update("footerText", e.target.value)} placeholder="A short tagline shown site-wide in the footer." className="text-xs h-9" />
              </div>
            </div>
          </AdminSectionCard>

          <AdminSectionCard title="Branding Assets" description="Upload logos and icons for site-wide branding. Falls back to text branding when not set.">
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="headerLogo" className="text-xs font-medium text-slate-600">Header Logo <span className="text-slate-400 font-normal text-[10px]">(optional)</span></Label>
                  <ImageUploader
                    images={headerLogoArr}
                    onChange={(v) => syncImage("headerLogo", v, setHeaderLogoArr)}
                    single
                    label=""
                    helperText="Replaces the Doshok.com text in the header."
                    folder="branding"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="footerLogo" className="text-xs font-medium text-slate-600">Footer Logo <span className="text-slate-400 font-normal text-[10px]">(optional)</span></Label>
                  <ImageUploader
                    images={footerLogoArr}
                    onChange={(v) => syncImage("footerLogo", v, setFooterLogoArr)}
                    single
                    label=""
                    helperText="Replaces the D mark + text in the footer."
                    folder="branding"
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="favicon" className="text-xs font-medium text-slate-600">Favicon <span className="text-slate-400 font-normal text-[10px]">(optional)</span></Label>
                  <ImageUploader
                    images={faviconArr}
                    onChange={(v) => syncImage("favicon", v, setFaviconArr)}
                    single
                    label=""
                    helperText="Browser tab icon. Ideal size: 32×32px."
                    folder="branding"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="appleTouchIcon" className="text-xs font-medium text-slate-600">Apple Touch Icon <span className="text-slate-400 font-normal text-[10px]">(optional)</span></Label>
                  <ImageUploader
                    images={appleTouchIconArr}
                    onChange={(v) => syncImage("appleTouchIcon", v, setAppleTouchIconArr)}
                    single
                    label=""
                    helperText="Home screen icon on iOS. Ideal size: 180×180px."
                    folder="branding"
                  />
                </div>
              </div>
            </div>
          </AdminSectionCard>

          <AdminSectionCard title="SEO Settings" description="Default metadata values used across the storefront when a page does not provide its own.">
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="defaultSeoTitle" className="text-xs font-medium text-slate-600">Default SEO Title</Label>
                  <Input id="defaultSeoTitle" value={settings.defaultSeoTitle} onChange={(e) => update("defaultSeoTitle", e.target.value)} placeholder="e.g. Doshok — Premium Bangladeshi Fashion" className="text-xs h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="defaultSeoKeywords" className="text-xs font-medium text-slate-600">Default SEO Keywords <span className="text-slate-400 font-normal text-[10px]">(optional)</span></Label>
                  <Input id="defaultSeoKeywords" value={settings.defaultSeoKeywords} onChange={(e) => update("defaultSeoKeywords", e.target.value)} placeholder="e.g. panjabi, kurta, Bangladeshi fashion" className="text-xs h-9" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="defaultSeoDescription" className="text-xs font-medium text-slate-600">Default SEO Description</Label>
                <textarea
                  id="defaultSeoDescription"
                  value={settings.defaultSeoDescription}
                  onChange={(e) => update("defaultSeoDescription", e.target.value)}
                  placeholder="Brief description of your store for search engines."
                  className="flex min-h-[60px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-0 resize-y"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="defaultSeoImage" className="text-xs font-medium text-slate-600">Default SEO Image <span className="text-slate-400 font-normal text-[10px]">(optional)</span></Label>
                <ImageUploader
                  images={defaultSeoImageArr}
                  onChange={(v) => syncImage("defaultSeoImage", v, setDefaultSeoImageArr)}
                  single
                  label=""
                  helperText="Fallback social sharing image (1200×630 recommended)."
                  folder="branding"
                />
              </div>
            </div>
          </AdminSectionCard>

          <AdminSectionCard title="Theme Settings" description="Customize the visual appearance of the storefront and admin panel.">
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1.5">
                  <Label htmlFor="accentColor" className="text-xs font-medium text-slate-600">Accent Color</Label>
                  <div className="flex gap-2 items-center">
                    <input type="color" id="accentColor" value={settings.accentColor} onChange={(e) => update("accentColor", e.target.value)} className="w-9 h-9 rounded-lg border border-slate-200 cursor-pointer" />
                    <Select value={settings.accentColor} onValueChange={(v) => { if (v) update("accentColor", v) }}>
                      <SelectTrigger className="flex-1 text-xs h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ACCENT_COLORS.map((c) => (
                          <SelectItem key={c.value} value={c.value} className="text-xs">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full border" style={{ backgroundColor: c.value }} />
                              {c.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-[10px] text-slate-400">Primary color for buttons and links.</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="buttonRadius" className="text-xs font-medium text-slate-600">Button Style</Label>
                  <Select value={settings.buttonRadius} onValueChange={(v) => { if (v) update("buttonRadius", v) }}>
                    <SelectTrigger className="text-xs h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {BUTTON_RADII.map((r) => <SelectItem key={r.value} value={r.value} className="text-xs">{r.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cardRadius" className="text-xs font-medium text-slate-600">Card Radius</Label>
                  <Select value={settings.cardRadius} onValueChange={(v) => { if (v) update("cardRadius", v) }}>
                    <SelectTrigger className="text-xs h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CARD_RADII.map((r) => <SelectItem key={r.value} value={r.value} className="text-xs">{r.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="storefrontTone" className="text-xs font-medium text-slate-600">Storefront Background</Label>
                  <Select value={settings.storefrontTone} onValueChange={(v) => { if (v) update("storefrontTone", v) }}>
                    <SelectTrigger className="text-xs h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STOREFRONT_TONES.map((t) => <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="adminAccentTone" className="text-xs font-medium text-slate-600">Admin Accent</Label>
                  <Select value={settings.adminAccentTone} onValueChange={(v) => { if (v) update("adminAccentTone", v) }}>
                    <SelectTrigger className="text-xs h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ADMIN_TONES.map((t) => <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </AdminSectionCard>

          <AdminSectionCard title="Contact Information" description="Support channels customers can use for order and delivery help.">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="supportEmail" className="text-xs font-medium text-slate-600">Support Email</Label>
                <Input id="supportEmail" type="email" value={settings.supportEmail} onChange={(e) => update("supportEmail", e.target.value)} placeholder="hello@doshok.com" className="text-xs h-9" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs font-medium text-slate-600">Phone Number</Label>
                <Input id="phone" value={settings.phone} onChange={(e) => update("phone", e.target.value)} placeholder="+880 17XXXXXXXX" className="text-xs h-9" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="whatsapp" className="text-xs font-medium text-slate-600">WhatsApp <span className="text-slate-400 font-normal text-[10px]">(optional)</span></Label>
                <Input id="whatsapp" value={settings.whatsapp} onChange={(e) => update("whatsapp", e.target.value)} placeholder="+880 17XXXXXXXX" className="text-xs h-9" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="address" className="text-xs font-medium text-slate-600">Service Area / Address</Label>
                <Input id="address" value={settings.address} onChange={(e) => update("address", e.target.value)} placeholder="e.g. All districts across Bangladesh" className="text-xs h-9" />
              </div>
            </div>
          </AdminSectionCard>

          <AdminSectionCard title="Social Media Links" description="Optional public social links. Leave blank to hide from the storefront.">
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { field: "facebookUrl" as const, label: "Facebook URL" },
                { field: "instagramUrl" as const, label: "Instagram URL" },
                { field: "tiktokUrl" as const, label: "TikTok URL" },
                { field: "youtubeUrl" as const, label: "YouTube URL" },
              ].map(({ field, label }) => (
                <div key={field} className="space-y-1.5">
                  <Label htmlFor={field} className="text-xs font-medium text-slate-600">{label} <span className="text-slate-400 font-normal text-[10px]">(optional)</span></Label>
                  <Input id={field} value={settings[field]} onChange={(e) => update(field, e.target.value)} placeholder="https://..." className="text-xs h-9" />
                </div>
              ))}
            </div>
          </AdminSectionCard>

          <AdminSectionCard title="Footer Menu Links" description="Custom links shown in the footer columns: Shop, Help, and Policy.">
            <div className="space-y-3">
              {footerLinks.length === 0 && (
                <p className="text-xs text-slate-500">No custom links added yet. Footer will show default links.</p>
              )}
              {footerLinks.map((link, i) => (
                <div key={i} className="flex gap-2 items-end">
                  <div className="flex-1 space-y-1">
                    <Label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Group</Label>
                    <Select value={link.group} onValueChange={(v) => v && updateFooterLink(i, "group", v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {LINK_GROUPS.map((g) => <SelectItem key={g} value={g} className="text-xs">{g}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Label</Label>
                    <Input value={link.label} onChange={(e) => updateFooterLink(i, "label", e.target.value)} placeholder="e.g. Privacy Policy" className="h-8 text-xs" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">URL</Label>
                    <Input value={link.href} onChange={(e) => updateFooterLink(i, "href", e.target.value)} placeholder="/privacy or https://..." className="h-8 text-xs" />
                  </div>
                  <Button type="button" size="icon" variant="ghost" onClick={() => removeFooterLink(i)} className="shrink-0 mb-1 text-slate-400 hover:text-red-500 h-8 w-8">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addFooterLink} className="mt-2 rounded-lg h-8 text-xs font-semibold">
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Link
              </Button>
            </div>
          </AdminSectionCard>
        </div>

        <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-xl border border-slate-200/60 bg-white p-4 shadow-sm">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Current Settings</h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Brand</span>
                <span className="font-medium text-slate-700 text-right max-w-[120px] truncate">{settings.brandName || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Accent</span>
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded-full border" style={{ backgroundColor: settings.accentColor }} />
                  <span className="text-slate-600 text-[10px] font-mono">{settings.accentColor}</span>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Button</span>
                <span className="text-slate-700">{BUTTON_RADII.find(r => r.value === settings.buttonRadius)?.label.split(" ")[0] || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Card</span>
                <span className="text-slate-700">{CARD_RADII.find(r => r.value === settings.cardRadius)?.label.split(" ")[0] || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Phone</span>
                <span className="text-slate-700 text-right max-w-[120px] truncate">{settings.phone || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Email</span>
                <span className="text-slate-700 text-right max-w-[120px] truncate">{settings.supportEmail || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Footer Links</span>
                <span className="font-semibold text-slate-800">{footerLinks.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Social</span>
                <span className="font-semibold text-slate-800">
                  {[settings.facebookUrl, settings.instagramUrl, settings.tiktokUrl, settings.youtubeUrl].filter(Boolean).length || "—"}
                </span>
              </div>
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full h-9 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white">
            {saving ? "Saving..." : "Save Settings"}
          </Button>

          <a
            href="/"
            target="_blank"
            className="inline-flex items-center justify-center gap-1.5 w-full h-9 rounded-lg border border-border bg-background text-xs font-semibold text-slate-600 hover:bg-muted transition"
          >
            <Eye className="h-3.5 w-3.5" />
            Preview Storefront
          </a>
        </div>
      </div>
    </div>
  )
}
"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { AdminPageHeader, AdminSectionCard } from "@/components/admin/admin-ui"
import { Plus, Trash2, ExternalLink, ArrowRight, ArrowLeft } from "lucide-react"

type FooterLinkItem = { label: string; href: string; group: string }
type MenuLink = { label: string; href: string }

const HEADER_QUICK_LINKS: MenuLink[] = [
  { label: "Help", href: "/help" },
  { label: "Policy", href: "/policy" },
  { label: "About Doshok", href: "/about" },
  { label: "Track Order", href: "/track-order" },
]

const VALID_INTERNAL_PATHS = [
  { value: "/products", label: "/products — All Products" },
  { value: "/new-arrivals", label: "/new-arrivals — New Arrivals" },
  { value: "/about", label: "/about — About" },
  { value: "/contact", label: "/contact — Contact" },
  { value: "/faq", label: "/faq — FAQ" },
  { value: "/size-guide", label: "/size-guide — Size Guide" },
  { value: "/care-guide", label: "/care-guide — Care Guide" },
  { value: "/track-order", label: "/track-order — Track Order" },
  { value: "/privacy", label: "/privacy — Privacy Policy" },
  { value: "/terms", label: "/terms — Terms" },
  { value: "/return-policy", label: "/return-policy — Return Policy" },
  { value: "/delivery", label: "/delivery — Delivery" },
  { value: "/shipping", label: "/shipping — Shipping" },
  { value: "/cookies", label: "/cookies — Cookies" },
  { value: "/help", label: "/help — Help Hub" },
  { value: "/policy", label: "/policy — Policy Hub" },
  { value: "/stories", label: "/stories — Stories" },
  { value: "/store-locator", label: "/store-locator — Store Locator" },
  { value: "/gift-cards", label: "/gift-cards — Gift Cards" },
  { value: "/careers", label: "/careers — Careers" },
]

export default function CMSMenusPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [headerLinks, setHeaderLinks] = useState<string[]>([])
  const [footerShopLinks, setFooterShopLinks] = useState<MenuLink[]>([])
  const [footerHelpLinks, setFooterHelpLinks] = useState<MenuLink[]>([])
  const [footerPolicyLinks, setFooterPolicyLinks] = useState<MenuLink[]>([])

  useEffect(() => {
    fetch("/api/site-settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data) {
          try {
            const footerLinks: FooterLinkItem[] = JSON.parse(d.data.footerLinks || "[]")
            setHeaderLinks(d.data.headerQuickLinks ? JSON.parse(d.data.headerQuickLinks) : HEADER_QUICK_LINKS.map(l => l.href))
            setFooterShopLinks(footerLinks.filter((l) => l.group === "Shop"))
            setFooterHelpLinks(footerLinks.filter((l) => l.group === "Help"))
            setFooterPolicyLinks(footerLinks.filter((l) => l.group === "Policy"))
          } catch {
            setHeaderLinks(HEADER_QUICK_LINKS.map(l => l.href))
          }
        }
      })
      .catch(() => toast.error("Failed to load menus"))
      .finally(() => setLoading(false))
  }, [])

  function updateHeaderLinks(index: number, href: string) {
    const updated = [...headerLinks]
    updated[index] = href
    setHeaderLinks(updated)
  }

  function removeHeaderLink(index: number) {
    setHeaderLinks(headerLinks.filter((_, i) => i !== index))
  }

  function addHeaderLink() {
    setHeaderLinks([...headerLinks, "/products"])
  }

  function addFooterLink(group: "Shop" | "Help" | "Policy") {
    const setter = group === "Shop" ? setFooterShopLinks : group === "Help" ? setFooterHelpLinks : setFooterPolicyLinks
    setter(prev => [...prev, { label: "", href: "/products", group }])
  }

  function updateFooterLink(group: "Shop" | "Help" | "Policy", index: number, field: "label" | "href", value: string) {
    const setter = group === "Shop" ? setFooterShopLinks : group === "Help" ? setFooterHelpLinks : setFooterPolicyLinks
    const getter = group === "Shop" ? footerShopLinks : group === "Help" ? footerHelpLinks : footerPolicyLinks
    const updated = [...getter]
    updated[index] = { ...updated[index], [field]: value }
    setter(updated)
  }

  function removeFooterLink(group: "Shop" | "Help" | "Policy", index: number) {
    const setter = group === "Shop" ? setFooterShopLinks : group === "Help" ? setFooterHelpLinks : setFooterPolicyLinks
    const getter = group === "Shop" ? footerShopLinks : group === "Help" ? footerHelpLinks : footerPolicyLinks
    setter(getter.filter((_, i) => i !== index))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const footerLinks: FooterLinkItem[] = [
        ...footerShopLinks.map(l => ({ ...l, group: "Shop" })),
        ...footerHelpLinks.map(l => ({ ...l, group: "Help" })),
        ...footerPolicyLinks.map(l => ({ ...l, group: "Policy" })),
      ]
      const res = await fetch("/api/site-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          headerQuickLinks: JSON.stringify(headerLinks),
          footerLinks: JSON.stringify(footerLinks),
        }),
      })
      const d = await res.json()
      if (d.success) {
        toast.success("Menu links saved")
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
    return <p className="text-muted-foreground py-8">Loading menus...</p>
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <AdminPageHeader eyebrow="CMS" title="Navigation Menus" description="Configure storefront navigation links shown in the header quick bar and footer columns." backHref="/admin/cms" />

      <Link href="/admin/cms" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group">
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
        Back to CMS Hub
      </Link>

      <AdminSectionCard title="Header Quick Links" description="Links shown in the top bar of the storefront header. Use internal paths only.">
        <div className="space-y-2">
          {headerLinks.length === 0 && (
            <p className="text-sm text-muted-foreground">No header links configured. The default links will be shown.</p>
          )}
          {headerLinks.map((href, i) => (
            <div key={i} className="flex gap-2 items-end">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Page</Label>
                <Select value={href} onValueChange={(v) => v && updateHeaderLinks(i, v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VALID_INTERNAL_PATHS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="button" size="icon" variant="ghost" onClick={() => removeHeaderLink(i)} className="shrink-0 mb-1">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addHeaderLink} className="mt-2">
            <Plus className="h-4 w-4 mr-1" /> Add Link
          </Button>
        </div>
      </AdminSectionCard>

      <AdminSectionCard title="Footer Menu — Shop" description="Links shown under the Shop column in the footer.">
        <div className="space-y-2">
          {footerShopLinks.length === 0 && (
            <p className="text-sm text-muted-foreground">No custom links. Default shop links will be shown.</p>
          )}
          {footerShopLinks.map((link, i) => (
            <div key={i} className="flex gap-2 items-end">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Label</Label>
                <Input value={link.label} onChange={(e) => updateFooterLink("Shop", i, "label", e.target.value)} placeholder="e.g. All Products" />
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Path</Label>
                <Select value={link.href} onValueChange={(v) => v && updateFooterLink("Shop", i, "href", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VALID_INTERNAL_PATHS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="button" size="icon" variant="ghost" onClick={() => removeFooterLink("Shop", i)} className="shrink-0 mb-1">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => addFooterLink("Shop")} className="mt-2">
            <Plus className="h-4 w-4 mr-1" /> Add Link
          </Button>
        </div>
      </AdminSectionCard>

      <AdminSectionCard title="Footer Menu — Help" description="Links shown under the Help column in the footer.">
        <div className="space-y-2">
          {footerHelpLinks.length === 0 && (
            <p className="text-sm text-muted-foreground">No custom links. Default help links will be shown.</p>
          )}
          {footerHelpLinks.map((link, i) => (
            <div key={i} className="flex gap-2 items-end">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Label</Label>
                <Input value={link.label} onChange={(e) => updateFooterLink("Help", i, "label", e.target.value)} placeholder="e.g. FAQ" />
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Path</Label>
                <Select value={link.href} onValueChange={(v) => v && updateFooterLink("Help", i, "href", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VALID_INTERNAL_PATHS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="button" size="icon" variant="ghost" onClick={() => removeFooterLink("Help", i)} className="shrink-0 mb-1">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => addFooterLink("Help")} className="mt-2">
            <Plus className="h-4 w-4 mr-1" /> Add Link
          </Button>
        </div>
      </AdminSectionCard>

      <AdminSectionCard title="Footer Menu — Policy" description="Links shown under the Policy column in the footer.">
        <div className="space-y-2">
          {footerPolicyLinks.length === 0 && (
            <p className="text-sm text-muted-foreground">No custom links. Default policy links will be shown.</p>
          )}
          {footerPolicyLinks.map((link, i) => (
            <div key={i} className="flex gap-2 items-end">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Label</Label>
                <Input value={link.label} onChange={(e) => updateFooterLink("Policy", i, "label", e.target.value)} placeholder="e.g. Privacy Policy" />
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Path</Label>
                <Select value={link.href} onValueChange={(v) => v && updateFooterLink("Policy", i, "href", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VALID_INTERNAL_PATHS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="button" size="icon" variant="ghost" onClick={() => removeFooterLink("Policy", i)} className="shrink-0 mb-1">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => addFooterLink("Policy")} className="mt-2">
            <Plus className="h-4 w-4 mr-1" /> Add Link
          </Button>
        </div>
      </AdminSectionCard>

      <div className="flex gap-3 pt-2">
        <Button onClick={handleSave} disabled={saving} className="h-11 rounded-full px-8">
          {saving ? "Saving..." : "Save Menu Links"}
        </Button>
      </div>
    </div>
  )
}
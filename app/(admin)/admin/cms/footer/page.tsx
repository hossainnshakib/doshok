"use client"

import { useEffect, useState } from "react"
import { AdminPageHeader, AdminPageShell } from "@/components/admin/admin-ui"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ImageUploader } from "@/components/admin/image-uploader"
import { Plus, Trash2, ExternalLink } from "lucide-react"
import { toast } from "sonner"

type FooterLink = { label: string; href: string; group: string }

const LINK_GROUPS = ["Shop", "Help", "Policy"]

export default function CMSFooterPage() {
  const [footerText, setFooterText] = useState("")
  const [footerLogo, setFooterLogo] = useState<string[]>([])
  const [footerLinks, setFooterLinks] = useState<FooterLink[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch("/api/site-settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setFooterText(d.data.footerText ?? "")
          setFooterLogo(d.data.footerLogo ? [d.data.footerLogo] : [])
          try {
            const parsed = JSON.parse(d.data.footerLinks || "[]")
            setFooterLinks(Array.isArray(parsed) ? parsed : [])
          } catch {
            setFooterLinks([])
          }
        }
      })
      .catch(() => toast.error("Failed to load footer settings"))
      .finally(() => setLoading(false))
  }, [])

  function addLink() {
    setFooterLinks([...footerLinks, { label: "", href: "", group: "Shop" }])
  }

  function updateLink(index: number, field: keyof FooterLink, value: string) {
    const updated = [...footerLinks]
    updated[index] = { ...updated[index], [field]: value }
    setFooterLinks(updated)
  }

  function removeLink(index: number) {
    setFooterLinks(footerLinks.filter((_, i) => i !== index))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch("/api/site-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          footerText,
          footerLogo: footerLogo[0] || "",
          footerLinks: JSON.stringify(footerLinks),
        }),
      })
      const d = await res.json()
      if (d.success) toast.success("Footer saved")
      else toast.error(d.error ?? "Failed to save")
    } catch {
      toast.error("Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="CMS"
        title="Footer"
        description="Manage the site-wide footer content and links."
      />
      {loading ? (
        <div className="rounded-xl border border-slate-200/60 bg-white p-8 text-center text-sm text-slate-400">Loading...</div>
      ) : (
        <div className="space-y-5">
          <div className="rounded-xl border border-slate-200/60 bg-white p-5 space-y-5">
            <div>
              <h3 className="text-sm font-semibold text-slate-800 mb-1">Footer Text &amp; Logo</h3>
              <p className="text-xs text-slate-400 mb-4">The tagline and optional logo shown at the bottom of every page.</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600">Footer Short Description</Label>
                  <Input value={footerText} onChange={(e) => setFooterText(e.target.value)} placeholder="A short tagline shown in the footer." className="text-xs h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600">Footer Logo <span className="text-slate-400 font-normal text-[10px]">(optional)</span></Label>
                  <ImageUploader
                    images={footerLogo}
                    onChange={setFooterLogo}
                    single
                    label=""
                    helperText="Replaces the D mark + text in the footer."
                    folder="branding"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200/60 bg-white p-5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-800 mb-1">Footer Menu Links</h3>
              <p className="text-xs text-slate-400 mb-1">Custom links shown in the footer columns: Shop, Help, and Policy.</p>
              <p className="text-xs text-slate-400 mb-4">These are overridden when a CMS Footer menu is configured in <a href="/admin/cms/menus" className="text-slate-600 underline">Menus</a>.</p>
            </div>
            {footerLinks.length === 0 && (
              <p className="text-xs text-slate-500 py-2">No custom links yet. Footer will show default links.</p>
            )}
            {footerLinks.map((link, i) => (
              <div key={i} className="flex gap-2 items-end">
                <div className="flex-1 space-y-1">
                  <Label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Group</Label>
                  <Select value={link.group} onValueChange={(v) => v && updateLink(i, "group", v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LINK_GROUPS.map((g) => <SelectItem key={g} value={g} className="text-xs">{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 space-y-1">
                  <Label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Label</Label>
                  <Input value={link.label} onChange={(e) => updateLink(i, "label", e.target.value)} placeholder="e.g. Privacy Policy" className="h-8 text-xs" />
                </div>
                <div className="flex-1 space-y-1">
                  <Label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">URL</Label>
                  <Input value={link.href} onChange={(e) => updateLink(i, "href", e.target.value)} placeholder="/privacy or https://..." className="h-8 text-xs" />
                </div>
                <Button type="button" size="icon" variant="ghost" onClick={() => removeLink(i)} className="shrink-0 mb-1 text-slate-400 hover:text-red-500 h-8 w-8">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addLink} className="rounded-lg h-8 text-xs font-semibold">
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Link
            </Button>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200/60 bg-white p-4">
            <div className="text-xs text-slate-500">
              Need advanced settings?{" "}
              <a href="/admin/site-settings" className="text-slate-700 underline font-medium">
                Go to Site Settings <ExternalLink className="h-3 w-3 inline-block" />
              </a>
            </div>
            <Button onClick={handleSave} disabled={saving} className="h-8 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800">
              {saving ? "Saving..." : "Save Footer"}
            </Button>
          </div>
        </div>
      )}
    </AdminPageShell>
  )
}

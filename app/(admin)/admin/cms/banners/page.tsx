"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import { AdminPageHeader, AdminSectionCard } from "@/components/admin/admin-ui"
import { ImageUploader } from "@/components/admin/image-uploader"

type HomepageData = {
  heroTitle: string
  heroSubtitle: string
  heroImage: string
  featuredIds: string
  announcementBarText: string
  announcementBarEnabled: boolean
  promoBannerText: string
  promoBannerImage: string
  promoBannerLink: string
  promoBannerEnabled: boolean
}

export default function CMSBannersPage() {
  const [data, setData] = useState<HomepageData>({
    heroTitle: "",
    heroSubtitle: "",
    heroImage: "",
    featuredIds: "[]",
    announcementBarText: "",
    announcementBarEnabled: false,
    promoBannerText: "",
    promoBannerImage: "",
    promoBannerLink: "",
    promoBannerEnabled: false,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch("/api/homepage")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data) {
          setData({
            heroTitle: d.data.heroTitle ?? "",
            heroSubtitle: d.data.heroSubtitle ?? "",
            heroImage: d.data.heroImage ?? "",
            featuredIds: d.data.featuredIds ?? "[]",
            announcementBarText: d.data.announcementBarText ?? "",
            announcementBarEnabled: d.data.announcementBarEnabled ?? false,
            promoBannerText: d.data.promoBannerText ?? "",
            promoBannerImage: d.data.promoBannerImage ?? "",
            promoBannerLink: d.data.promoBannerLink ?? "",
            promoBannerEnabled: d.data.promoBannerEnabled ?? false,
          })
        }
      })
      .catch(() => toast.error("Failed to load banner settings"))
      .finally(() => setLoading(false))
  }, [])

  function update(field: keyof HomepageData, value: string | boolean) {
    setData(prev => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch("/api/homepage", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          heroTitle: data.heroTitle,
          heroSubtitle: data.heroSubtitle,
          heroImage: data.heroImage,
          featuredIds: data.featuredIds,
          announcementBarText: data.announcementBarText,
          announcementBarEnabled: data.announcementBarEnabled,
          promoBannerText: data.promoBannerText,
          promoBannerImage: data.promoBannerImage,
          promoBannerLink: data.promoBannerLink,
          promoBannerEnabled: data.promoBannerEnabled,
        }),
      })
      const d = await res.json()
      if (d.success) {
        toast.success("Banner settings saved")
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
    return <p className="text-muted-foreground py-8">Loading banner settings...</p>
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <AdminPageHeader eyebrow="CMS" title="Banners" description="Manage the announcement bar and promotional banners shown across the storefront." backHref="/admin/cms" />

      <Link href="/admin/cms" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group">
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
        Back to CMS Hub
      </Link>

      <AdminSectionCard title="Announcement Bar" description="A thin bar shown at the top of every storefront page. Use for urgent offers or updates.">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable Announcement Bar</Label>
              <p className="text-xs text-muted-foreground">Turn on to show the announcement bar on the storefront.</p>
            </div>
            <Switch
              checked={data.announcementBarEnabled}
              onCheckedChange={(v) => update("announcementBarEnabled", v)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="announcementText">Announcement Text</Label>
            <Input
              id="announcementText"
              value={data.announcementBarText}
              onChange={(e) => update("announcementBarText", e.target.value)}
              placeholder="e.g. Free delivery inside Chattogram on orders over ৳999"
              disabled={!data.announcementBarEnabled}
            />
            <p className="text-xs text-muted-foreground">Keep it short — ideally under 80 characters for best display.</p>
          </div>
        </div>
      </AdminSectionCard>

      <AdminSectionCard title="Hero Banner" description="The main banner on the homepage. Already editable via the Homepage Settings page.">
        <div className="space-y-2">
          <div className="rounded-xl border border-dashed border-black/10 bg-muted/50 p-4 text-center">
            <p className="text-sm font-medium">Hero banner is managed in</p>
            <a href="/admin/homepage" className="mt-1 inline-block text-sm font-bold text-primary hover:underline">
              Homepage Settings
            </a>
          </div>
          <div className="grid grid-cols-2 gap-4 rounded-xl border bg-muted/30 p-4">
            <div>
              <p className="text-xs text-muted-foreground">Current Title</p>
              <p className="text-sm font-medium">{data.heroTitle || "(not set)"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Current Subtitle</p>
              <p className="text-sm font-medium line-clamp-2">{data.heroSubtitle || "(not set)"}</p>
            </div>
          </div>
        </div>
      </AdminSectionCard>

      <AdminSectionCard title="Promo Banner" description="An optional promotional banner shown below the hero on the homepage.">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable Promo Banner</Label>
              <p className="text-xs text-muted-foreground">Show a promotional banner block on the homepage.</p>
            </div>
            <Switch
              checked={data.promoBannerEnabled}
              onCheckedChange={(v) => update("promoBannerEnabled", v)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="promoText">Promo Text</Label>
            <Input
              id="promoText"
              value={data.promoBannerText}
              onChange={(e) => update("promoBannerText", e.target.value)}
              placeholder="e.g. Summer Sale — Up to 40% off"
              disabled={!data.promoBannerEnabled}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="promoLink">Link URL <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input
              id="promoLink"
              value={data.promoBannerLink}
              onChange={(e) => update("promoBannerLink", e.target.value)}
              placeholder="/products or https://..."
              disabled={!data.promoBannerEnabled}
            />
          </div>
          <div className="space-y-2">
            <Label>Banner Image <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <ImageUploader
              images={data.promoBannerImage ? [data.promoBannerImage] : []}
              onChange={(imgs) => update("promoBannerImage", imgs[0] || "")}
              single
              label="Promo banner image"
              helperText="Optional background or side image for the promo banner."
              folder="promo"
            />
          </div>
        </div>
      </AdminSectionCard>

      <div className="flex gap-3 pt-2">
        <Button onClick={handleSave} disabled={saving} className="h-11 rounded-full px-8">
          {saving ? "Saving..." : "Save Banner Settings"}
        </Button>
      </div>
    </div>
  )
}
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { X, ImageIcon } from "lucide-react"
import { AdminPageHeader, AdminSectionCard } from "@/components/admin/admin-ui"
import { ImageUploader } from "@/components/admin/image-uploader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface SectionItem {
  type: string
  enabled: boolean
  title: string
  description: string
  sortOrder: number
  config: Record<string, unknown>
}

const SECTION_LABELS: Record<string, string> = {
  hero: "Hero",
  categories: "Categories",
  sale_products: "Sale Products",
  new_arrivals: "New Arrivals",
  featured_products: "Featured Products",
  best_sellers: "Best Sellers",
  promo_banner: "Promo Banner",
  quote: "Quote",
}

const DEFAULT_SECTIONS: SectionItem[] = [
  { type: "hero", enabled: true, title: "", description: "", sortOrder: 0, config: {} },
  { type: "categories", enabled: true, title: "Shop by Category", description: "", sortOrder: 10, config: { maxCategories: 8 } },
  { type: "sale_products", enabled: true, title: "Special Discount", description: "", sortOrder: 20, config: { maxProducts: 4 } },
  { type: "new_arrivals", enabled: true, title: "New Arrivals", description: "", sortOrder: 30, config: { maxProducts: 8 } },
  { type: "featured_products", enabled: true, title: "Doshok Picks", description: "Curated sets for daily elegance and effortless style.", sortOrder: 40, config: { maxProducts: 4 } },
  { type: "promo_banner", enabled: true, title: "", description: "", sortOrder: 50, config: {} },
  { type: "quote", enabled: true, title: "Style That Speaks", description: "", sortOrder: 60, config: {} },
]

export default function AdminHomepagePage() {
  const [heroTitle, setHeroTitle] = useState("")
  const [heroSubtitle, setHeroSubtitle] = useState("")
  const [heroImage, setHeroImage] = useState("")
  const [heroCTAText, setHeroCTAText] = useState("")
  const [heroCTASecondaryText, setHeroCTASecondaryText] = useState("")
  const [featuredIds, setFeaturedIds] = useState<string[]>([])
  const [announcementBarText, setAnnouncementBarText] = useState("")
  const [announcementBarEnabled, setAnnouncementBarEnabled] = useState(false)
  const [promoBannerText, setPromoBannerText] = useState("")
  const [promoBannerImage, setPromoBannerImage] = useState("")
  const [promoBannerLink, setPromoBannerLink] = useState("")
  const [promoBannerEnabled, setPromoBannerEnabled] = useState(false)
  const [products, setProducts] = useState<{ id: string; name: string; price: number; images?: string[]; imageUrl?: string }[]>([])
  const [selectedProductId, setSelectedProductId] = useState("")
  const [loading, setLoading] = useState(false)
  const [sections, setSections] = useState<SectionItem[]>(DEFAULT_SECTIONS)
  const [sectionsOpen, setSectionsOpen] = useState(false)

  useEffect(() => {
    fetch("/api/homepage")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data) {
          setHeroTitle(d.data.heroTitle ?? "")
          setHeroSubtitle(d.data.heroSubtitle ?? "")
          setHeroImage(d.data.heroImage ?? "")
          setHeroCTAText(d.data.heroCTAText ?? "")
          setHeroCTASecondaryText(d.data.heroCTASecondaryText ?? "")
          setAnnouncementBarText(d.data.announcementBarText ?? "")
          setAnnouncementBarEnabled(d.data.announcementBarEnabled ?? false)
          setPromoBannerText(d.data.promoBannerText ?? "")
          setPromoBannerImage(d.data.promoBannerImage ?? "")
          setPromoBannerLink(d.data.promoBannerLink ?? "")
          setPromoBannerEnabled(d.data.promoBannerEnabled ?? false)
          if (d.data.featuredIds) {
            try {
              const ids = typeof d.data.featuredIds === "string"
                ? JSON.parse(d.data.featuredIds)
                : d.data.featuredIds
              setFeaturedIds(Array.isArray(ids) ? ids : [])
            } catch {
              setFeaturedIds([])
            }
          }
          if (Array.isArray(d.data.sections) && d.data.sections.length > 0) {
            setSections(d.data.sections)
          }
        }
      })
      .catch(() => {})

    fetch("/api/products?selector=true&status=Active")
      .then((r) => r.json())
      .then((d) => {
        if (!d?.success) return
        const list = Array.isArray(d.data)
          ? d.data
          : Array.isArray(d.data?.products)
            ? d.data.products
            : []
        setProducts(list)
      })
      .catch(() => {})
  }, [])

  function addFeatured() {
    if (!selectedProductId || featuredIds.includes(selectedProductId)) return
    setFeaturedIds([...featuredIds, selectedProductId])
    setSelectedProductId("")
  }

  function removeFeatured(id: string) {
    setFeaturedIds(featuredIds.filter((fid) => fid !== id))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch("/api/homepage", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        heroTitle, heroSubtitle, heroImage,
        heroCTAText, heroCTASecondaryText,
        featuredIds,
        announcementBarText, announcementBarEnabled,
        promoBannerText, promoBannerImage, promoBannerLink, promoBannerEnabled,
        sections,
      }),
    })
    const data = await res.json()
    if (data.success) {
      toast.success("Homepage updated")
    } else {
      toast.error(data.error ?? "Failed to update")
    }
    setLoading(false)
  }

  function updateSection(index: number, field: string, value: unknown) {
    setSections((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  function updateSectionConfig(index: number, key: string, value: unknown) {
    setSections((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], config: { ...next[index].config, [key]: value } }
      return next
    })
  }

  const getProductImage = (product: typeof products[0] | undefined): string | null => {
    if (!product) return null
    if (Array.isArray(product.images) && product.images.length > 0 && typeof product.images[0] === "string") {
      return product.images[0]
    }
    if (typeof product.imageUrl === "string" && product.imageUrl) return product.imageUrl
    return null
  }

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="CMS"
        title="Homepage Settings"
        description="Control the storefront hero banner and featured product selection."
        backHref="/admin/cms"
      />

      <form onSubmit={handleSubmit}>
        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <div className="space-y-5">
            <AdminSectionCard
              title="Hero Banner"
              description="Controls the large banner at the top of your homepage. Title and subtitle appear as text overlay."
            >
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="heroTitle" className="text-xs font-medium text-slate-600">Hero Title</Label>
                    <Input id="heroTitle" value={heroTitle} onChange={(e) => setHeroTitle(e.target.value)} placeholder="Fashion with&#10;Purpose." className="text-xs h-9" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="heroSubtitle" className="text-xs font-medium text-slate-600">Hero Subtitle</Label>
                    <Input id="heroSubtitle" value={heroSubtitle} onChange={(e) => setHeroSubtitle(e.target.value)} placeholder="Premium quality at the best price" className="text-xs h-9" />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="heroCTAText" className="text-xs font-medium text-slate-600">Primary CTA Button</Label>
                    <Input id="heroCTAText" value={heroCTAText} onChange={(e) => setHeroCTAText(e.target.value)} placeholder="Shop Collection" className="text-xs h-9" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="heroCTASecondaryText" className="text-xs font-medium text-slate-600">Secondary CTA Button</Label>
                    <Input id="heroCTASecondaryText" value={heroCTASecondaryText} onChange={(e) => setHeroCTASecondaryText(e.target.value)} placeholder="About Us" className="text-xs h-9" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs font-medium text-slate-600">Hero Background Image</Label>
                    <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">Renders on storefront</span>
                  </div>
                  <p className="text-[11px] text-slate-400">Shown as the background of the hero section. Recommended: 1600×800px or larger.</p>
                  <ImageUploader
                    images={heroImage ? [heroImage] : []}
                    onChange={(imgs) => setHeroImage(imgs[0] || "")}
                    single
                    label=""
                    helperText=""
                    folder="homepage"
                  />
                </div>
              </div>
            </AdminSectionCard>

            <AdminSectionCard
              title="Announcement Bar"
              description="A thin bar at the top of every storefront page. Best for urgent offers or short messages."
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-xs font-medium text-slate-700">Enable Announcement Bar</Label>
                    <p className="text-[11px] text-slate-400">Shown at the top of every page on the storefront.</p>
                  </div>
                  <Switch checked={announcementBarEnabled} onCheckedChange={(v) => setAnnouncementBarEnabled(v)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600">Announcement Text</Label>
                  <Input
                    value={announcementBarText}
                    onChange={(e) => setAnnouncementBarText(e.target.value)}
                    placeholder="e.g. Free delivery inside Chattogram on orders over ৳999"
                    disabled={!announcementBarEnabled}
                    className={cn("text-xs h-9", !announcementBarEnabled && "opacity-50")}
                  />
                </div>
              </div>
            </AdminSectionCard>

            <AdminSectionCard
              title="Promo Banner"
              description="An optional promotional banner shown below the hero section on the homepage."
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-xs font-medium text-slate-700">Enable Promo Banner</Label>
                    <p className="text-[11px] text-slate-400">Appears below the hero banner on the homepage only.</p>
                  </div>
                  <Switch checked={promoBannerEnabled} onCheckedChange={(v) => setPromoBannerEnabled(v)} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-600">Promo Text</Label>
                    <Input
                      value={promoBannerText}
                      onChange={(e) => setPromoBannerText(e.target.value)}
                      placeholder="e.g. Summer Sale — Up to 40% off"
                      disabled={!promoBannerEnabled}
                      className={cn("text-xs h-9", !promoBannerEnabled && "opacity-50")}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-600">Link</Label>
                    <Input
                      value={promoBannerLink}
                      onChange={(e) => setPromoBannerLink(e.target.value)}
                      placeholder="/products or https://..."
                      disabled={!promoBannerEnabled}
                      className={cn("text-xs h-9", !promoBannerEnabled && "opacity-50")}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600">Banner Image</Label>
                  <ImageUploader
                    images={promoBannerImage ? [promoBannerImage] : []}
                    onChange={(imgs) => setPromoBannerImage(imgs[0] || "")}
                    single
                    label=""
                    helperText=""
                    folder="promo"
                  />
                </div>
              </div>
            </AdminSectionCard>

            <AdminSectionCard
              title="Featured Products"
              description="Products shown in the featured section below the hero. Select up to 8 products."
            >
              <div className="space-y-4">
                <div className="flex items-end gap-2">
                  <div className="space-y-1 flex-1">
                    <Label htmlFor="featuredProduct" className="text-xs font-medium text-slate-600">Add a product</Label>
                    <Select value={selectedProductId} onValueChange={(v) => v && setSelectedProductId(v)}>
                      <SelectTrigger id="featuredProduct" className="text-xs h-9">
                        <SelectValue placeholder="Choose a product to feature" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((p) => (
                          <SelectItem key={p.id} value={p.id} className="text-xs">
                            {p.name} — ৳{(typeof p.price === "number" ? p.price : 0).toLocaleString()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addFeatured}
                    disabled={!selectedProductId || featuredIds.includes(selectedProductId)}
                    className="h-9 rounded-lg text-xs font-semibold shrink-0"
                  >
                    Add
                  </Button>
                </div>

                {featuredIds.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/40 p-5 text-center">
                    <p className="text-xs text-slate-500">No featured products yet. Add products above to feature them on the homepage.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-[11px] text-slate-400 font-medium">{featuredIds.length} of 8 products selected</p>
                    {featuredIds.map((id) => {
                      const product = products.find((p) => p.id === id)
                      return (
                        <div
                          key={id}
                          className={cn(
                            "flex items-center gap-3 rounded-lg border px-3 py-2.5 text-xs",
                            !product
                              ? "border-red-200 bg-red-50"
                              : "border-slate-200 bg-white"
                          )}
                        >
                          {(() => {
                              const img = getProductImage(product)
                              return img ? (
                                <img src={img} alt="" className="h-8 w-8 rounded-md object-cover shrink-0" />
                              ) : (
                                <div className="h-8 w-8 rounded-md bg-slate-100 flex items-center justify-center shrink-0">
                                  <ImageIcon className="h-3.5 w-3.5 text-slate-300" />
                                </div>
                              )
                            })()}
                          <div className="flex-1 min-w-0">
                            <p className={cn("font-medium truncate", !product ? "text-slate-400 italic" : "text-slate-700")}>
                              {product ? product.name : "Product not found (may have been deleted)"}
                            </p>
                            {product && (
                              <p className="text-[11px] text-slate-400">৳{(typeof product.price === "number" ? product.price : 0).toLocaleString()}</p>
                            )}
                          </div>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 shrink-0 text-slate-400 hover:text-red-500"
                            onClick={() => removeFeatured(id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </AdminSectionCard>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-slate-800">Homepage Sections</CardTitle>
                <p className="text-xs text-slate-500">Enable, reorder, and customize each section on the storefront homepage.</p>
              </CardHeader>
              <CardContent className="space-y-4">
                {sections.map((section, index) => (
                  <div key={section.type} className="rounded-lg border border-slate-200 bg-white p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider min-w-[120px]">
                          {SECTION_LABELS[section.type] ?? section.type}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">#{section.sortOrder}</span>
                      </div>
                      <Switch
                        checked={section.enabled}
                        onCheckedChange={(v) => updateSection(index, "enabled", v)}
                      />
                    </div>
                    {section.enabled && (
                      <div className="space-y-2.5">
                        <div className="grid gap-2 sm:grid-cols-3">
                          <div className="space-y-1">
                            <Label className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Title</Label>
                            <Input
                              value={section.title}
                              onChange={(e) => updateSection(index, "title", e.target.value)}
                              placeholder={SECTION_LABELS[section.type]}
                              className="text-xs h-8"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Description</Label>
                            <Input
                              value={section.description}
                              onChange={(e) => updateSection(index, "description", e.target.value)}
                              placeholder="Section description"
                              className="text-xs h-8"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Sort Order</Label>
                            <Input
                              type="number"
                              value={section.sortOrder}
                              onChange={(e) => updateSection(index, "sortOrder", parseInt(e.target.value) || 0)}
                              className="text-xs h-8"
                            />
                          </div>
                        </div>
                        {(section.type === "categories") && (
                          <div className="space-y-1">
                            <Label className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Max Categories</Label>
                            <Input
                              type="number"
                              value={(section.config.maxCategories as number) ?? 8}
                              onChange={(e) => updateSectionConfig(index, "maxCategories", parseInt(e.target.value) || 8)}
                              className="text-xs h-8 w-24"
                            />
                          </div>
                        )}
                        {(["sale_products", "new_arrivals", "featured_products", "best_sellers"] as const).includes(section.type as "sale_products") && (
                          <div className="space-y-1">
                            <Label className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Max Products</Label>
                            <Input
                              type="number"
                              value={(section.config.maxProducts as number) ?? 8}
                              onChange={(e) => updateSectionConfig(index, "maxProducts", parseInt(e.target.value) || 8)}
                              className="text-xs h-8 w-24"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-xl border border-slate-200/60 bg-white p-4 shadow-sm">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Summary</h3>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Hero Title</span>
                  <span className={cn("font-medium text-right max-w-[140px] truncate", !heroTitle ? "text-slate-300" : "text-slate-700")}>
                    {heroTitle || "Not set"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Hero Subtitle</span>
                  <span className={cn("font-medium text-right max-w-[140px] truncate", !heroSubtitle ? "text-slate-300" : "text-slate-700")}>
                    {heroSubtitle || "Not set"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Hero Image</span>
                  <span className={cn("font-medium", !heroImage ? "text-slate-300" : "text-emerald-600")}>
                    {heroImage ? "Set" : "Not set"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Featured</span>
                  <span className={cn("font-semibold tabular-nums", featuredIds.length > 0 ? "text-slate-800" : "text-slate-400")}>
                    {featuredIds.length} product{featuredIds.length !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200/60 bg-white p-4 shadow-sm">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Storefront Preview</h3>
              <div className="space-y-2 text-[11px] text-slate-500">
                <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                  <p className="font-semibold text-slate-700 mb-1">Hero Banner</p>
                  <p>Top of homepage. Shows title, subtitle, and background image as overlay.</p>
                </div>
                <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                  <p className="font-semibold text-slate-700 mb-1">Featured Products</p>
                  <p>Below hero. Shows selected products in a grid or carousel.</p>
                </div>
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full h-9 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white">
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
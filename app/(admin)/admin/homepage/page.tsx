"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { X } from "lucide-react"
import { AdminPageHeader, AdminSectionCard } from "@/components/admin/admin-ui"
import { ImageUploader } from "@/components/admin/image-uploader"

export default function AdminHomepagePage() {
  const [heroTitle, setHeroTitle] = useState("")
  const [heroSubtitle, setHeroSubtitle] = useState("")
  const [heroImage, setHeroImage] = useState("")
  const [featuredIds, setFeaturedIds] = useState<string[]>([])
  const [products, setProducts] = useState<{ id: string; name: string; price: number }[]>([])
  const [selectedProductId, setSelectedProductId] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch("/api/homepage")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data) {
          setHeroTitle(d.data.heroTitle ?? "")
          setHeroSubtitle(d.data.heroSubtitle ?? "")
          setHeroImage(d.data.heroImage ?? "")
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
        }
      })
      .catch(() => {})

    fetch("/api/products")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setProducts(d.data)
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
      body: JSON.stringify({ heroTitle, heroSubtitle, heroImage, featuredIds }),
    })
    const data = await res.json()
    if (data.success) {
      toast.success("Homepage updated")
    } else {
      toast.error(data.error ?? "Failed to update")
    }
    setLoading(false)
  }

  return (
    <div className="max-w-4xl space-y-6">
      <AdminPageHeader eyebrow="CMS" title="Homepage Settings" description="Control the storefront hero banner and curated featured product selection." backHref="/admin/cms" />

      <form onSubmit={handleSubmit} className="space-y-6">
        <AdminSectionCard title="Hero Banner" description="Set the campaign copy and background image that greet customers on the homepage.">
            <div className="space-y-2">
              <Label htmlFor="heroTitle">Hero title</Label>
              <Input
                id="heroTitle"
                value={heroTitle}
                onChange={(e) => setHeroTitle(e.target.value)}
                placeholder="Summer Collection 2024"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="heroSubtitle">Hero subtitle</Label>
              <Textarea
                id="heroSubtitle"
                value={heroSubtitle}
                onChange={(e) => setHeroSubtitle(e.target.value)}
                rows={2}
                placeholder="Premium quality at the best price"
              />
            </div>
            <div className="space-y-2">
              <ImageUploader
                images={heroImage ? [heroImage] : []}
                onChange={(imgs) => setHeroImage(imgs[0] || "")}
                single
                label="Homepage hero image"
                helperText="Upload the hero banner image for the homepage."
                folder="homepage"
              />
            </div>
        </AdminSectionCard>

        <AdminSectionCard title="Featured Products" description="Curate the products shown in Doshok Picks and featured homepage sections.">
            <div className="flex items-end gap-2">
              <div className="space-y-1 flex-1">
                <Label htmlFor="featuredProduct">Add product</Label>
                <Select value={selectedProductId} onValueChange={(v) => v && setSelectedProductId(v)}>
                  <SelectTrigger id="featuredProduct">
                    <SelectValue placeholder="Choose a featured product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} — ৳{p.price.toLocaleString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="button" variant="outline" onClick={addFeatured} disabled={!selectedProductId}>
                Add
              </Button>
            </div>
            {featuredIds.length > 0 && (
              <div className="space-y-2">
                {featuredIds.map((id) => {
                  const product = products.find((p) => p.id === id)
                  return (
                    <div key={id} className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm ${!product ? 'border-red-200 bg-red-50' : ''}`}>
                      <span className={!product ? 'text-muted-foreground italic' : ''}>
                        {product ? `${product.name} — ৳${product.price.toLocaleString()}` : 'Product not found (may have been deleted)'}
                      </span>
                      <Button type="button" size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeFeatured(id)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}
        </AdminSectionCard>

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={loading} className="h-11 rounded-full px-8">
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  )
}

"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { AdminPageHeader } from "@/components/admin/admin-ui"

type VariantInput = {
  size: string
  color: string
  colorHex: string
  stock: number
  sku: string
}

export default function EditProductPage() {
  const router = useRouter()
  const params = useParams()
  const productId = params.id as string
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
  const [variants, setVariants] = useState<VariantInput[]>([])
  const [pageType, setPageType] = useState("NORMAL")
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    price: "",
    oldPrice: "",
    images: "",
    categoryId: "",
    featured: false,
    published: true,
    landingHeadline: "",
    landingSubheadline: "",
    landingCopy: "",
    landingHeroImage: "",
    defaultCouponCode: "",
  })

  useEffect(() => {
    Promise.all([
      fetch("/api/categories").then((r) => r.json()),
      fetch(`/api/products/${productId}`).then((r) => r.json()),
    ]).then(([catData, prodData]) => {
      if (catData.success) setCategories(catData.data)
      if (prodData.success) {
        const p = prodData.data
        setFormData({
          name: p.name ?? "",
          slug: p.slug ?? "",
          description: p.description ?? "",
          price: p.price?.toString() ?? "",
          oldPrice: p.oldPrice?.toString() ?? "",
          images: (p.images ?? []).join("\n"),
          categoryId: p.categoryId ?? "",
          featured: p.featured ?? false,
          published: p.published ?? true,
          landingHeadline: p.landingHeadline ?? "",
          landingSubheadline: p.landingSubheadline ?? "",
          landingCopy: p.landingCopy ?? "",
          landingHeroImage: p.landingHeroImage ?? "",
          defaultCouponCode: p.defaultCouponCode ?? "",
        })
        setPageType(p.pageType ?? "NORMAL")
        setVariants(
          (p.variants ?? []).map((v: VariantInput & { id: string }) => ({
            size: v.size,
            color: v.color,
            colorHex: v.colorHex ?? "",
            stock: v.stock,
            sku: v.sku ?? "",
          }))
        )
      }
      setFetching(false)
    }).catch(() => setFetching(false))
  }, [productId])

  function addVariant() {
    setVariants([...variants, { size: "", color: "", colorHex: "", stock: 0, sku: "" }])
  }

  function updateVariant(i: number, field: keyof VariantInput, value: string | number) {
    const next = [...variants]
    next[i] = { ...next[i], [field]: value }
    setVariants(next)
  }

  function removeVariant(i: number) {
    setVariants(variants.filter((_, idx) => idx !== i))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const body: Record<string, unknown> = {
      name: formData.name,
      slug: formData.slug,
      description: formData.description || undefined,
      price: Number(formData.price),
      oldPrice: formData.oldPrice ? Number(formData.oldPrice) : undefined,
      images: formData.images.split("\n").map((s) => s.trim()).filter(Boolean),
      categoryId: formData.categoryId,
      featured: formData.featured,
      published: formData.published,
      pageType,
      defaultCouponCode: formData.defaultCouponCode?.toUpperCase() || undefined,
      variants: variants.filter((v) => v.size && v.color),
    }

    if (pageType === "LANDING") {
      body.landingHeadline = formData.landingHeadline || undefined
      body.landingSubheadline = formData.landingSubheadline || undefined
      body.landingCopy = formData.landingCopy || undefined
      body.landingHeroImage = formData.landingHeroImage || undefined
    }

    const res = await fetch(`/api/products/${productId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    const data = await res.json()
    if (data.success) {
      toast.success("Product updated")
      router.refresh()
    } else {
      toast.error(data.error ?? "Failed to update product")
    }
    setLoading(false)
  }

  if (fetching) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl space-y-6">
      <AdminPageHeader eyebrow="Commerce" title="Edit Product" description="Update catalog details, stock variants, and optional landing-page campaign content." />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Tabs defaultValue="general">
          <TabsList className="rounded-full bg-white p-1 shadow-sm">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="variants">Variants</TabsTrigger>
            {pageType === "LANDING" && <TabsTrigger value="landing">Landing</TabsTrigger>}
          </TabsList>

          <TabsContent value="general" className="space-y-6 mt-4">
            <Card className="rounded-[1.5rem] border-black/5 shadow-sm">
              <CardContent className="pt-6 space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name <span className="text-muted-foreground">*</span></Label>
                    <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Premium Cotton Panjabi" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="slug">Slug <span className="text-muted-foreground">*</span></Label>
                    <Input id="slug" value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} placeholder="e.g. premium-cotton-panjabi" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" rows={4} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Write the product description customers will see on the storefront." />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="price">Price (BDT) <span className="text-muted-foreground">*</span></Label>
                    <Input id="price" type="number" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} placeholder="e.g. 2490" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="oldPrice">Compare price (BDT) <span className="text-muted-foreground">(optional)</span></Label>
                    <Input id="oldPrice" type="number" value={formData.oldPrice} onChange={(e) => setFormData({ ...formData, oldPrice: e.target.value })} placeholder="e.g. 2990" />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="categoryId">Category <span className="text-muted-foreground">*</span></Label>
                    <Select value={formData.categoryId} onValueChange={(v) => v && setFormData({ ...formData, categoryId: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pageType">Page type</Label>
                    <Select value={pageType} onValueChange={(v) => v && setPageType(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NORMAL">Normal</SelectItem>
                        <SelectItem value="LANDING">Landing</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="images">Image URLs <span className="text-muted-foreground">(one per line)</span></Label>
                  <Textarea id="images" rows={3} value={formData.images} onChange={(e) => setFormData({ ...formData, images: e.target.value })} placeholder="Paste Cloudinary image URL" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="defaultCouponCode">Default coupon code <span className="text-muted-foreground">(optional)</span></Label>
                  <Input id="defaultCouponCode" value={formData.defaultCouponCode} onChange={(e) => setFormData({ ...formData, defaultCouponCode: e.target.value })} placeholder="WELCOME10" className="uppercase" />
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Switch id="featured" checked={formData.featured} onCheckedChange={(v) => setFormData({ ...formData, featured: v })} />
                    <Label htmlFor="featured">Featured</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch id="published" checked={formData.published} onCheckedChange={(v) => setFormData({ ...formData, published: v })} />
                    <Label htmlFor="published">Active</Label>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="variants" className="space-y-4 mt-4">
            <Card className="rounded-[1.5rem] border-black/5 shadow-sm">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-black">Size / Color / Stock</h2>
                    <p className="text-sm text-muted-foreground">Each variant controls what customers can buy at checkout. Add all size and color combinations.</p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addVariant}>
                    Add variant
                  </Button>
                </div>
                {variants.length === 0 && (
                  <p className="text-sm text-muted-foreground">No variants yet. Add one to manage inventory.</p>
                )}
                {variants.map((v, i) => (
                  <div key={i} className="grid gap-3 rounded-2xl border p-3 md:grid-cols-[90px_1fr_100px_100px_auto] md:items-end">
                    <div className="space-y-1">
                      <Label className="text-xs">Size</Label>
                      <Input value={v.size} onChange={(e) => updateVariant(i, "size", e.target.value)} className="w-20 h-8" placeholder="M" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Color</Label>
                      <Input value={v.color} onChange={(e) => updateVariant(i, "color", e.target.value)} className="w-24 h-8" placeholder="Black" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Hex <span className="text-muted-foreground">(opt.)</span></Label>
                      <Input value={v.colorHex} onChange={(e) => updateVariant(i, "colorHex", e.target.value)} className="w-20 h-8" placeholder="#000000" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Stock</Label>
                      <Input type="number" value={v.stock} onChange={(e) => updateVariant(i, "stock", parseInt(e.target.value) || 0)} className="w-20 h-8" />
                    </div>
                    <Button type="button" variant="ghost" size="sm" className="h-8 text-destructive" onClick={() => removeVariant(i)}>Remove</Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {pageType === "LANDING" && (
            <TabsContent value="landing" className="space-y-4 mt-4">
              <Card className="rounded-[1.5rem] border-black/5 shadow-sm">
                <CardContent className="pt-6 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="landingHeadline">Landing headline</Label>
                    <Input id="landingHeadline" value={formData.landingHeadline} onChange={(e) => setFormData({ ...formData, landingHeadline: e.target.value })} placeholder="Limited Edition Drop" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="landingSubheadline">Landing subheadline</Label>
                    <Input id="landingSubheadline" value={formData.landingSubheadline} onChange={(e) => setFormData({ ...formData, landingSubheadline: e.target.value })} placeholder="Crafted for the season" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="landingCopy">Landing copy</Label>
                    <Textarea id="landingCopy" rows={4} value={formData.landingCopy} onChange={(e) => setFormData({ ...formData, landingCopy: e.target.value })} placeholder="Write the campaign copy customers will see on the landing page." />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="landingHeroImage">Landing hero image URL</Label>
                    <Input id="landingHeroImage" value={formData.landingHeroImage} onChange={(e) => setFormData({ ...formData, landingHeroImage: e.target.value })} placeholder="Paste Cloudinary image URL" />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>

        <div className="flex gap-4">
          <Button type="submit" disabled={loading} className="h-11 rounded-full px-8">
            {loading ? "Saving..." : "Save Changes"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push("/admin/products")} className="h-11 rounded-full px-6">
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}

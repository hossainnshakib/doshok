"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
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

export default function NewProductPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
  const [variants, setVariants] = useState<VariantInput[]>([])
  const [pageType, setPageType] = useState("NORMAL")

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => { if (d.success) setCategories(d.data) })
      .catch(() => {})
  }, [])

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

    const formData = new FormData(e.currentTarget)
    const imagesStr = (formData.get("images") as string) || ""

    const body: Record<string, unknown> = {
      name: formData.get("name"),
      slug: formData.get("slug"),
      description: formData.get("description") || undefined,
      price: Number(formData.get("price")),
      oldPrice: formData.get("oldPrice") ? Number(formData.get("oldPrice")) : undefined,
      images: imagesStr.split("\n").map((s) => s.trim()).filter(Boolean),
      categoryId: formData.get("categoryId"),
      featured: formData.get("featured") === "on",
      published: formData.get("published") === "on",
      pageType,
      defaultCouponCode: (formData.get("defaultCouponCode") as string)?.toUpperCase() || undefined,
      variants: variants.filter((v) => v.size && v.color),
    }

    if (pageType === "LANDING") {
      body.landingHeadline = formData.get("landingHeadline") || undefined
      body.landingSubheadline = formData.get("landingSubheadline") || undefined
      body.landingCopy = formData.get("landingCopy") || undefined
      body.landingHeroImage = formData.get("landingHeroImage") || undefined
    }

    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    const data = await res.json()
    if (data.success) {
      toast.success("Product created")
      router.push("/admin/products")
      router.refresh()
    } else {
      toast.error(data.error ?? "Failed to create product")
    }
    setLoading(false)
  }

  return (
    <div className="max-w-5xl space-y-6">
      <AdminPageHeader eyebrow="Commerce" title="New Product" description="Add a catalog item with pricing, variants, images, and optional landing-page campaign copy." />

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
                    <Input id="name" name="name" placeholder="e.g. Premium Cotton Panjabi" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="slug">Slug <span className="text-muted-foreground">*</span></Label>
                    <Input id="slug" name="slug" placeholder="e.g. premium-cotton-panjabi" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" name="description" rows={4} placeholder="Write the product description customers will see on the storefront." />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="price">Price (BDT) <span className="text-muted-foreground">*</span></Label>
                    <Input id="price" name="price" type="number" placeholder="e.g. 2490" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="oldPrice">Compare price (BDT) <span className="text-muted-foreground">(optional)</span></Label>
                    <Input id="oldPrice" name="oldPrice" type="number" placeholder="e.g. 2990" />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="categoryId">Category <span className="text-muted-foreground">*</span></Label>
                    <Select name="categoryId" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a category" />
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
                    <Select value={pageType} onValueChange={(v) => v && setPageType(v)} name="pageType">
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
                  <Textarea id="images" name="images" rows={3} placeholder="Paste Cloudinary image URL" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="defaultCouponCode">Default coupon code <span className="text-muted-foreground">(optional)</span></Label>
                  <Input id="defaultCouponCode" name="defaultCouponCode" placeholder="WELCOME10" className="uppercase" />
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Switch id="featured" name="featured" />
                    <Label htmlFor="featured">Featured</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch id="published" name="published" defaultChecked />
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
                      <Input
                        value={v.size}
                        onChange={(e) => updateVariant(i, "size", e.target.value)}
                        className="w-20 h-8"
                        placeholder="M"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Color</Label>
                      <Input
                        value={v.color}
                        onChange={(e) => updateVariant(i, "color", e.target.value)}
                        className="w-24 h-8"
                        placeholder="Black"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Hex <span className="text-muted-foreground">(opt.)</span></Label>
                      <Input
                        value={v.colorHex}
                        onChange={(e) => updateVariant(i, "colorHex", e.target.value)}
                        className="w-20 h-8"
                        placeholder="#000000"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Stock</Label>
                      <Input
                        type="number"
                        value={v.stock}
                        onChange={(e) => updateVariant(i, "stock", parseInt(e.target.value) || 0)}
                        className="w-20 h-8"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 text-destructive"
                      onClick={() => removeVariant(i)}
                    >
                      Remove
                    </Button>
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
                    <Input id="landingHeadline" name="landingHeadline" placeholder="Limited Edition Drop" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="landingSubheadline">Landing subheadline</Label>
                    <Input id="landingSubheadline" name="landingSubheadline" placeholder="Crafted for the season" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="landingCopy">Landing copy</Label>
                    <Textarea id="landingCopy" name="landingCopy" rows={4} placeholder="Write the campaign copy customers will see on the landing page." />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="landingHeroImage">Landing hero image URL</Label>
                    <Input id="landingHeroImage" name="landingHeroImage" placeholder="Paste Cloudinary image URL" />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>

        <Button type="submit" disabled={loading} className="h-11 rounded-full px-8">
          {loading ? "Creating..." : "Create Product"}
        </Button>
      </form>
    </div>
  )
}

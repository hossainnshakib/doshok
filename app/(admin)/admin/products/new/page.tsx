"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { AdminPageHeader, AdminSectionCard, AdminStatusBadge } from "@/components/admin/admin-ui"
import { ImageUploader } from "@/components/admin/image-uploader"
import { AlertTriangle, Archive, EyeOff, Layers, Save, SendHorizonal } from "lucide-react"

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
  const [productImages, setProductImages] = useState<string[]>([])
  const [landingHeroImage, setLandingHeroImage] = useState("")
  const [slug, setSlug] = useState("")
  const [name, setName] = useState("")
  const [price, setPrice] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [status, setStatus] = useState("Draft")
  const [description, setDescription] = useState("")
  const [oldPrice, setOldPrice] = useState("")
  const [featured, setFeatured] = useState(false)
  const [defaultCouponCode, setDefaultCouponCode] = useState("")
  const [landingHeadline, setLandingHeadline] = useState("")
  const [landingSubheadline, setLandingSubheadline] = useState("")
  const [landingCopy, setLandingCopy] = useState("")

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => { if (d.success) setCategories(d.data) })
      .catch(() => {})
  }, [])

  const totalVariants = variants.filter((v) => v.size && v.color).length
  const totalStock = variants.reduce((s, v) => s + v.stock, 0)
  const lowStockVariants = variants.filter((v) => v.stock > 0 && v.stock <= 5).length
  const noImages = productImages.length === 0
  const noCategory = !categoryId
  const noVariants = totalVariants === 0

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

  async function handleSubmit(publishStatus: string) {
    setLoading(true)
    setStatus(publishStatus)

    const body: Record<string, unknown> = {
      name,
      slug,
      description: description || undefined,
      price: Number(price),
      oldPrice: oldPrice ? Number(oldPrice) : undefined,
      images: productImages,
      categoryId,
      featured,
      status: publishStatus,
      pageType,
      defaultCouponCode: defaultCouponCode?.toUpperCase() || undefined,
      variants: variants.filter((v) => v.size && v.color),
    }

    if (pageType === "LANDING") {
      body.landingHeadline = landingHeadline || undefined
      body.landingSubheadline = landingSubheadline || undefined
      body.landingCopy = landingCopy || undefined
      body.landingHeroImage = landingHeroImage || undefined
    }

    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    const data = await res.json()
    if (data.success) {
      toast.success(publishStatus === "Draft" ? "Product saved as draft" : publishStatus === "Active" ? "Product published" : `Product saved (${publishStatus})`)
      router.push("/admin/products")
      router.refresh()
    } else {
      toast.error(data.error ?? "Failed to create product")
    }
    setLoading(false)
  }

  return (
    <div className="max-w-6xl space-y-6">
      <AdminPageHeader eyebrow="Commerce" title="New Product" description="Add a catalog item with pricing, variants, and images." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px] lg:gap-8">
        <div className="space-y-6">
          <AdminSectionCard title="Basic Information">
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name" className="flex items-center gap-1">
                    Name <span className="text-red-500">*</span>
                  </Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Premium Cotton Panjabi" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug" className="flex items-center gap-1">
                    Slug <span className="text-red-500">*</span>
                    {slug && <span className="text-[10px] text-muted-foreground font-normal">/{slug}</span>}
                  </Label>
                  <Input id="slug" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="e.g. premium-cotton-panjabi" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Product description customers will see on the storefront." />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="categoryId" className="flex items-center gap-1">
                    Category <span className="text-red-500">*</span>
                  </Label>
                  <Select value={categoryId} onValueChange={(v) => v && setCategoryId(v)}>
                    <SelectTrigger className={noCategory ? "border-amber-300" : ""}>
                      <SelectValue placeholder="Choose a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {noCategory && <p className="text-xs text-amber-600 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Required</p>}
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
            </div>
          </AdminSectionCard>

          <AdminSectionCard title="Product Images">
            <div className="space-y-2">
              <ImageUploader
                images={productImages}
                onChange={setProductImages}
                label=""
                helperText="First image is the primary. Upload clear product photos. Drag to reorder."
                folder="products"
              />
              {noImages && <p className="text-xs text-amber-600 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> No images yet — add at least one</p>}
            </div>
          </AdminSectionCard>

          <AdminSectionCard title="Pricing">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="price" className="flex items-center gap-1">
                  Price (BDT) <span className="text-red-500">*</span>
                </Label>
                <Input id="price" type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="e.g. 2490" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="oldPrice">Compare price (BDT) <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Input id="oldPrice" type="number" value={oldPrice} onChange={(e) => setOldPrice(e.target.value)} placeholder="e.g. 2990" />
              </div>
            </div>
          </AdminSectionCard>

          <AdminSectionCard title="Variants">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Add size and color combinations with stock levels.</p>
                  {totalVariants > 0 && (
                    <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                      <span>{totalVariants} variant{totalVariants !== 1 ? "s" : ""}</span>
                      <span>· {totalStock} total stock</span>
                      {lowStockVariants > 0 && <span className="text-amber-600 font-medium">{lowStockVariants} low stock</span>}
                    </div>
                  )}
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addVariant} className="rounded-full">
                  Add variant
                </Button>
              </div>
              {variants.length === 0 && (
                <div className="rounded-xl border border-dashed border-black/10 bg-neutral-50 p-6 text-center">
                  <Layers className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No variants yet. Add one to manage inventory.</p>
                </div>
              )}
              {variants.map((v, i) => (
                <div key={i} className="grid gap-2 rounded-2xl border p-3 md:grid-cols-[1fr_1fr_100px_80px_1fr_auto] md:items-center">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Size</Label>
                    <Select value={v.size} onValueChange={(val) => val && updateVariant(i, "size", val)}>
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Size" />
                      </SelectTrigger>
                      <SelectContent>
                        {["XS", "S", "M", "L", "XL", "XXL", "3XL", "Free Size"].map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Color</Label>
                    <Select value={v.color} onValueChange={(val) => val && updateVariant(i, "color", val)}>
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Color" />
                      </SelectTrigger>
                      <SelectContent>
                        {["Black", "White", "Maroon", "Olive", "Navy", "Beige", "Pink", "Red", "Blue", "Green", "Grey", "Brown", "Cream", "Mustard", "Teal"].map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Hex</Label>
                    <div className="flex items-center gap-1.5">
                      {v.colorHex && /^#[0-9a-fA-F]{3,6}$/.test(v.colorHex) && (
                        <span className="h-5 w-5 shrink-0 rounded-full border" style={{ backgroundColor: v.colorHex }} />
                      )}
                      <Input value={v.colorHex} onChange={(e) => updateVariant(i, "colorHex", e.target.value)} className="h-8 font-mono text-xs" placeholder="#000" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Stock</Label>
                    <Input type="number" value={v.stock} onChange={(e) => updateVariant(i, "stock", parseInt(e.target.value) || 0)} className={`h-8 ${v.stock === 0 ? "text-muted-foreground" : ""}`} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">SKU</Label>
                    <Input value={v.sku} onChange={(e) => updateVariant(i, "sku", e.target.value)} className="h-8 text-xs" placeholder="(opt.)" />
                  </div>
                  <Button type="button" variant="ghost" size="sm" className="h-8 text-destructive mt-5" onClick={() => removeVariant(i)}>Remove</Button>
                </div>
              ))}
            </div>
          </AdminSectionCard>

          {pageType === "LANDING" && (
            <AdminSectionCard title="Landing Campaign">
              <div className="space-y-4">
                <div className="rounded-2xl border border-black/5 bg-neutral-50 p-4 text-sm text-muted-foreground">
                  <p className="font-bold text-neutral-950 mb-1">Recommended landing copy structure</p>
                  <p><strong>Headline</strong> — Single bold offer line.</p>
                  <p><strong>Subheadline</strong> — One-line value prop.</p>
                  <p><strong>Copy</strong> — 3–5 lines: what, why, benefits, CTA.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="landingHeadline">Landing headline</Label>
                  <Input id="landingHeadline" value={landingHeadline} onChange={(e) => setLandingHeadline(e.target.value)} placeholder="Limited Edition Drop" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="landingSubheadline">Landing subheadline</Label>
                  <Input id="landingSubheadline" value={landingSubheadline} onChange={(e) => setLandingSubheadline(e.target.value)} placeholder="Premium cotton, crafted for the season" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="landingCopy">Landing copy</Label>
                  <Textarea id="landingCopy" rows={4} value={landingCopy} onChange={(e) => setLandingCopy(e.target.value)} placeholder="What it is, why it matters, key benefits, and CTA." />
                </div>
                <div className="space-y-2">
                  <ImageUploader
                    images={landingHeroImage ? [landingHeroImage] : []}
                    onChange={(imgs) => setLandingHeroImage(imgs[0] || "")}
                    single
                    label="Landing hero image"
                    helperText="Upload a hero image for the landing page. Recommended size: 1200×800px."
                    folder="landing"
                  />
                </div>
              </div>
            </AdminSectionCard>
          )}

          <AdminSectionCard title="Publishing">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Control who can see this product on the storefront.</p>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
                  <span className="text-sm font-medium">Featured product</span>
                </label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="defaultCouponCode">Default coupon code <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Input id="defaultCouponCode" value={defaultCouponCode} onChange={(e) => setDefaultCouponCode(e.target.value)} placeholder="WELCOME10" className="uppercase max-w-xs" />
              </div>
            </div>
          </AdminSectionCard>
        </div>

        <div className="space-y-4">
          <div className="sticky top-6 space-y-4">
            <div className="rounded-[1.5rem] border border-black/5 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-black tracking-[-0.02em] mb-3">Product Summary</h3>
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name</span>
                  <span className="font-medium text-right max-w-[160px] truncate">{name || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Slug</span>
                  <span className="font-mono text-xs text-right max-w-[160px] truncate">{slug || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Category</span>
                  <span className="text-right max-w-[160px] truncate">{categories.find((c) => c.id === categoryId)?.name || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span><AdminStatusBadge status={status} /></span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Price</span>
                  <span className="font-medium tabular-nums">{price ? `৳${Number(price).toLocaleString()}` : "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Variants</span>
                  <span className="tabular-nums">{totalVariants || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Images</span>
                  <span className="tabular-nums">{productImages.length || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total stock</span>
                  <span className={`tabular-nums ${totalStock === 0 && totalVariants > 0 ? "text-amber-600" : ""}`}>{totalStock || "—"}</span>
                </div>
              </div>
            </div>

            {(noImages || noCategory || noVariants) && (
              <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-4 shadow-sm">
                <h3 className="text-xs font-black uppercase tracking-wider text-amber-800 mb-2">Missing</h3>
                <ul className="space-y-1.5">
                  {noImages && <li className="text-xs text-amber-700 flex items-center gap-1.5"><AlertTriangle className="h-3 w-3 shrink-0" /> No product images</li>}
                  {noCategory && <li className="text-xs text-amber-700 flex items-center gap-1.5"><AlertTriangle className="h-3 w-3 shrink-0" /> No category selected</li>}
                  {noVariants && <li className="text-xs text-amber-700 flex items-center gap-1.5"><AlertTriangle className="h-3 w-3 shrink-0" /> No variants added</li>}
                </ul>
              </div>
            )}

            <div className="rounded-[1.5rem] border border-black/5 bg-white p-4 shadow-sm">
              <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-3">Publish Actions</h3>
              <div className="space-y-2">
                <Button type="button" disabled={loading} onClick={() => handleSubmit("Draft")} variant="outline" className="w-full h-10 rounded-full justify-start gap-2">
                  <Save className="h-4 w-4" /> Save Draft
                </Button>
                <Button type="button" disabled={loading} onClick={() => handleSubmit("Active")} className="w-full h-10 rounded-full justify-start gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                  <SendHorizonal className="h-4 w-4" /> Publish
                </Button>
                <Button type="button" disabled={loading} onClick={() => handleSubmit("Hidden")} variant="secondary" className="w-full h-10 rounded-full justify-start gap-2">
                  <EyeOff className="h-4 w-4" /> Hide
                </Button>
                <Button type="button" disabled={loading} onClick={() => handleSubmit("Archived")} variant="outline" className="w-full h-10 rounded-full justify-start gap-2 text-muted-foreground">
                  <Archive className="h-4 w-4" /> Archive
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
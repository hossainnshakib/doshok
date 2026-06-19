"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { AdminSectionCard, AdminStatusBadge } from "@/components/admin/admin-ui"
import { ImageUploader } from "@/components/admin/image-uploader"
import { ProductRelationSelector } from "@/components/admin/product-relation-selector"
import { AlertTriangle, Archive, ChevronDown, ChevronRight, EyeOff, ExternalLink, Layers, Ruler, Save, SendHorizonal, Trash2 } from "lucide-react"
import { LOW_STOCK_THRESHOLD } from "@/types"
import { slugifyName } from "@/lib/slug"

type VariantInput = {
  size: string
  color: string
  colorHex: string
  stock: number
  sku: string
  lowStockThreshold: number
}

type SpecInput = {
  label: string
  value: string
}

type ProductFormProps = {
  mode: "create" | "edit"
  productId?: string
}

export function ProductForm({ mode, productId }: ProductFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(mode === "edit")
  const [categories, setCategories] = useState<{ id: string; name: string; parentId: string | null }[]>([])
  const [variants, setVariants] = useState<VariantInput[]>([])
  const [specifications, setSpecifications] = useState<SpecInput[]>([])
  const [productImages, setProductImages] = useState<string[]>([])
  const [slug, setSlug] = useState("")
  const [name, setName] = useState("")
  const [price, setPrice] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [status, setStatus] = useState("Draft")
  const [description, setDescription] = useState("")
  const [shortDescription, setShortDescription] = useState("")
  const [oldPrice, setOldPrice] = useState("")
  const [featured, setFeatured] = useState(false)
  const [defaultCouponCode, setDefaultCouponCode] = useState("")
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
  const [material, setMaterial] = useState("")
  const [careInstructions, setCareInstructions] = useState("")
  const [seoTitle, setSeoTitle] = useState("")
  const [seoDescription, setSeoDescription] = useState("")
  const [seoKeywords, setSeoKeywords] = useState("")
  const [seoImage, setSeoImage] = useState("")
  const [sizeChartIds, setSizeChartIds] = useState<string[]>([])
  const [allSizeCharts, setAllSizeCharts] = useState<{ id: string; name: string }[]>([])
  const [chartSearch, setChartSearch] = useState("")
  const [relatedProductIds, setRelatedProductIds] = useState<string[]>([])
  const [crossSellProductIds, setCrossSellProductIds] = useState<string[]>([])
  const [upsellProductIds, setUpsellProductIds] = useState<string[]>([])
  const [showAdvanced, setShowAdvanced] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const [catRes, chartRes] = await Promise.all([
          fetch("/api/categories").then((r) => r.json()),
          fetch("/api/size-charts").then((r) => r.json()),
        ])
        if (catRes.success) setCategories(catRes.data)
        if (chartRes.success) setAllSizeCharts(chartRes.data.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })))
      } catch {}
    }
    load()
  }, [])

  useEffect(() => {
    if (mode === "edit" && productId) {
      fetch(`/api/products/${productId}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.success) {
            const p = d.data
            setName(p.name ?? "")
            setSlug(p.slug ?? "")
            setDescription(p.description ?? "")
            setShortDescription(p.shortDescription ?? "")
            setPrice(p.price?.toString() ?? "")
            setOldPrice(p.oldPrice?.toString() ?? "")
            setCategoryId(p.categoryId ?? "")
            setFeatured(p.featured ?? false)
            setStatus(p.status ?? "Draft")
            setProductImages(p.images ?? [])
            setDefaultCouponCode(p.defaultCouponCode ?? "")
            setMaterial(p.material ?? "")
            setCareInstructions(p.careInstructions ?? "")
            setSeoTitle(p.seoTitle ?? "")
            setSeoDescription(p.seoDescription ?? "")
            setSeoKeywords(p.seoKeywords ?? "")
            setSeoImage(p.seoImage ?? "")
            setSpecifications((p.specifications ?? []).map((s: SpecInput) => ({ label: s.label, value: s.value })))
            setVariants(
              (p.variants ?? []).map((v: VariantInput & { id: string }) => ({
                size: v.size,
                color: v.color,
                colorHex: v.colorHex ?? "",
                stock: v.stock,
                sku: v.sku ?? "",
                lowStockThreshold: v.lowStockThreshold ?? 5,
              }))
            )
            setSizeChartIds((p.sizeCharts ?? []).map((sc: { sizeChart: { id: string } }) => sc.sizeChart.id))
            setRelatedProductIds((p.relations?.RELATED ?? []).map((r: { id: string }) => r.id))
            setCrossSellProductIds((p.relations?.CROSS_SELL ?? []).map((r: { id: string }) => r.id))
            setUpsellProductIds((p.relations?.UPSELL ?? []).map((r: { id: string }) => r.id))
          }
          setFetching(false)
        })
        .catch(() => setFetching(false))
    }
  }, [mode, productId])

  const totalVariants = variants.filter((v) => v.size && v.color).length
  const totalStock = variants.reduce((s, v) => s + v.stock, 0)
  const lowStockVariants = variants.filter((v) => v.stock > 0 && v.stock <= LOW_STOCK_THRESHOLD).length
  const outOfStockVariants = variants.filter((v) => v.stock === 0 && v.size && v.color).length
  const noImages = productImages.length === 0
  const noCategory = !categoryId
  const noVariants = totalVariants === 0

  const mainCategories = categories.filter((c) => !c.parentId)
  const subCategories = categories.filter((c) => c.parentId === categoryId)

  function addVariant() {
    setVariants([...variants, { size: "", color: "", colorHex: "", stock: 0, sku: "", lowStockThreshold: 5 }])
  }

  function addSpec() {
    setSpecifications([...specifications, { label: "", value: "" }])
  }

  function updateSpec(i: number, field: keyof SpecInput, value: string) {
    const next = [...specifications]
    next[i] = { ...next[i], [field]: value }
    setSpecifications(next)
  }

  function removeSpec(i: number) {
    setSpecifications(specifications.filter((_, idx) => idx !== i))
  }

  function handleNameChange(value: string) {
    setName(value)
    if (!slugManuallyEdited && value.trim()) {
      setSlug(slugifyName(value))
    }
  }

  function handleSlugChange(value: string) {
    setSlug(value)
    setSlugManuallyEdited(true)
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

    const currentPrice = Number(price)
    const comparePrice = oldPrice ? Number(oldPrice) : null
    if (comparePrice !== null && comparePrice <= currentPrice) {
      toast.error("Compare price must be greater than the current price")
      setLoading(false)
      return
    }

    const body: Record<string, unknown> = {
      name,
      slug,
      description: description || undefined,
      shortDescription: shortDescription || undefined,
      price: Number(price),
      oldPrice: oldPrice ? Number(oldPrice) : undefined,
      images: productImages,
      categoryId,
      featured,
      status: publishStatus,
      defaultCouponCode: defaultCouponCode?.toUpperCase() || undefined,
      variants: variants.filter((v) => v.size && v.color),
      material: material || undefined,
      careInstructions: careInstructions || undefined,
      seoTitle: seoTitle || undefined,
      seoDescription: seoDescription || undefined,
      seoKeywords: seoKeywords || undefined,
      seoImage: seoImage || undefined,
      specifications: specifications.filter((s) => s.label && s.value),
      sizeChartIds,
      relatedProductIds,
      crossSellProductIds,
      upsellProductIds,
    }

    const url = mode === "create" ? "/api/products" : `/api/products/${productId}`
    const method = mode === "create" ? "POST" : "PATCH"

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    const data = await res.json()
    if (data.success) {
      toast.success(
        publishStatus === "Draft" ? "Product saved as draft"
        : publishStatus === "Active" ? "Product published"
        : `Product saved (${publishStatus})`
      )
      if (mode === "create") {
        router.push("/admin/products")
      } else {
        setStatus(publishStatus)
      }
      router.refresh()
    } else {
      toast.error(data.error ?? `Failed to ${mode === "create" ? "create" : "update"} product`)
    }
    setLoading(false)
  }

  if (fetching) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-slate-400">Loading...</p>
      </div>
    )
  }

  const previewUrl = `/products/${slug}?preview=1`

  return (
    <div className="max-w-6xl space-y-5">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_300px] lg:gap-6">
        {/* LEFT COLUMN */}
        <div className="space-y-4">

          {/* 1. Basic Information */}
          <AdminSectionCard title="Basic Information">
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Name <span className="text-red-500">*</span></Label>
                  <Input id="name" value={name} onChange={(e) => handleNameChange(e.target.value)} placeholder="e.g. Premium Cotton Panjabi" className="h-8 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="slug">Slug <span className="text-red-500">*</span> {slug && <span className="text-slate-400 font-normal text-[10px]">/{slug}</span>}</Label>
                  <Input id="slug" value={slug} onChange={(e) => handleSlugChange(e.target.value)} placeholder="e.g. premium-cotton-panjabi" className="h-8 text-sm" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Product description shown on the storefront." className="text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="shortDescription">Short Description</Label>
                <Textarea id="shortDescription" rows={1} value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} placeholder="Brief summary shown near product title." className="text-sm" />
              </div>
            </div>
          </AdminSectionCard>

          {/* 2. Product Media */}
          <AdminSectionCard title="Product Media">
            <div className="space-y-2">
              <ImageUploader
                images={productImages}
                onChange={setProductImages}
                label=""
                helperText="First image is the primary. Upload clear product photos."
                folder="products"
              />
              {noImages && <p className="text-[11px] text-amber-500 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> No images yet</p>}
            </div>
          </AdminSectionCard>

          {/* 3. Inventory */}
          <AdminSectionCard title="Inventory">
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Total Stock</p>
                  <p className={`mt-1 text-lg font-bold tabular-nums ${totalStock === 0 && totalVariants > 0 ? "text-amber-500" : "text-slate-800"}`}>
                    {totalStock}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Variants</p>
                  <p className="mt-1 text-lg font-bold tabular-nums text-slate-800">{totalVariants}</p>
                </div>
                <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Low Stock</p>
                  <p className={`mt-1 text-lg font-bold tabular-nums ${lowStockVariants > 0 ? "text-amber-500" : "text-slate-800"}`}>
                    {lowStockVariants}
                  </p>
                </div>
              </div>
              {outOfStockVariants > 0 && (
                <div className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  <p className="text-[11px] text-amber-700">{outOfStockVariants} variant{outOfStockVariants !== 1 ? "s" : ""} out of stock</p>
                </div>
              )}
              {lowStockVariants > 0 && (
                <div className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  <p className="text-[11px] text-amber-700">{lowStockVariants} variant{lowStockVariants !== 1 ? "s" : ""} below low stock threshold</p>
                </div>
              )}
            </div>
          </AdminSectionCard>

          {/* 4. Variants */}
          <AdminSectionCard title="Variants">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">Size and color combinations with stock levels.</p>
                <Button type="button" variant="outline" size="sm" onClick={addVariant} className="rounded-lg h-7 text-xs">
                  + Add variant
                </Button>
              </div>
              {variants.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-4 text-center">
                  <Layers className="mx-auto mb-1.5 h-4 w-4 text-slate-300" />
                  <p className="text-xs text-slate-500">No variants yet. Add one to manage inventory.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {variants.map((v, i) => (
                    <div key={i} className="rounded-lg border border-slate-200/60 p-2.5">
                      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_70px_70px_80px_auto] sm:items-end">
                        <div className="space-y-1">
                          <Label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Size</Label>
                          <Select value={v.size} onValueChange={(val) => val && updateVariant(i, "size", val)}>
                            <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Size" /></SelectTrigger>
                            <SelectContent>
                              {["XS", "S", "M", "L", "XL", "XXL", "3XL", "Free Size"].map((s) => (
                                <SelectItem key={s} value={s}>{s}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Color</Label>
                          <div className="flex items-center gap-1.5">
                            {v.colorHex && /^#[0-9a-fA-F]{3,6}$/.test(v.colorHex) && (
                              <span className="h-4 w-4 shrink-0 rounded-full border" style={{ backgroundColor: v.colorHex }} />
                            )}
                            <Select value={v.color} onValueChange={(val) => val && updateVariant(i, "color", val)}>
                              <SelectTrigger className="h-7 text-xs flex-1"><SelectValue placeholder="Color" /></SelectTrigger>
                              <SelectContent>
                                {["Black", "White", "Maroon", "Olive", "Navy", "Beige", "Pink", "Red", "Blue", "Green", "Grey", "Brown", "Cream", "Mustard", "Teal"].map((c) => (
                                  <SelectItem key={c} value={c}>{c}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Stock</Label>
                          <Input type="number" value={v.stock} onChange={(e) => updateVariant(i, "stock", parseInt(e.target.value) || 0)} className="h-7 text-xs" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Alert</Label>
                          <Input type="number" value={v.lowStockThreshold} onChange={(e) => updateVariant(i, "lowStockThreshold", parseInt(e.target.value) || 5)} className="h-7 text-xs" placeholder="5" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">SKU</Label>
                          <Input value={v.sku} onChange={(e) => updateVariant(i, "sku", e.target.value)} className="h-7 text-[11px]" />
                        </div>
                        <Button type="button" variant="ghost" size="sm" className="h-7 text-red-400 hover:text-red-600" onClick={() => removeVariant(i)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="mt-1.5">
                        <Label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Hex</Label>
                        <Input value={v.colorHex} onChange={(e) => updateVariant(i, "colorHex", e.target.value)} className="h-7 font-mono text-[11px] mt-0.5" placeholder="#000000" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </AdminSectionCard>

          {/* 5. Advanced Settings (collapsible) */}
          <div className="rounded-xl border border-slate-200/60 bg-white shadow-sm overflow-hidden">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex w-full items-center justify-between px-4 py-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <span>Advanced Settings</span>
              {showAdvanced ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>
            {showAdvanced && (
              <div className="border-t border-slate-100 p-4 space-y-4">
                {/* Material & Care */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="material">Material</Label>
                    <Input id="material" value={material} onChange={(e) => setMaterial(e.target.value)} placeholder="e.g. 100% Cotton" className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="careInstructions">Care Instructions</Label>
                    <Input id="careInstructions" value={careInstructions} onChange={(e) => setCareInstructions(e.target.value)} placeholder="e.g. Machine wash cold" className="h-8 text-xs" />
                  </div>
                </div>

                {/* Specifications */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-slate-700">Specifications</p>
                    <Button type="button" variant="outline" size="sm" onClick={addSpec} className="rounded-lg h-7 text-xs">
                      + Add spec
                    </Button>
                  </div>
                  {specifications.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-3 text-center">
                      <p className="text-xs text-slate-500">No specifications yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {specifications.map((spec, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <Input value={spec.label} onChange={(e) => updateSpec(i, "label", e.target.value)} className="h-7 text-xs flex-1" placeholder="Label" />
                          <Input value={spec.value} onChange={(e) => updateSpec(i, "value", e.target.value)} className="h-7 text-xs flex-1" placeholder="Value" />
                          <Button type="button" variant="ghost" size="sm" className="h-7 text-red-400 hover:text-red-600 shrink-0" onClick={() => removeSpec(i)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Product Recommendations */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-slate-700">Product Recommendations</p>
                  {(["RELATED", "CROSS_SELL", "UPSELL"] as const).map((type) => {
                    const label = type === "RELATED" ? "Related Products" : type === "CROSS_SELL" ? "Cross-sell Products" : "Upsell Products"
                    const desc = type === "RELATED" ? "You May Also Like" : type === "CROSS_SELL" ? "Pairs well with" : "Upgrade your choice"
                    const state = type === "RELATED" ? relatedProductIds : type === "CROSS_SELL" ? crossSellProductIds : upsellProductIds
                    const setState = type === "RELATED" ? setRelatedProductIds : type === "CROSS_SELL" ? setCrossSellProductIds : setUpsellProductIds

                    return (
                      <div key={type} className="space-y-1.5">
                        <p className="text-[11px] font-medium text-slate-600">{label}</p>
                        <ProductRelationSelector
                          selectedIds={state}
                          onChange={setState}
                          excludeId={productId ?? ""}
                          label={label}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-4">
          <div className="sticky top-6 space-y-4">

            {/* Summary */}
            <div className="rounded-xl border border-slate-200/60 bg-white p-4 shadow-sm">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Summary</h3>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Name</span>
                  <span className="font-medium text-slate-700 text-right max-w-[130px] truncate">{name || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Status</span>
                  <span><AdminStatusBadge status={status} /></span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Price</span>
                  <span className="font-semibold tabular-nums text-slate-800">{price ? `৳${Number(price).toLocaleString()}` : "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Stock</span>
                  <span className={`tabular-nums font-semibold ${totalStock === 0 && totalVariants > 0 ? "text-amber-500" : ""}`}>{totalStock || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Variants</span>
                  <span className="tabular-nums">{totalVariants || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Images</span>
                  <span className="tabular-nums">{productImages.length || "—"}</span>
                </div>
              </div>
            </div>

            {/* 5. Status */}
            <AdminSectionCard title="Status">
              <div className="flex flex-wrap gap-1.5">
                {(["Draft", "Active", "Hidden", "Archived"] as const).map((s) => {
                  const isCurrent = status === s
                  const variants: Record<string, { variant: "default" | "outline" | "secondary"; className: string }> = {
                    Draft: { variant: isCurrent ? "default" : "outline", className: isCurrent ? "bg-amber-500 hover:bg-amber-600 text-white" : "" },
                    Active: { variant: isCurrent ? "default" : "outline", className: isCurrent ? "bg-emerald-500 hover:bg-emerald-600 text-white" : "" },
                    Hidden: { variant: isCurrent ? "secondary" : "outline", className: isCurrent ? "" : "" },
                    Archived: { variant: "outline", className: isCurrent ? "bg-slate-200 text-slate-500" : "text-slate-400" },
                  }
                  const v = variants[s]
                  return (
                    <Button
                      key={s}
                      type="button"
                      variant={v.variant}
                      size="sm"
                      onClick={() => setStatus(s)}
                      className={`h-7 text-xs rounded-lg ${v.className}`}
                    >
                      {s === "Active" && <SendHorizonal className="h-3 w-3 mr-1" />}
                      {s === "Hidden" && <EyeOff className="h-3 w-3 mr-1" />}
                      {s === "Archived" && <Archive className="h-3 w-3 mr-1" />}
                      {s}
                    </Button>
                  )
                })}
              </div>
            </AdminSectionCard>

            {/* 6. Organization */}
            <AdminSectionCard title="Product Organization">
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="categoryId">Category <span className="text-red-500">*</span></Label>
                  <Select value={categoryId} onValueChange={(v) => v && setCategoryId(v)}>
                    <SelectTrigger className={noCategory ? "border-amber-300 h-8" : "h-8"}>
                      <SelectValue placeholder="Choose a category">
                        {categories.find((c) => c.id === categoryId)?.name}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {mainCategories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {noCategory && <p className="text-[10px] text-amber-500 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Required</p>}
                </div>

                {/* Size Charts */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Size Charts</Label>
                  {allSizeCharts.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-3 text-center">
                      <Ruler className="mx-auto mb-1 h-4 w-4 text-slate-300" />
                      <p className="text-[10px] text-slate-500">No size charts. <a href="/admin/size-charts" target="_blank" className="text-blue-600 hover:underline">Manage</a></p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <Input
                        value={chartSearch}
                        onChange={(e) => setChartSearch(e.target.value)}
                        placeholder="Search..."
                        className="h-7 text-xs"
                      />
                      <div className="max-h-36 overflow-y-auto space-y-1">
                        {allSizeCharts
                          .filter((c) => c.name.toLowerCase().includes(chartSearch.toLowerCase()))
                          .map((chart) => (
                            <label
                              key={chart.id}
                              className={`flex items-center gap-2 rounded-lg border p-1.5 cursor-pointer transition-colors text-xs ${
                                sizeChartIds.includes(chart.id)
                                  ? "border-blue-300 bg-blue-50"
                                  : "border-slate-200 hover:bg-slate-50"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={sizeChartIds.includes(chart.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSizeChartIds([...sizeChartIds, chart.id])
                                  } else {
                                    setSizeChartIds(sizeChartIds.filter((id) => id !== chart.id))
                                  }
                                }}
                                className="h-3.5 w-3.5 rounded border-slate-300"
                              />
                              <span className="font-medium text-slate-700">{chart.name}</span>
                            </label>
                          ))}
                      </div>
                      {sizeChartIds.length > 0 && (
                        <p className="text-[10px] text-blue-600 font-medium">{sizeChartIds.length} selected</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </AdminSectionCard>

            {/* 7. Pricing */}
            <AdminSectionCard title="Pricing">
              <div className="grid gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="price">Price (BDT) <span className="text-red-500">*</span></Label>
                  <Input id="price" type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="e.g. 2490" className="h-8 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="oldPrice">Compare price <span className="text-slate-400 font-normal text-[10px]">(optional)</span></Label>
                  <Input id="oldPrice" type="number" value={oldPrice} onChange={(e) => setOldPrice(e.target.value)} placeholder="e.g. 2990" className="h-8 text-sm" />
                </div>
              </div>
            </AdminSectionCard>

            {/* 8. Publishing */}
            <AdminSectionCard title="Publishing">
              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
                  <span className="text-xs font-medium text-slate-700">Featured product</span>
                </label>
                <div className="space-y-1.5">
                  <Label htmlFor="defaultCouponCode">Default coupon code <span className="text-slate-400 font-normal text-[10px]">(optional)</span></Label>
                  <Input id="defaultCouponCode" value={defaultCouponCode} onChange={(e) => setDefaultCouponCode(e.target.value)} placeholder="WELCOME10" className="uppercase h-8 text-xs" />
                </div>
              </div>
            </AdminSectionCard>

            {/* 9. SEO */}
            <AdminSectionCard title="SEO">
              <div className="space-y-3">
                <p className="text-[10px] text-slate-400">Override default metadata for search engines and social sharing.</p>
                <div className="space-y-1.5">
                  <Label className="text-[11px]">Meta Title</Label>
                  <Input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} placeholder="Custom page title" className="h-7 text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px]">Meta Description</Label>
                  <Textarea rows={1} value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} placeholder="Custom meta description" className="text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px]">Keywords</Label>
                  <Input value={seoKeywords} onChange={(e) => setSeoKeywords(e.target.value)} placeholder="keyword1, keyword2" className="h-7 text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px]">SEO Image</Label>
                  <ImageUploader
                    images={seoImage ? [seoImage] : []}
                    onChange={(imgs) => setSeoImage(imgs[0] || "")}
                    single
                    label=""
                    helperText="Open Graph image."
                    folder="seo"
                  />
                </div>
              </div>
            </AdminSectionCard>

            {/* Missing alerts */}
            {(noImages || noCategory || noVariants) && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 shadow-sm">
                <h3 className="text-[10px] font-semibold uppercase tracking-wider text-amber-700 mb-2">Missing</h3>
                <ul className="space-y-1">
                  {noImages && <li className="text-[11px] text-amber-600 flex items-center gap-1.5"><AlertTriangle className="h-3 w-3 shrink-0" /> No product images</li>}
                  {noCategory && <li className="text-[11px] text-amber-600 flex items-center gap-1.5"><AlertTriangle className="h-3 w-3 shrink-0" /> No category selected</li>}
                  {noVariants && <li className="text-[11px] text-amber-600 flex items-center gap-1.5"><AlertTriangle className="h-3 w-3 shrink-0" /> No variants added</li>}
                </ul>
              </div>
            )}

            {/* Publish buttons */}
            <div className="rounded-xl border border-slate-200/60 bg-white p-4 shadow-sm">
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-3">Publish</h3>
              <div className="space-y-2">
                <Button type="button" disabled={loading} onClick={() => handleSubmit("Draft")} variant="outline" className="w-full h-8 rounded-lg justify-start gap-2 text-xs font-semibold">
                  <Save className="h-3.5 w-3.5" /> Save Draft
                </Button>
                <Button type="button" disabled={loading} onClick={() => handleSubmit("Active")} className="w-full h-8 rounded-lg justify-start gap-2 text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white">
                  <SendHorizonal className="h-3.5 w-3.5" /> Publish
                </Button>
                <Button type="button" disabled={loading} onClick={() => handleSubmit("Hidden")} variant="secondary" className="w-full h-8 rounded-lg justify-start gap-2 text-xs font-semibold">
                  <EyeOff className="h-3.5 w-3.5" /> Hide
                </Button>
                <Button type="button" disabled={loading} onClick={() => handleSubmit("Archived")} variant="outline" className="w-full h-8 rounded-lg justify-start gap-2 text-xs font-semibold text-slate-400">
                  <Archive className="h-3.5 w-3.5" /> Archive
                </Button>
              </div>
            </div>

            {/* Preview link (edit mode only) */}
            {mode === "edit" && slug && (
              <Link
                href={previewUrl}
                target="_blank"
                className="inline-flex items-center justify-center gap-2 w-full h-8 rounded-lg border border-slate-200/60 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Preview
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

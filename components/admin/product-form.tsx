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
import { AlertTriangle, Archive, ChevronDown, ChevronRight, EyeOff, ExternalLink, ImageIcon, Layers, Ruler, Save, SendHorizonal, Trash2, Plus } from "lucide-react"
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

const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "3XL", "Free Size"]
const COLORS = ["Black", "White", "Maroon", "Olive", "Navy", "Beige", "Pink", "Red", "Blue", "Green", "Grey", "Brown", "Cream", "Mustard", "Teal"]

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
  const [showSeo, setShowSeo] = useState(false)

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
    <div className="max-w-6xl">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">

        {/* ===== LEFT COLUMN ===== */}
        <div className="space-y-6">

          {/* ── 1. Basic Information ── */}
          <AdminSectionCard title="Basic Information">
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-xs font-medium text-slate-700">Name <span className="text-red-500">*</span></Label>
                  <Input id="name" value={name} onChange={(e) => handleNameChange(e.target.value)} placeholder="e.g. Premium Cotton Panjabi" className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="slug" className="text-xs font-medium text-slate-700">Slug <span className="text-red-500">*</span></Label>
                  <div className="relative">
                    <Input id="slug" value={slug} onChange={(e) => handleSlugChange(e.target.value)} placeholder="e.g. premium-cotton-panjabi" className="h-9 text-sm pl-[18px]" />
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 pointer-events-none">/</span>
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-xs font-medium text-slate-700">Description</Label>
                <Textarea id="description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Product description shown on the storefront." className="text-sm resize-y min-h-[72px]" />
                <p className="text-[11px] text-slate-400">Supports basic HTML for formatting.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="shortDescription" className="text-xs font-medium text-slate-700">Short Description</Label>
                <Textarea id="shortDescription" rows={2} value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} placeholder="Brief summary shown near product title." className="text-sm resize-none" />
              </div>
            </div>
          </AdminSectionCard>

          {/* ── 2. Product Media ── */}
          <AdminSectionCard title={`Product Media${productImages.length > 0 ? ` (${productImages.length})` : ""}`} description="First image is the primary product photo.">
            <div className="space-y-3">
              {productImages.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {productImages.map((img, i) => (
                    <div key={img} className="group relative aspect-square rounded-lg border border-slate-200 bg-slate-50 overflow-hidden">
                      <img src={img} alt={`Product ${i + 1}`} className="h-full w-full object-cover" />
                      {i === 0 && (
                        <span className="absolute top-1.5 left-1.5 rounded-md bg-emerald-500 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-xs">
                          Primary
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setProductImages(productImages.filter((_, idx) => idx !== i))}
                        className="absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-white/90 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:text-red-500"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  <label className="flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-slate-200 bg-slate-50/50 aspect-square hover:border-slate-300 hover:bg-slate-100/50 transition-colors">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        const fd = new FormData()
                        fd.append("file", file)
                        fd.append("folder", "products")
                        const res = await fetch("/api/upload/image", { method: "POST", body: fd })
                        const d = await res.json()
                        if (d.success) {
                          setProductImages([...productImages, d.data.secureUrl])
                        }
                        e.target.value = ""
                      }}
                    />
                    <Plus className="h-5 w-5 text-slate-300" />
                  </label>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 py-8">
                  <ImageIcon className="h-8 w-8 text-slate-300" />
                  <div className="text-center">
                    <p className="text-sm font-medium text-slate-600">No product images</p>
                    <p className="text-xs text-slate-400 mt-0.5">Upload product photos to showcase your item.</p>
                  </div>
                  <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm">
                    <Plus className="h-3.5 w-3.5" />
                    Add Images
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        const fd = new FormData()
                        fd.append("file", file)
                        fd.append("folder", "products")
                        const res = await fetch("/api/upload/image", { method: "POST", body: fd })
                        const d = await res.json()
                        if (d.success) {
                          setProductImages([...productImages, d.data.secureUrl])
                        }
                        e.target.value = ""
                      }}
                    />
                  </label>
                </div>
              )}
              {noImages && (
                <div className="flex items-center gap-1.5 text-amber-600">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  <p className="text-[11px] font-medium">At least one image is recommended</p>
                </div>
              )}
            </div>
          </AdminSectionCard>

          {/* ── 3. Inventory ── */}
          <AdminSectionCard title="Inventory">
            {noVariants ? (
              <div className="flex flex-col items-center gap-3 py-6">
                <Layers className="h-6 w-6 text-slate-300" />
                <div className="text-center">
                  <p className="text-sm font-medium text-slate-600">No inventory available yet</p>
                  <p className="text-xs text-slate-400 mt-0.5">Add at least one variant to start inventory tracking.</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addVariant} className="rounded-lg h-8 text-xs gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> Add Variant
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
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
                {(outOfStockVariants > 0 || lowStockVariants > 0) && (
                  <div className="space-y-1.5">
                    {outOfStockVariants > 0 && (
                      <div className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                        <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                        <p className="text-[11px] text-red-700">{outOfStockVariants} variant{outOfStockVariants !== 1 ? "s" : ""} out of stock</p>
                      </div>
                    )}
                    {lowStockVariants > 0 && (
                      <div className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        <p className="text-[11px] text-amber-700">{lowStockVariants} variant{lowStockVariants !== 1 ? "s" : ""} below threshold</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </AdminSectionCard>

          {/* ── 4. Variants ── */}
          <AdminSectionCard title="Variants" description="Add size/color combinations with SKU and stock levels.">
            <div className="space-y-3">
              {variants.length === 0 ? (
                <div className="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed border-slate-200 bg-slate-50/50 py-8">
                  <Layers className="h-6 w-6 text-slate-300" />
                  <div className="text-center">
                    <p className="text-sm font-medium text-slate-600">No variants yet</p>
                    <p className="text-xs text-slate-400 mt-0.5">Add at least one variant to manage inventory and pricing by size/color.</p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addVariant} className="rounded-lg h-8 text-xs gap-1.5">
                    <Plus className="h-3.5 w-3.5" /> Add Variant
                  </Button>
                </div>
              ) : (
                <>
                  <div className="overflow-hidden rounded-lg border border-slate-200">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-50">
                          <th className="px-2.5 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400 w-[90px]">Size</th>
                          <th className="px-2.5 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400 w-[100px]">Color</th>
                          <th className="px-2.5 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400 w-[110px]">SKU</th>
                          <th className="px-2.5 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-400 w-[70px]">Stock</th>
                          <th className="px-2.5 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-400 w-[70px]">Alert @</th>
                          <th className="px-2.5 py-2 text-right w-[40px]"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {variants.map((v, i) => (
                          <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-2.5 py-1.5">
                              <Select value={v.size} onValueChange={(val) => val && updateVariant(i, "size", val)}>
                                <SelectTrigger className="h-8 text-xs border-slate-200"><SelectValue placeholder="Size" /></SelectTrigger>
                                <SelectContent>
                                  {SIZES.map((s) => (
                                    <SelectItem key={s} value={s}>{s}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="px-2.5 py-1.5">
                              <div className="flex items-center gap-1.5">
                                {v.colorHex && /^#[0-9a-fA-F]{3,6}$/.test(v.colorHex) && (
                                  <span className="h-4 w-4 shrink-0 rounded-full border border-slate-200" style={{ backgroundColor: v.colorHex }} />
                                )}
                                <Select value={v.color} onValueChange={(val) => val && updateVariant(i, "color", val)}>
                                  <SelectTrigger className="h-8 text-xs border-slate-200 flex-1"><SelectValue placeholder="Color" /></SelectTrigger>
                                  <SelectContent>
                                    {COLORS.map((c) => (
                                      <SelectItem key={c} value={c}>{c}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <Input
                                value={v.colorHex}
                                onChange={(e) => updateVariant(i, "colorHex", e.target.value)}
                                className="mt-1 h-6 text-[10px] font-mono border-slate-200"
                                placeholder="#000000"
                              />
                            </td>
                            <td className="px-2.5 py-1.5">
                              <Input
                                value={v.sku}
                                onChange={(e) => updateVariant(i, "sku", e.target.value)}
                                className="h-8 text-xs border-slate-200 font-mono"
                                placeholder="e.g. PNL-001-BLK"
                              />
                            </td>
                            <td className="px-2.5 py-1.5">
                              <Input
                                type="number"
                                value={v.stock}
                                onChange={(e) => updateVariant(i, "stock", parseInt(e.target.value) || 0)}
                                className={`h-8 text-xs text-right tabular-nums font-semibold ${
                                  v.stock === 0
                                    ? "border-red-200 bg-red-50 text-red-700"
                                    : v.stock <= v.lowStockThreshold
                                      ? "border-amber-200 bg-amber-50 text-amber-700"
                                      : "border-slate-200 bg-white text-slate-800"
                                }`}
                              />
                            </td>
                            <td className="px-2.5 py-1.5">
                              <Input
                                type="number"
                                value={v.lowStockThreshold}
                                onChange={(e) => updateVariant(i, "lowStockThreshold", parseInt(e.target.value) || 5)}
                                className="h-8 text-xs text-right tabular-nums border-slate-200"
                                placeholder="5"
                              />
                            </td>
                            <td className="px-2.5 py-1.5 text-right">
                              <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-red-500" onClick={() => removeVariant(i)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addVariant} className="rounded-lg h-8 text-xs gap-1.5">
                    <Plus className="h-3.5 w-3.5" /> Add Variant
                  </Button>
                </>
              )}
            </div>
          </AdminSectionCard>

          {/* ── 5. Advanced Settings (collapsible) ── */}
          <div className="rounded-xl border border-slate-200/60 bg-white shadow-sm overflow-hidden">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex w-full items-center justify-between px-5 py-3.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <span>Advanced Settings</span>
              {showAdvanced ? <ChevronDown className="h-3.5 w-3.5 text-slate-400" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
            </button>
            {showAdvanced && (
              <div className="border-t border-slate-100 px-5 py-4 space-y-5">
                <div className="space-y-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Product Details</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="material" className="text-xs font-medium text-slate-700">Material</Label>
                      <Input id="material" value={material} onChange={(e) => setMaterial(e.target.value)} placeholder="e.g. 100% Cotton" className="h-9 text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="careInstructions" className="text-xs font-medium text-slate-700">Care Instructions</Label>
                      <Input id="careInstructions" value={careInstructions} onChange={(e) => setCareInstructions(e.target.value)} placeholder="e.g. Machine wash cold" className="h-9 text-sm" />
                    </div>
                  </div>
                </div>

                <hr className="border-slate-100" />

                {/* Specifications */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-slate-700">Specifications</p>
                    <Button type="button" variant="outline" size="sm" onClick={addSpec} className="rounded-lg h-7 text-xs gap-1">
                      <Plus className="h-3 w-3" /> Add
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
                          <Input value={spec.label} onChange={(e) => updateSpec(i, "label", e.target.value)} className="h-8 text-xs flex-1 border-slate-200" placeholder="Label" />
                          <Input value={spec.value} onChange={(e) => updateSpec(i, "value", e.target.value)} className="h-8 text-xs flex-1 border-slate-200" placeholder="Value" />
                          <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-red-500 shrink-0" onClick={() => removeSpec(i)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <hr className="border-slate-100" />

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

        {/* ===== RIGHT COLUMN ===== */}
        <div className="space-y-4">
          <div className="sticky top-6 space-y-4">

            {/* ── Summary ── */}
            <div className="rounded-xl border border-slate-200/60 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-slate-100 px-4 py-2.5">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Summary</h3>
              </div>
              <div className="p-3 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Name</span>
                  <span className="font-medium text-slate-700 text-right max-w-[140px] truncate">{name || "—"}</span>
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

            {/* ── Status ── */}
            <div className="rounded-xl border border-slate-200/60 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-slate-100 px-4 py-2.5">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Status</h3>
              </div>
              <div className="p-3">
                <div className="grid grid-cols-2 gap-1.5">
                  {(["Draft", "Active", "Hidden", "Archived"] as const).map((s) => {
                    const isCurrent = status === s
                    const styles: Record<string, { base: string; active: string }> = {
                      Draft: { base: "border-slate-200 text-slate-600 hover:bg-slate-50", active: "bg-amber-500 text-white border-amber-500 hover:bg-amber-600" },
                      Active: { base: "border-slate-200 text-slate-600 hover:bg-slate-50", active: "bg-emerald-500 text-white border-emerald-500 hover:bg-emerald-600" },
                      Hidden: { base: "border-slate-200 text-slate-600 hover:bg-slate-50", active: "bg-slate-600 text-white border-slate-600 hover:bg-slate-700" },
                      Archived: { base: "border-slate-200 text-slate-400 hover:bg-slate-50", active: "bg-slate-200 text-slate-500 border-slate-200" },
                    }
                    const s2 = styles[s]
                    return (
                      <Button
                        key={s}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setStatus(s)}
                        className={`h-7 text-[11px] font-semibold rounded-lg border transition-all ${isCurrent ? s2.active : s2.base}`}
                      >
                        {s === "Active" && <SendHorizonal className="h-3 w-3 mr-1" />}
                        {s === "Hidden" && <EyeOff className="h-3 w-3 mr-1" />}
                        {s === "Archived" && <Archive className="h-3 w-3 mr-1" />}
                        {s}
                      </Button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* ── Organization ── */}
            <div className="rounded-xl border border-slate-200/60 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-slate-100 px-4 py-2.5">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Organization</h3>
              </div>
              <div className="p-3 space-y-2.5">
                <div className="space-y-1.5">
                  <Label htmlFor="cat-sidebar" className="text-xs font-medium text-slate-700">Category <span className="text-red-500">*</span></Label>
                  <Select value={categoryId} onValueChange={(v) => v && setCategoryId(v)}>
                    <SelectTrigger id="cat-sidebar" className={`h-8 text-xs ${noCategory ? "border-amber-300" : ""}`}>
                      <SelectValue placeholder="Choose category">
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
                  <Label className="text-xs font-medium text-slate-700">Size Charts</Label>
                  {allSizeCharts.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-2.5 text-center">
                      <Ruler className="mx-auto mb-1 h-3.5 w-3.5 text-slate-300" />
                      <p className="text-[10px] text-slate-500">No size charts. <a href="/admin/size-charts" target="_blank" className="text-blue-600 hover:underline">Manage</a></p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <Input
                        value={chartSearch}
                        onChange={(e) => setChartSearch(e.target.value)}
                        placeholder="Search charts..."
                        className="h-7 text-xs"
                      />
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {allSizeCharts
                          .filter((c) => c.name.toLowerCase().includes(chartSearch.toLowerCase()))
                          .map((chart) => (
                            <label
                              key={chart.id}
                              className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 cursor-pointer transition-colors text-xs ${
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
            </div>

            {/* ── Pricing ── */}
            <div className="rounded-xl border border-slate-200/60 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-slate-100 px-4 py-2.5">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Pricing</h3>
              </div>
              <div className="p-3 space-y-2.5">
                <div className="space-y-1.5">
                  <Label htmlFor="price-sidebar" className="text-xs font-medium text-slate-700">Price (BDT) <span className="text-red-500">*</span></Label>
                  <Input id="price-sidebar" type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="e.g. 2490" className="h-8 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="oldPrice-sidebar" className="text-xs font-medium text-slate-700">Compare at price</Label>
                  <Input id="oldPrice-sidebar" type="number" value={oldPrice} onChange={(e) => setOldPrice(e.target.value)} placeholder="e.g. 2990" className="h-8 text-sm" />
                  <p className="text-[10px] text-slate-400">Shows a strikethrough on the storefront.</p>
                </div>
              </div>
            </div>

            {/* ── Publishing ── */}
            <div className="rounded-xl border border-slate-200/60 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-slate-100 px-4 py-2.5">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Publishing</h3>
              </div>
              <div className="p-3 space-y-2.5">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500" />
                  <span className="text-xs font-medium text-slate-700">Featured product</span>
                </label>
                <div className="space-y-1.5">
                  <Label htmlFor="coupon-sidebar" className="text-xs font-medium text-slate-700">Default coupon code</Label>
                  <Input id="coupon-sidebar" value={defaultCouponCode} onChange={(e) => setDefaultCouponCode(e.target.value)} placeholder="WELCOME10" className="uppercase h-8 text-xs" />
                  <p className="text-[10px] text-slate-400">Auto-applied at checkout.</p>
                </div>
              </div>
            </div>

            {/* ── SEO (collapsible) ── */}
            <div className="rounded-xl border border-slate-200/60 bg-white shadow-sm overflow-hidden">
              <button
                type="button"
                onClick={() => setShowSeo(!showSeo)}
                className="flex w-full items-center justify-between px-4 py-2.5 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">SEO</h3>
                  {!showSeo && (seoTitle || seoDescription) && (
                    <span className="rounded-md bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-600">Configured</span>
                  )}
                </div>
                {showSeo ? <ChevronDown className="h-3.5 w-3.5 text-slate-400" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
              </button>
              {showSeo && (
                <div className="border-t border-slate-100 p-3 space-y-3">
                  <p className="text-[10px] text-slate-400 leading-relaxed">Override default metadata for search engines and social sharing.</p>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-medium text-slate-600">Meta Title</Label>
                    <Input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} placeholder="Custom page title" className="h-7 text-xs" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-medium text-slate-600">Meta Description</Label>
                    <Textarea rows={2} value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} placeholder="Custom meta description" className="text-xs resize-none" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-medium text-slate-600">Keywords</Label>
                    <Input value={seoKeywords} onChange={(e) => setSeoKeywords(e.target.value)} placeholder="keyword1, keyword2" className="h-7 text-xs" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-medium text-slate-600">OG Image</Label>
                    <ImageUploader
                      images={seoImage ? [seoImage] : []}
                      onChange={(imgs) => setSeoImage(imgs[0] || "")}
                      single
                      label=""
                      helperText="Open Graph image for social sharing."
                      folder="seo"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* ── Missing warnings ── */}
            {(noImages || noCategory || noVariants) && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3">
                <h3 className="text-[10px] font-semibold uppercase tracking-wider text-amber-700 mb-1.5">Before publishing</h3>
                <ul className="space-y-1">
                  {noImages && <li className="text-[11px] text-amber-600 flex items-center gap-1.5"><AlertTriangle className="h-3 w-3 shrink-0" /> Add product images</li>}
                  {noCategory && <li className="text-[11px] text-amber-600 flex items-center gap-1.5"><AlertTriangle className="h-3 w-3 shrink-0" /> Select a category</li>}
                  {noVariants && <li className="text-[11px] text-amber-600 flex items-center gap-1.5"><AlertTriangle className="h-3 w-3 shrink-0" /> Add at least one variant</li>}
                </ul>
              </div>
            )}

            {/* ── Actions ── */}
            <div className="rounded-xl border border-slate-200/60 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-slate-100 px-4 py-2.5">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Actions</h3>
              </div>
              <div className="p-3 space-y-2">
                <Button type="button" disabled={loading} onClick={() => handleSubmit("Active")} className="w-full h-9 rounded-lg justify-center gap-2 text-sm font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-sm">
                  <SendHorizonal className="h-4 w-4" /> Publish
                </Button>
                <Button type="button" disabled={loading} onClick={() => handleSubmit("Draft")} variant="outline" className="w-full h-8 rounded-lg justify-start gap-2 text-xs font-semibold border-slate-200">
                  <Save className="h-3.5 w-3.5 text-slate-500" /> Save Draft
                </Button>
                <hr className="border-slate-100" />
                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" disabled={loading} onClick={() => handleSubmit("Hidden")} variant="secondary" className="h-7 rounded-lg text-[11px] font-semibold gap-1.5">
                    <EyeOff className="h-3 w-3" /> Hide
                  </Button>
                  <Button type="button" disabled={loading} onClick={() => handleSubmit("Archived")} variant="outline" className="h-7 rounded-lg text-[11px] font-semibold text-slate-400 border-slate-200 gap-1.5">
                    <Archive className="h-3 w-3" /> Archive
                  </Button>
                </div>
              </div>
            </div>

            {/* ── Preview (edit mode) ── */}
            {mode === "edit" && slug && (
              <Link
                href={previewUrl}
                target="_blank"
                className="inline-flex items-center justify-center gap-2 w-full h-8 rounded-xl border border-slate-200/60 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Preview Product
              </Link>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}

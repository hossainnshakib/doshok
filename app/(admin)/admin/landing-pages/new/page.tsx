"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowRight, Boxes, FilePlus2, Loader2, Search } from "lucide-react"
import { AdminPageHeader, AdminSectionCard } from "@/components/admin/admin-ui"
import { ImageUploader } from "@/components/admin/image-uploader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { slugifyName } from "@/lib/slug"
import { LandingCampaignSettings, type LandingCampaignSettingsHandle } from "@/components/admin/landing-campaign-settings"

type ProductOption = {
  id: string
  name: string
  slug: string
  price: number
  oldPrice: number | null
  images: string[]
  status: string
}

type CategoryOption = {
  id: string
  name: string
}

type Mode = "existing" | "new"

export default function NewLandingPagePage() {
  const router = useRouter()
  const campaignRef = useRef<LandingCampaignSettingsHandle>(null)
  const [mode, setMode] = useState<Mode>("existing")
  const [loading, setLoading] = useState(false)
  const [productsLoading, setProductsLoading] = useState(true)
  const [products, setProducts] = useState<ProductOption[]>([])
  const [categories, setCategories] = useState<CategoryOption[]>([])

  const [selectedProductId, setSelectedProductId] = useState("")
  const [productSearch, setProductSearch] = useState("")
  const [showProductDropdown, setShowProductDropdown] = useState(false)
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [price, setPrice] = useState("")
  const [oldPrice, setOldPrice] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [images, setImages] = useState<string[]>([])

  const [status, setStatus] = useState("Draft")
  const [headline, setHeadline] = useState("")
  const [subheadline, setSubheadline] = useState("")
  const [copy, setCopy] = useState("")
  const [heroImage, setHeroImage] = useState("")
  const [cta, setCta] = useState("")

  const [seoTitle, setSeoTitle] = useState("")
  const [seoDescription, setSeoDescription] = useState("")
  const [seoKeywords, setSeoKeywords] = useState("")
  const [seoImage, setSeoImage] = useState("")

  const [landingUrl, setLandingUrl] = useState("")

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedProductId),
    [products, selectedProductId]
  )
  const filteredProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase()
    const matches = query
      ? products.filter((product) => (
          product.name.toLowerCase().includes(query) ||
          product.slug.toLowerCase().includes(query)
        ))
      : products
    return matches.slice(0, 20)
  }, [productSearch, products])
  const selectedLandingSlug = selectedProduct?.slug.replace(/^\/+/, "") ?? ""

  useEffect(() => {
    Promise.all([
      fetch("/api/products?selector=true&status=all").then((response) => response.json()),
      fetch("/api/categories").then((response) => response.json()),
    ])
      .then(([productData, categoryData]) => {
        if (productData.success) setProducts(productData.data ?? [])
        if (categoryData.success) setCategories(categoryData.data ?? [])
      })
      .catch(() => toast.error("Failed to load landing page setup data"))
      .finally(() => setProductsLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedProduct) return
    if (!headline) setHeadline(selectedProduct.name)
    if (!heroImage) setHeroImage(selectedProduct.images?.[0] ?? "")
  }, [headline, heroImage, selectedProduct])

  function handleNameChange(value: string) {
    setName(value)
    if (!slug) setSlug(slugifyName(value))
    if (!landingUrl) setLandingUrl(slugifyName(value))
  }

  async function handleExistingProductSubmit() {
    if (!selectedProduct) {
      toast.error("Select a product first")
      return
    }

    setLoading(true)
    try {
      const settings = campaignRef.current?.getValue()
      const response = await fetch(`/api/products/${selectedProduct.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageType: "LANDING",
          status,
          landingHeadline: headline || selectedProduct.name,
          landingSubheadline: subheadline || undefined,
          landingCopy: copy || undefined,
          landingHeroImage: heroImage || selectedProduct.images?.[0] || undefined,
          seoTitle: seoTitle || undefined,
          seoDescription: seoDescription || undefined,
          seoKeywords: seoKeywords || undefined,
          seoImage: seoImage || undefined,
          landingPageSetting: {
            customCta: cta || null,
            ...settings,
          },
        }),
      })
      const data = await response.json()
      if (!data.success) {
        toast.error(data.error ?? "Failed to create landing page")
        return
      }
      toast.success("Landing page configured")
      router.push("/admin/landing-pages")
      router.refresh()
    } catch {
      toast.error("Failed to create landing page")
    } finally {
      setLoading(false)
    }
  }

  async function handleNewLandingProductSubmit() {
    const currentPrice = Number(price)
    const comparePrice = oldPrice ? Number(oldPrice) : null
    if (!name.trim() || !slug.trim() || !categoryId || !currentPrice) {
      toast.error("Name, slug, category, and price are required")
      return
    }
    if (comparePrice !== null && comparePrice <= currentPrice) {
      toast.error("Compare price must be greater than the current price")
      return
    }

    setLoading(true)
    try {
      const settings = campaignRef.current?.getValue()
      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug,
          price: currentPrice,
          oldPrice: comparePrice ?? undefined,
          images,
          categoryId,
          status,
          pageType: "LANDING",
          featured: false,
          landingHeadline: headline || name,
          landingSubheadline: subheadline || undefined,
          landingCopy: copy || undefined,
          landingHeroImage: heroImage || images[0] || undefined,
          seoTitle: seoTitle || undefined,
          seoDescription: seoDescription || undefined,
          seoKeywords: seoKeywords || undefined,
          seoImage: seoImage || undefined,
          variants: [],
          landingPageSetting: {
            customCta: cta || null,
            ...settings,
          },
        }),
      })
      const data = await response.json()
      if (!data.success) {
        toast.error(data.error ?? "Failed to create landing page")
        return
      }
      toast.success("Landing page created")
      router.push("/admin/landing-pages")
      router.refresh()
    } catch {
      toast.error("Failed to create landing page")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Commerce"
        title="New Landing Page"
        description="Create a sales page from an existing product or start a landing-only product/content entry."
        backHref="/admin/landing-pages"
      />

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <AdminSectionCard title="Creation Type">
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setMode("existing")}
              className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition ${mode === "existing" ? "border-slate-900 bg-slate-50" : "border-slate-200 hover:bg-slate-50"}`}
            >
              <Boxes className="mt-0.5 h-4 w-4 text-slate-500" />
              <span>
                <span className="block text-sm font-semibold text-slate-800">Use existing product</span>
                <span className="mt-0.5 block text-xs leading-5 text-slate-500">Configure a landing page for a product already in the catalog.</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => setMode("new")}
              className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition ${mode === "new" ? "border-slate-900 bg-slate-50" : "border-slate-200 hover:bg-slate-50"}`}
            >
              <FilePlus2 className="mt-0.5 h-4 w-4 text-slate-500" />
              <span>
                <span className="block text-sm font-semibold text-slate-800">Create landing product/content</span>
                <span className="mt-0.5 block text-xs leading-5 text-slate-500">Create the hidden product-backed landing entry from this flow.</span>
              </span>
            </button>
          </div>
        </AdminSectionCard>

        <div className="space-y-4">
          {mode === "existing" ? (
            <AdminSectionCard title="Existing Product Source" description="This will configure the selected product as a landing page without opening the product creation screen." className="relative z-20 overflow-visible">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Product</Label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      value={productSearch}
                      onChange={(event) => {
                        setProductSearch(event.target.value)
                        setShowProductDropdown(true)
                      }}
                      onFocus={() => setShowProductDropdown(true)}
                      placeholder={productsLoading ? "Loading products..." : "Search product by name or slug"}
                      disabled={productsLoading}
                      className="h-10 pl-9 text-sm"
                    />
                    {showProductDropdown && !productsLoading && (
                      <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                        {filteredProducts.length > 0 ? (
                          filteredProducts.map((product) => (
                            <button
                              key={product.name}
                              type="button"
                              onClick={() => {
                                setSelectedProductId(product.id)
                                setProductSearch(product.name)
                                setShowProductDropdown(false)
                              }}
                              className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-slate-50"
                            >
                              {product.images?.[0] ? (
                                <img src={product.images[0]} alt="" className="h-10 w-10 shrink-0 rounded-md object-cover" />
                              ) : (
                                <div className="h-10 w-10 shrink-0 rounded-md bg-slate-100" />
                              )}
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-semibold text-slate-800">{product.name}</span>
                                <span className="mt-0.5 block truncate text-[11px] text-slate-400">/{product.slug} · ৳{product.price.toLocaleString()}</span>
                              </span>
                            </button>
                          ))
                        ) : (
                          <div className="px-3 py-2.5 text-xs text-slate-400">No product found</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                {selectedProduct && (
                  <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                    {selectedProduct.images?.[0] ? (
                      <img src={selectedProduct.images[0]} alt="" className="h-12 w-12 shrink-0 rounded-md object-cover" />
                    ) : (
                      <div className="h-12 w-12 shrink-0 rounded-md bg-slate-200" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-800">{selectedProduct.name}</p>
                      <p className="mt-0.5 text-xs text-slate-500">/{selectedProduct.slug} · ৳{selectedProduct.price.toLocaleString()}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Landing URL: <span className="font-mono text-slate-700">/l/{selectedLandingSlug}</span>
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </AdminSectionCard>
          ) : (
            <AdminSectionCard title="Landing Product Content" description="This creates a product-backed landing entry while keeping the old product creation route untouched.">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Name</Label>
                  <Input value={name} onChange={(event) => handleNameChange(event.target.value)} placeholder="Campaign product name" />
                </div>
                <div className="space-y-1.5">
                  <Label>Slug</Label>
                  <Input value={slug} onChange={(event) => setSlug(event.target.value)} placeholder="landing-page-slug" />
                </div>
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Select value={categoryId} onValueChange={(value) => value && setCategoryId(value)}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={(value) => value && setStatus(value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Draft">Draft</SelectItem>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Hidden">Hidden</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Price</Label>
                  <Input type="number" min={1} value={price} onChange={(event) => setPrice(event.target.value)} placeholder="2490" />
                </div>
                <div className="space-y-1.5">
                  <Label>Compare price</Label>
                  <Input type="number" min={1} value={oldPrice} onChange={(event) => setOldPrice(event.target.value)} placeholder="2990" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <ImageUploader images={images} onChange={setImages} label="Product images" helperText="Optional here. First image can be used as the landing hero." folder="landing" />
                </div>
              </div>
            </AdminSectionCard>
          )}

          <AdminSectionCard title="Landing Presentation">
            <div className="space-y-4">
              {mode === "existing" && (
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={(value) => value && setStatus(value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Draft">Draft</SelectItem>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Hidden">Hidden</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Headline</Label>
                <Input value={headline} onChange={(event) => setHeadline(event.target.value)} placeholder="Landing headline" />
              </div>
              <div className="space-y-1.5">
                <Label>Subheadline</Label>
                <Input value={subheadline} onChange={(event) => setSubheadline(event.target.value)} placeholder="Short sales promise" />
              </div>
              <div className="space-y-1.5">
                <Label>Copy</Label>
                <Textarea rows={4} value={copy} onChange={(event) => setCopy(event.target.value)} placeholder="Brief landing copy for this campaign." />
              </div>
              <div className="space-y-1.5">
                <Label>CTA label</Label>
                <Input value={cta} onChange={(event) => setCta(event.target.value)} placeholder="এখনই অর্ডার করুন" />
              </div>
              <div className="space-y-2">
                <ImageUploader
                  images={heroImage ? [heroImage] : []}
                  onChange={(next) => setHeroImage(next[0] || "")}
                  single
                  label="Hero image"
                  helperText="Optional. Existing product image is used as a fallback."
                  folder="landing"
                />
              </div>
            </div>
          </AdminSectionCard>

          <AdminSectionCard title="Landing Campaign Settings">
            <LandingCampaignSettings ref={campaignRef} showCheckoutOverrides />
          </AdminSectionCard>

          <AdminSectionCard title="SEO">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>SEO Title</Label>
                <Input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} placeholder="Custom title for search engines" />
              </div>
              <div className="space-y-1.5">
                <Label>SEO Description</Label>
                <Textarea value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} rows={2} placeholder="Meta description for search results" />
              </div>
              <div className="space-y-1.5">
                <Label>SEO Keywords</Label>
                <Input value={seoKeywords} onChange={(e) => setSeoKeywords(e.target.value)} placeholder="keyword1, keyword2, keyword3" />
              </div>
              <div className="space-y-2">
                <Label>SEO Image</Label>
                <ImageUploader
                  images={seoImage ? [seoImage] : []}
                  onChange={(imgs) => setSeoImage(imgs[0] || "")}
                  single
                  label=""
                  helperText="Image shown when the landing page is shared on social media."
                  folder="landing"
                />
              </div>
            </div>
          </AdminSectionCard>

          <div className="flex justify-end">
            <Button
              type="button"
              disabled={loading || productsLoading}
              onClick={mode === "existing" ? handleExistingProductSubmit : handleNewLandingProductSubmit}
              className="h-10 rounded-lg text-xs font-semibold"
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
              Create Landing Page
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

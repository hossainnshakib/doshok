"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { AdminFormSection } from "@/components/admin/admin-ui"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { ImageUploader } from "@/components/admin/image-uploader"
import { toast } from "sonner"
import { ArrowDown, ArrowUp, ChevronDown, Package, Pencil, Plus, Search, Trash2 } from "lucide-react"
import { getRegistryEntry } from "@/lib/landing-pages/section-registry"
import { parseSectionContent } from "@/lib/landing-pages/section-schemas"
import type { BenefitsContent, CheckoutContent, FaqContent, GalleryContent, HeroContent, OffersContent, ProductsContent, ReviewsContent } from "@/lib/landing-pages/types"
import { BenefitsEditor, GalleryEditor, HeroEditor, ProductsEditor, type ProductLinkOption } from "./landing-section-editors"
import { FaqEditor, ReviewsEditor, CheckoutEditor } from "./landing-content-editors"
import { OffersEditor } from "./landing-offers-panel"
import { cn } from "@/lib/utils"

export type LandingSectionRow = {
  id: string
  type: string
  enabled: boolean
  sortOrder: number
  content: unknown
}

export type LandingProductLink = {
  id: string
  sortOrder: number
  displayTitle: string | null
  displayDescription: string | null
  displayImage: string | null
  ctaLabel: string | null
  overridePrice: number | null
  product: {
    id: string
    name: string
    slug: string
    images: string[]
    price: number
    oldPrice: number | null
    status: string
  }
}

type ProductHit = { id: string; name: string; slug: string; price: number; images: string[]; status: string }

export function LandingSectionsPanel({
  pageId,
  sections,
  links,
  sourceProduct,
  onChanged,
}: {
  pageId: string
  sections: LandingSectionRow[]
  links: LandingProductLink[]
  sourceProduct: { name: string; shortDescription: string | null; description: string | null; images: string[] } | null
  onChanged: () => void
}) {
  const [busy, setBusy] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  const ordered = [...sections].sort((a, b) => a.sortOrder - b.sortOrder)
  const hasGallery = ordered.some((s) => s.type === "GALLERY")
  const linkOptions: ProductLinkOption[] = links.map((l) => ({ id: l.id, product: { id: l.product.id, name: l.product.name, slug: l.product.slug } }))

  async function patchSection(sectionId: string, body: Record<string, unknown>, action: string) {
    setBusy(action)
    try {
      const res = await fetch(`/api/landing-pages/${pageId}/sections/${sectionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Section updated")
        setEditingId(null)
        onChanged()
      } else {
        toast.error(data.error ?? "Update failed")
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setBusy(null)
    }
  }

  async function moveSection(section: LandingSectionRow, dir: -1 | 1) {
    const idx = ordered.findIndex((s) => s.id === section.id)
    const j = idx + dir
    if (j < 0 || j >= ordered.length) return
    const next = [...ordered]
    ;[next[idx], next[j]] = [next[j], next[idx]]
    setBusy(`move-${section.id}`)
    try {
      const res = await fetch(`/api/landing-pages/${pageId}/sections/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: next.map((s) => s.id) }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Section order saved")
        onChanged()
      } else {
        toast.error(data.error ?? "Reorder failed")
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setBusy(null)
    }
  }

  async function addGallery() {
    setBusy("add-gallery")
    try {
      const res = await fetch(`/api/landing-pages/${pageId}/sections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "GALLERY" }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Gallery section added")
        onChanged()
      } else {
        toast.error(data.error ?? "Failed to add gallery")
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setBusy(null)
    }
  }

  return (
    <AdminFormSection
      title={`Page sections (${ordered.length})`}
      description="Enable, reorder and edit content per section. Disabled sections stay stored but never render publicly. Changes apply to the live page immediately when published — edits do not change lifecycle status."
    >
      <div className="space-y-2">
        {ordered.map((section, i) => {
          const entry = getRegistryEntry(section.type)
          const editable = entry?.editable ?? false
          return (
            <div key={section.id} className={cn("rounded-xl border bg-white", section.enabled ? "border-slate-200/70" : "border-dashed border-slate-200 bg-slate-50/50")}>
              <div className="flex items-center gap-2 px-3 py-2.5">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-slate-100 text-[11px] font-bold text-slate-500 tabular-nums">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-slate-800">
                    {entry?.label ?? section.type}
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-medium text-slate-500">{section.type}</span>
                    {editable ? (
                      <span className="rounded-md bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">Ready</span>
                    ) : (
                      <span className="rounded-md bg-slate-100 border border-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">Coming in later batch</span>
                    )}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button type="button" onClick={() => moveSection(section, -1)} disabled={i === 0 || busy !== null} className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-30" title="Move up" aria-label={`Move ${entry?.label ?? section.type} up`}>
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={() => moveSection(section, 1)} disabled={i === ordered.length - 1 || busy !== null} className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-30" title="Move down" aria-label={`Move ${entry?.label ?? section.type} down`}>
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  {editable && (
                    <button
                      type="button"
                      onClick={() => setEditingId(editingId === section.id ? null : section.id)}
                      className={cn("inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-semibold transition-colors", editingId === section.id ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-800 hover:bg-slate-100")}
                      aria-expanded={editingId === section.id}
                      aria-label={`Edit ${entry?.label ?? section.type} content`}
                    >
                      <Pencil className="h-3 w-3" /> Edit
                      <ChevronDown className={cn("h-3 w-3 transition-transform", editingId === section.id && "rotate-180")} />
                    </button>
                  )}
                  <Switch
                    checked={section.enabled}
                    onCheckedChange={(v) => patchSection(section.id, { enabled: v }, `toggle-${section.id}`)}
                    disabled={busy !== null}
                    aria-label={`Enable ${entry?.label ?? section.type} section`}
                  />
                </div>
              </div>
              {editingId === section.id && editable && (
                <div className="border-t border-slate-100 p-4">
                  <SectionEditor
                    section={section}
                    links={linkOptions}
                    fullLinks={links}
                    pageId={pageId}
                    sourceProduct={sourceProduct}
                    saving={busy !== null}
                    onSaveContent={(content) => patchSection(section.id, { content }, `save-${section.id}`)}
                    onLinksChanged={onChanged}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
      {!hasGallery && (
        <Button type="button" variant="outline" size="sm" className="mt-3 rounded-lg" disabled={busy !== null} onClick={addGallery}>
          <Plus className="h-3.5 w-3.5 mr-1" /> {busy === "add-gallery" ? "Adding..." : "Add gallery section"}
        </Button>
      )}
    </AdminFormSection>
  )
}

// ---------------------------------------------------------------------------
// Per-type editor dispatch + linked-product management for PRODUCTS
// ---------------------------------------------------------------------------

function SectionEditor({
  section,
  links,
  fullLinks,
  pageId,
  sourceProduct,
  saving,
  onSaveContent,
  onLinksChanged,
}: {
  section: LandingSectionRow
  links: ProductLinkOption[]
  fullLinks: LandingProductLink[]
  pageId: string
  sourceProduct: { name: string; shortDescription: string | null; description: string | null; images: string[] } | null
  saving: boolean
  onSaveContent: (content: unknown) => void
  onLinksChanged: () => void
}) {
  switch (section.type) {
    case "HERO": {
      const parsed = parseSectionContent<HeroContent>("HERO", section.content) ?? {
        eyebrow: "", headline: "", subheadline: "", description: "", media: [], layout: "split",
        primaryCta: { label: "Shop Now", target: "products" }, secondaryCta: null, trustLine: "", showPrice: false,
      }
      return <HeroEditor initial={parsed} links={links} sourceProduct={sourceProduct} onSave={onSaveContent} saving={saving} />
    }
    case "BENEFITS": {
      const parsed = parseSectionContent<BenefitsContent>("BENEFITS", section.content) ?? { heading: "", subheading: "", items: [] }
      return <BenefitsEditor initial={parsed} onSave={onSaveContent} saving={saving} />
    }
    case "PRODUCTS": {
      const parsed = parseSectionContent<ProductsContent>("PRODUCTS", section.content) ?? {
        heading: "Featured Products", subheading: "", showPrice: true, showOldPrice: true, showStock: false, ctaLabel: "View",
      }
      return (
        <div className="space-y-5">
          <ProductsEditor initial={parsed} onSave={onSaveContent} saving={saving} />
          <LinkedProductsManager pageId={pageId} links={fullLinks} onChanged={onLinksChanged} />
        </div>
      )
    }
    case "GALLERY": {
      const parsed = parseSectionContent<GalleryContent>("GALLERY", section.content) ?? { heading: "", subheading: "", layout: "grid", items: [] }
      return <GalleryEditor initial={parsed} onSave={onSaveContent} saving={saving} />
    }
    case "OFFERS": {
      const parsed = parseSectionContent<OffersContent>("OFFERS", section.content) ?? {
        heading: "Choose Your Bundle", subheading: "", layout: "cards", showRegularPrice: true, showSavings: true, selectionLabel: "Select", helperText: "",
      }
      return <OffersEditor initial={parsed} pageId={pageId} links={fullLinks} onSave={onSaveContent} saving={saving} />
    }
    case "REVIEWS": {
      const parsed = parseSectionContent<ReviewsContent>("REVIEWS", section.content) ?? { heading: "Customer Reviews", subheading: "", layout: "grid", items: [] }
      return <ReviewsEditor initial={parsed} pageId={pageId} onSave={onSaveContent} saving={saving} />
    }
    case "FAQ": {
      const parsed = parseSectionContent<FaqContent>("FAQ", section.content) ?? { heading: "Frequently Asked Questions", subheading: "", items: [] }
      return <FaqEditor initial={parsed} onSave={onSaveContent} saving={saving} />
    }
    case "CHECKOUT": {
      const parsed = parseSectionContent<CheckoutContent>("CHECKOUT", section.content) ?? {
        heading: "Complete Your Order", subheading: "", submitButtonLabel: "Place Order",
        successHeading: "Order Placed!", successMessage: "Thank you! We will call you shortly to confirm your order.",
        showOrderSummary: true, showTrustNote: true, trustNote: "Cash on Delivery available across Bangladesh.", layout: "split",
      }
      return <CheckoutEditor initial={parsed} onSave={onSaveContent} saving={saving} />
    }
    default:
      return null
  }
}

// ---------------------------------------------------------------------------
// Linked products: add / remove / reorder / presentation edit
// ---------------------------------------------------------------------------

const inputCls = "w-full rounded-lg border border-border bg-white px-3 py-2 text-sm h-9 focus:outline-none focus:ring-2 focus:ring-primary/20"
const areaCls = "w-full rounded-lg border border-border bg-white px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"

function LinkedProductsManager({ pageId, links, onChanged }: { pageId: string; links: LandingProductLink[]; onChanged: () => void }) {
  const [busy, setBusy] = useState(false)
  const [adding, setAdding] = useState(false)
  const [query, setQuery] = useState("")
  const [hits, setHits] = useState<ProductHit[]>([])
  const [searching, setSearching] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const ordered = [...links].sort((a, b) => a.sortOrder - b.sortOrder)

  useEffect(() => {
    if (!adding) return
    const t = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/landing-pages/product-search?search=${encodeURIComponent(query)}`)
        const data = await res.json()
        if (data.success) setHits(data.data)
      } catch {
        toast.error("Product search failed")
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => clearTimeout(t)
  }, [query, adding])

  async function handleAdd(productId: string) {
    setBusy(true)
    try {
      const res = await fetch(`/api/landing-pages/${pageId}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, sortOrder: ordered.length }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Product linked")
        setAdding(false)
        setQuery("")
        onChanged()
      } else {
        toast.error(data.error ?? "Failed to link product")
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setBusy(false)
    }
  }

  async function handleRemove(linkId: string) {
    if (!confirm("Remove this product from the landing page? The product itself is not affected.")) return
    setBusy(true)
    try {
      const res = await fetch(`/api/landing-pages/${pageId}/products/${linkId}`, { method: "DELETE" })
      const data = await res.json()
      if (data.success) {
        toast.success("Product removed")
        onChanged()
      } else {
        toast.error(data.error ?? "Failed to remove product")
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setBusy(false)
    }
  }

  async function moveLink(link: LandingProductLink, dir: -1 | 1) {
    const idx = ordered.findIndex((l) => l.id === link.id)
    const j = idx + dir
    if (j < 0 || j >= ordered.length) return
    const next = [...ordered]
    ;[next[idx], next[j]] = [next[j], next[idx]]
    setBusy(true)
    try {
      const res = await fetch(`/api/landing-pages/${pageId}/products/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: next.map((l) => l.id) }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Product order saved")
        onChanged()
      } else {
        toast.error(data.error ?? "Reorder failed")
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border border-slate-200/70 p-4">
      <p className="text-sm font-semibold text-slate-800">Linked products ({ordered.length})</p>
      <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
        Commerce always resolves to the real product. Presentation edits below never modify the product itself.
      </p>
      <div className="mt-3 space-y-2">
        {ordered.length === 0 && <p className="text-xs text-slate-400">No products linked yet.</p>}
        {ordered.map((lp, i) => (
          <div key={lp.id} className="rounded-lg border border-slate-100">
            <div className="flex items-center gap-2 p-2">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded bg-slate-100 text-[10px] font-bold text-slate-500 tabular-nums">{i + 1}</span>
              {lp.product.images[0] ? (
                <Image src={lp.product.images[0]} alt={lp.product.name} width={36} height={36} className="h-9 w-9 shrink-0 rounded-md object-cover" />
              ) : (
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-slate-100">
                  <Package className="h-4 w-4 text-slate-400" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800">{lp.displayTitle || lp.product.name}</p>
                <p className="font-mono text-[11px] text-slate-400">/{lp.product.slug} · ৳{lp.product.price.toLocaleString()} · {lp.product.status}</p>
              </div>
              <button type="button" onClick={() => moveLink(lp, -1)} disabled={i === 0 || busy} className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-30" title="Move up" aria-label={`Move ${lp.product.name} up`}>
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => moveLink(lp, 1)} disabled={i === ordered.length - 1 || busy} className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-30" title="Move down" aria-label={`Move ${lp.product.name} down`}>
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => setEditingId(editingId === lp.id ? null : lp.id)} className={cn("p-1.5 rounded-md transition-colors", editingId === lp.id ? "bg-slate-900 text-white" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100")} title="Edit presentation" aria-label={`Edit presentation for ${lp.product.name}`} aria-expanded={editingId === lp.id}>
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => handleRemove(lp.id)} disabled={busy} className="p-1.5 rounded-md text-red-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30" title="Remove (product itself is untouched)" aria-label={`Remove ${lp.product.name} from landing page`}>
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            {editingId === lp.id && (
              <LinkPresentationForm pageId={pageId} link={lp} busy={busy} setBusy={setBusy} onSaved={() => { setEditingId(null); onChanged() }} />
            )}
          </div>
        ))}
      </div>
      {!adding ? (
        <Button type="button" variant="outline" size="sm" className="mt-3 rounded-lg" disabled={busy} onClick={() => setAdding(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Link a product
        </Button>
      ) : (
        <div className="mt-3 space-y-2 rounded-lg border border-slate-200 p-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search products..." autoFocus className="w-full rounded-lg border border-border bg-white pl-8 pr-3 py-2 text-sm h-9 focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 rounded-lg border border-slate-100">
            {searching ? (
              <p className="p-3 text-center text-xs text-slate-400">Searching...</p>
            ) : hits.length === 0 ? (
              <p className="p-3 text-center text-xs text-slate-400">No products found.</p>
            ) : (
              hits.filter((h) => !ordered.some((l) => l.product.id === h.id)).map((h) => (
                <button key={h.id} type="button" disabled={busy} onClick={() => handleAdd(h.id)} className="flex w-full items-center gap-2 p-2 text-left hover:bg-slate-50 disabled:opacity-50">
                  <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-700">{h.name}</span>
                  <span className="shrink-0 text-[11px] text-slate-400">৳{h.price.toLocaleString()}</span>
                </button>
              ))
            )}
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={() => { setAdding(false); setQuery("") }}>Cancel</Button>
        </div>
      )}
    </div>
  )
}

function LinkPresentationForm({
  pageId,
  link,
  busy,
  setBusy,
  onSaved,
}: {
  pageId: string
  link: LandingProductLink
  busy: boolean
  setBusy: (v: boolean) => void
  onSaved: () => void
}) {
  const [displayTitle, setDisplayTitle] = useState(link.displayTitle ?? "")
  const [displayDescription, setDisplayDescription] = useState(link.displayDescription ?? "")
  const [displayImage, setDisplayImage] = useState(link.displayImage ?? "")
  const [ctaLabel, setCtaLabel] = useState(link.ctaLabel ?? "")

  async function handleSave() {
    setBusy(true)
    try {
      const res = await fetch(`/api/landing-pages/${pageId}/products/${link.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayTitle: displayTitle || null,
          displayDescription: displayDescription || null,
          displayImage: displayImage || null,
          ctaLabel: ctaLabel || null,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Presentation saved — product unchanged")
        onSaved()
      } else {
        toast.error(data.error ?? "Save failed")
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3 border-t border-slate-100 p-3">
      <p className="text-[11px] text-slate-400">Landing-only overrides. Blank fields fall back to the real product. The live product price is always shown publicly.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-600">Display title</label>
          <input value={displayTitle} maxLength={160} onChange={(e) => setDisplayTitle(e.target.value)} placeholder={link.product.name} className={inputCls} />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-600">Card button label</label>
          <input value={ctaLabel} maxLength={40} onChange={(e) => setCtaLabel(e.target.value)} placeholder="View" className={inputCls} />
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-600">Display description (plain text)</label>
        <textarea value={displayDescription} rows={2} maxLength={1000} onChange={(e) => setDisplayDescription(e.target.value)} className={areaCls} />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-600">Display image</label>
        <ImageUploader images={displayImage ? [displayImage] : []} onChange={(imgs) => setDisplayImage(imgs[0] || "")} single label="" helperText="" folder="landing-pages" />
      </div>
      <Button type="button" size="sm" className="rounded-lg bg-slate-900 hover:bg-slate-800" disabled={busy} onClick={handleSave}>
        {busy ? "Saving..." : "Save presentation"}
      </Button>
    </div>
  )
}

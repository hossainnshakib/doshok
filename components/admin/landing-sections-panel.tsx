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

export type LandingPageItem = {
  id: string
  sortOrder: number
  name: string
  description: string | null
  shortDescription: string | null
  price: number
  compareAtPrice: number | null
  images: string[]
  sku: string | null
  ctaLabel: string | null
  active: boolean
  isPrimary: boolean
  stock: number
  reservedStock: number
  importedFromProductId: string | null
}

type ProductHit = { id: string; name: string; price: number; images: string[]; status: string }

export function LandingSectionsPanel({
  pageId,
  sections,
  items,
  onChanged,
}: {
  pageId: string
  sections: LandingSectionRow[]
  items: LandingPageItem[]
  onChanged: () => void
}) {
  const [busy, setBusy] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  const ordered = [...sections].sort((a, b) => a.sortOrder - b.sortOrder)
  const hasGallery = ordered.some((s) => s.type === "GALLERY")
  const linkOptions: ProductLinkOption[] = items.map((item) => ({ id: item.id, name: item.name }))

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
                    fullItems={items}
                    pageId={pageId}
                    saving={busy !== null}
                    onSaveContent={(content) => patchSection(section.id, { content }, `save-${section.id}`)}
                    onItemsChanged={onChanged}
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
// Per-type editor dispatch + landing-item management for PRODUCTS
// ---------------------------------------------------------------------------

function SectionEditor({
  section,
  links,
  fullItems,
  pageId,
  saving,
  onSaveContent,
  onItemsChanged,
}: {
  section: LandingSectionRow
  links: ProductLinkOption[]
  fullItems: LandingPageItem[]
  pageId: string
  saving: boolean
  onSaveContent: (content: unknown) => void
  onItemsChanged: () => void
}) {
  switch (section.type) {
    case "HERO": {
      const parsed = parseSectionContent<HeroContent>("HERO", section.content) ?? {
        eyebrow: "", headline: "", subheadline: "", description: "", media: [], layout: "split",
        primaryCta: { label: "Shop Now", target: "products" }, secondaryCta: null, trustLine: "", showPrice: false,
      }
      return <HeroEditor initial={parsed} links={links} onSave={onSaveContent} saving={saving} />
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
          <LandingItemsManager pageId={pageId} items={fullItems} onChanged={onItemsChanged} />
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
      return <OffersEditor initial={parsed} pageId={pageId} items={fullItems} onSave={onSaveContent} saving={saving} />
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
// Landing items: add / remove / reorder / edit
// ---------------------------------------------------------------------------

const inputCls = "w-full rounded-lg border border-border bg-white px-3 py-2 text-sm h-9 focus:outline-none focus:ring-2 focus:ring-primary/20"
const areaCls = "w-full rounded-lg border border-border bg-white px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"

function LandingItemsManager({ pageId, items, onChanged }: { pageId: string; items: LandingPageItem[]; onChanged: () => void }) {
  const [busy, setBusy] = useState(false)
  const [adding, setAdding] = useState(false)
  const [mode, setMode] = useState<"manual" | "import" | null>(null)
  const [query, setQuery] = useState("")
  const [hits, setHits] = useState<ProductHit[]>([])
  const [searching, setSearching] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const ordered = [...items].sort((a, b) => a.sortOrder - b.sortOrder)

  useEffect(() => {
    if (mode !== "import") return
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
  }, [query, mode])

  async function handleImport(productId: string) {
    setBusy(true)
    try {
      const res = await fetch(`/api/landing-pages/${pageId}/items/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, sortOrder: ordered.length }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Item imported")
        setAdding(false)
        setMode(null)
        setQuery("")
        onChanged()
      } else {
        toast.error(data.error ?? "Failed to import item")
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setBusy(false)
    }
  }

  async function handleCreateManual(name: string) {
    setBusy(true)
    try {
      const res = await fetch(`/api/landing-pages/${pageId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, sortOrder: ordered.length }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Item created")
        setAdding(false)
        setMode(null)
        onChanged()
      } else {
        toast.error(data.error ?? "Failed to create item")
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setBusy(false)
    }
  }

  async function handleRemove(itemId: string) {
    if (!confirm("Delete this landing page item?")) return
    setBusy(true)
    try {
      const res = await fetch(`/api/landing-pages/${pageId}/items/${itemId}`, { method: "DELETE" })
      const data = await res.json()
      if (data.success) {
        toast.success("Item deleted")
        onChanged()
      } else {
        toast.error(data.error ?? "Failed to delete item")
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setBusy(false)
    }
  }

  async function moveItem(item: LandingPageItem, dir: -1 | 1) {
    const idx = ordered.findIndex((l) => l.id === item.id)
    const j = idx + dir
    if (j < 0 || j >= ordered.length) return
    const next = [...ordered]
    ;[next[idx], next[j]] = [next[j], next[idx]]
    setBusy(true)
    try {
      const res = await fetch(`/api/landing-pages/${pageId}/items/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: next.map((l) => l.id) }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Item order saved")
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
      <p className="text-sm font-semibold text-slate-800">Landing items ({ordered.length})</p>
      <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
        Manage the items available on this landing page. Each item has its own name, price, images and stock.
      </p>
      <div className="mt-3 space-y-2">
        {ordered.length === 0 && <p className="text-xs text-slate-400">No items yet.</p>}
        {ordered.map((item, i) => (
          <div key={item.id} className={cn("rounded-lg border", !item.active ? "border-amber-200 bg-amber-50/40" : "border-slate-100")}>
            <div className="flex items-center gap-2 p-2">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded bg-slate-100 text-[10px] font-bold text-slate-500 tabular-nums">{i + 1}</span>
              {item.images[0] ? (
                <Image src={item.images[0]} alt={item.name} width={36} height={36} className="h-9 w-9 shrink-0 rounded-md object-cover" />
              ) : (
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-slate-100">
                  <Package className="h-4 w-4 text-slate-400" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate text-sm font-medium text-slate-800">
                  {item.name}
                  {!item.active && (
                    <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">Inactive</span>
                  )}
                </p>
                <p className="font-mono text-[11px] text-slate-400">৳{item.price.toLocaleString()} · Stock: {item.stock - item.reservedStock}</p>
              </div>
              <button type="button" onClick={() => moveItem(item, -1)} disabled={i === 0 || busy} className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-30" title="Move up" aria-label={`Move ${item.name} up`}>
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => moveItem(item, 1)} disabled={i === ordered.length - 1 || busy} className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-30" title="Move down" aria-label={`Move ${item.name} down`}>
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => setEditingId(editingId === item.id ? null : item.id)} className={cn("p-1.5 rounded-md transition-colors", editingId === item.id ? "bg-slate-900 text-white" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100")} title="Edit item" aria-label={`Edit ${item.name}`} aria-expanded={editingId === item.id}>
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => handleRemove(item.id)} disabled={busy} className="p-1.5 rounded-md text-red-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30" title="Delete item" aria-label={`Delete ${item.name}`}>
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            {editingId === item.id && (
              <ItemEditForm pageId={pageId} item={item} busy={busy} setBusy={setBusy} onSaved={() => { setEditingId(null); onChanged() }} />
            )}
          </div>
        ))}
      </div>
      {!adding ? (
        <div className="mt-3 flex gap-2">
          <Button type="button" variant="outline" size="sm" className="rounded-lg" disabled={busy} onClick={() => { setAdding(true); setMode("manual") }}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add item
          </Button>
          <Button type="button" variant="outline" size="sm" className="rounded-lg" disabled={busy} onClick={() => { setAdding(true); setMode("import") }}>
            <Search className="h-3.5 w-3.5 mr-1" /> Import from catalog
          </Button>
        </div>
      ) : mode === "import" ? (
        <div className="mt-3 space-y-2 rounded-lg border border-slate-200 p-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search catalog products..." autoFocus className="w-full rounded-lg border border-border bg-white pl-8 pr-3 py-2 text-sm h-9 focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 rounded-lg border border-slate-100">
            {searching ? (
              <p className="p-3 text-center text-xs text-slate-400">Searching...</p>
            ) : hits.length === 0 ? (
              <p className="p-3 text-center text-xs text-slate-400">No products found.</p>
            ) : (
              hits.map((h) => (
                <button key={h.id} type="button" disabled={busy} onClick={() => handleImport(h.id)} className="flex w-full items-center gap-2 p-2 text-left hover:bg-slate-50 disabled:opacity-50">
                  <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-700">{h.name}</span>
                  <span className="shrink-0 text-[11px] text-slate-400">৳{h.price.toLocaleString()}</span>
                </button>
              ))
            )}
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={() => { setAdding(false); setMode(null); setQuery("") }}>Cancel</Button>
        </div>
      ) : (
        <ManualItemForm onSubmit={handleCreateManual} onCancel={() => { setAdding(false); setMode(null) }} busy={busy} />
      )}
    </div>
  )
}

function ManualItemForm({ onSubmit, onCancel, busy }: { onSubmit: (name: string) => void; onCancel: () => void; busy: boolean }) {
  const [name, setName] = useState("")
  return (
    <div className="mt-3 space-y-2 rounded-lg border border-slate-200 p-3">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-600">Item name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Classic T-Shirt" className={inputCls} autoFocus />
      </div>
      <div className="flex gap-2">
        <Button type="button" size="sm" className="rounded-lg bg-slate-900 hover:bg-slate-800" disabled={busy || !name.trim()} onClick={() => onSubmit(name.trim())}>
          {busy ? "Creating..." : "Create"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  )
}

function ItemEditForm({
  pageId,
  item,
  busy,
  setBusy,
  onSaved,
}: {
  pageId: string
  item: LandingPageItem
  busy: boolean
  setBusy: (v: boolean) => void
  onSaved: () => void
}) {
  const [name, setName] = useState(item.name)
  const [price, setPrice] = useState(String(item.price))
  const [compareAtPrice, setCompareAtPrice] = useState(item.compareAtPrice != null ? String(item.compareAtPrice) : "")
  const [images, setImages] = useState<string[]>(item.images)
  const [ctaLabel, setCtaLabel] = useState(item.ctaLabel ?? "")
  const [active, setActive] = useState(item.active)

  async function handleSave() {
    setBusy(true)
    try {
      const res = await fetch(`/api/landing-pages/${pageId}/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name || undefined,
          price: price ? parseInt(price, 10) : undefined,
          compareAtPrice: compareAtPrice ? parseInt(compareAtPrice, 10) : null,
          images,
          ctaLabel: ctaLabel || null,
          active,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Item saved")
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
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-600">Name</label>
          <input value={name} maxLength={160} onChange={(e) => setName(e.target.value)} className={inputCls} />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-600">Price (৳)</label>
          <input value={price} inputMode="numeric" onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, ""))} className={cn(inputCls, "tabular-nums")} />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-600">Compare at price (৳)</label>
          <input value={compareAtPrice} inputMode="numeric" onChange={(e) => setCompareAtPrice(e.target.value.replace(/[^0-9]/g, ""))} placeholder="Optional" className={cn(inputCls, "tabular-nums")} />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-600">CTA button label</label>
          <input value={ctaLabel} maxLength={40} onChange={(e) => setCtaLabel(e.target.value)} placeholder="View" className={inputCls} />
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-600">Images</label>
        <ImageUploader images={images} onChange={setImages} label="" helperText="" folder="landing-pages" />
      </div>
      <div className="flex items-center gap-2">
        <Switch checked={active} onCheckedChange={setActive} aria-label="Item active" />
        <span className="text-xs text-slate-600">Active</span>
      </div>
      <Button type="button" size="sm" className="rounded-lg bg-slate-900 hover:bg-slate-800" disabled={busy} onClick={handleSave}>
        {busy ? "Saving..." : "Save item"}
      </Button>
    </div>
  )
}

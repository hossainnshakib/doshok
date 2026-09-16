"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { ImageUploader } from "@/components/admin/image-uploader"
import { toast } from "sonner"
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react"
import {
  BENEFIT_ICONS,
  GALLERY_LAYOUTS,
  HERO_CTA_TARGETS,
  HERO_LAYOUTS,
  MAX_BENEFITS,
  MAX_GALLERY_ITEMS,
  heroPrefillFromProduct,
} from "@/lib/landing-pages/section-schemas"
import type {
  BenefitsContent,
  BenefitItem,
  GalleryContent,
  GalleryItem,
  HeroContent,
  HeroCta,
  ProductsContent,
} from "@/lib/landing-pages/types"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Shared field primitives (match existing admin form conventions)
// ---------------------------------------------------------------------------

const inputCls =
  "w-full rounded-lg border border-border bg-white px-3 py-2 text-sm h-9 focus:outline-none focus:ring-2 focus:ring-primary/20"
const areaCls =
  "w-full rounded-lg border border-border bg-white px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
const labelCls = "text-xs font-medium text-slate-600"

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <label className={labelCls}>{label}</label>
      {children}
      {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
    </div>
  )
}

function isValidMediaUrl(v: string): boolean {
  const t = v.trim()
  return t.startsWith("/") || /^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(t)
}

export type ProductLinkOption = {
  id: string
  name: string
}

// ---------------------------------------------------------------------------
// HERO editor
// ---------------------------------------------------------------------------

function emptyCta(): HeroCta {
  return { label: "", target: "products", productSlug: "", customPath: "" }
}

function CtaFields({
  value,
  onChange,
  links,
  prefix,
}: {
  value: HeroCta
  onChange: (v: HeroCta) => void
  links: ProductLinkOption[]
  prefix: string
}) {
  return (
    <div className="grid gap-3 rounded-lg border border-slate-100 p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={`${prefix} label`}>
          <input value={value.label} maxLength={60} onChange={(e) => onChange({ ...value, label: e.target.value })} className={inputCls} placeholder="Shop Now" />
        </Field>
        <Field label={`${prefix} goes to`}>
          <select
            value={value.target}
            onChange={(e) => onChange({ ...value, target: e.target.value as HeroCta["target"] })}
            className={inputCls}
          >
            {HERO_CTA_TARGETS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </Field>
      </div>
      {value.target === "product" && (
        <Field label="Linked item">
          <select
            value={value.productSlug ?? ""}
            onChange={(e) => onChange({ ...value, productSlug: e.target.value })}
            className={inputCls}
          >
            <option value="">Select a linked item…</option>
            {links.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </Field>
      )}
      {value.target === "custom" && (
        <Field label="Internal path" hint="Must start with / — no external or javascript: URLs.">
          <input value={value.customPath ?? ""} onChange={(e) => onChange({ ...value, customPath: e.target.value })} className={cn(inputCls, "font-mono")} placeholder="/products" />
        </Field>
      )}
    </div>
  )
}

export function HeroEditor({
  initial,
  links,
  onSave,
  saving,
}: {
  initial: HeroContent
  links: ProductLinkOption[]
  onSave: (content: HeroContent) => void
  saving: boolean
}) {
  const [form, setForm] = useState<HeroContent>(initial)
  const [mediaAlts, setMediaAlts] = useState<string[]>(initial.media.map((m) => m.alt))
  const [mediaSlugs, setMediaSlugs] = useState<string[]>(initial.media.map((m) => m.productSlug ?? ""))
  const [secondaryOn, setSecondaryOn] = useState(!!initial.secondaryCta)

  const set = (patch: Partial<HeroContent>) => setForm((f) => ({ ...f, ...patch }))

  function handleImages(urls: string[]) {
    const next = urls.slice(0, 3)
    setForm((f) => ({
      ...f,
      media: next.map((url, i) => ({
        url,
        alt: mediaAlts[i] ?? "",
        ...(mediaSlugs[i] ? { productSlug: mediaSlugs[i] } : {}),
      })),
    }))
  }

  function handleSave() {
    if (!form.headline.trim() && form.media.length === 0 && !form.description.trim()) {
      toast.error("Add a headline, description, or at least one image")
      return
    }
    for (const m of form.media) {
      if (!isValidMediaUrl(m.url)) {
        toast.error("One or more media URLs are invalid")
        return
      }
    }
    const secondaryCta = secondaryOn ? form.secondaryCta ?? emptyCta() : null
    if (secondaryCta && !secondaryCta.label.trim()) {
      toast.error("Secondary CTA needs a label")
      return
    }
    if (!form.primaryCta.label.trim()) {
      toast.error("Primary CTA needs a label")
      return
    }
    onSave({ ...form, secondaryCta })
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Eyebrow / badge">
          <input value={form.eyebrow} maxLength={80} onChange={(e) => set({ eyebrow: e.target.value })} className={inputCls} placeholder="New arrival" />
        </Field>
        <Field label="Layout preset">
          <select value={form.layout} onChange={(e) => set({ layout: e.target.value as HeroContent["layout"] })} className={inputCls}>
            {HERO_LAYOUTS.map((l) => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Headline">
        <input value={form.headline} maxLength={160} onChange={(e) => set({ headline: e.target.value })} className={inputCls} placeholder="Campaign headline" />
      </Field>
      <Field label="Subheadline">
        <input value={form.subheadline} maxLength={220} onChange={(e) => set({ subheadline: e.target.value })} className={inputCls} />
      </Field>
      <Field label="Description" hint="Plain text only.">
        <textarea value={form.description} rows={3} maxLength={1000} onChange={(e) => set({ description: e.target.value })} className={areaCls} />
      </Field>
      <div className="space-y-2">
        <p className={labelCls}>Media (up to 3)</p>
        <ImageUploader images={form.media.map((m) => m.url)} onChange={handleImages} label="" helperText="" folder="landing-pages" />
        {form.media.map((m, i) => (
          <div key={`${m.url}-${i}`} className="grid gap-2 rounded-lg border border-slate-100 p-2 sm:grid-cols-2">
            <input
              value={mediaAlts[i] ?? ""}
              maxLength={160}
              placeholder={`Alt text for image ${i + 1}`}
              onChange={(e) => {
                const next = [...mediaAlts]
                next[i] = e.target.value
                setMediaAlts(next)
                setForm((f) => ({ ...f, media: f.media.map((mm, j) => (j === i ? { ...mm, alt: e.target.value } : mm)) }))
              }}
              className={inputCls}
              aria-label={`Alt text for image ${i + 1}`}
            />
            <select
              value={mediaSlugs[i] ?? ""}
              onChange={(e) => {
                const next = [...mediaSlugs]
                next[i] = e.target.value
                setMediaSlugs(next)
                setForm((f) => ({
                  ...f,
                  media: f.media.map((mm, j) => {
                    if (j !== i) return mm
                    if (!e.target.value) {
                      const next: typeof mm = { url: mm.url, alt: mm.alt }
                      return next
                    }
                    return { ...mm, productSlug: e.target.value }
                  }),
                }))
              }}
              className={inputCls}
              aria-label={`Item link for image ${i + 1}`}
            >
              <option value="">No item link</option>
              {links.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <p className={labelCls}>Primary CTA</p>
        <CtaFields value={form.primaryCta} onChange={(v) => set({ primaryCta: v })} links={links} prefix="Primary" />
      </div>
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-xs text-slate-600">
          <Switch checked={secondaryOn} onCheckedChange={setSecondaryOn} aria-label="Enable secondary CTA" />
          Show secondary CTA
        </label>
        {secondaryOn && (
          <CtaFields value={form.secondaryCta ?? emptyCta()} onChange={(v) => set({ secondaryCta: v })} links={links} prefix="Secondary" />
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Trust line">
          <input value={form.trustLine} maxLength={160} onChange={(e) => set({ trustLine: e.target.value })} className={inputCls} placeholder="Cash on delivery available" />
        </Field>
        <div className="flex items-end pb-1">
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <Switch checked={form.showPrice} onCheckedChange={(v) => set({ showPrice: v })} aria-label="Show first item price in hero" />
            Show first item's current price
          </label>
        </div>
      </div>
      <Button type="button" className="rounded-lg bg-slate-900 hover:bg-slate-800" disabled={saving} onClick={handleSave}>
        {saving ? "Saving..." : "Save Hero"}
      </Button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// BENEFITS editor
// ---------------------------------------------------------------------------

export function BenefitsEditor({
  initial,
  onSave,
  saving,
}: {
  initial: BenefitsContent
  onSave: (content: BenefitsContent) => void
  saving: boolean
}) {
  const [heading, setHeading] = useState(initial.heading)
  const [subheading, setSubheading] = useState(initial.subheading)
  const [items, setItems] = useState<BenefitItem[]>(initial.items)

  function addItem() {
    if (items.length >= MAX_BENEFITS) {
      toast.error(`Maximum ${MAX_BENEFITS} benefits`)
      return
    }
    setItems([...items, { id: crypto.randomUUID(), icon: "badge", title: "", description: "" }])
  }

  function move(index: number, dir: -1 | 1) {
    const j = index + dir
    if (j < 0 || j >= items.length) return
    const next = [...items]
    ;[next[index], next[j]] = [next[j], next[index]]
    setItems(next)
  }

  function handleSave() {
    for (const item of items) {
      if (!item.title.trim()) {
        toast.error("Every benefit needs a title")
        return
      }
    }
    onSave({ heading, subheading, items })
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Heading">
          <input value={heading} maxLength={120} onChange={(e) => setHeading(e.target.value)} className={inputCls} placeholder="Why shop with us" />
        </Field>
        <Field label="Subheading">
          <input value={subheading} maxLength={300} onChange={(e) => setSubheading(e.target.value)} className={inputCls} />
        </Field>
      </div>
      <div className="space-y-2">
        <p className={labelCls}>Benefits ({items.length}/{MAX_BENEFITS})</p>
        {items.map((item, i) => (
          <div key={item.id} className="space-y-2 rounded-lg border border-slate-100 p-3">
            <div className="grid gap-2 sm:grid-cols-[140px_1fr]">
              <select
                value={item.icon}
                onChange={(e) => setItems(items.map((it) => (it.id === item.id ? { ...it, icon: e.target.value as BenefitItem["icon"] } : it)))}
                className={inputCls}
                aria-label={`Icon for benefit ${i + 1}`}
              >
                {BENEFIT_ICONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <input
                value={item.title}
                maxLength={80}
                placeholder={`Benefit ${i + 1} title`}
                onChange={(e) => setItems(items.map((it) => (it.id === item.id ? { ...it, title: e.target.value } : it)))}
                className={inputCls}
                aria-label={`Title for benefit ${i + 1}`}
              />
            </div>
            <textarea
              value={item.description}
              rows={2}
              maxLength={300}
              placeholder="Short description (plain text)"
              onChange={(e) => setItems(items.map((it) => (it.id === item.id ? { ...it, description: e.target.value } : it)))}
              className={areaCls}
              aria-label={`Description for benefit ${i + 1}`}
            />
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-30" title="Move up" aria-label={`Move benefit ${i + 1} up`}>
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1} className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-30" title="Move down" aria-label={`Move benefit ${i + 1} down`}>
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => setItems(items.filter((it) => it.id !== item.id))} className="ml-auto p-1.5 rounded-md text-red-400 hover:text-red-600 hover:bg-red-50" title="Remove" aria-label={`Remove benefit ${i + 1}`}>
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={addItem} disabled={items.length >= MAX_BENEFITS}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add benefit
        </Button>
      </div>
      <Button type="button" className="rounded-lg bg-slate-900 hover:bg-slate-800" disabled={saving} onClick={handleSave}>
        {saving ? "Saving..." : "Save Benefits"}
      </Button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// PRODUCTS presentation editor (controls only — items managed alongside)
// ---------------------------------------------------------------------------

export function ProductsEditor({
  initial,
  onSave,
  saving,
}: {
  initial: ProductsContent
  onSave: (content: ProductsContent) => void
  saving: boolean
}) {
  const [form, setForm] = useState<ProductsContent>(initial)
  const set = (patch: Partial<ProductsContent>) => setForm((f) => ({ ...f, ...patch }))

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Heading">
          <input value={form.heading} maxLength={120} onChange={(e) => set({ heading: e.target.value })} className={inputCls} />
        </Field>
        <Field label="Default card button label">
          <input value={form.ctaLabel} maxLength={40} onChange={(e) => set({ ctaLabel: e.target.value })} className={inputCls} placeholder="View" />
        </Field>
      </div>
      <Field label="Subheading">
        <input value={form.subheading} maxLength={300} onChange={(e) => set({ subheading: e.target.value })} className={inputCls} />
      </Field>
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-xs text-slate-600">
          <Switch checked={form.showPrice} onCheckedChange={(v) => set({ showPrice: v })} aria-label="Show current item price" />
          Show current price
        </label>
        <label className="flex items-center gap-2 text-xs text-slate-600">
          <Switch checked={form.showOldPrice} onCheckedChange={(v) => set({ showOldPrice: v })} aria-label="Show compare price" />
          Show compare price
        </label>
        <label className="flex items-center gap-2 text-xs text-slate-600">
          <Switch checked={form.showStock} onCheckedChange={(v) => set({ showStock: v })} aria-label="Show stock status" />
          Show stock status
        </label>
      </div>
      <Button type="button" className="rounded-lg bg-slate-900 hover:bg-slate-800" disabled={saving} onClick={() => onSave(form)}>
        {saving ? "Saving..." : "Save Products Display"}
      </Button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// GALLERY editor
// ---------------------------------------------------------------------------

export function GalleryEditor({
  initial,
  onSave,
  saving,
}: {
  initial: GalleryContent
  onSave: (content: GalleryContent) => void
  saving: boolean
}) {
  const [heading, setHeading] = useState(initial.heading)
  const [subheading, setSubheading] = useState(initial.subheading)
  const [layout, setLayout] = useState<GalleryContent["layout"]>(initial.layout)
  const [items, setItems] = useState<GalleryItem[]>(initial.items)

  function handleImages(urls: string[]) {
    const next = urls.slice(0, MAX_GALLERY_ITEMS)
    setItems(next.map((url) => {
      const prev = items.find((it) => it.url === url)
      return prev ?? { url, alt: "", caption: "" }
    }))
  }

  function move(index: number, dir: -1 | 1) {
    const j = index + dir
    if (j < 0 || j >= items.length) return
    const next = [...items]
    ;[next[index], next[j]] = [next[j], next[index]]
    setItems(next)
  }

  function handleSave() {
    for (const item of items) {
      if (!isValidMediaUrl(item.url)) {
        toast.error("One or more gallery URLs are invalid")
        return
      }
    }
    onSave({ heading, subheading, layout, items })
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Heading">
          <input value={heading} maxLength={120} onChange={(e) => setHeading(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Layout preset">
          <select value={layout} onChange={(e) => setLayout(e.target.value as GalleryContent["layout"])} className={inputCls}>
            {GALLERY_LAYOUTS.map((l) => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Subheading">
        <input value={subheading} maxLength={300} onChange={(e) => setSubheading(e.target.value)} className={inputCls} />
      </Field>
      <div className="space-y-2">
        <p className={labelCls}>Images ({items.length}/{MAX_GALLERY_ITEMS})</p>
        <ImageUploader images={items.map((i) => i.url)} onChange={handleImages} label="" helperText="" folder="landing-pages" />
        {items.map((item, i) => (
          <div key={`${item.url}-${i}`} className="grid gap-2 rounded-lg border border-slate-100 p-2 sm:grid-cols-2">
            <input
              value={item.alt}
              maxLength={160}
              placeholder={`Alt text for image ${i + 1}`}
              onChange={(e) => setItems(items.map((it, j) => (j === i ? { ...it, alt: e.target.value } : it)))}
              className={inputCls}
              aria-label={`Alt text for gallery image ${i + 1}`}
            />
            <div className="flex gap-1">
              <input
                value={item.caption}
                maxLength={200}
                placeholder="Caption (optional)"
                onChange={(e) => setItems(items.map((it, j) => (j === i ? { ...it, caption: e.target.value } : it)))}
                className={cn(inputCls, "flex-1")}
                aria-label={`Caption for gallery image ${i + 1}`}
              />
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-30" title="Move up" aria-label={`Move gallery image ${i + 1} up`}>
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1} className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-30" title="Move down" aria-label={`Move gallery image ${i + 1} down`}>
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
      <Button type="button" className="rounded-lg bg-slate-900 hover:bg-slate-800" disabled={saving} onClick={handleSave}>
        {saving ? "Saving..." : "Save Gallery"}
      </Button>
    </div>
  )
}

"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { ImageUploader } from "@/components/admin/image-uploader"
import { toast } from "sonner"
import { ArrowDown, ArrowUp, Plus, Star, Trash2, BadgeCheck, TriangleAlert } from "lucide-react"
import { MAX_FAQ_ITEMS, MAX_REVIEWS } from "@/lib/landing-pages/section-schemas"
import type { CheckoutContent, FaqContent, FaqItem, ReviewEntry, ReviewsContent } from "@/lib/landing-pages/types"
import { cn } from "@/lib/utils"

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

// ---------------------------------------------------------------------------
// REVIEWS editor
// ---------------------------------------------------------------------------

type ApprovedReview = {
  id: string
  productId: string
  rating: number
  title: string | null
  content: string
  isVerifiedBuyer: boolean
  createdAt: string
  user: { name: string | null }
  product: { name: string }
}

export function ReviewsEditor({
  initial,
  pageId,
  onSave,
  saving,
}: {
  initial: ReviewsContent
  pageId: string
  onSave: (content: ReviewsContent) => void
  saving: boolean
}) {
  const [heading, setHeading] = useState(initial.heading)
  const [subheading, setSubheading] = useState(initial.subheading)
  const [layout, setLayout] = useState<ReviewsContent["layout"]>(initial.layout)
  const [items, setItems] = useState<ReviewEntry[]>(initial.items)
  const [approved, setApproved] = useState<ApprovedReview[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)

  useEffect(() => {
    fetch(`/api/landing-pages/${pageId}/reviews/approved`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setApproved(d.data)
      })
      .catch(() => {})
  }, [pageId])

  const approvedById = new Map(approved.map((r) => [r.id, r]))

  function addCustom() {
    if (items.length >= MAX_REVIEWS) {
      toast.error(`Maximum ${MAX_REVIEWS} reviews`)
      return
    }
    setItems([...items, { kind: "custom", id: crypto.randomUUID(), customerName: "", rating: 5, text: "", image: "" }])
  }

  function addReference(reviewId: string) {
    if (items.length >= MAX_REVIEWS) {
      toast.error(`Maximum ${MAX_REVIEWS} reviews`)
      return
    }
    if (items.some((it) => it.kind === "reference" && it.reviewId === reviewId)) {
      toast.error("This review is already added")
      return
    }
    setItems([...items, { kind: "reference", id: crypto.randomUUID(), reviewId }])
    setPickerOpen(false)
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
      if (item.kind === "custom" && (!item.customerName.trim() || !item.text.trim())) {
        toast.error("Every testimonial needs a name and text")
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
          <select value={layout} onChange={(e) => setLayout(e.target.value as ReviewsContent["layout"])} className={inputCls}>
            <option value="grid">Grid</option>
            <option value="list">List</option>
          </select>
        </Field>
      </div>
      <Field label="Subheading">
        <input value={subheading} maxLength={300} onChange={(e) => setSubheading(e.target.value)} className={inputCls} />
      </Field>

      <div className="space-y-2">
        <p className={labelCls}>Reviews ({items.length}/{MAX_REVIEWS})</p>
        {items.map((item, i) => (
          <div key={item.id} className="space-y-2 rounded-lg border border-slate-100 p-3">
            {item.kind === "custom" ? (
              <>
                <div className="grid gap-2 sm:grid-cols-[1fr_130px]">
                  <input
                    value={item.customerName}
                    maxLength={80}
                    placeholder="Customer name"
                    onChange={(e) => setItems(items.map((it) => (it.id === item.id ? { ...it, customerName: e.target.value } : it)))}
                    className={inputCls}
                    aria-label={`Customer name for testimonial ${i + 1}`}
                  />
                  <select
                    value={item.rating}
                    onChange={(e) => setItems(items.map((it) => (it.id === item.id ? { ...it, rating: parseInt(e.target.value, 10) } : it)))}
                    className={inputCls}
                    aria-label={`Rating for testimonial ${i + 1}`}
                  >
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>{n} star{n > 1 ? "s" : ""}</option>
                    ))}
                  </select>
                </div>
                <textarea
                  value={item.text}
                  rows={2}
                  maxLength={1000}
                  placeholder="Testimonial text (plain text)"
                  onChange={(e) => setItems(items.map((it) => (it.id === item.id ? { ...it, text: e.target.value } : it)))}
                  className={areaCls}
                  aria-label={`Text for testimonial ${i + 1}`}
                />
                <ImageUploader
                  images={item.image ? [item.image] : []}
                  onChange={(imgs) => setItems(items.map((it) => (it.id === item.id ? { ...it, image: imgs[0] || "" } : it)))}
                  single
                  label=""
                  helperText=""
                  folder="landing-pages"
                />
                <p className="text-[11px] text-slate-400">Custom testimonials never show a verified badge.</p>
              </>
            ) : (
              <ReferenceRow review={approvedById.get(item.reviewId) ?? null} />
            )}
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-30" title="Move up" aria-label={`Move review ${i + 1} up`}>
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1} className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-30" title="Move down" aria-label={`Move review ${i + 1} down`}>
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => setItems(items.filter((it) => it.id !== item.id))} className="ml-auto p-1.5 rounded-md text-red-400 hover:text-red-600 hover:bg-red-50" title="Remove" aria-label={`Remove review ${i + 1}`}>
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={addCustom} disabled={items.length >= MAX_REVIEWS}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add testimonial
          </Button>
          <Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={() => setPickerOpen((v) => !v)} disabled={items.length >= MAX_REVIEWS}>
            <Star className="h-3.5 w-3.5 mr-1" /> Add approved product review
          </Button>
        </div>
        {pickerOpen && (
          <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
            {approved.length === 0 ? (
              <p className="p-3 text-center text-xs text-slate-400">No approved reviews on the linked products yet.</p>
            ) : (
              approved.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => addReference(r.id)}
                  disabled={items.some((it) => it.kind === "reference" && it.reviewId === r.id)}
                  className="flex w-full items-start gap-2 rounded-md p-2 text-left hover:bg-slate-50 disabled:opacity-40"
                >
                  <span className="flex shrink-0 items-center gap-0.5 pt-0.5" aria-label={`${r.rating} out of 5 stars`}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className={cn("h-3 w-3", s <= r.rating ? "fill-amber-400 text-amber-400" : "text-slate-200")} />
                    ))}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium text-slate-700">
                      {r.user.name ?? "Customer"} · {r.product.name}
                      {r.isVerifiedBuyer && <span className="ml-1 font-bold text-emerald-600">· Verified</span>}
                    </span>
                    <span className="block truncate text-[11px] text-slate-400">{r.title ? `${r.title} — ` : ""}{r.content}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>
      <Button type="button" className="rounded-lg bg-slate-900 hover:bg-slate-800" disabled={saving} onClick={handleSave}>
        {saving ? "Saving..." : "Save Reviews"}
      </Button>
    </div>
  )
}

function ReferenceRow({ review }: { review: ApprovedReview | null }) {
  if (!review) {
    return (
      <p className="flex items-start gap-1.5 rounded-md bg-amber-50 border border-amber-200 px-2.5 py-2 text-[11px] leading-relaxed text-amber-700">
        <TriangleAlert className="h-3.5 w-3.5 shrink-0 mt-0.5" />
        Referenced review is no longer approved — it is skipped on the public page until re-approved.
      </p>
    )
  }
  return (
    <div className="rounded-md bg-slate-50 px-2.5 py-2">
      <p className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
        {review.user.name ?? "Customer"}
        {review.isVerifiedBuyer && (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">
            <BadgeCheck className="h-2.5 w-2.5" /> Verified
          </span>
        )}
        <span className="ml-auto font-normal text-slate-400">{review.product.name}</span>
      </p>
      <p className="mt-1 truncate text-[11px] text-slate-500">{review.title ? `${review.title} — ` : ""}{review.content}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// CHECKOUT editor (presentation only — prices/logic are never editable)
// ---------------------------------------------------------------------------

export function CheckoutEditor({
  initial,
  onSave,
  saving,
}: {
  initial: CheckoutContent
  onSave: (content: CheckoutContent) => void
  saving: boolean
}) {
  const [form, setForm] = useState<CheckoutContent>(initial)
  const set = (patch: Partial<CheckoutContent>) => setForm((f) => ({ ...f, ...patch }))

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Heading">
          <input value={form.heading} maxLength={120} onChange={(e) => set({ heading: e.target.value })} className={inputCls} />
        </Field>
        <Field label="Layout preset">
          <select value={form.layout} onChange={(e) => set({ layout: e.target.value as CheckoutContent["layout"] })} className={inputCls}>
            <option value="split">Split (form + summary)</option>
            <option value="stacked">Stacked</option>
          </select>
        </Field>
      </div>
      <Field label="Subheading">
        <input value={form.subheading} maxLength={300} onChange={(e) => set({ subheading: e.target.value })} className={inputCls} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Submit button label">
          <input value={form.submitButtonLabel} maxLength={40} onChange={(e) => set({ submitButtonLabel: e.target.value })} className={inputCls} placeholder="Place Order" />
        </Field>
        <Field label="Trust note">
          <input value={form.trustNote} maxLength={300} onChange={(e) => set({ trustNote: e.target.value })} className={inputCls} />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Success heading">
          <input value={form.successHeading} maxLength={120} onChange={(e) => set({ successHeading: e.target.value })} className={inputCls} />
        </Field>
        <Field label="Success message">
          <input value={form.successMessage} maxLength={500} onChange={(e) => set({ successMessage: e.target.value })} className={inputCls} />
        </Field>
      </div>
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-xs text-slate-600">
          <Switch checked={form.showOrderSummary} onCheckedChange={(v) => set({ showOrderSummary: v })} aria-label="Show order summary" />
          Show order summary
        </label>
        <label className="flex items-center gap-2 text-xs text-slate-600">
          <Switch checked={form.showTrustNote} onCheckedChange={(v) => set({ showTrustNote: v })} aria-label="Show trust note" />
          Show trust note
        </label>
      </div>
      <p className="rounded-lg bg-slate-50 px-3 py-2 text-[11px] leading-relaxed text-slate-500">
        Presentation only. Prices, delivery, payment and stock logic are fixed by the order engine and cannot be changed here.
      </p>
      <Button type="button" className="rounded-lg bg-slate-900 hover:bg-slate-800" disabled={saving} onClick={() => onSave(form)}>
        {saving ? "Saving..." : "Save Checkout Display"}
      </Button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// FAQ editor
// ---------------------------------------------------------------------------

export function FaqEditor({
  initial,
  onSave,
  saving,
}: {
  initial: FaqContent
  onSave: (content: FaqContent) => void
  saving: boolean
}) {
  const [heading, setHeading] = useState(initial.heading)
  const [subheading, setSubheading] = useState(initial.subheading)
  const [items, setItems] = useState<FaqItem[]>(initial.items)

  function addItem() {
    if (items.length >= MAX_FAQ_ITEMS) {
      toast.error(`Maximum ${MAX_FAQ_ITEMS} questions`)
      return
    }
    setItems([...items, { id: crypto.randomUUID(), question: "", answer: "" }])
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
      if (!item.question.trim() || !item.answer.trim()) {
        toast.error("Every FAQ needs a question and an answer")
        return
      }
    }
    onSave({ heading, subheading, items })
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Heading">
          <input value={heading} maxLength={120} onChange={(e) => setHeading(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Subheading">
          <input value={subheading} maxLength={300} onChange={(e) => setSubheading(e.target.value)} className={inputCls} />
        </Field>
      </div>
      <div className="space-y-2">
        <p className={labelCls}>Questions ({items.length}/{MAX_FAQ_ITEMS})</p>
        {items.map((item, i) => (
          <div key={item.id} className="space-y-2 rounded-lg border border-slate-100 p-3">
            <input
              value={item.question}
              maxLength={200}
              placeholder={`Question ${i + 1}`}
              onChange={(e) => setItems(items.map((it) => (it.id === item.id ? { ...it, question: e.target.value } : it)))}
              className={inputCls}
              aria-label={`Question ${i + 1}`}
            />
            <textarea
              value={item.answer}
              rows={3}
              maxLength={2000}
              placeholder="Answer (plain text)"
              onChange={(e) => setItems(items.map((it) => (it.id === item.id ? { ...it, answer: e.target.value } : it)))}
              className={areaCls}
              aria-label={`Answer ${i + 1}`}
            />
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-30" title="Move up" aria-label={`Move question ${i + 1} up`}>
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1} className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-30" title="Move down" aria-label={`Move question ${i + 1} down`}>
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => setItems(items.filter((it) => it.id !== item.id))} className="ml-auto p-1.5 rounded-md text-red-400 hover:text-red-600 hover:bg-red-50" title="Remove" aria-label={`Remove question ${i + 1}`}>
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={addItem} disabled={items.length >= MAX_FAQ_ITEMS}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add question
        </Button>
      </div>
      <Button type="button" className="rounded-lg bg-slate-900 hover:bg-slate-800" disabled={saving} onClick={handleSave}>
        {saving ? "Saving..." : "Save FAQ"}
      </Button>
    </div>
  )
}

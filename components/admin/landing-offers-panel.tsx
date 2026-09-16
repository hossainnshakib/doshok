"use client"

import { startTransition, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { ArrowDown, ArrowUp, Minus, Pencil, Plus, Trash2 } from "lucide-react"
import type { OffersContent } from "@/lib/landing-pages/types"
import { OFFERS_LAYOUTS } from "@/lib/landing-pages/section-schemas"
import type { ResolvedOffer } from "@/lib/landing-pages/types"
import type { LandingPageItem } from "./landing-sections-panel"
import { cn } from "@/lib/utils"

const inputCls =
  "w-full rounded-lg border border-border bg-white px-3 py-2 text-sm h-9 focus:outline-none focus:ring-2 focus:ring-primary/20"
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
// OFFERS presentation editor + offer manager
// ---------------------------------------------------------------------------

export function OffersEditor({
  initial,
  pageId,
  items,
  onSave,
  saving,
}: {
  initial: OffersContent
  pageId: string
  items: LandingPageItem[]
  onSave: (content: OffersContent) => void
  saving: boolean
}) {
  const [form, setForm] = useState<OffersContent>(initial)
  const set = (patch: Partial<OffersContent>) => setForm((f) => ({ ...f, ...patch }))

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Heading">
          <input value={form.heading} maxLength={120} onChange={(e) => set({ heading: e.target.value })} className={inputCls} />
        </Field>
        <Field label="Layout preset">
          <select value={form.layout} onChange={(e) => set({ layout: e.target.value as OffersContent["layout"] })} className={inputCls}>
            {OFFERS_LAYOUTS.map((l) => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Subheading">
        <input value={form.subheading} maxLength={300} onChange={(e) => set({ subheading: e.target.value })} className={inputCls} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Select button label">
          <input value={form.selectionLabel} maxLength={40} onChange={(e) => set({ selectionLabel: e.target.value })} className={inputCls} placeholder="Select" />
        </Field>
        <Field label="Helper text">
          <input value={form.helperText} maxLength={300} onChange={(e) => set({ helperText: e.target.value })} className={inputCls} placeholder="Prices include..." />
        </Field>
      </div>
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-xs text-slate-600">
          <Switch checked={form.showRegularPrice} onCheckedChange={(v) => set({ showRegularPrice: v })} aria-label="Show regular price" />
          Show regular price
        </label>
        <label className="flex items-center gap-2 text-xs text-slate-600">
          <Switch checked={form.showSavings} onCheckedChange={(v) => set({ showSavings: v })} aria-label="Show savings" />
          Show savings
        </label>
      </div>
      <Button type="button" className="rounded-lg bg-slate-900 hover:bg-slate-800" disabled={saving} onClick={() => onSave(form)}>
        {saving ? "Saving..." : "Save Offers Display"}
      </Button>

      <OfferManager pageId={pageId} items={items} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Offer CRUD
// ---------------------------------------------------------------------------

type ItemQty = { landingPageItemId: string; quantity: number }

function OfferManager({ pageId, items }: { pageId: string; items: LandingPageItem[] }) {
  const [offers, setOffers] = useState<ResolvedOffer[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    startTransition(() => {
      setLoading(true)
    })
    fetch(`/api/landing-pages/${pageId}/offers`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setOffers(d.data)
        else toast.error("Failed to load offers")
      })
      .catch(() => toast.error("Failed to load offers"))
      .finally(() => setLoading(false))
  }, [pageId, refreshKey])

  function reload() {
    setRefreshKey((k) => k + 1)
  }

  async function handleDelete(offerId: string) {
    if (!confirm("Delete this offer?")) return
    setBusy(true)
    try {
      const res = await fetch(`/api/landing-pages/${pageId}/offers/${offerId}`, { method: "DELETE" })
      const data = await res.json()
      if (data.success) {
        toast.success("Offer deleted")
        reload()
      } else {
        toast.error(data.error ?? "Delete failed")
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setBusy(false)
    }
  }

  async function handleToggle(offer: ResolvedOffer, enabled: boolean) {
    setBusy(true)
    try {
      const res = await fetch(`/api/landing-pages/${pageId}/offers/${offer.offerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(enabled ? "Offer enabled" : "Offer disabled")
        reload()
      } else {
        toast.error(data.error ?? "Update failed")
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setBusy(false)
    }
  }

  async function moveOffer(offer: ResolvedOffer, dir: -1 | 1) {
    const idx = offers.findIndex((o) => o.offerId === offer.offerId)
    const j = idx + dir
    if (j < 0 || j >= offers.length) return
    const next = [...offers]
    ;[next[idx], next[j]] = [next[j], next[idx]]
    setBusy(true)
    try {
      const res = await fetch(`/api/landing-pages/${pageId}/offers/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: next.map((o) => o.offerId) }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Offer order saved")
        reload()
      } else {
        toast.error(data.error ?? "Reorder failed")
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <p className="text-xs text-slate-400">Loading offers...</p>

  return (
    <div className="rounded-xl border border-slate-200/70 p-4">
      <p className="text-sm font-semibold text-slate-800">Offers ({offers.length})</p>
      <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
        Fixed campaign prices. Regular totals and savings are recalculated server-side from live item prices.
      </p>
      <div className="mt-3 space-y-2">
        {offers.length === 0 && <p className="text-xs text-slate-400">No offers yet. Create the first bundle below.</p>}
        {offers.map((offer, i) => (
          <div key={offer.offerId} className={cn("rounded-lg border", offer.valid ? "border-slate-200/70" : "border-amber-200 bg-amber-50/40")}>
            <div className="flex items-center gap-2 p-2.5">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded bg-slate-100 text-[10px] font-bold text-slate-500 tabular-nums">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-1.5 truncate text-sm font-semibold text-slate-800">
                  {offer.offerName}
                  {offer.badge && (
                    <span className="rounded-md bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700">{offer.badge}</span>
                  )}
                  {!offer.valid && (
                    <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700" title={offer.invalidReason ?? ""}>
                      Unavailable
                    </span>
                  )}
                </p>
                <p className="mt-0.5 truncate text-[11px] text-slate-500">
                  {offer.items.map((it) => `${it.displayName} ×${it.quantity}`).join(" · ") || "No items"}
                </p>
                <p className="mt-0.5 text-[11px] tabular-nums text-slate-500">
                  Regular ৳{offer.regularTotal.toLocaleString()} · Offer <span className="font-bold text-slate-800">৳{offer.offerPrice.toLocaleString()}</span>
                  {offer.savings > 0 && <span className="font-semibold text-emerald-600"> · Save ৳{offer.savings.toLocaleString()}</span>}
                </p>
              </div>
              <button type="button" onClick={() => moveOffer(offer, -1)} disabled={i === 0 || busy} className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-30" title="Move up" aria-label={`Move ${offer.offerName} up`}>
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => moveOffer(offer, 1)} disabled={i === offers.length - 1 || busy} className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-30" title="Move down" aria-label={`Move ${offer.offerName} down`}>
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => setEditingId(editingId === offer.offerId ? null : offer.offerId)} className={cn("p-1.5 rounded-md transition-colors", editingId === offer.offerId ? "bg-slate-900 text-white" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100")} title="Edit offer" aria-label={`Edit ${offer.offerName}`} aria-expanded={editingId === offer.offerId}>
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => handleDelete(offer.offerId)} disabled={busy} className="p-1.5 rounded-md text-red-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30" title="Delete offer" aria-label={`Delete ${offer.offerName}`}>
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              <Switch checked={offer.enabled} onCheckedChange={(v) => handleToggle(offer, v)} disabled={busy} aria-label={`Enable ${offer.offerName}`} />
            </div>
            {editingId === offer.offerId && (
              <div className="border-t border-slate-100 p-3">
                <OfferForm
                  pageId={pageId}
                  items={items}
                  initial={{ name: offer.offerName, badge: offer.badge ?? "", offerPrice: offer.offerPrice, enabled: offer.enabled, matchType: offer.matchType, minQuantity: offer.minQuantity,
                    items: offer.items.map((it) => ({ landingPageItemId: it.landingPageItemId, quantity: it.quantity })) }}
                  offerId={offer.offerId}
                  busy={busy}
                  setBusy={setBusy}
                  onSaved={() => { setEditingId(null); reload() }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
      {!creating ? (
        <Button type="button" variant="outline" size="sm" className="mt-3 rounded-lg" disabled={busy || items.length === 0} onClick={() => setCreating(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> New offer
        </Button>
      ) : (
        <div className="mt-3 rounded-lg border border-slate-200 p-3">
          <OfferForm
            pageId={pageId}
            items={items}
            busy={busy}
            setBusy={setBusy}
            onSaved={() => { setCreating(false); reload() }}
            onCancel={() => setCreating(false)}
          />
        </div>
      )}
      {items.length === 0 && (
        <p className="mt-2 text-[11px] text-amber-600">Add at least one landing item before creating offers.</p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Offer create/edit form
// ---------------------------------------------------------------------------

function OfferForm({
  pageId,
  items,
  initial,
  offerId,
  busy,
  setBusy,
  onSaved,
  onCancel,
}: {
  pageId: string
  items: LandingPageItem[]
  initial?: { name: string; badge: string; offerPrice: number; enabled: boolean; matchType?: string; minQuantity?: number | null; items: ItemQty[] }
  offerId?: string
  busy: boolean
  setBusy: (v: boolean) => void
  onSaved: () => void
  onCancel?: () => void
}) {
  const [name, setName] = useState(initial?.name ?? "")
  const [badge, setBadge] = useState(initial?.badge ?? "")
  const [offerPrice, setOfferPrice] = useState(initial ? String(initial.offerPrice) : "")
  const [enabled, setEnabled] = useState(initial?.enabled ?? true)
  const [matchType, setMatchType] = useState(initial?.matchType ?? "EXACT_COMBINATION")
  const [minQuantity, setMinQuantity] = useState(initial?.minQuantity ? String(initial.minQuantity) : "")
  const [qtys, setQtys] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {}
    for (const item of items) map[item.id] = initial?.items.find((i) => i.landingPageItemId === item.id)?.quantity ?? 0
    return map
  })

  // Display-only live estimate (server recalculates authoritatively on save).
  const regularTotal = items.reduce((sum, item) => sum + item.price * (qtys[item.id] ?? 0), 0)
  const priceNum = parseInt(offerPrice, 10)
  const savings = !Number.isNaN(priceNum) ? Math.max(0, regularTotal - priceNum) : 0

  function bump(itemId: string, dir: 1 | -1) {
    setQtys((q) => ({ ...q, [itemId]: Math.min(20, Math.max(0, (q[itemId] ?? 0) + dir)) }))
  }

  async function handleSave() {
    const offerItems = Object.entries(qtys)
      .filter(([, q]) => q > 0)
      .map(([landingPageItemId, quantity]) => ({ landingPageItemId, quantity }))
    if (!name.trim()) {
      toast.error("Offer name is required")
      return
    }
    if (offerItems.length === 0) {
      toast.error("Select at least one item with quantity")
      return
    }
    if (Number.isNaN(priceNum) || priceNum < 1) {
      toast.error("Offer price must be a positive amount")
      return
    }
    const minQtyNum = minQuantity ? parseInt(minQuantity, 10) : null
    if (matchType === "QUANTITY_TIER" && (!minQtyNum || minQtyNum < 2)) {
      toast.error("Minimum quantity must be at least 2 for quantity-tier offers")
      return
    }
    if (matchType === "QUANTITY_TIER" && minQtyNum) {
      const totalQty = offerItems.reduce((sum, it) => sum + it.quantity, 0)
      if (totalQty < minQtyNum) {
        toast.error(`Add at least ${minQtyNum} total items to create a quantity-tier offer. Currently: ${totalQty}`)
        return
      }
    }
    setBusy(true)
    try {
      const url = offerId ? `/api/landing-pages/${pageId}/offers/${offerId}` : `/api/landing-pages/${pageId}/offers`
      const res = await fetch(url, {
        method: offerId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          badge: badge.trim() || null,
          offerPrice: priceNum,
          enabled,
          matchType,
          minQuantity: matchType === "QUANTITY_TIER" ? minQtyNum : null,
          items: offerItems,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(offerId ? "Offer updated" : "Offer created")
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
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Offer name">
          <input value={name} maxLength={120} onChange={(e) => setName(e.target.value)} placeholder="Buy 2 — Best Value" className={inputCls} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Badge (optional)">
            <input value={badge} maxLength={40} onChange={(e) => setBadge(e.target.value)} placeholder="Best Value" className={inputCls} />
          </Field>
          <Field label="Offer price (৳)">
            <input value={offerPrice} inputMode="numeric" onChange={(e) => setOfferPrice(e.target.value.replace(/[^0-9]/g, ""))} placeholder="2100" className={cn(inputCls, "tabular-nums")} />
          </Field>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Match type" hint="How this offer applies to customer selections">
          <select value={matchType} onChange={(e) => setMatchType(e.target.value)} className={inputCls}>
            <option value="EXACT_COMBINATION">Exact combination (specific items + quantities)</option>
            <option value="QUANTITY_TIER">Quantity tier (any N eligible items)</option>
          </select>
        </Field>
        {matchType === "QUANTITY_TIER" && (
          <Field label="Minimum quantity" hint="Min items needed to trigger this offer">
            <input value={minQuantity} inputMode="numeric" onChange={(e) => setMinQuantity(e.target.value.replace(/[^0-9]/g, ""))} placeholder="2" min="2" max="20" className={cn(inputCls, "tabular-nums")} />
          </Field>
        )}
      </div>
      {matchType === "QUANTITY_TIER" && minQuantity && parseInt(minQuantity, 10) > items.length && (
        <p className="text-[11px] text-amber-600">
          Add at least {parseInt(minQuantity, 10) - items.length} more {parseInt(minQuantity, 10) - items.length === 1 ? "item" : "items"} to create a Buy Any {minQuantity} offer.
        </p>
      )}
      <div className="space-y-1.5">
        <p className={labelCls}>Items & quantities</p>
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-2 rounded-lg border border-slate-100 px-2.5 py-1.5">
            <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-700">
              {item.name}
              <span className="ml-1.5 font-normal text-slate-400 tabular-nums">৳{item.price.toLocaleString()} each</span>
            </span>
            <div className="flex shrink-0 items-center gap-1">
              <button type="button" onClick={() => bump(item.id, -1)} disabled={(qtys[item.id] ?? 0) === 0} className="grid h-6 w-6 place-items-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30" aria-label={`Decrease quantity for ${item.name}`}>
                <Minus className="h-3 w-3" />
              </button>
              <span className="w-6 text-center text-xs font-bold tabular-nums" aria-live="polite">{qtys[item.id] ?? 0}</span>
              <button type="button" onClick={() => bump(item.id, 1)} disabled={(qtys[item.id] ?? 0) >= 20} className="grid h-6 w-6 place-items-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30" aria-label={`Increase quantity for ${item.name}`}>
                <Plus className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-lg bg-slate-50 px-3 py-2 text-[11px] tabular-nums text-slate-600">
        Regular ৳{regularTotal.toLocaleString()} · Offer ৳{(Number.isNaN(priceNum) ? 0 : priceNum).toLocaleString()}
        {savings > 0 && <span className="font-semibold text-emerald-600"> · Save ৳{savings.toLocaleString()}</span>}
        <span className="ml-1 text-slate-400">(estimate — server reprices on save)</span>
      </div>
      <label className="flex items-center gap-2 text-xs text-slate-600">
        <Switch checked={enabled} onCheckedChange={setEnabled} aria-label="Enable offer" />
        Enabled
      </label>
      <div className="flex gap-2">
        <Button type="button" size="sm" className="rounded-lg bg-slate-900 hover:bg-slate-800" disabled={busy} onClick={handleSave}>
          {busy ? "Saving..." : offerId ? "Update offer" : "Create offer"}
        </Button>
        {onCancel && (
          <Button type="button" size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
        )}
      </div>
    </div>
  )
}

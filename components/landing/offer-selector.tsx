"use client"

import Image from "next/image"
import Link from "next/link"
import { Check } from "lucide-react"
import type { ResolvedOffer } from "@/lib/landing-pages/types"
import { cn } from "@/lib/utils"
import { useLandingPageState } from "./landing-page-state"

// Offer selection UI. State (selected offer + per-unit variant picks) lives
// in the page-scoped LandingPageProvider so the checkout section below
// consumes the exact same selections — single source of truth.

function slotsFor(offer: ResolvedOffer): { linkId: string; slot: number }[] {
  const slots: { linkId: string; slot: number }[] = []
  for (const item of offer.items) {
    for (let s = 0; s < item.quantity; s++) slots.push({ linkId: item.landingPageProductId, slot: s })
  }
  return slots
}

export function OfferSelector({
  offers,
  selectionLabel,
  layout,
  showRegularPrice,
  showSavings,
  helperText,
  showInvalid,
}: {
  offers: ResolvedOffer[]
  selectionLabel: string
  layout: "cards" | "compact"
  showRegularPrice: boolean
  showSavings: boolean
  helperText: string
  showInvalid: boolean
}) {
  const { selectedOfferId, selectOffer, picks, setPick } = useLandingPageState()

  const valid = offers.filter((o) => o.valid)
  const selected = valid.find((o) => o.offerId === selectedOfferId) ?? null
  const invalid = showInvalid ? offers.filter((o) => !o.valid) : []

  if (valid.length === 0 && invalid.length === 0) return null

  return (
    <div data-selected-offer={selected?.offerId ?? ""}>
      <div
        role={layout === "cards" ? "radiogroup" : undefined}
        aria-label="Choose an offer"
        className={layout === "cards" ? "mt-6 grid gap-3 sm:grid-cols-2" : "mt-6 space-y-2"}
      >
        {valid.map((offer) => {
          const active = offer.offerId === selectedOfferId
          return (
            <article
              key={offer.offerId}
              role={layout === "cards" ? "radio" : undefined}
              aria-checked={layout === "cards" ? active : undefined}
              onClick={() => selectOffer(offer.offerId)}
              onKeyDown={(e) => {
                if (layout === "cards" && (e.key === " " || e.key === "Enter")) {
                  e.preventDefault()
                  selectOffer(offer.offerId)
                }
              }}
              tabIndex={layout === "cards" ? 0 : undefined}
              className={cn(
                "relative rounded-2xl border p-4 text-left transition",
                layout === "compact" ? "flex items-center gap-3" : "cursor-pointer",
                active ? "border-slate-900 ring-1 ring-slate-900" : "border-slate-200 hover:border-slate-400"
              )}
            >
              {offer.badge && (
                <span className="absolute -top-2.5 left-4 rounded-full bg-red-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                  {offer.badge}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold">{offer.offerName}</h3>
                <ul className="mt-1.5 space-y-1">
                  {offer.items.map((item) => (
                    <li key={item.landingPageProductId} className="flex items-center gap-2 text-xs text-slate-500">
                      {item.image && (
                        <Image src={item.image} alt="" width={24} height={24} className="h-6 w-6 shrink-0 rounded-md object-cover" aria-hidden />
                      )}
                      <span className="truncate">
                        {item.displayName} <span className="font-semibold text-slate-700">×{item.quantity}</span>
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-2.5 flex flex-wrap items-baseline gap-x-2">
                  <span className="text-xl font-bold tabular-nums">৳{offer.offerPrice.toLocaleString()}</span>
                  {showRegularPrice && (
                    <span className="text-xs text-slate-400 line-through tabular-nums">৳{offer.regularTotal.toLocaleString()}</span>
                  )}
                  {showSavings && offer.savings > 0 && (
                    <span className="rounded-md bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-[11px] font-bold text-emerald-700 tabular-nums">
                      Save ৳{offer.savings.toLocaleString()} ({offer.savingsPercent}%)
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  selectOffer(offer.offerId)
                }}
                aria-pressed={active}
                aria-label={`${selectionLabel || "Select"}: ${offer.offerName}`}
                className={cn(
                  "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-4 text-xs font-semibold transition",
                  active ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                )}
              >
                {active && <Check className="h-3.5 w-3.5" aria-hidden />}
                {active ? "Selected" : selectionLabel || "Select"}
              </button>
            </article>
          )
        })}
      </div>

      {selected && <VariantSelectors offer={selected} picks={picks} setPick={setPick} />}

      {invalid.map((offer) => (
        <div key={offer.offerId} className="mt-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-4 opacity-70">
          <p className="text-sm font-semibold text-slate-500">{offer.offerName}</p>
          <p className="mt-0.5 text-xs text-slate-400">Currently unavailable{offer.invalidReason ? ` — ${offer.invalidReason}` : ""}.</p>
        </div>
      ))}

      {helperText && <p className="mt-4 text-center text-xs text-slate-400">{helperText}</p>}
      {selected && (
        <p className="mt-2 text-center text-[11px] text-slate-400">
          <Link href="#lp-products" className="font-semibold underline underline-offset-2 hover:text-slate-600">
            View included products
          </Link>{" "}
          · selection is held for checkout
        </p>
      )}
    </div>
  )
}

function VariantSelectors({
  offer,
  picks,
  setPick,
}: {
  offer: ResolvedOffer
  picks: Record<string, { size: string; variantId: string }>
  setPick: (offerId: string, landingPageProductId: string, unitIndex: number, patch: Partial<{ size: string; variantId: string }>) => void
}) {
  const slots = slotsFor(offer)
  const needsSelection = offer.items.some((i) => i.requiresVariant)
  if (!needsSelection) return null

  return (
    <div className="mt-4 rounded-2xl border border-slate-200 p-4">
      <p className="text-xs font-semibold text-slate-700">Choose variations for “{offer.offerName}”</p>
      <p className="mt-0.5 text-[11px] text-slate-400">Only in-stock options can be picked. Nothing is reserved yet.</p>
      <div className="mt-3 space-y-3">
        {slots.map(({ linkId, slot }) => {
          const item = offer.items.find((i) => i.landingPageProductId === linkId)
          if (!item || !item.requiresVariant) return null
          const key = `${offer.offerId}:${linkId}:${slot}`
          const pick = picks[key] ?? { size: "", variantId: "" }
          const sizes = [...new Set(item.variants.map((v) => v.size))]
          const colors = item.variants.filter((v) => !pick.size || v.size === pick.size)
          return (
            <div key={key} className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr] sm:items-center">
              <p className="truncate text-xs font-medium text-slate-600">
                {item.displayName} <span className="text-slate-400">· unit {slot + 1}</span>
              </p>
              <label className="text-xs text-slate-500">
                <span className="sr-only">Size for {item.displayName} unit {slot + 1}</span>
                <select
                  value={pick.size}
                  onChange={(e) => setPick(offer.offerId, linkId, slot, { size: e.target.value, variantId: "" })}
                  className="h-9 w-full rounded-lg border border-border bg-white px-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Select size</option>
                  {sizes.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-slate-500">
                <span className="sr-only">Color for {item.displayName} unit {slot + 1}</span>
                <select
                  value={pick.variantId}
                  disabled={!pick.size}
                  onChange={(e) => setPick(offer.offerId, linkId, slot, { variantId: e.target.value })}
                  className="h-9 w-full rounded-lg border border-border bg-white px-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                >
                  <option value="">{pick.size ? "Select color" : "Pick a size first"}</option>
                  {colors.map((v) => (
                    <option key={v.id} value={v.id} disabled={v.available <= 0}>
                      {v.color}{v.available <= 0 ? " (out of stock)" : ""}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )
        })}
      </div>
    </div>
  )
}

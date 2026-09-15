"use client"

import Image from "next/image"
import { Check } from "lucide-react"
import type { PublicProductLink } from "./landing-sections"
import { useLandingPageState } from "./landing-page-state"
import { cn } from "@/lib/utils"
import { useMemo, useCallback } from "react"

// Product selection UI for the new product-driven flow.
// Customers select products; server auto-resolves the best offer.
// Includes integrated pricing summary (matching prototype's "Add More & Save").

type ProductSelectorProps = {
  links: PublicProductLink[]
  heading?: string
  subheading?: string
  ctaLabel?: string
  showPrice?: boolean
}

function availableStock(variants: { stock: number; reservedStock: number }[]): number {
  return variants.reduce((sum, v) => sum + Math.max(0, v.stock - v.reservedStock), 0)
}

export function ProductSelector({
  links,
  heading = "Choose Your Products",
  subheading,
  showPrice = true,
}: ProductSelectorProps) {
  const { selectedProductIds, toggleProduct, isProductSelected, quote } = useLandingPageState()
  const active = useMemo(() => links.filter((l) => l.product.status === "Active"), [links])

  // Prevent removing the last selected product
  const handleToggle = useCallback(
    (id: string) => {
      if (selectedProductIds.includes(id) && selectedProductIds.length === 1) {
        // Don't allow removing the last product
        return
      }
      toggleProduct(id)
    },
    [selectedProductIds, toggleProduct]
  )

  if (active.length === 0) return null

  const count = selectedProductIds.length
  const hasOffer = quote && quote.savings > 0

  return (
    <section aria-label={heading} id="lp-products" className="scroll-mt-6">
      <div className="text-center">
        <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{heading}</h2>
        {subheading && <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">{subheading}</p>}
      </div>

      <div className="mt-6 space-y-2">
        {active.map((lp) => {
          const p = lp.product
          const stock = availableStock(p.variants)
          const selected = isProductSelected(lp.id)
          const outOfStock = stock <= 0

          return (
            <article
              key={`${p.slug}-${lp.sortOrder}`}
              onClick={() => !outOfStock && handleToggle(lp.id)}
              onKeyDown={(e) => {
                if (e.key === " " || e.key === "Enter") {
                  e.preventDefault()
                  if (!outOfStock) handleToggle(lp.id)
                }
              }}
              tabIndex={outOfStock ? undefined : 0}
              role="checkbox"
              aria-checked={selected}
              aria-disabled={outOfStock}
              className={cn(
                "relative flex items-center gap-4 py-3 px-3 text-left transition-all rounded-sm",
                outOfStock
                  ? "cursor-not-allowed bg-white border border-slate-100 opacity-60"
                  : "cursor-pointer",
                selected && !outOfStock
                  ? "bg-white border border-slate-900/10"
                  : !outOfStock
                    ? "bg-white border border-slate-200 hover:border-slate-400"
                    : "bg-white border border-slate-100"
              )}
            >
              {/* Product image */}
              {(lp.displayImage || p.images[0]) ? (
                <Image
                  src={lp.displayImage || p.images[0]}
                  alt={lp.displayTitle || p.name}
                  width={72}
                  height={72}
                  className="h-14 w-14 md:h-[4.5rem] md:w-[4.5rem] shrink-0 rounded-sm object-cover"
                />
              ) : (
                <span className="grid h-14 w-14 md:h-[4.5rem] md:w-[4.5rem] shrink-0 place-items-center rounded-sm bg-slate-100 text-lg font-bold text-slate-300" aria-hidden>
                  D
                </span>
              )}

              {/* Product info */}
              <div className="min-w-0 flex-1">
                <h3 className="text-sm md:text-[15px] font-semibold text-slate-900">{lp.displayTitle?.trim() || p.name}</h3>
                {showPrice && (
                  <p className="text-sm font-semibold text-slate-800 mt-0.5">
                    ৳{p.price.toLocaleString()}
                  </p>
                )}
                <span
                  className={cn(
                    "text-[11px] font-semibold",
                    outOfStock ? "text-slate-400" : stock <= 5 ? "text-amber-600" : "text-emerald-600"
                  )}
                >
                  {outOfStock ? "Out of stock" : stock <= 5 ? `Only ${stock} left` : ""}
                </span>
              </div>

              {/* Add/remove indicator */}
              {!outOfStock && (
                <span
                  className={cn(
                    "shrink-0 flex items-center gap-1 text-xs font-medium px-3 py-2 rounded-sm transition-all",
                    selected
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  {selected ? <><Check className="w-3.5 h-3.5" strokeWidth={2.5} /> Added</> : "+ Add"}
                </span>
              )}
            </article>
          )
        })}
      </div>

      {/* Integrated pricing summary */}
      {count > 0 && (
        <div className="mt-5 bg-white border border-slate-200 p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-700">{count} {count === 1 ? "item" : "items"} selected</span>
            {hasOffer && (
              <span className="text-[11px] font-semibold tracking-wide text-purple-700">
                Set price applied
              </span>
            )}
            {!hasOffer && count === 1 && active.length > 1 && (
              <span className="text-[11px] text-slate-400">Add another to unlock set pricing</span>
            )}
          </div>

          {hasOffer ? (
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Regular</span>
                <span className="text-slate-400 line-through">৳{quote.regularTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-purple-600 font-medium">Set saving</span>
                <span className="text-purple-600 font-medium">-৳{quote.savings.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold text-base pt-2 border-t border-slate-100">
                <span className="text-slate-900">Your Total</span>
                <span className="text-slate-900">৳{quote.offerPrice.toLocaleString()}</span>
              </div>
            </div>
          ) : (
            <div className="flex justify-between font-bold text-base">
              <span className="text-slate-900">Your Total</span>
              <span className="text-slate-900">৳{quote?.regularTotal?.toLocaleString() ?? active[0]?.product.price.toLocaleString() ?? "0"}</span>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

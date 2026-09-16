"use client"

import Image from "next/image"
import { Check } from "lucide-react"
import type { PublicLandingItem } from "./landing-sections"
import { useLandingPageState } from "./landing-page-state"
import { cn } from "@/lib/utils"
import { useMemo, useCallback, useState } from "react"

type ProductSelectorProps = {
  items: PublicLandingItem[]
  heading?: string
  subheading?: string
  showPrice?: boolean
  onContinue?: () => void
}

function availableStock(item: PublicLandingItem): number {
  const activeVariants = item.variants.filter((v) => v.active)
  if (activeVariants.length > 0) {
    return activeVariants.reduce((sum, v) => sum + Math.max(0, v.stock - v.reservedStock), 0)
  }
  return Math.max(0, item.stock - item.reservedStock)
}

export function ProductSelector({
  items,
  heading = "Add More & Save",
  subheading,
  showPrice = true,
  onContinue,
}: ProductSelectorProps) {
  const { selectedItemIds, toggleItem, isItemSelected, quote } = useLandingPageState()
  const [msg, setMsg] = useState("")
  const active = useMemo(() => items.filter((i) => i.active), [items])
  const count = selectedItemIds.length
  const hasOffer = quote && quote.savings > 0

  const handleToggle = useCallback(
    (id: string) => {
      if (selectedItemIds.includes(id) && selectedItemIds.length === 1) {
        setMsg("Choose at least one item to continue.")
        setTimeout(() => setMsg(""), 2500)
        return
      }
      toggleItem(id)
    },
    [selectedItemIds, toggleItem]
  )

  if (active.length === 0) return null

  return (
    <section className="bg-stone-50 border-y border-stone-200">
      <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-6 md:py-10">
        <h2 className="text-lg md:text-xl font-bold text-stone-900 mb-1">
          {heading}
        </h2>
        {subheading && (
          <p className="text-sm text-stone-500 mb-5">{subheading}</p>
        )}

        {/* Item rows */}
        <div className="space-y-2 mb-5">
          {active.map((item) => {
            const stock = availableStock(item)
            const selected = isItemSelected(item.id)
            const outOfStock = stock <= 0
            const img = item.displayImage || item.images[0]

            return (
              <button
                key={`${item.id}-${item.sortOrder}`}
                onClick={() => !outOfStock && handleToggle(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 md:gap-4 py-3 px-3 text-left transition-all rounded-sm",
                  selected
                    ? "bg-white border border-stone-900/10"
                    : "bg-white border border-stone-200 hover:border-stone-400",
                  outOfStock && "opacity-50 cursor-not-allowed"
                )}
                disabled={outOfStock}
              >
                {img ? (
                  <Image
                    src={img}
                    alt={item.displayTitle || item.name}
                    width={72}
                    height={72}
                    className="w-14 h-[4.5rem] md:w-[4.5rem] md:h-[5.5rem] shrink-0 rounded-sm object-cover"
                  />
                ) : (
                  <span className="grid w-14 h-[4.5rem] md:w-[4.5rem] md:h-[5.5rem] shrink-0 place-items-center rounded-sm bg-stone-100 text-sm font-bold text-stone-300">
                    D
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm md:text-[15px] font-semibold text-stone-900">
                    {item.displayTitle?.trim() || item.name}
                  </h3>
                  {showPrice && (
                    <p className="text-sm font-semibold text-stone-800 mt-0.5">
                      ৳{item.price.toLocaleString()}
                    </p>
                  )}
                  <span className={cn(
                    "text-[11px] font-medium",
                    outOfStock ? "text-stone-400" : stock <= 5 ? "text-amber-600" : "text-stone-400"
                  )}>
                    {outOfStock ? "Out of stock" : stock <= 5 ? `Only ${stock} left` : "Free Size"}
                  </span>
                </div>
                <span
                  className={cn(
                    "shrink-0 flex items-center gap-1 text-xs font-medium px-3 py-2 rounded-sm transition-all",
                    selected
                      ? "bg-stone-900 text-white"
                      : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                  )}
                >
                  {selected ? (
                    <><Check className="w-3.5 h-3.5" strokeWidth={2.5} /> Added</>
                  ) : (
                    "+ Add"
                  )}
                </span>
              </button>
            )
          })}
        </div>

        {msg && <p className="text-sm text-stone-500 mb-3 animate-in fade-in">{msg}</p>}

        {/* Integrated pricing summary */}
        <div className="bg-white border border-stone-200 p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-stone-700">
              {count} {count === 1 ? "item" : "items"} selected
            </span>
            {hasOffer && (
              <span className="text-[11px] font-semibold tracking-wide text-purple-700">
                {count === 2 ? "2-piece set price applied" : "Best value unlocked"}
              </span>
            )}
            {!hasOffer && count === 1 && active.length > 1 && (
              <span className="text-[11px] text-stone-400">Add another to unlock set pricing</span>
            )}
          </div>

          {hasOffer ? (
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-stone-500">Regular</span>
                <span className="text-stone-400 line-through">৳{quote!.regularTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-purple-600 font-medium">Set saving</span>
                <span className="text-purple-600 font-medium">-৳{quote!.savings.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold text-base pt-2 border-t border-stone-100">
                <span className="text-stone-900">Your Total</span>
                <span className="text-stone-900">৳{quote!.offerPrice.toLocaleString()}</span>
              </div>
            </div>
          ) : (
            <div className="flex justify-between font-bold text-base">
              <span className="text-stone-900">Your Total</span>
              <span className="text-stone-900">
                ৳{quote?.regularTotal?.toLocaleString() ?? active[0]?.price.toLocaleString() ?? "0"}
              </span>
            </div>
          )}

          <button
            onClick={onContinue}
            className="w-full mt-4 bg-stone-900 text-white text-sm font-semibold py-3.5 tracking-wider uppercase hover:bg-stone-800 transition-colors"
          >
            Continue to Order
          </button>
        </div>
      </div>
    </section>
  )
}

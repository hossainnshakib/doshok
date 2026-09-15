"use client"

import { createContext, useCallback, useContext, useMemo, useState } from "react"
import type { ResolvedOffer } from "@/lib/landing-pages/types"

// Landing-page-scoped checkout state. Shared by the offer selector and the
// inline checkout section on the same page — never global, never persisted
// until order submit.
//
// Selection keys are deterministic: `${offerId}:${landingPageProductId}:${unitIndex}`
// so switching offers can never leak stale cross-offer selections.

export type SlotPick = { size: string; variantId: string }

type LandingPageState = {
  selectedOfferId: string | null
  selectOffer: (offerId: string) => void
  picks: Record<string, SlotPick>
  setPick: (offerId: string, landingPageProductId: string, unitIndex: number, patch: Partial<SlotPick>) => void
  resetAll: () => void
}

const LandingPageContext = createContext<LandingPageState | null>(null)

export function useLandingPageState(): LandingPageState {
  const ctx = useContext(LandingPageContext)
  if (!ctx) throw new Error("useLandingPageState must be used inside LandingPageProvider")
  return ctx
}

export function LandingPageProvider({
  offers,
  initialSelectedOfferId,
  children,
}: {
  offers: ResolvedOffer[]
  initialSelectedOfferId: string | null
  children: React.ReactNode
}) {
  const validIds = useMemo(() => new Set(offers.filter((o) => o.valid).map((o) => o.offerId)), [offers])
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(
    initialSelectedOfferId && validIds.has(initialSelectedOfferId) ? initialSelectedOfferId : null
  )
  const [picks, setPicks] = useState<Record<string, SlotPick>>({})

  const selectOffer = useCallback(
    (offerId: string) => {
      if (!validIds.has(offerId)) return
      setSelectedOfferId(offerId)
      // Drop picks from other offers; keep this offer's picks if present.
      setPicks((prev) => {
        const next: Record<string, SlotPick> = {}
        for (const [key, value] of Object.entries(prev)) {
          if (key.startsWith(`${offerId}:`)) next[key] = value
        }
        return next
      })
    },
    [validIds]
  )

  const setPick = useCallback(
    (offerId: string, landingPageProductId: string, unitIndex: number, patch: Partial<SlotPick>) => {
      const key = `${offerId}:${landingPageProductId}:${unitIndex}`
      setPicks((prev) => {
        const current = prev[key] ?? { size: "", variantId: "" }
        return { ...prev, [key]: { ...current, ...patch } }
      })
    },
    []
  )

  const resetAll = useCallback(() => {
    const first = offers.find((o) => o.valid)?.offerId ?? null
    setSelectedOfferId(first)
    setPicks({})
  }, [offers])

  const value = useMemo(
    () => ({ selectedOfferId, selectOffer, picks, setPick, resetAll }),
    [selectedOfferId, selectOffer, picks, setPick, resetAll]
  )

  return <LandingPageContext.Provider value={value}>{children}</LandingPageContext.Provider>
}

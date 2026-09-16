"use client"

import { createContext, useCallback, useContext, useMemo, useState } from "react"
import type { ResolvedOffer } from "@/lib/landing-pages/types"

// Landing-page-scoped checkout state. Item-driven: customers select
// items, server auto-resolves the best offer.

type VariantPick = { variantId: string; size: string; color: string }

type LandingPageState = {
  // Item selection
  selectedItemIds: string[]
  toggleItem: (landingPageItemId: string) => void
  selectItem: (landingPageItemId: string) => void
  deselectItem: (landingPageItemId: string) => void
  isItemSelected: (landingPageItemId: string) => boolean
  clearItems: () => void

  // Variant picks for items that require variants
  variantPicks: Record<string, VariantPick>
  setVariantPick: (landingPageItemId: string, pick: VariantPick) => void
  clearVariantPick: (landingPageItemId: string) => void

  // Auto-resolved offer (server-computed, read-only)
  matchedOffer: ResolvedOffer | null
  setMatchedOffer: (offer: ResolvedOffer | null) => void

  // Quote from server
  quote: {
    regularTotal: number
    offerPrice: number
    savings: number
    deliveryFee: number
    total: number
    zone: string
  } | null
  setQuote: (quote: LandingPageState["quote"]) => void

  // Reset everything
  resetAll: () => void
}

const LandingPageContext = createContext<LandingPageState | null>(null)

export function useLandingPageState(): LandingPageState {
  const ctx = useContext(LandingPageContext)
  if (!ctx) throw new Error("useLandingPageState must be used inside LandingPageProvider")
  return ctx
}

export function LandingPageProvider({
  defaultItemIds,
  children,
}: {
  defaultItemIds?: string[]
  children: React.ReactNode
}) {
  const initialItemIds = useMemo(
    () => (defaultItemIds && defaultItemIds.length > 0 ? [defaultItemIds[0]] : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [] // Only compute once on mount
  )
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>(initialItemIds)
  const [variantPicks, setVariantPicksState] = useState<Record<string, VariantPick>>({})
  const [matchedOffer, setMatchedOffer] = useState<ResolvedOffer | null>(null)
  const [quote, setQuote] = useState<LandingPageState["quote"]>(null)

  const toggleItem = useCallback((id: string) => {
    setSelectedItemIds((prev) => {
      const removing = prev.includes(id)
      if (removing) {
        // Clear variant pick for deselected item
        setVariantPicksState((prevPicks) => {
          if (!prevPicks[id]) return prevPicks
          const nextPicks = { ...prevPicks }
          delete nextPicks[id]
          return nextPicks
        })
        return prev.filter((p) => p !== id)
      }
      return [...prev, id]
    })
  }, [])

  const selectItem = useCallback((id: string) => {
    setSelectedItemIds((prev) =>
      prev.includes(id) ? prev : [...prev, id]
    )
  }, [])

  const deselectItem = useCallback((id: string) => {
    setSelectedItemIds((prev) => prev.filter((p) => p !== id))
  }, [])

  const isItemSelected = useCallback(
    (id: string) => selectedItemIds.includes(id),
    [selectedItemIds]
  )

  const clearItems = useCallback(() => {
    setSelectedItemIds([])
    setVariantPicksState({})
  }, [])

  const setVariantPick = useCallback((landingPageItemId: string, pick: VariantPick) => {
    setVariantPicksState((prev) => ({ ...prev, [landingPageItemId]: pick }))
  }, [])

  const clearVariantPick = useCallback((landingPageItemId: string) => {
    setVariantPicksState((prev) => {
      const next = { ...prev }
      delete next[landingPageItemId]
      return next
    })
  }, [])

  const resetAll = useCallback(() => {
    setSelectedItemIds([])
    setVariantPicksState({})
    setMatchedOffer(null)
    setQuote(null)
  }, [])

  const value = useMemo(
    () => ({
      selectedItemIds,
      toggleItem,
      selectItem,
      deselectItem,
      isItemSelected,
      clearItems,
      variantPicks,
      setVariantPick,
      clearVariantPick,
      matchedOffer,
      setMatchedOffer,
      quote,
      setQuote,
      resetAll,
    }),
    [
      selectedItemIds,
      toggleItem,
      selectItem,
      deselectItem,
      isItemSelected,
      clearItems,
      variantPicks,
      setVariantPick,
      clearVariantPick,
      matchedOffer,
      setMatchedOffer,
      quote,
      setQuote,
      resetAll,
    ]
  )

  return <LandingPageContext.Provider value={value}>{children}</LandingPageContext.Provider>
}

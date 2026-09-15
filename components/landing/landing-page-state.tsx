"use client"

import { createContext, useCallback, useContext, useMemo, useState } from "react"
import type { ResolvedOffer } from "@/lib/landing-pages/types"

// Landing-page-scoped checkout state. Product-driven: customers select
// products, server auto-resolves the best offer.
//
// This replaces the old offer-driven state where customers manually
// selected an offer first.

type VariantPick = { variantId: string; size: string; color: string }

type LandingPageState = {
  // Product selection
  selectedProductIds: string[]
  toggleProduct: (landingPageProductId: string) => void
  selectProduct: (landingPageProductId: string) => void
  deselectProduct: (landingPageProductId: string) => void
  isProductSelected: (landingPageProductId: string) => boolean
  clearProducts: () => void

  // Variant picks for products that require variants
  variantPicks: Record<string, VariantPick>
  setVariantPick: (landingPageProductId: string, pick: VariantPick) => void
  clearVariantPick: (landingPageProductId: string) => void

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
  defaultProductIds,
  children,
}: {
  defaultProductIds?: string[]
  children: React.ReactNode
}) {
  const initialProductIds = useMemo(
    () => (defaultProductIds && defaultProductIds.length > 0 ? [defaultProductIds[0]] : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [] // Only compute once on mount
  )
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>(initialProductIds)
  const [variantPicks, setVariantPicksState] = useState<Record<string, VariantPick>>({})
  const [matchedOffer, setMatchedOffer] = useState<ResolvedOffer | null>(null)
  const [quote, setQuote] = useState<LandingPageState["quote"]>(null)

  const toggleProduct = useCallback((id: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    )
  }, [])

  const selectProduct = useCallback((id: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev : [...prev, id]
    )
  }, [])

  const deselectProduct = useCallback((id: string) => {
    setSelectedProductIds((prev) => prev.filter((p) => p !== id))
  }, [])

  const isProductSelected = useCallback(
    (id: string) => selectedProductIds.includes(id),
    [selectedProductIds]
  )

  const clearProducts = useCallback(() => {
    setSelectedProductIds([])
    setVariantPicksState({})
  }, [])

  const setVariantPick = useCallback((landingPageProductId: string, pick: VariantPick) => {
    setVariantPicksState((prev) => ({ ...prev, [landingPageProductId]: pick }))
  }, [])

  const clearVariantPick = useCallback((landingPageProductId: string) => {
    setVariantPicksState((prev) => {
      const next = { ...prev }
      delete next[landingPageProductId]
      return next
    })
  }, [])

  const resetAll = useCallback(() => {
    setSelectedProductIds([])
    setVariantPicksState({})
    setMatchedOffer(null)
    setQuote(null)
  }, [])

  const value = useMemo(
    () => ({
      selectedProductIds,
      toggleProduct,
      selectProduct,
      deselectProduct,
      isProductSelected,
      clearProducts,
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
      selectedProductIds,
      toggleProduct,
      selectProduct,
      deselectProduct,
      isProductSelected,
      clearProducts,
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

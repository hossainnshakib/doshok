"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  type CheckoutDraft,
  createEmptyDraft,
  saveDraft,
  loadDraft,
  clearDraft,
  clearBuyNowContext,
  saveStep,
  loadStep,
  hasRecentDraft,
  saveAbandonedCheckout,
} from "@/lib/checkout-draft"

const STEP_LABELS = ["Contact", "Delivery", "Payment & Offer", "Verification", "Confirm"]

export function useCheckoutDraft() {
  const [step, setStepState] = useState(0)
  const [draft, setDraft] = useState<CheckoutDraft>(createEmptyDraft())
  const [restored, setRestored] = useState(false)
  const [showRestoreNotice, setShowRestoreNotice] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const abandonedRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const initialized = useRef(false)
  const lastAbandonedSave = useRef(0)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    const savedStep = loadStep()
    const savedDraft = loadDraft()

    if (savedDraft && hasRecentDraft()) {
      setDraft(savedDraft)
      setShowRestoreNotice(true)
      if (savedStep > 0 && savedStep < 5) {
        setStepState(savedStep)
      }
    }
    setRestored(true)
  }, [])

  const persistAbandoned = useCallback((d: CheckoutDraft, st: number) => {
    const now = Date.now()
    if (now - lastAbandonedSave.current < 5000) return
    lastAbandonedSave.current = now
    const hasData = d.name || d.email || d.phone
    if (!hasData) return
    saveAbandonedCheckout({
      name: d.name || undefined,
      email: d.email || undefined,
      phone: d.phone || undefined,
      address: d.fullAddress || undefined,
      deliveryZone: d.selectedDeliveryZone || undefined,
      couponCode: d.couponCode || undefined,
      step: `step_${st}`,
      source: "checkout",
    })
  }, [])

  useEffect(() => {
    if (!restored) return
    if (!draft.name && !draft.email && !draft.phone) return
    if (abandonedRef.current) clearTimeout(abandonedRef.current)
    abandonedRef.current = setTimeout(() => {
      persistAbandoned(draft, step)
    }, 2000)
  }, [draft, step, restored, persistAbandoned])

  const persistDraft = useCallback((updated: CheckoutDraft) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      saveDraft(updated)
    }, 500)
  }, [])

  const updateField = useCallback(<K extends keyof CheckoutDraft>(field: K, value: CheckoutDraft[K]) => {
    setDraft((prev) => {
      const next = { ...prev, [field]: value }
      persistDraft(next)
      return next
    })
  }, [persistDraft])

  const updateFields = useCallback((partial: Partial<CheckoutDraft>) => {
    setDraft((prev) => {
      const next = { ...prev, ...partial }
      persistDraft(next)
      return next
    })
  }, [persistDraft])

  const setStep = useCallback((newStep: number) => {
    setStepState(newStep)
    saveStep(newStep)
    updateField("currentStep", newStep)
  }, [updateField])

  const goNext = useCallback(() => {
    if (step < 4) setStep(step + 1)
  }, [step, setStep])

  const goBack = useCallback(() => {
    if (step > 0) setStep(step - 1)
  }, [step, setStep])

  const resetDraft = useCallback(() => {
    const empty = createEmptyDraft()
    setDraft(empty)
    setStep(0)
    clearDraft()
    clearBuyNowContext()
    setShowRestoreNotice(false)
  }, [])

  const dismissRestoreNotice = useCallback(() => {
    setShowRestoreNotice(false)
  }, [])

  const clearSavedDetails = useCallback(() => {
    const empty = createEmptyDraft()
    setDraft(empty)
    setStepState(0)
    clearDraft()
    clearBuyNowContext()
    setShowRestoreNotice(false)
  }, [])

  return {
    step,
    draft,
    restored,
    showRestoreNotice,
    setStep,
    goNext,
    goBack,
    updateField,
    updateFields,
    resetDraft,
    dismissRestoreNotice,
    clearSavedDetails,
    stepLabel: STEP_LABELS[step],
    totalSteps: STEP_LABELS.length,
    stepLabels: STEP_LABELS,
    isFirstStep: step === 0,
    isLastStep: step === 4,
    canGoNext: step < 4,
    canGoBack: step > 0,
  }
}

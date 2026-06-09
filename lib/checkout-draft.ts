const DRAFT_KEY = "doshok_checkout_draft"
const STEP_KEY = "doshok_checkout_step"
const BUY_NOW_KEY = "doshok_buy_now"
const LANDING_PREFIX = "doshok_landing_checkout_draft_"
const ABANDONED_DRAFT_ID_KEY = "doshok_abandoned_draft_id"
const ABANDONED_DRAFT_TOKEN_KEY = "doshok_abandoned_token"
const DRAFT_EXPIRY_MS = 24 * 60 * 60 * 1000

export type CheckoutDraft = {
  name: string
  phone: string
  email: string
  division: string
  district: string
  thana: string
  fullAddress: string
  note: string
  selectedDeliveryZone: string
  couponCode: string
  selectedPaymentMethod: string
  currentStep: number
  updatedAt: number
}

export type BuyNowContext = {
  productId: string
  variantId?: string
  name: string
  price: number
  quantity: number
  size?: string
  color?: string
  slug?: string
  image?: string
}

type Ls = typeof localStorage

function isExpired(timestamp: number): boolean {
  return Date.now() - timestamp > DRAFT_EXPIRY_MS
}

function safeGet(ls: Ls, key: string): string | null {
  try { return ls.getItem(key) } catch { return null }
}

function safeSet(ls: Ls, key: string, value: string): void {
  try { ls.setItem(key, value) } catch { /* quota exceeded */ }
}

function safeRemove(ls: Ls, key: string): void {
  try { ls.removeItem(key) } catch { /* ignore */ }
}

export function createEmptyDraft(): CheckoutDraft {
  return {
    name: "",
    phone: "",
    email: "",
    division: "",
    district: "",
    thana: "",
    fullAddress: "",
    note: "",
    selectedDeliveryZone: "dhaka",
    couponCode: "",
    selectedPaymentMethod: "cod",
    currentStep: 0,
    updatedAt: Date.now(),
  }
}

export function saveDraft(draft: CheckoutDraft): void {
  draft.updatedAt = Date.now()
  safeSet(localStorage, DRAFT_KEY, JSON.stringify(draft))
}

export function loadDraft(): CheckoutDraft | null {
  const raw = safeGet(localStorage, DRAFT_KEY)
  if (!raw) return null
  try {
    const draft = JSON.parse(raw) as CheckoutDraft
    if (isExpired(draft.updatedAt)) {
      safeRemove(localStorage, DRAFT_KEY)
      return null
    }
    return draft
  } catch {
    return null
  }
}

export function clearDraft(): void {
  safeRemove(localStorage, DRAFT_KEY)
  safeRemove(localStorage, STEP_KEY)
  clearAbandonedDraft()
}

export function saveStep(step: number): void {
  safeSet(localStorage, STEP_KEY, String(step))
}

export function loadStep(): number {
  const raw = safeGet(localStorage, STEP_KEY)
  if (!raw) return 0
  const step = parseInt(raw, 10)
  return isNaN(step) ? 0 : step
}

export function saveLandingDraft(slug: string, draft: Partial<CheckoutDraft> & { selectedSize?: string; selectedColor?: string; quantity?: number }): void {
  const key = LANDING_PREFIX + slug
  const existing = loadLandingDraft(slug) || {}
  const merged = { ...existing, ...draft, updatedAt: Date.now() }
  safeSet(localStorage, key, JSON.stringify(merged))
}

export function loadLandingDraft(slug: string): (Partial<CheckoutDraft> & { selectedSize?: string; selectedColor?: string; quantity?: number }) | null {
  const key = LANDING_PREFIX + slug
  const raw = safeGet(localStorage, key)
  if (!raw) return null
  try {
    const draft = JSON.parse(raw)
    if (isExpired(draft.updatedAt || 0)) {
      safeRemove(localStorage, key)
      return null
    }
    return draft
  } catch {
    return null
  }
}

export function clearLandingDraft(slug: string): void {
  safeRemove(localStorage, LANDING_PREFIX + slug)
  clearAbandonedDraft()
}

export function saveBuyNowContext(context: BuyNowContext): void {
  safeSet(localStorage, BUY_NOW_KEY, JSON.stringify(context))
}

export function loadBuyNowContext(): BuyNowContext | null {
  const raw = safeGet(localStorage, BUY_NOW_KEY)
  if (!raw) return null
  try {
    const ctx = JSON.parse(raw) as BuyNowContext
    return ctx
  } catch {
    return null
  }
}

export function clearBuyNowContext(): void {
  safeRemove(localStorage, BUY_NOW_KEY)
}

export function getDraftToken(): string {
  let token = safeGet(localStorage, ABANDONED_DRAFT_TOKEN_KEY)
  if (!token) {
    const bytes = new Uint8Array(24)
    crypto.getRandomValues(bytes)
    token = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
    safeSet(localStorage, ABANDONED_DRAFT_TOKEN_KEY, token)
  }
  return token
}

export async function saveAbandonedCheckout(data: Record<string, unknown>): Promise<void> {
  try {
    const abandonedDraftId = safeGet(localStorage, ABANDONED_DRAFT_ID_KEY)
    const draftToken = getDraftToken()
    const payload = { ...data, draftToken, lastSeenAt: new Date().toISOString() }

    if (abandonedDraftId) {
      await fetch(`/api/abandoned/${abandonedDraftId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
    } else {
      const res = await fetch("/api/abandoned", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const result = await res.json()
      if (result.success && result.data?.id) {
        safeSet(localStorage, ABANDONED_DRAFT_ID_KEY, result.data.id)
      }
    }
  } catch {
    /* silently fail */
  }
}

export function clearAbandonedDraftId(): void {
  safeRemove(localStorage, ABANDONED_DRAFT_ID_KEY)
}

export function clearAbandonedDraft(): void {
  safeRemove(localStorage, ABANDONED_DRAFT_ID_KEY)
  safeRemove(localStorage, ABANDONED_DRAFT_TOKEN_KEY)
}

export function hasRecentDraft(): boolean {
  return loadDraft() !== null
}

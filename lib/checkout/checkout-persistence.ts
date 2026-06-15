const STORAGE_KEY = "doshok_checkout_v2"
const MAX_AGE_DAYS = 7
const CURRENT_VERSION = 1

export interface CheckoutPersistenceData {
  version: number
  updatedAt: string

  customer: {
    name: string
    email: string
    phone: string
  } | null

  address: {
    divisionId: string
    divisionName: string
    districtId: string
    districtName: string
    upazilaId: string
    upazilaName: string
    address: string
    notes: string
    deliveryZone: string
  } | null

  checkout: {
    selectedAddressId: string | null
    paymentMethod: string
    currentStep: number
    couponCode: string
  } | null

  cart: {
    itemIds: string[]
    quantitySnapshot: number
    timestamp: string
  } | null
}

function isBrowser(): boolean {
  return typeof window !== "undefined"
}

function nowISO(): string {
  return new Date().toISOString()
}

export function saveCheckoutPersistence(data: Omit<CheckoutPersistenceData, "version" | "updatedAt">): void {
  if (!isBrowser()) return

  const payload: CheckoutPersistenceData = {
    version: CURRENT_VERSION,
    updatedAt: nowISO(),
    ...data,
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // localStorage full or unavailable — silently fail
  }
}

export function loadCheckoutPersistence(): CheckoutPersistenceData | null {
  if (!isBrowser()) return null

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const data = JSON.parse(raw) as CheckoutPersistenceData

    if (!data.version || !data.updatedAt) {
      clearCheckoutPersistence()
      return null
    }

    if (isExpired(data)) {
      clearCheckoutPersistence()
      return null
    }

    return data
  } catch {
    clearCheckoutPersistence()
    return null
  }
}

export function clearCheckoutPersistence(): void {
  if (!isBrowser()) return
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // silently fail
  }
}

function isExpired(data: CheckoutPersistenceData): boolean {
  const updatedAt = new Date(data.updatedAt).getTime()
  const now = Date.now()
  const maxAgeMs = MAX_AGE_DAYS * 24 * 60 * 60 * 1000
  return now - updatedAt > maxAgeMs
}

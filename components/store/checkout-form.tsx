"use client"

import { startTransition, useState, useEffect, useCallback, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { getCart, clearCart } from "@/lib/cart"
import type { CartItem, DeliveryZone, UserAddress } from "@/types"
import { DELIVERY_ZONE_NAMES } from "@/types"
import {
  CheckCircle, Shield, Tag, Truck, CreditCard, ArrowLeft, ChevronLeft, ChevronRight, Smartphone, Clock,
} from "lucide-react"
import Link from "next/link"
import { getPhoneDisplayE164 } from "@/lib/utils"
import { useSession } from "next-auth/react"
import { User, LogIn, MapPin, Home, Briefcase, Users } from "lucide-react"
import { getDivisions, getDistrictsByDivision, getUpazilasByDistrict } from "@/lib/bangladesh-address"
import { AddressCombobox } from "@/components/store/address-combobox"
import { normalizePhoneToE164, isValidBdPhone } from "@/lib/checkout/phone"
import { calculatePaymentAmounts, type PaymentRuleType } from "@/lib/checkout/payment-amount-client"
import { FirebaseOtpPanel } from "@/components/store/firebase-otp-panel"
import {
  ABANDONED_CHECKOUT_TOKEN_KEY,
  saveCheckoutPersistence,
  loadCheckoutPersistence,
  clearCheckoutPersistence,
} from "@/lib/checkout/checkout-persistence"

type PaymentMethodSetting = {
  provider: string
  displayName: string
  enabled: boolean
  supportsFullPayment: boolean
  supportsPartialPayment: boolean
  supportsCodDeliveryCharge: boolean
  instructions: string | null
}

type CheckoutSettings = {
  checkoutV2Enabled: boolean
  otpRequired: boolean
  otpCooldownSeconds: number
  otpTtlSeconds: number
  checkoutTokenTtlSeconds: number
  otpProvider: "firebase" | "mock"
  defaultPaymentRule: string
  defaultPaymentRuleValue: number | null
}

const ONLINE_PROVIDERS: string[] = []

const STEPS = [
  { index: 0, label: "Contact", description: "Who & where to reach" },
  { index: 1, label: "Delivery", description: "Delivery address & zone" },
  { index: 2, label: "Offer & Payment", description: "Coupon & payment method" },
  { index: 3, label: "Confirm", description: "Review & place order" },
]

function getLocalFromSaved(e164: string): string {
  const digits = e164.replace(/\D/g, "")
  if (digits.length === 13 && digits.startsWith("880")) return digits.slice(3)
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1)
  return digits.slice(0, 10)
}

function normalizePhoneInput(raw: string): string {
  const digits = raw.replace(/\D/g, "")
  if (digits.length === 13 && digits.startsWith("880")) return digits.slice(3, 13)
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1, 11)
  return digits.slice(0, 10)
}

export function CheckoutForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isBuyNow = searchParams.has("productId")

  const { data: session } = useSession()
  const isLoggedIn = !!session?.user

  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState({
    name: "",
    phone: "",
    email: "",
    divisionId: "",
    divisionName: "",
    districtId: "",
    districtName: "",
    upazilaId: "",
    upazilaName: "",
    fullAddress: "",
    note: "",
    selectedDeliveryZone: "dhaka" as DeliveryZone,
    couponCode: "",
    selectedPaymentMethod: "cod",
  })

  const updateField = <K extends keyof typeof draft>(field: K, value: (typeof draft)[K]) => {
    setDraft((prev) => ({ ...prev, [field]: value }))
  }

  const updateFields = (partial: Partial<typeof draft>) => {
    setDraft((prev) => ({ ...prev, ...partial }))
  }

  const goNext = () => { if (step < 3) setStep(step + 1) }
  const goBack = () => { if (step > 0) setStep(step - 1) }
  const resetDraft = () => {
    setDraft({
      name: "",
      phone: "",
      email: "",
      divisionId: "",
      divisionName: "",
      districtId: "",
      districtName: "",
      upazilaId: "",
      upazilaName: "",
      fullAddress: "",
      note: "",
      selectedDeliveryZone: "dhaka",
      couponCode: "",
      selectedPaymentMethod: "cod",
    })
    setStep(0)
  }

  const [items, setItems] = useState<(CartItem & { productName?: string })[]>([])
  const [deliveryZone, setDeliveryZone] = useState<DeliveryZone>("dhaka")
  const [deliveryFee, setDeliveryFee] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState<string>("cod")
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodSetting[]>([])
  const [paymentMethodsLoading, setPaymentMethodsLoading] = useState(true)
  const [loading, setLoading] = useState(false)

  const [couponCode, setCouponCode] = useState("")
  const [couponDiscount, setCouponDiscount] = useState(0)
  const [couponApplied, setCouponApplied] = useState(false)
  const [couponError, setCouponError] = useState("")
  const [couponLoading, setCouponLoading] = useState(false)

  const [savedAddresses, setSavedAddresses] = useState<UserAddress[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
  const [saveToAccount, setSaveToAccount] = useState(false)
  const [addressesLoading, setAddressesLoading] = useState(false)

  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const formRef = useRef<HTMLDivElement>(null)

  const [divisions] = useState<Awaited<ReturnType<typeof getDivisions>>>(() => getDivisions())
  const [districts, setDistricts] = useState<Awaited<ReturnType<typeof getDistrictsByDivision>>>([])
  const [upazilas, setUpazilas] = useState<Awaited<ReturnType<typeof getUpazilasByDistrict>>>([])

  const [checkoutSettings, setCheckoutSettings] = useState<CheckoutSettings | null>(null)
  const [settingsLoading, setSettingsLoading] = useState(true)
  const idempotencyKeyRef = useRef<string>("")

  const [otpState, setOtpState] = useState<"idle" | "sending" | "sent" | "verifying" | "verified" | "error">("idle")
  const [otpCode, setOtpCode] = useState("")
  const [otpError, setOtpError] = useState("")
  const [cooldownRemaining, setCooldownRemaining] = useState(0)
  const [checkoutVerificationToken, setCheckoutVerificationToken] = useState<string | null>(null)
  const [verifiedPhone, setVerifiedPhone] = useState<string | null>(null)
  const [otpResetSignal, setOtpResetSignal] = useState(0)
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const profilePrefilledRef = useRef(false)
  const addressPrefilledRef = useRef(false)

  const [couponScope, setCouponScope] = useState<string | null>(null)
  const [productDiscount, setProductDiscount] = useState(0)
  const [deliveryDiscount, setDeliveryDiscount] = useState(0)
  const [discountedProductTotal, setDiscountedProductTotal] = useState(0)
  const [finalDeliveryFeeDisplay, setFinalDeliveryFeeDisplay] = useState(0)
  const [grandTotal, setGrandTotal] = useState(0)

  const isV2 = checkoutSettings?.checkoutV2Enabled ?? false
  const otpRequired = checkoutSettings?.otpRequired ?? true
  const otpProvider = checkoutSettings?.otpProvider ?? "mock"

  const isPhoneVerified = otpState === "verified" && !!checkoutVerificationToken && !!verifiedPhone
  const isPhoneLocked = isV2 && otpRequired && isPhoneVerified && draft.phone === verifiedPhone

  function clearPhoneVerification() {
    setOtpState("idle")
    setOtpCode("")
    setOtpError("")
    setCheckoutVerificationToken(null)
    setVerifiedPhone(null)
    setOtpResetSignal((n) => n + 1)
    if (cooldownRef.current) {
      clearInterval(cooldownRef.current)
      cooldownRef.current = null
    }
    setCooldownRemaining(0)
  }

  useEffect(() => {
    const urlCoupon = searchParams.get("coupon")
    if (urlCoupon) {
      startTransition(() => {
        setCouponCode(urlCoupon)
      })
    }
  }, [searchParams])

  const autoValidatedRef = useRef(false)

  useEffect(() => {
    if (couponCode && !couponApplied) {
      validateCoupon(couponCode)
    }
  }, [items])

  useEffect(() => {
    fetch("/api/checkout/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setCheckoutSettings(d.data as CheckoutSettings)
        }
      })
      .catch(() => {})
      .finally(() => setSettingsLoading(false))
  }, [])

  useEffect(() => {
    if (typeof window !== "undefined" && window.crypto && typeof window.crypto.randomUUID === "function") {
      idempotencyKeyRef.current = window.crypto.randomUUID()
    } else {
      idempotencyKeyRef.current = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    }
  }, [])

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current)
    }
  }, [])

  useEffect(() => {
    if (otpState === "verified" && verifiedPhone && draft.phone !== verifiedPhone) {
      startTransition(() => {
        clearPhoneVerification()
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.phone, otpState, verifiedPhone])

  useEffect(() => {
    if (isBuyNow) {
      const productId = searchParams.get("productId")!
      const slug = searchParams.get("slug")
      const item: CartItem & { productName?: string } = {
        productId,
        variantId: searchParams.get("variantId") || undefined,
        name: searchParams.get("name") || "",
        price: Number(searchParams.get("price") || 0),
        quantity: Number(searchParams.get("quantity") || 1),
        size: searchParams.get("size") || undefined,
        color: searchParams.get("color") || undefined,
        slug: slug || undefined,
      }
      if (!item.name) {
        fetch(`/api/products/${productId}`)
          .then((r) => r.json())
          .then((d) => {
            if (d.success) {
              setItems([{ ...item, name: d.data.name, productName: d.data.name }])
            } else {
              setItems([item])
            }
          })
          .catch(() => setItems([item]))
      } else {
        startTransition(() => {
          setItems([item])
        })
      }
    } else {
      const cart = getCart()
      if (cart.length === 0) {
        router.push("/cart")
        return
      }
      startTransition(() => {
        setItems(cart)
      })
    }
  }, [isBuyNow, searchParams, router])

  const restoredRef = useRef(false)

  useEffect(() => {
    if (restoredRef.current) return
    if (isBuyNow) return

    const saved = loadCheckoutPersistence()
    if (!saved) {
      restoredRef.current = true
      return
    }

    const cart = getCart()
    if (cart.length === 0) {
      clearCheckoutPersistence()
      restoredRef.current = true
      return
    }

    const updates: Partial<typeof draft> = {}

    if (saved.customer) {
      if (saved.customer.name) updates.name = saved.customer.name
      if (saved.customer.email) updates.email = saved.customer.email
      if (saved.customer.phone) updates.phone = saved.customer.phone
    }

    if (saved.address) {
      if (saved.address.divisionId) updates.divisionId = saved.address.divisionId
      if (saved.address.divisionName) updates.divisionName = saved.address.divisionName
      if (saved.address.districtId) updates.districtId = saved.address.districtId
      if (saved.address.districtName) updates.districtName = saved.address.districtName
      if (saved.address.upazilaId) updates.upazilaId = saved.address.upazilaId
      if (saved.address.upazilaName) updates.upazilaName = saved.address.upazilaName
      if (saved.address.address) updates.fullAddress = saved.address.address
      if (saved.address.notes !== undefined) updates.note = saved.address.notes
      if (saved.address.deliveryZone) {
        updates.selectedDeliveryZone = saved.address.deliveryZone as DeliveryZone
      }
    }

    if (saved.checkout) {
      if (saved.checkout.couponCode) updates.couponCode = saved.checkout.couponCode
      if (saved.checkout.paymentMethod) updates.selectedPaymentMethod = saved.checkout.paymentMethod
    }

    startTransition(() => {
      if (Object.keys(updates).length > 0) {
        updateFields(updates)
      }

      if (saved.checkout) {
        setStep(saved.checkout.currentStep)
        setPaymentMethod(saved.checkout.paymentMethod)
        setSelectedAddressId(saved.checkout.selectedAddressId ?? null)
        setCouponCode(saved.checkout.couponCode ?? "")
      }

      if (saved.address?.deliveryZone) {
        setDeliveryZone(saved.address.deliveryZone as DeliveryZone)
      }

      if (saved.address?.divisionId) {
        const restoredDistricts = getDistrictsByDivision(saved.address.divisionId)
        setDistricts(restoredDistricts)
        if (saved.address.districtId) {
          const restoredUpazilas = getUpazilasByDistrict(saved.address.districtId)
          setUpazilas(restoredUpazilas)
        }
      }
    })

    restoredRef.current = true
  }, [isBuyNow])

  useEffect(() => {
    if (!draft.districtId) return
    const url = draft.districtId ? `/api/delivery-fees?districtId=${encodeURIComponent(draft.districtId)}` : "/api/delivery-fees"
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          if (typeof d.data === "object" && !Array.isArray(d.data) && "fee" in d.data) {
            setDeliveryFee((d.data as { zone: string; fee: number }).fee)
            setDeliveryZone((d.data as { zone: string; fee: number }).zone as DeliveryZone)
          } else if (typeof d.data === "object" && !Array.isArray(d.data)) {
            const feeMap = d.data as Record<DeliveryZone, number>
            setDeliveryFee(feeMap[deliveryZone] ?? 100)
          }
        }
      })
      .catch(() => setDeliveryFee(100))
  }, [draft.districtId, deliveryZone])

  useEffect(() => {
    fetch("/api/payment-methods")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          const methods = d.data as PaymentMethodSetting[]
          setPaymentMethods(methods)
        }
      })
      .catch(() => {})
      .finally(() => setPaymentMethodsLoading(false))
  }, [])

  useEffect(() => {
    if (!isLoggedIn) return
    if (profilePrefilledRef.current) return
    profilePrefilledRef.current = true
    fetch("/api/account/profile")
      .then((r) => r.json())
      .then((d) => {
        if (!d.success || !d.data) return
        const profile = d.data as { firstName?: string; lastName?: string; email?: string; phone?: string | null }
        setDraft((prev) => {
          const updates: Partial<typeof draft> = {}
          if ((profile.firstName || profile.lastName) && !prev.name) {
            updates.name = [profile.firstName, profile.lastName].filter(Boolean).join(" ")
          }
          if (profile.email && !prev.email) updates.email = profile.email
          if (profile.phone && !prev.phone) updates.phone = getLocalFromSaved(profile.phone)
          if (Object.keys(updates).length === 0) return prev
          return { ...prev, ...updates }
        })
      })
      .catch(() => {})
  }, [isLoggedIn])

  useEffect(() => {
    if (!isLoggedIn) return
    if (addressPrefilledRef.current) return
    addressPrefilledRef.current = true
    setAddressesLoading(true)
    fetch("/api/account/addresses")
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) return
        const addrs = d.data as UserAddress[]
        setSavedAddresses(addrs)
        const defaultAddr = addrs.find((a: UserAddress) => a.isDefault)
        if (defaultAddr) {
          setSelectedAddressId(defaultAddr.id)
          let addrDivisionId = defaultAddr.divisionId || ""
          let addrDistrictId = defaultAddr.districtId || ""
          let addrUpazilaId = defaultAddr.upazilaId || ""

          if (!addrDivisionId && (defaultAddr.divisionName || defaultAddr.city)) {
            addrDivisionId = resolveIdByName(divisions, defaultAddr.divisionName || defaultAddr.city)
          }
          if (!addrDistrictId && (defaultAddr.districtName || defaultAddr.city)) {
            addrDistrictId = resolveIdByName(districts, defaultAddr.districtName || defaultAddr.city)
          }
          if (!addrUpazilaId && defaultAddr.upazilaName) {
            addrUpazilaId = resolveIdByName(upazilas, defaultAddr.upazilaName)
          }

          setDraft((prev) => ({
            ...prev,
            name: prev.name || defaultAddr.recipientName,
            phone: prev.phone || getLocalFromSaved(defaultAddr.phone),
            divisionId: addrDivisionId,
            divisionName: prev.divisionName || defaultAddr.divisionName || defaultAddr.city,
            districtId: addrDistrictId,
            districtName: prev.districtName || defaultAddr.districtName || defaultAddr.city,
            upazilaId: addrUpazilaId,
            upazilaName: prev.upazilaName || defaultAddr.upazilaName || defaultAddr.city,
            fullAddress: prev.fullAddress || (defaultAddr.addressLine1 + (defaultAddr.addressLine2 ? `, ${defaultAddr.addressLine2}` : "")),
            selectedDeliveryZone: (defaultAddr.zone as DeliveryZone) || prev.selectedDeliveryZone,
          }))
          setDeliveryZone(defaultAddr.zone as DeliveryZone)
          if (addrDivisionId) setDistricts(getDistrictsByDivision(addrDivisionId))
          if (addrDistrictId) setUpazilas(getUpazilasByDistrict(addrDistrictId))
        }
      })
      .catch(() => {})
      .finally(() => setAddressesLoading(false))
  }, [isLoggedIn])

  const prevSessionRef = useRef(session)

  useEffect(() => {
    if (prevSessionRef.current && !session) {
      clearCheckoutPersistence()
    }
    prevSessionRef.current = session
  }, [session])

  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (isBuyNow) return

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
    }

    autoSaveTimerRef.current = setTimeout(() => {
      const itemIds = items.map((i) => {
        const key = i.variantId ? `${i.productId}:${i.variantId}` : i.productId
        return key
      })
      const quantitySnapshot = items.reduce((sum, i) => sum + i.quantity, 0)

      saveCheckoutPersistence({
        customer: {
          name: draft.name,
          email: draft.email,
          phone: draft.phone,
        },
        address: {
          divisionId: draft.divisionId,
          divisionName: draft.divisionName,
          districtId: draft.districtId,
          districtName: draft.districtName,
          upazilaId: draft.upazilaId,
          upazilaName: draft.upazilaName,
          address: draft.fullAddress,
          notes: draft.note,
          deliveryZone,
        },
        checkout: {
          selectedAddressId,
          paymentMethod,
          currentStep: step,
          couponCode,
        },
        cart: {
          itemIds,
          quantitySnapshot,
          timestamp: new Date().toISOString(),
        },
      })

      try {
        const token = localStorage.getItem(ABANDONED_CHECKOUT_TOKEN_KEY) || undefined
        const phone = draft.phone && isValidBdPhone(draft.phone) ? normalizePhoneToE164(draft.phone) : draft.phone
        const abandonedSubtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
        const abandonedDeliveryFee = finalDeliveryFeeDisplay || deliveryFee
        const abandonedDiscount = productDiscount || couponDiscount
        const abandonedTotal = grandTotal || (abandonedSubtotal + deliveryFee - couponDiscount)

        fetch("/api/checkout/abandoned", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token,
            cartItems: items,
            checkoutData: {
              customer: {
                name: draft.name,
                email: draft.email,
                phone: draft.phone,
              },
              address: {
                divisionId: draft.divisionId,
                divisionName: draft.divisionName,
                districtId: draft.districtId,
                districtName: draft.districtName,
                upazilaId: draft.upazilaId,
                upazilaName: draft.upazilaName,
                address: draft.fullAddress,
                notes: draft.note,
                deliveryZone,
              },
              checkout: {
                selectedAddressId,
                currentStep: step,
                couponCode,
              },
            },
            email: draft.email,
            phone,
            name: draft.name,
            couponCode,
            subtotal: abandonedSubtotal,
            deliveryFee: abandonedDeliveryFee,
            discount: abandonedDiscount,
            total: abandonedTotal,
            lastStep: STEPS[step]?.label ?? "Checkout",
          }),
        })
          .then((r) => r.json())
          .then((d) => {
            if (d.success && d.data?.token) {
              localStorage.setItem(ABANDONED_CHECKOUT_TOKEN_KEY, d.data.token)
            }
          })
          .catch(() => {})
      } catch {
        // Abandoned checkout tracking is best-effort and must never block checkout.
      }
    }, 1500)

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
    }
  }, [
    draft.name,
    draft.email,
    draft.phone,
    draft.divisionId,
    draft.divisionName,
    draft.districtId,
    draft.districtName,
    draft.upazilaId,
    draft.upazilaName,
    draft.fullAddress,
    draft.note,
    draft.selectedPaymentMethod,
    draft.couponCode,
    deliveryZone,
    step,
    paymentMethod,
    selectedAddressId,
    couponCode,
    finalDeliveryFeeDisplay,
    productDiscount,
    couponDiscount,
    grandTotal,
    items,
    isBuyNow,
  ])

  function resolveIdByName<T extends { id: string; name: string }>(list: T[], name: string | null | undefined): string {
    if (!name) return ""
    const found = list.find((item) => item.name.toLowerCase() === name.trim().toLowerCase())
    return found?.id ?? ""
  }

  function applyAddressToDraft(addr: UserAddress) {
    let addrDivisionId = addr.divisionId || ""
    let addrDistrictId = addr.districtId || ""
    let addrUpazilaId = addr.upazilaId || ""

    // Fallback: resolve ID from name for legacy addresses that lack IDs
    if (!addrDivisionId && (addr.divisionName || addr.city)) {
      addrDivisionId = resolveIdByName(divisions, addr.divisionName || addr.city)
    }
    if (!addrDistrictId && (addr.districtName || addr.city)) {
      addrDistrictId = resolveIdByName(districts, addr.districtName || addr.city)
    }
    if (!addrUpazilaId && addr.upazilaName) {
      addrUpazilaId = resolveIdByName(upazilas, addr.upazilaName)
    }

    const resolvedDivisionName = addrDivisionId
      ? (divisions.find((d) => d.id === addrDivisionId)?.name ?? addr.divisionName ?? addr.city)
      : addr.divisionName || addr.city

    const resolvedDistrictName = addrDistrictId
      ? (districts.find((d) => d.id === addrDistrictId)?.name ?? addr.districtName ?? addr.city)
      : addr.districtName || addr.city

    const resolvedUpazilaName = addrUpazilaId
      ? (upazilas.find((u) => u.id === addrUpazilaId)?.name ?? addr.upazilaName ?? "")
      : addr.upazilaName || ""

    updateFields({
      name: addr.recipientName,
      phone: getLocalFromSaved(addr.phone),
      divisionId: addrDivisionId,
      divisionName: resolvedDivisionName,
      districtId: addrDistrictId,
      districtName: resolvedDistrictName,
      upazilaId: addrUpazilaId,
      upazilaName: resolvedUpazilaName,
      fullAddress: addr.addressLine1 + (addr.addressLine2 ? `, ${addr.addressLine2}` : ""),
      selectedDeliveryZone: addr.zone as DeliveryZone,
    })
    setDeliveryZone(addr.zone as DeliveryZone)
    if (addrDivisionId) setDistricts(getDistrictsByDivision(addrDivisionId))
    if (addrDistrictId) setUpazilas(getUpazilasByDistrict(addrDistrictId))
  }

  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0)
  const displayDeliveryFee = finalDeliveryFeeDisplay || deliveryFee
  const displayProductDiscount = productDiscount || couponDiscount
  const displayTotal = grandTotal || (subtotal + displayDeliveryFee - couponDiscount)

  const effectiveGrandTotal = displayTotal
  const effectiveDeliveryFee = finalDeliveryFeeDisplay || deliveryFee
  const effectivePayRule: PaymentRuleType = (checkoutSettings?.defaultPaymentRule || "cod_only") as PaymentRuleType
  const effectivePayValue = checkoutSettings?.defaultPaymentRuleValue ?? null
  const computedPayment = calculatePaymentAmounts(effectiveGrandTotal, effectiveDeliveryFee, effectivePayRule, effectivePayValue)

  const calculatedPayNow = computedPayment.payNow
  const calculatedDueAmount = computedPayment.dueAmount
  const payNowForDisplay = isV2 ? calculatedPayNow : (computedPayment.payNow)
  const dueAmountForDisplay = isV2 ? calculatedDueAmount : (computedPayment.dueAmount)
  const isOnlinePaymentRequired = isV2 && payNowForDisplay > 0

  const scrollToTop = useCallback(() => {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [])

  const validateCurrentStep = useCallback((): string[] => {
    const errors: string[] = []
    const onlineRequired = isV2 && calculatedPayNow > 0
    switch (step) {
      case 0: {
        if (!draft.name.trim()) errors.push("Full name is required")
        if (!draft.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email))
          errors.push("Valid email is required")
        if (!draft.phone.trim() || !isValidBdPhone(draft.phone.trim()))
          errors.push("Enter a valid Bangladesh mobile number")
        if (isV2 && otpRequired && otpState !== "verified") {
          errors.push("Please verify your phone with OTP before continuing")
        }
        break
      }
      case 1: {
        if (!draft.divisionId) errors.push("Division is required")
        if (!draft.districtId) errors.push("District is required")
        if (!draft.upazilaId) errors.push("Upazila / Thana is required")
        if (!draft.fullAddress.trim()) errors.push("Full address is required")
        break
      }
      case 2: {
        if (couponCode.trim() && !couponApplied) {
          errors.push("Apply or remove the coupon code before continuing")
        }
        if (onlineRequired && (!paymentMethod || paymentMethod === "cod")) {
          errors.push("This order requires advance payment but only Cash on Delivery is available.")
        }
        break
      }
    }
    return errors
  }, [step, draft, couponCode, couponApplied, isV2, otpRequired, otpState, calculatedPayNow, paymentMethod])

  const handleNext = useCallback(() => {
    const errors = validateCurrentStep()
    setValidationErrors(errors)
    if (errors.length === 0) {
      goNext()
      scrollToTop()
    }
  }, [validateCurrentStep, goNext, scrollToTop])

  const handleBack = useCallback(() => {
    goBack()
    scrollToTop()
    setValidationErrors([])
  }, [goBack, scrollToTop])

  const goToStep = useCallback((target: number) => {
    if (target < 0 || target > 3) return
    if (target > step) {
      const errors = validateCurrentStep()
      if (errors.length > 0) {
        setValidationErrors(errors)
        return
      }
    }
    setValidationErrors([])
    setStep(target)
    scrollToTop()
  }, [step, validateCurrentStep, scrollToTop])

  useEffect(() => {
    if (isOnlinePaymentRequired) {
      if (paymentMethod === "cod" || paymentMethod === "" || !paymentMethod) {
        startTransition(() => {
          setPaymentMethod("")
          updateField("selectedPaymentMethod", "")
        })
      }
    } else {
      if (paymentMethod === "") {
        const cod = paymentMethods.find((p) => p.provider === "COD" && p.enabled)
        if (cod) {
          startTransition(() => {
            setPaymentMethod("cod")
            updateField("selectedPaymentMethod", "cod")
          })
        }
      }
    }
  }, [isOnlinePaymentRequired, paymentMethod, paymentMethods])

  async function validateCoupon(code: string) {
    if (!code.trim()) return
    setCouponLoading(true)
    setCouponError("")
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code.trim(),
          subtotal,
          deliveryFee,
          email: draft.email.trim() || undefined,
          userId: session?.user?.id,
        }),
      })
      const d = await res.json()
      if (d.success) {
        setCouponApplied(true)
        setCouponDiscount(d.data.discount)
        setCouponCode(code.trim().toUpperCase())
        setCouponError("")
        setCouponScope(d.data.couponScope ?? null)
        setProductDiscount(d.data.productDiscount ?? 0)
        setDeliveryDiscount(d.data.deliveryDiscount ?? 0)
        setDiscountedProductTotal(d.data.discountedProductTotal ?? 0)
        setFinalDeliveryFeeDisplay(d.data.finalDeliveryFee ?? deliveryFee)
        setGrandTotal(d.data.grandTotal ?? 0)
      } else {
        setCouponApplied(false)
        setCouponDiscount(0)
        setCouponError(d.error ?? "Invalid coupon")
        resetCouponDisplay()
      }
    } catch {
      setCouponError("Failed to validate")
    } finally {
      setCouponLoading(false)
    }
  }

  function resetCouponDisplay() {
    setCouponScope(null)
    setProductDiscount(0)
    setDeliveryDiscount(0)
    setDiscountedProductTotal(0)
    setFinalDeliveryFeeDisplay(0)
    setGrandTotal(0)
  }

  function handleApplyCoupon() {
    validateCoupon(couponCode)
  }

  function handleRemoveCoupon() {
    setCouponCode("")
    setCouponDiscount(0)
    setCouponApplied(false)
    setCouponError("")
    updateField("couponCode", "")
    resetCouponDisplay()
  }

  async function handleSendOtp() {
    if (!draft.phone.trim() || !isValidBdPhone(draft.phone.trim())) {
      toast.error("Enter a valid Bangladesh mobile number")
      return
    }

    const e164Phone = normalizePhoneToE164(draft.phone.trim())
    setOtpState("sending")
    setOtpError("")

    try {
      const res = await fetch("/api/checkout/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: e164Phone }),
      })
      const d = await res.json()
      if (d.success) {
        setOtpState("sent")
        const cooldown = d.data.cooldownSeconds ?? 30
        setCooldownRemaining(cooldown)
        startCooldown(cooldown)
        toast.success(`OTP sent to ${d.data.maskedPhone ?? e164Phone}`)
      } else {
        setOtpState("error")
        setOtpError(d.error ?? "Failed to send OTP")
        toast.error(d.error ?? "Failed to send OTP")
      }
    } catch {
      setOtpState("error")
      setOtpError("Network error. Please try again.")
    }
  }

  function startCooldown(seconds: number) {
    if (cooldownRef.current) clearInterval(cooldownRef.current)
    setCooldownRemaining(seconds)
    cooldownRef.current = setInterval(() => {
      setCooldownRemaining((prev) => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current)
          cooldownRef.current = null
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  async function handleVerifyOtp() {
    if (!otpCode.trim()) {
      setOtpError("Enter the OTP code")
      return
    }
    if (!draft.phone.trim() || !isValidBdPhone(draft.phone.trim())) {
      toast.error("Invalid phone number")
      return
    }

    const e164Phone = normalizePhoneToE164(draft.phone.trim())
    setOtpState("verifying")
    setOtpError("")

    try {
      const res = await fetch("/api/checkout/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: e164Phone, code: otpCode.trim() }),
      })
      const d = await res.json()
      if (d.success) {
        setOtpState("verified")
        setCheckoutVerificationToken(d.data.checkoutVerificationToken)
        setVerifiedPhone(draft.phone)
        setOtpCode("")
        setOtpError("")
        if (cooldownRef.current) {
          clearInterval(cooldownRef.current)
          cooldownRef.current = null
        }
        setCooldownRemaining(0)
        toast.success("Phone verified successfully")
      } else {
        setOtpState("sent")
        setOtpError(d.error ?? "Invalid OTP")
        toast.error(d.error ?? "Invalid OTP")
      }
    } catch {
      setOtpState("sent")
      setOtpError("Network error. Please try again.")
    }
  }

  const isSubmitting = useRef(false)

  async function handlePlaceOrder() {
    if (isSubmitting.current) return
    if (!draft.phone || !isValidBdPhone(draft.phone)) {
      toast.error("Enter a valid Bangladesh mobile number")
      return
    }

    const e164Phone = normalizePhoneToE164(draft.phone)

    if (isV2 && otpRequired && !checkoutVerificationToken) {
      toast.error("Please verify your phone with OTP before placing the order")
      return
    }

    if (isOnlinePaymentRequired && (!paymentMethod || paymentMethod === "cod")) {
      toast.error("This order requires advance payment but only Cash on Delivery is available.")
      setStep(2)
      scrollToTop()
      return
    }

    if (isSubmitting.current) return
    isSubmitting.current = true
    setLoading(true)
    try {
      const payload: Record<string, unknown> = {
        name: draft.name,
        email: draft.email,
        phone: e164Phone,
        divisionId: draft.divisionId,
        divisionName: draft.divisionName,
        districtId: draft.districtId,
        districtName: draft.districtName,
        upazilaId: draft.upazilaId,
        upazilaName: draft.upazilaName,
        fullAddress: draft.fullAddress,
        notes: draft.note,
        paymentMethod,
        couponCode: couponApplied ? couponCode : undefined,
        items: items.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
        })),
      }

      const abandonedCheckoutToken = localStorage.getItem(ABANDONED_CHECKOUT_TOKEN_KEY)
      if (abandonedCheckoutToken) {
        payload.abandonedCheckoutToken = abandonedCheckoutToken
      }

      payload.idempotencyKey = idempotencyKeyRef.current
      if (checkoutVerificationToken) {
        payload.checkoutVerificationToken = checkoutVerificationToken
      }

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "X-Checkout-Session-Id": idempotencyKeyRef.current,
      }

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (data.success) {
        if (isLoggedIn && saveToAccount && !selectedAddressId) {
          fetch("/api/account/addresses", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              label: "Home",
              recipientName: draft.name,
              phone: e164Phone,
              addressLine1: draft.fullAddress,
              addressLine2: "",
              city: draft.districtName || draft.divisionName,
              zone: deliveryZone,
              postalCode: "",
              divisionId: draft.divisionId || null,
              districtId: draft.districtId || null,
              upazilaId: draft.upazilaId || null,
              divisionName: draft.divisionName || null,
              districtName: draft.districtName || null,
              upazilaName: draft.upazilaName || null,
              isDefault: savedAddresses.length === 0,
            }),
          }).catch(() => {})
        }
        clearCheckoutPersistence()
        localStorage.removeItem(ABANDONED_CHECKOUT_TOKEN_KEY)
        if (!isBuyNow) clearCart()
        resetDraft()
        window.dispatchEvent(new Event("cart-update"))

        const paymentInitData = data.data?.paymentInitData
        const order = data.data?.order
        const orderId = order?.id

        if (paymentInitData?.paymentUrl && orderId) {
          window.location.href = paymentInitData.paymentUrl
          return
        }

        if (order?.payNow > 0 && !paymentInitData?.paymentUrl) {
          toast.error("Payment could not be started. Please try again.")
          return
        }

        const orderNumber = order?.orderNumber
        const successToken = data.data?.successToken as string | undefined
        if (orderNumber) {
          if (successToken) {
            router.push(`/order/success/${orderNumber}?token=${encodeURIComponent(successToken)}`)
          } else if (isLoggedIn) {
            router.push(`/order/${orderNumber}`)
          } else {
            router.push("/")
          }
        } else {
          router.push("/")
        }
      } else {
        toast.error(data.error ?? "Order failed")
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setLoading(false)
      isSubmitting.current = false
    }
  }

  if (items.length === 0) return null

  return (
    <div className="container mx-auto container-px py-8 md:py-12 max-w-6xl" ref={formRef}>
      <div className="mb-6">
        {isLoggedIn ? (
          <div className="rounded-2xl border border-primary/10 bg-primary/[0.03] p-4 md:p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">
                  Checking out as <strong>{session?.user?.firstName || session?.user?.name || session?.user?.email || "Account"}</strong>
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Your order will be saved to your account after phone verification.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-muted bg-muted/20 p-4 md:p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted-foreground/10">
                <LogIn className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">Continue as guest</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Guest checkout is available. We only verify your phone before confirming the order.
                </p>
                <Link href="/auth/login" className="text-xs text-primary hover:underline mt-1 inline-block">
                  Already have an account? Login
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2 font-medium">Secure Checkout</p>
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight">Checkout</h1>
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between max-w-3xl">
          {STEPS.map((s, i) => {
            const isCompleted = i < step
            const isCurrent = i === step
            const isClickable = isCompleted || isCurrent
            return (
              <div key={s.index} className="flex items-center">
                <div className="flex flex-col items-center">
                  {isClickable ? (
                    <button
                      type="button"
                      onClick={() => goToStep(s.index)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                        isCompleted
                          ? "bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
                          : "bg-primary text-primary-foreground ring-2 ring-primary/30"
                      }`}
                      aria-label={`Go to ${s.label} step`}
                    >
                      {isCompleted ? <CheckCircle className="h-4 w-4" /> : s.index + 1}
                    </button>
                  ) : (
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors bg-muted text-muted-foreground"
                    >
                      {s.index + 1}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => isClickable && goToStep(s.index)}
                    disabled={!isClickable}
                    className={`text-[10px] mt-1 font-medium hidden sm:block transition-colors ${
                      isCurrent
                        ? "text-foreground"
                        : isCompleted
                          ? "text-muted-foreground hover:text-foreground cursor-pointer"
                          : "text-muted-foreground/60 cursor-not-allowed"
                    }`}
                  >
                    {s.label}
                  </button>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`h-px w-8 md:w-16 mx-2 ${
                      i < step ? "bg-primary" : "bg-muted-foreground/20"
                    }`}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {validationErrors.length > 0 && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-xl px-5 py-4">
              <p className="text-sm font-medium text-destructive mb-1">Please fix the following:</p>
              <ul className="list-disc list-inside text-sm text-destructive/80 space-y-0.5">
                {validationErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          <Link href="/cart" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 transition-colors group">
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" /> Back to Cart
          </Link>

          {/* Step 0: Contact */}
          {step === 0 && (
            <Card className="overflow-hidden border-border/50 rounded-2xl shadow-sm">
              <CardContent className="p-6 md:p-8 space-y-6">
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-primary text-primary-foreground text-sm font-bold">1</span>
                    <div>
                      <h2 className="text-lg font-semibold">Contact Information</h2>
                      <p className="text-xs text-muted-foreground">
                        {isV2 && otpRequired ? "We&apos;ll send OTP to your phone" : "Who & where to reach"}
                      </p>
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={draft.name}
                      onChange={(e) => updateField("name", e.target.value)}
                      placeholder="John Doe"
                      className="h-11 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={draft.email}
                      onChange={(e) => updateField("email", e.target.value)}
                      placeholder="john@example.com"
                      className="h-11 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="phone">Phone Number</Label>
                      {isPhoneLocked && (
                        <button
                          type="button"
                          onClick={clearPhoneVerification}
                          className="text-xs text-red-500 hover:text-red-700 font-medium"
                        >
                          Change phone
                        </button>
                      )}
                    </div>
                    <div
                      className={`flex items-center gap-0 rounded-xl border bg-background overflow-hidden ${
                        isPhoneLocked
                          ? "opacity-70 cursor-not-allowed"
                          : "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1 has-[:focus]:ring-primary"
                      }`}
                    >
                      <span className="px-4 py-2.5 text-sm font-medium bg-muted/50 border-r border-border text-muted-foreground select-none shrink-0">
                        +880
                      </span>
                      <Input
                        id="phone"
                        type="tel"
                        inputMode="tel"
                        value={draft.phone}
                        onChange={(e) => {
                          if (isPhoneLocked) return
                          const raw = normalizePhoneInput(e.target.value)
                          updateField("phone", raw)
                        }}
                        onPaste={(e) => {
                          if (isPhoneLocked) {
                            e.preventDefault()
                            return
                          }
                          const pasted = e.clipboardData.getData("text")
                          if (!pasted) return
                          e.preventDefault()
                          updateField("phone", normalizePhoneInput(pasted))
                        }}
                        readOnly={isPhoneLocked}
                        disabled={isPhoneLocked}
                        placeholder={isPhoneLocked ? "" : "1XXXXXXXXX"}
                        aria-readonly={isPhoneLocked}
                        className="h-11 rounded-none border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 disabled:opacity-100 disabled:cursor-not-allowed"
                      />
                    </div>
                    {isPhoneLocked && (
                      <p className="text-[11px] text-emerald-600 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" /> Phone verified — locked
                      </p>
                    )}
                  </div>
                </div>

                {/* OTP Panel */}
                {isV2 && otpRequired && !isPhoneLocked && (
                  <div className="border-t border-border/50 pt-5">
                    {otpProvider === "firebase" ? (
                      <FirebaseOtpPanel
                        phone={draft.phone}
                        disabled={loading}
                        resetSignal={otpResetSignal}
                        onVerified={(token) => {
                          setOtpState("verified")
                          setCheckoutVerificationToken(token)
                          setVerifiedPhone(draft.phone)
                          setOtpCode("")
                          setOtpError("")
                          if (cooldownRef.current) {
                            clearInterval(cooldownRef.current)
                            cooldownRef.current = null
                          }
                          setCooldownRemaining(0)
                          toast.success("Phone verified successfully")
                        }}
                        onReset={clearPhoneVerification}
                      />
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Smartphone className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium">Phone Verification</span>
                        </div>

                        {otpState === "idle" && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleSendOtp}
                            disabled={!draft.phone.trim() || !isValidBdPhone(draft.phone.trim())}
                            className="h-11 rounded-xl"
                          >
                            <Smartphone className="h-4 w-4 mr-2" />
                            Send OTP
                          </Button>
                        )}

                        {otpState === "sending" && (
                          <p className="text-sm text-muted-foreground animate-pulse">Sending OTP...</p>
                        )}

                        {(otpState === "sent" || otpState === "verifying" || otpState === "error") && (
                          <div className="space-y-3">
                            <p className="text-xs text-muted-foreground">
                              Enter the 6-digit code sent to {normalizePhoneToE164(draft.phone)}
                            </p>
                            <div className="flex gap-2">
                              <Input
                                value={otpCode}
                                onChange={(e) => {
                                  setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                                  setOtpError("")
                                }}
                                placeholder="000000"
                                className="h-11 rounded-xl w-40 text-center text-lg tracking-widest font-mono"
                                disabled={otpState === "verifying"}
                                maxLength={6}
                              />
                              <Button
                                type="button"
                                onClick={handleVerifyOtp}
                                disabled={otpState === "verifying" || otpCode.length < 6}
                                className="h-11 rounded-xl"
                              >
                                {otpState === "verifying" ? "Verifying..." : "Verify"}
                              </Button>
                            </div>

                            {otpError && (
                              <p className="text-sm text-destructive">{otpError}</p>
                            )}

                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={handleSendOtp}
                                disabled={cooldownRemaining > 0 || otpState === "verifying"}
                                className="text-xs h-8"
                              >
                                Resend OTP
                                {cooldownRemaining > 0 && (
                                  <span className="ml-1 inline-flex items-center gap-1 text-muted-foreground">
                                    <Clock className="h-3 w-3" />
                                    {cooldownRemaining}s
                                  </span>
                                )}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 1: Delivery */}
          {step === 1 && (
            <>
              {isLoggedIn && savedAddresses.length > 0 && (
                <Card className="overflow-hidden border-border/50 rounded-2xl shadow-sm">
                  <CardContent className="p-6 md:p-8 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-primary/10">
                        <MapPin className="h-4 w-4 text-primary" />
                      </div>
                      <h2 className="text-sm font-semibold">Saved Addresses</h2>
                    </div>
                    <div className="space-y-2">
                      {savedAddresses.map((addr) => {
                        const AddrIcon = addr.label === "Home" ? Home : addr.label === "Office" ? Briefcase : Users
                        return (
                          <button
                            key={addr.id}
                            type="button"
                            onClick={() => {
                              setSelectedAddressId(addr.id)
                              applyAddressToDraft(addr)
                            }}
                            className={`w-full flex items-start gap-3 rounded-xl border p-4 text-left transition-all ${
                              selectedAddressId === addr.id
                                ? "border-primary bg-primary/5"
                                : "border-border/50 hover:border-muted-foreground/30"
                            }`}
                          >
                            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                              <AddrIcon className="h-4 w-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium">{addr.label}</p>
                                {addr.isDefault && (
                                  <span className="text-[10px] text-primary font-medium">Default</span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground truncate">{addr.addressLine1}</p>
                              <p className="text-xs text-muted-foreground">{addr.city}</p>
                              <p className="text-xs text-muted-foreground">{addr.recipientName} — {getPhoneDisplayE164(addr.phone)}</p>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card className="overflow-hidden border-border/50 rounded-2xl shadow-sm">
                <CardContent className="p-6 md:p-8 space-y-6">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-primary text-primary-foreground text-sm font-bold">2</span>
                    <div>
                      <h2 className="text-lg font-semibold">Delivery Address</h2>
                      <p className="text-xs text-muted-foreground">Where should we send your order?</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="division">Division</Label>
                      <AddressCombobox
                        options={divisions}
                        value={draft.divisionId}
                        onChange={(v) => {
                          if (!v) return
                          const div = divisions.find((d) => d.id === v)
                          if (div) {
                            updateFields({
                              divisionId: div.id,
                              divisionName: div.name,
                              districtId: "",
                              districtName: "",
                              upazilaId: "",
                              upazilaName: "",
                            })
                            setDistricts(getDistrictsByDivision(v))
                            setUpazilas([])
                            setSelectedAddressId(null)
                          }
                        }}
                        placeholder="Select division"
                        disabled={false}
                        className="h-11 rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="district">District</Label>
                      <AddressCombobox
                        options={districts}
                        value={draft.districtId}
                        onChange={(v) => {
                          if (!v) return
                          const dist = districts.find((d) => d.id === v)
                          if (dist) {
                            updateFields({
                              districtId: dist.id,
                              districtName: dist.name,
                              upazilaId: "",
                              upazilaName: "",
                            })
                            setUpazilas(getUpazilasByDistrict(v))
                            setSelectedAddressId(null)
                          }
                        }}
                        placeholder={draft.divisionId ? "Select district" : "Select division first"}
                        disabled={!draft.divisionId}
                        className="h-11 rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="upazila">Upazila / Thana</Label>
                      <AddressCombobox
                        options={upazilas}
                        value={draft.upazilaId}
                        onChange={(v) => {
                          if (!v) return
                          const upa = upazilas.find((u) => u.id === v)
                          if (upa) {
                            updateFields({
                              upazilaId: upa.id,
                              upazilaName: upa.name,
                            })
                            setSelectedAddressId(null)
                          }
                        }}
                        placeholder={draft.districtId ? "Select upazila/thana" : "Select district first"}
                        disabled={!draft.districtId}
                        className="h-11 rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Delivery Area</Label>
                      <div className="h-11 rounded-xl border border-input bg-muted/30 px-4 flex items-center text-sm">
                        <Truck className="h-4 w-4 mr-2 text-muted-foreground shrink-0" />
                        {draft.districtId ? (
                          <span>
                            {DELIVERY_ZONE_NAMES[deliveryZone as keyof typeof DELIVERY_ZONE_NAMES]} &mdash; ৳{deliveryFee}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Select district for delivery info</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullAddress">Full Address</Label>
                      <Input
                        id="fullAddress"
                        value={draft.fullAddress}
                        onChange={(e) => { updateField("fullAddress", e.target.value); setSelectedAddressId(null) }}
                        placeholder="House #, Road #, Area"
                        className="h-11 rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="country">Country</Label>
                      <Input
                        id="country"
                        value="Bangladesh"
                        disabled
                        className="h-11 rounded-xl bg-muted/30"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="note">Order Note (optional)</Label>
                    <Input
                      id="note"
                      value={draft.note}
                      onChange={(e) => updateField("note", e.target.value)}
                      placeholder="Any special instructions?"
                      className="h-11 rounded-xl"
                    />
                  </div>

                  {isLoggedIn && (
                    <div className="flex items-start gap-3 pt-2 border-t border-border/50">
                      <Checkbox
                        id="saveAddress"
                        checked={saveToAccount}
                        onCheckedChange={(v) => setSaveToAccount(v === true)}
                      />
                      <Label htmlFor="saveAddress" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
                        Save this address to my account
                      </Label>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {/* Step 2: Offer & Payment */}
          {step === 2 && (
            <div className="space-y-6">
              <Card className="border-border/50 rounded-2xl shadow-sm">
                <CardContent className="p-6 md:p-8 space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-primary text-primary-foreground text-sm font-bold">3</span>
                    <div>
                      <h2 className="text-lg font-semibold">Coupon Code</h2>
                      <p className="text-xs text-muted-foreground">Have a discount code?</p>
                    </div>
                  </div>
                  {couponApplied ? (
                    <div>
                      <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-5 py-4">
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium text-green-700">{couponCode}</span>
                          <span className="text-sm text-green-600">(-৳{couponDiscount.toLocaleString()})</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleRemoveCoupon}
                          className="text-sm text-red-500 hover:text-red-700 font-medium"
                        >
                          Remove
                        </button>
                      </div>
                      {couponScope && couponScope !== "none" && (
                        <div className="mt-2 space-y-1 px-2">
                          {productDiscount > 0 && (
                            <p className="text-xs text-muted-foreground">
                              Product discount: -৳{productDiscount.toLocaleString()}
                            </p>
                          )}
                          {deliveryDiscount > 0 && (
                            <p className="text-xs text-muted-foreground">
                              Delivery discount: -৳{deliveryDiscount.toLocaleString()}
                            </p>
                          )}
                          {couponScope === "product" && (
                            <p className="text-xs text-muted-foreground italic">Applied to product subtotal only</p>
                          )}
                          {couponScope === "delivery" && (
                            <p className="text-xs text-muted-foreground italic">Applied to delivery fee only</p>
                          )}
                          {couponScope === "both" && (
                            <p className="text-xs text-muted-foreground italic">Applied to both product and delivery</p>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        value={couponCode}
                        onChange={(e) => { setCouponCode(e.target.value); setCouponError("") }}
                        placeholder="Enter coupon code"
                        className="flex-1 uppercase h-11 rounded-xl"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleApplyCoupon}
                        disabled={couponLoading || !couponCode.trim()}
                        className="h-11 rounded-xl"
                      >
                        {couponLoading ? "..." : "Apply"}
                      </Button>
                    </div>
                  )}
                  {couponError && (
                    <p className="text-sm text-destructive">{couponError}</p>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border/50 rounded-2xl shadow-sm">
                <CardContent className="p-6 md:p-8 space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-primary text-primary-foreground text-sm font-bold">4</span>
                    <div>
                      <h2 className="text-lg font-semibold">Payment Method</h2>
                      <p className="text-xs text-muted-foreground">Choose how to pay</p>
                    </div>
                  </div>
                  {paymentMethodsLoading ? (
                    <p className="text-sm text-muted-foreground animate-pulse">Loading payment options...</p>
                  ) : paymentMethods.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No payment methods available.</p>
                  ) : (
                    <RadioGroup
                      value={paymentMethod}
                      onValueChange={(v) => {
                        const target = paymentMethods.find((p) => p.provider.toLowerCase() === v)
                        if (target && target.enabled && target.provider === "COD") {
                          setPaymentMethod(v)
                          updateField("selectedPaymentMethod", v)
                        }
                      }}
                      className="space-y-3"
                    >
                      {paymentMethods.map((pm) => {
                        const isOnline = ONLINE_PROVIDERS.includes(pm.provider)
                        const isEnabled = pm.enabled
                        const isCod = pm.provider === "COD"
                        const isCodBlocked = isCod && isOnlinePaymentRequired
                        const isSelectable = isEnabled && !isCodBlocked && isCod

                        return (
                          <div
                            key={pm.provider}
                            className={`flex items-start gap-4 rounded-xl border p-4 transition-all ${
                              paymentMethod === pm.provider.toLowerCase() && isSelectable
                                ? "border-primary bg-primary/5"
                                : isSelectable
                                  ? "border-border/50 hover:border-muted-foreground/30"
                                  : "border-border/30 opacity-50 cursor-not-allowed bg-muted/20"
                            }`}
                            onClick={() => {
                              if (isSelectable) {
                                setPaymentMethod(pm.provider.toLowerCase())
                                updateField("selectedPaymentMethod", pm.provider.toLowerCase())
                              }
                            }}
                          >
                            <RadioGroupItem
                              value={pm.provider.toLowerCase()}
                              id={pm.provider}
                              disabled={!isSelectable}
                            />
                            <div className="flex-1 min-w-0">
                              <Label
                                htmlFor={pm.provider}
                                className={`font-medium text-sm cursor-pointer ${!isSelectable ? "cursor-not-allowed" : ""}`}
                              >
                                {pm.displayName}
                              </Label>
                              {isCod && (
                                <div className="mt-1.5 space-y-1">
                                  {isCodBlocked ? (
                                    <p className="text-xs text-amber-600">
                                      This order requires advance payment. COD is not available.
                                    </p>
                                  ) : (
                                    <>
                                      <p className="text-xs text-muted-foreground">
                                        {isV2 ? "Pay the amount due when your order is delivered." : `Pay the full amount (৳${displayTotal.toLocaleString()}) when your order is delivered.`}
                                      </p>
                                      <p className="text-xs text-amber-600">
                                        No advance payment required.
                                      </p>
                                    </>
                                  )}
                                </div>
                              )}
                              {pm.instructions && isEnabled && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {pm.instructions}
                                </p>
                              )}
                              {isOnline && !isEnabled && (
                                <p className="text-xs text-muted-foreground mt-1 italic">
                                  Currently unavailable
                                </p>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </RadioGroup>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 3: Review & Place */}
          {step === 3 && (
            <div className="space-y-6">
              <Card className="border-border/50 rounded-2xl shadow-sm">
                <CardContent className="p-6 md:p-8 space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-primary text-primary-foreground text-sm font-bold">4</span>
                    <div>
                      <h2 className="text-lg font-semibold">Review Your Order</h2>
                      <p className="text-xs text-muted-foreground">Please confirm everything is correct</p>
                    </div>
                  </div>

                  <div className="space-y-4 divide-y divide-border/50">
                    <div className="space-y-2 pb-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-muted-foreground">Contact</h3>
                        <button
                          type="button"
                          onClick={() => goToStep(0)}
                          className="text-xs text-primary hover:underline font-medium"
                        >
                          Edit
                        </button>
                      </div>
                      <p className="text-sm">{draft.name}</p>
                      <p className="text-sm">{draft.email}</p>
                      <p className="text-sm">{getPhoneDisplayE164(draft.phone)}</p>
                      {isV2 && otpRequired && otpState === "verified" && checkoutVerificationToken && (
                        <p className="text-xs text-green-600 flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" /> Phone verified
                        </p>
                      )}
                    </div>
                    <div className="space-y-2 pb-4 pt-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-muted-foreground">Delivery</h3>
                        <button
                          type="button"
                          onClick={() => goToStep(1)}
                          className="text-xs text-primary hover:underline font-medium"
                        >
                          Edit
                        </button>
                      </div>
                      <p className="text-sm">{draft.fullAddress}</p>
                      <p className="text-sm">{draft.upazilaName}, {draft.districtName}, Bangladesh</p>
                      <p className="text-sm">{DELIVERY_ZONE_NAMES[deliveryZone as keyof typeof DELIVERY_ZONE_NAMES] || deliveryZone}</p>
                      {draft.note && <p className="text-sm text-muted-foreground italic">Note: {draft.note}</p>}
                    </div>
                    <div className="space-y-2 pb-4 pt-4">
                      <h3 className="text-sm font-medium text-muted-foreground">Payment</h3>
                      <p className="text-sm">
                        Cash on Delivery
                      </p>
                      {couponApplied && (
                        <p className="text-sm text-green-600">Coupon {couponCode} applied (-৳{couponDiscount.toLocaleString()})</p>
                      )}
                    </div>
                    <div className="space-y-2 pt-4">
                      <h3 className="text-sm font-medium text-muted-foreground">Items</h3>
                      {items.map((item, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            {item.name || "Product"}
                            {item.size ? ` (${item.size}` : ""}{item.color ? ` / ${item.color}` : ""}{item.size ? ")" : ""}
                            {" "}x{item.quantity}
                          </span>
                          <span className="font-medium">৳{(item.price * item.quantity).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex flex-col gap-3">
                <Button
                  size="lg"
                  className="w-full h-12 md:h-14 text-base rounded-xl"
                  onClick={handlePlaceOrder}
                  disabled={loading || isSubmitting.current}
                >
                  {loading ? "Placing Order..." : `Place Order — ৳${displayTotal.toLocaleString()}`}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleBack}
                  disabled={loading}
                  className="gap-1.5"
                >
                  <ChevronLeft className="h-4 w-4" /> Back to Offer &amp; Payment
                </Button>
              </div>
            </div>
          )}

          {/* Navigation */}
          {step < 3 && (
            <div className="flex items-center justify-between gap-4 pt-2">
              <div>
                {step > 0 ? (
                  <Button type="button" variant="ghost" onClick={handleBack} className="gap-1.5">
                    <ChevronLeft className="h-4 w-4" /> Back
                  </Button>
                ) : (
                  <div />
                )}
              </div>
              <Button type="button" onClick={handleNext} className="gap-1.5 h-11 rounded-xl px-6">
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Sticky Order Summary */}
        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-24 space-y-4">
            <Card className="bg-primary/5 border-primary/10 rounded-2xl shadow-sm">
              <CardContent className="p-5 md:p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-semibold">Order Summary</h2>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="divide-y divide-border/30">
                    {items.map((item, i) => (
                      <div key={i} className="flex justify-between py-1.5 first:pt-0 text-sm">
                        <span className="text-muted-foreground truncate max-w-[180px]">
                          {item.name || "Product"}
                          {item.size ? ` (${item.size}` : ""}{item.color ? ` / ${item.color}` : ""}{item.size ? ")" : ""}
                        </span>
                        <span className="font-medium shrink-0">x{item.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Product Subtotal</span>
                    <span className="font-medium">৳{subtotal.toLocaleString()}</span>
                  </div>
                  {isV2 && productDiscount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Product Discount {couponScope === "delivery" ? "" : `(${couponCode})`}</span>
                      <span>-৳{productDiscount.toLocaleString()}</span>
                    </div>
                  )}
                  {isV2 && discountedProductTotal > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Discounted Product Total</span>
                      <span>৳{discountedProductTotal.toLocaleString()}</span>
                    </div>
                  )}
                  {!isV2 && couponDiscount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount ({couponCode})</span>
                      <span>-৳{couponDiscount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Delivery Fee</span>
                    <span className="font-medium">৳{displayDeliveryFee.toLocaleString()}</span>
                  </div>
                  {isV2 && deliveryDiscount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Delivery Discount {couponScope === "product" ? "" : `(${couponCode})`}</span>
                      <span>-৳{deliveryDiscount.toLocaleString()}</span>
                    </div>
                  )}
                  {isV2 && finalDeliveryFeeDisplay > 0 && finalDeliveryFeeDisplay !== deliveryFee && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Final Delivery Fee</span>
                      <span>৳{finalDeliveryFeeDisplay.toLocaleString()}</span>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between font-bold text-base">
                    <span>Grand Total</span>
                    <span>৳{displayTotal.toLocaleString()}</span>
                  </div>
                  {isV2 && (
                    <>
                      {computedPayment.payNow > 0 && (
                        <div className="flex justify-between text-sm text-primary font-medium">
                          <span>Pay Now</span>
                          <span>৳{computedPayment.payNow.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Due on Delivery</span>
                        <span>{computedPayment.dueAmount > 0 ? `৳${computedPayment.dueAmount.toLocaleString()}` : "—"}</span>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            <p className="text-xs text-muted-foreground flex items-center gap-1.5 px-1">
              <Shield className="h-3.5 w-3.5 shrink-0" /> Your information is secure
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

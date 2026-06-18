"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import {
  BadgeCheck,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  HeadphonesIcon,
  LogIn,
  Minus,
  Package,
  Plus,
  Printer,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Star,
  Tag,
  Truck,
  User,
  UserPlus,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import type { DeliveryZone } from "@/types"
import { DELIVERY_ZONE_NAMES } from "@/types"
import { normalizePhoneToE164, isValidBdPhone } from "@/lib/checkout/phone"
import { FirebaseOtpPanel } from "@/components/store/firebase-otp-panel"
import { useSession } from "next-auth/react"
import { calculatePaymentAmounts, type PaymentRuleType } from "@/lib/checkout/payment-amount-client"
import { getDivisions, getDistrictsByDivision, getUpazilasByDistrict } from "@/lib/bangladesh-address"
import { ABANDONED_CHECKOUT_TOKEN_KEY } from "@/lib/checkout/checkout-persistence"

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

type ProductVariant = {
  id: string
  size: string
  color: string
  colorHex: string | null
  stock: number
  reservedStock: number
}

type ProductWithVariants = {
  id: string
  name: string
  slug: string
  price: number
  oldPrice: number | null
  images: string[]
  description: string | null
  shortDescription?: string | null
  material?: string | null
  careInstructions?: string | null
  landingHeadline?: string | null
  landingSubheadline?: string | null
  landingCopy?: string | null
  landingHeroImage?: string | null
  paymentRuleOverride?: string | null
  paymentRuleValueOverride?: number | null
  averageRating?: number | null
  reviewCount?: number | null
  category?: {
    name: string
    slug?: string
  } | null
  specifications?: {
    id?: string
    label: string
    value: string
    position?: number
  }[]
  variants: ProductVariant[]
  defaultCouponCode?: string | null
  landingPageSetting?: {
    autoCouponCode?: string | null
    couponOverrideEnabled: boolean
    quantityLimit?: number | null
    otpOverrideEnabled: boolean
    otpOverride?: boolean | null
    paymentOverrideEnabled: boolean
    paymentRuleOverride?: string | null
    paymentRuleValueOverride?: number | null
    deliveryOverrideEnabled?: boolean
    deliveryFeeOverride?: number | null
    customCta?: string | null
    customThankYouMessage?: string | null
    customQuestionField?: string | null
    landingGalleryPrimaryImage?: string | null
    landingGallerySecondaryImage?: string | null
    landingGalleryTertiaryImage?: string | null
    landingGalleryVideoUrl?: string | null
    landingOfferText?: string | null
    landingDisplayPrice?: number | null
    landingDisplayOldPrice?: number | null
    landingTestimonials?: unknown
    landingGalleryEnabled?: boolean
    landingReviewsEnabled?: boolean
    landingFaqEnabled?: boolean
    landingHighlightsEnabled?: boolean
    urgencyCounterEnabled?: boolean
    hideNormalNavigation?: boolean
    benefits?: { id?: string; icon?: string | null; title: string; description?: string | null; enabled: boolean; sortOrder: number }[]
    faqItems?: { id?: string; question: string; answer: string; enabled: boolean; sortOrder: number }[]
    testimonials?: { id?: string; name: string; rating: number; text: string; image?: string | null; enabled: boolean; sortOrder: number }[]
    galleryImages?: { id?: string; url: string; sortOrder: number }[]
    landingGalleryLayout?: string | null
    landingVariantSectionEnabled?: boolean
    landingProductSummaryEnabled?: boolean
    landingCheckoutTitle?: string | null
    landingCheckoutSubtitle?: string | null
    landingCheckoutCta?: string | null
    landingSectionOrder?: { key: string; enabled: boolean; order: number; title?: string; subtitle?: string }[]
  } | null
}

export type LandingPageClientProps = {
  product: ProductWithVariants
  slug: string
}

type OrderResult = {
  id: string
  orderNumber: string
  total: number
  subtotal: number
  deliveryFee: number
  discount: number
  dueAmount: number
  customerName: string
  customerPhone: string
  customerEmail: string
  successToken?: string
}

const STEPS = [
  { index: 0, label: "Select" },
  { index: 1, label: "Contact" },
  { index: 2, label: "Delivery" },
  { index: 3, label: "Review" },
]

const ONLINE_PROVIDERS: string[] = []

const DEFAULT_SECTION_ORDER: { key: string; enabled: boolean; order: number; title?: string; subtitle?: string }[] = [
  { key: "hero", enabled: true, order: 0 },
  { key: "benefits", enabled: true, order: 1 },
  { key: "gallery", enabled: true, order: 2 },
  { key: "variant", enabled: true, order: 3 },
  { key: "testimonials", enabled: true, order: 4 },
  { key: "checkout", enabled: true, order: 5 },
  { key: "faq", enabled: true, order: 6 },
]

function getAvailableStock(variant: ProductVariant | undefined): number {
  if (!variant) return 0
  return Math.max(0, variant.stock - variant.reservedStock)
}

function formatTk(amount: number | null | undefined): string {
  return `৳${Math.max(0, amount ?? 0).toLocaleString()}`
}

function getVideoEmbedUrl(url: string | null | undefined): string | null {
  if (!url) return null

  try {
    const parsed = new URL(url)
    const host = parsed.hostname.replace(/^www\./, "")

    if (host === "youtu.be") {
      const id = parsed.pathname.replace("/", "")
      return id ? `https://www.youtube.com/embed/${id}` : null
    }

    if (host === "youtube.com" || host === "m.youtube.com") {
      const id = parsed.searchParams.get("v")
      if (id) return `https://www.youtube.com/embed/${id}`
      if (parsed.pathname.startsWith("/shorts/") || parsed.pathname.startsWith("/embed/")) {
        const idFromPath = parsed.pathname.split("/").filter(Boolean).pop()
        return idFromPath ? `https://www.youtube.com/embed/${idFromPath}` : null
      }
    }

    if (host === "vimeo.com") {
      const id = parsed.pathname.split("/").filter(Boolean).pop()
      return id ? `https://player.vimeo.com/video/${id}` : null
    }
  } catch {}

  return null
}

export function LandingPageClient({ product }: LandingPageClientProps) {
  const [selectedImage, setSelectedImage] = useState(
    product.landingPageSetting?.landingGalleryPrimaryImage || product.landingHeroImage || product.images[0] || ""
  )
  const [selectedSize, setSelectedSize] = useState("")
  const [selectedColor, setSelectedColor] = useState("")
  const [quantity, setQuantity] = useState(1)
  const [step, setStep] = useState(0)
  const [deliveryZone, setDeliveryZone] = useState<DeliveryZone>("dhaka")
  const [deliveryFee, setDeliveryFee] = useState(100)
  const [deliveryFeeMap, setDeliveryFeeMap] = useState<Record<DeliveryZone, number>>({ chatto: 60, dhaka: 100, outside: 130 })
  const [paymentMethod, setPaymentMethod] = useState<string>("cod")
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodSetting[]>([])
  const [paymentMethodsLoading, setPaymentMethodsLoading] = useState(true)
  const [phone, setPhone] = useState("")
  const [loading, setLoading] = useState(false)
  const [couponCode, setCouponCode] = useState("")
  const [couponDiscount, setCouponDiscount] = useState(0)
  const [couponApplied, setCouponApplied] = useState(false)
  const [couponError, setCouponError] = useState("")
  const [couponLoading, setCouponLoading] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [orderResult, setOrderResult] = useState<OrderResult | null>(null)

  const [checkoutSettings, setCheckoutSettings] = useState<CheckoutSettings | null>(null)
  const [settingsLoading, setSettingsLoading] = useState(true)
  const idempotencyKeyRef = useRef<string>("")
  const isSubmitting = useRef(false)

  const [otpState, setOtpState] = useState<"idle" | "sending" | "sent" | "verifying" | "verified" | "error">("idle")
  const [otpCode, setOtpCode] = useState("")
  const [otpError, setOtpError] = useState("")
  const [cooldownRemaining, setCooldownRemaining] = useState(0)
  const [checkoutVerificationToken, setCheckoutVerificationToken] = useState<string | null>(null)
  const [verifiedPhone, setVerifiedPhone] = useState<string | null>(null)
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [couponScope, setCouponScope] = useState<string | null>(null)
  const [productDiscount, setProductDiscount] = useState(0)
  const [deliveryDiscount, setDeliveryDiscount] = useState(0)
  const [discountedProductTotal, setDiscountedProductTotal] = useState(0)
  const [finalDeliveryFeeDisplay, setFinalDeliveryFeeDisplay] = useState(0)
  const [grandTotal, setGrandTotal] = useState(0)

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [divisionId, setDivisionId] = useState("")
  const [divisionName, setDivisionName] = useState("")
  const [districtId, setDistrictId] = useState("")
  const [districtName, setDistrictName] = useState("")
  const [upazilaId, setUpazilaId] = useState("")
  const [upazilaName, setUpazilaName] = useState("")
  const [fullAddress, setFullAddress] = useState("")
  const [note, setNote] = useState("")

  const [divisions, setDivisions] = useState<Awaited<ReturnType<typeof getDivisions>>>([])
  const [districts, setDistricts] = useState<Awaited<ReturnType<typeof getDistrictsByDivision>>>([])
  const [upazilas, setUpazilas] = useState<Awaited<ReturnType<typeof getUpazilasByDistrict>>>([])

  const { data: session } = useSession()
  const isLoggedIn = !!session?.user

  const isV2 = checkoutSettings?.checkoutV2Enabled ?? false
  const baseOtpRequired = checkoutSettings?.otpRequired ?? true
  const otpRequired = product.landingPageSetting?.otpOverrideEnabled
    ? (product.landingPageSetting?.otpOverride ?? baseOtpRequired)
    : baseOtpRequired
  const otpProvider = checkoutSettings?.otpProvider ?? "mock"
  const hasVariants = product.variants.length > 0

  const sizes = useMemo(() => [...new Set(product.variants.map((variant) => variant.size))], [product.variants])
  const colors = useMemo(() => [...new Set(product.variants.map((variant) => variant.color))], [product.variants])
  const selectedVariant = useMemo(
    () => product.variants.find((variant) => variant.size === selectedSize && variant.color === selectedColor),
    [product.variants, selectedColor, selectedSize]
  )
  const selectedStock = hasVariants ? getAvailableStock(selectedVariant) : 99
  const quantityLimit = product.landingPageSetting?.quantityLimit ?? 10
  const maxQuantity = Math.max(1, Math.min(quantityLimit, selectedStock || 1))
  const subtotal = product.price * quantity
  const effectiveDeliveryFee = couponApplied ? finalDeliveryFeeDisplay : deliveryFee
  const displayTotal = couponApplied && grandTotal > 0
    ? grandTotal
    : subtotal + effectiveDeliveryFee - couponDiscount
  const computedPayment = calculatePaymentAmounts(displayTotal, effectiveDeliveryFee, "cod_only" as PaymentRuleType, null)
  const galleryImages = useMemo(() => {
    const images = [
      product.landingPageSetting?.landingGalleryPrimaryImage,
      product.landingPageSetting?.landingGallerySecondaryImage,
      product.landingPageSetting?.landingGalleryTertiaryImage,
      product.landingHeroImage,
      ...product.images,
      ...(product.landingPageSetting?.galleryImages ?? []).map((img) => img.url),
    ].filter(Boolean) as string[]
    return [...new Set(images)]
  }, [
    product.images,
    product.landingHeroImage,
    product.landingPageSetting?.landingGalleryPrimaryImage,
    product.landingPageSetting?.landingGallerySecondaryImage,
    product.landingPageSetting?.landingGalleryTertiaryImage,
    product.landingPageSetting?.galleryImages,
  ])
  const heroImage = selectedImage || galleryImages[0] || ""
  const galleryRailImages = galleryImages.filter((image) => image !== heroImage).slice(0, 2)
  const galleryVideoUrl = product.landingPageSetting?.landingGalleryVideoUrl?.trim() || ""
  const galleryVideoEmbedUrl = getVideoEmbedUrl(galleryVideoUrl)
  const landingGalleryEnabled = product.landingPageSetting?.landingGalleryEnabled ?? true
  const hasGalleryRail = landingGalleryEnabled && (galleryRailImages.length > 0 || Boolean(galleryVideoUrl))
  const ctaLabel = product.landingPageSetting?.customCta || ""
  const thankYouMessage = product.landingPageSetting?.customThankYouMessage || ""
  const landingDisplayPrice = product.landingPageSetting?.landingDisplayPrice ?? product.price
  const comparePrice = product.landingPageSetting?.landingDisplayOldPrice ?? product.oldPrice ?? 0
  const savings = comparePrice > landingDisplayPrice ? comparePrice - landingDisplayPrice : 0
  const landingOfferText = product.landingPageSetting?.landingOfferText || ""
  const landingReviewsEnabled = product.landingPageSetting?.landingReviewsEnabled ?? true
  const landingFaqEnabled = product.landingPageSetting?.landingFaqEnabled ?? true
  const landingVariantEnabled = product.landingPageSetting?.landingVariantSectionEnabled ?? true
  const landingProductSummaryEnabled = product.landingPageSetting?.landingProductSummaryEnabled ?? true
  const landingFaqs = useMemo(() => {
    const items = product.landingPageSetting?.faqItems ?? []
    return items
      .filter((item) => item.enabled)
      .sort((a, b) => a.sortOrder - b.sortOrder)
  }, [product.landingPageSetting?.faqItems])
  const landingTestimonials = useMemo(() => {
    const items = product.landingPageSetting?.testimonials ?? []
    return items
      .filter((item) => item.enabled)
      .sort((a, b) => a.sortOrder - b.sortOrder)
  }, [product.landingPageSetting?.testimonials])
  const benefits = useMemo(() => {
    const items = product.landingPageSetting?.benefits ?? []
    return items
      .filter((item) => item.enabled)
      .sort((a, b) => a.sortOrder - b.sortOrder)
  }, [product.landingPageSetting?.benefits])
  const enabledPaymentMethods = paymentMethods.filter((method) => method.enabled)
  const paymentModeLabel = paymentMethodsLoading
    ? "Loading..."
    : enabledPaymentMethods.length > 0
      ? enabledPaymentMethods.map((method) => method.displayName).join(", ")
      : "Payment method unavailable"
  const hasRealReviewSummary = (product.reviewCount ?? 0) > 0 && typeof product.averageRating === "number"
  const shouldShowReviews = landingReviewsEnabled && (hasRealReviewSummary || landingTestimonials.length > 0)
  const sectionOrderConfig = product.landingPageSetting?.landingSectionOrder ?? DEFAULT_SECTION_ORDER
  const sortedSections = useMemo(
    () => [...sectionOrderConfig].filter((s) => s.enabled).sort((a, b) => a.order - b.order),
    [sectionOrderConfig]
  )
  const sectionTitles = useMemo(() => {
    const map: Record<string, { title?: string; subtitle?: string }> = {}
    sectionOrderConfig.forEach((s) => { map[s.key] = { title: s.title, subtitle: s.subtitle } })
    return map
  }, [sectionOrderConfig])

  const sizeIsAvailable = useCallback((size: string) => (
    product.variants.some((variant) => (
      variant.size === size &&
      (!selectedColor || variant.color === selectedColor) &&
      getAvailableStock(variant) > 0
    ))
  ), [product.variants, selectedColor])

  const colorIsAvailable = useCallback((color: string) => (
    product.variants.some((variant) => (
      variant.color === color &&
      (!selectedSize || variant.size === selectedSize) &&
      getAvailableStock(variant) > 0
    ))
  ), [product.variants, selectedSize])

  useEffect(() => {
    setDivisions(getDivisions())
  }, [])

  useEffect(() => {
    const firstAvailable = product.variants.find((variant) => getAvailableStock(variant) > 0)
    if (firstAvailable && (!selectedSize || !selectedColor)) {
      setSelectedSize(firstAvailable.size)
      setSelectedColor(firstAvailable.color)
    }
  }, [product.variants, selectedColor, selectedSize])

  useEffect(() => {
    setQuantity((current) => Math.min(Math.max(1, current), maxQuantity))
  }, [maxQuantity])

  useEffect(() => {
    const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null
    const urlCoupon = params?.get("coupon")
    const lpCoupon = product.landingPageSetting?.couponOverrideEnabled
      ? product.landingPageSetting?.autoCouponCode
      : null
    const code = urlCoupon || lpCoupon || product.defaultCouponCode || ""
    if (code) setCouponCode(code)
  }, [product.defaultCouponCode, product.landingPageSetting])

  useEffect(() => {
    fetch("/api/payment-methods")
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          const methods = data.data as PaymentMethodSetting[]
          setPaymentMethods(methods)
          const cod = methods.find((method) => method.provider === "COD")
          if (cod?.enabled) setPaymentMethod("cod")
        }
      })
      .catch(() => {})
      .finally(() => setPaymentMethodsLoading(false))
  }, [])

  useEffect(() => {
    fetch("/api/checkout/settings")
      .then((response) => response.json())
      .then((data) => {
        if (data.success) setCheckoutSettings(data.data as CheckoutSettings)
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
    if (otpState === "verified" && verifiedPhone && phone !== verifiedPhone) {
      clearPhoneVerification()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phone, otpState, verifiedPhone])

  useEffect(() => {
    fetch("/api/delivery-fees")
      .then((response) => response.json())
      .then((data) => {
        if (data.success && typeof data.data === "object" && !Array.isArray(data.data)) {
          const feeMap = data.data as Record<DeliveryZone, number>
          setDeliveryFeeMap(feeMap)
          setDeliveryFee((current) => districtId ? current : (feeMap.dhaka ?? 100))
        }
      })
      .catch(() => {})
  }, [districtId])

  useEffect(() => {
    if (!districtId) return
    fetch(`/api/delivery-fees?districtId=${encodeURIComponent(districtId)}`)
      .then((response) => response.json())
      .then((data) => {
        if (data.success && data.data && typeof data.data === "object" && "fee" in data.data) {
          const resolved = data.data as { zone: DeliveryZone; fee: number }
          setDeliveryZone(resolved.zone)
          setDeliveryFee(resolved.fee)
        }
      })
      .catch(() => {
        setDeliveryFee(deliveryFeeMap[deliveryZone] ?? 100)
      })
  }, [deliveryFeeMap, deliveryZone, districtId])

  useEffect(() => {
    if (!couponCode || couponApplied) return
    const timer = setTimeout(() => {
      validateCoupon(couponCode, true)
    }, 300)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [couponCode, couponApplied])

  useEffect(() => {
    if (!couponApplied || !couponCode) return
    const timer = setTimeout(() => {
      validateCoupon(couponCode, true)
    }, 400)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal, deliveryFee])

  useEffect(() => {
    if (orderResult) return
    const hasDraft =
      name.trim() ||
      email.trim() ||
      phone.trim() ||
      fullAddress.trim() ||
      couponCode.trim() ||
      step > 0
    if (!hasDraft) return

    const timer = setTimeout(() => {
      try {
        const token = localStorage.getItem(ABANDONED_CHECKOUT_TOKEN_KEY) || undefined
        const draftPhone = phone && isValidBdPhone(phone) ? normalizePhoneToE164(phone) : phone
        const item = {
          productId: product.id,
          variantId: selectedVariant?.id,
          name: product.name,
          price: product.price,
          quantity,
          size: selectedVariant?.size,
          color: selectedVariant?.color,
          image: product.images[0],
          slug: product.slug,
        }

        fetch("/api/checkout/abandoned", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token,
            cartItems: [item],
            checkoutData: {
              customer: { name, email, phone },
              address: {
                divisionId,
                divisionName,
                districtId,
                districtName,
                upazilaId,
                upazilaName,
                address: fullAddress,
                notes: note,
                deliveryZone,
              },
              checkout: { currentStep: step, couponCode, paymentMethod },
            },
            email,
            phone: draftPhone,
            name,
            couponCode,
            subtotal,
            deliveryFee: effectiveDeliveryFee,
            discount: couponDiscount,
            total: displayTotal,
            lastStep: STEPS[step]?.label ?? "Landing checkout",
          }),
        })
          .then((response) => response.json())
          .then((data) => {
            if (data.success && data.data?.token) {
              localStorage.setItem(ABANDONED_CHECKOUT_TOKEN_KEY, data.data.token)
            }
          })
          .catch(() => {})
      } catch {
        // Best-effort landing checkout recovery should never affect checkout.
      }
    }, 1500)

    return () => clearTimeout(timer)
  }, [
    couponCode,
    couponDiscount,
    deliveryFee,
    deliveryZone,
    displayTotal,
    districtId,
    districtName,
    divisionId,
    divisionName,
    effectiveDeliveryFee,
    email,
    fullAddress,
    name,
    note,
    orderResult,
    paymentMethod,
    phone,
    product.id,
    product.images,
    product.name,
    product.price,
    product.slug,
    quantity,
    selectedVariant,
    step,
    subtotal,
    upazilaId,
    upazilaName,
  ])

  const scrollToCheckout = useCallback(() => {
    document.getElementById("landing-checkout")?.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [])

  function clearPhoneVerification() {
    setOtpState("idle")
    setOtpCode("")
    setOtpError("")
    setCheckoutVerificationToken(null)
    setVerifiedPhone(null)
    if (cooldownRef.current) {
      clearInterval(cooldownRef.current)
      cooldownRef.current = null
    }
    setCooldownRemaining(0)
  }

  function selectSize(size: string) {
    if (!sizeIsAvailable(size)) return
    setSelectedSize(size)
    const currentVariant = product.variants.find((variant) => variant.size === size && variant.color === selectedColor)
    if (!currentVariant || getAvailableStock(currentVariant) <= 0) {
      const nextVariant = product.variants.find((variant) => variant.size === size && getAvailableStock(variant) > 0)
      setSelectedColor(nextVariant?.color ?? "")
    }
  }

  function selectColor(color: string) {
    if (!colorIsAvailable(color)) return
    setSelectedColor(color)
    const currentVariant = product.variants.find((variant) => variant.color === color && variant.size === selectedSize)
    if (!currentVariant || getAvailableStock(currentVariant) <= 0) {
      const nextVariant = product.variants.find((variant) => variant.color === color && getAvailableStock(variant) > 0)
      setSelectedSize(nextVariant?.size ?? "")
    }
  }

  function resetCouponDisplay() {
    setCouponDiscount(0)
    setCouponScope(null)
    setProductDiscount(0)
    setDeliveryDiscount(0)
    setDiscountedProductTotal(0)
    setFinalDeliveryFeeDisplay(0)
    setGrandTotal(0)
  }

  async function validateCoupon(code: string, quiet = false) {
    if (!code.trim()) return
    setCouponLoading(true)
    if (!quiet) setCouponError("")
    try {
      const response = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim(), subtotal, deliveryFee }),
      })
      const data = await response.json()
      if (data.success) {
        setCouponApplied(true)
        setCouponDiscount(data.data.discount)
        setCouponScope(data.data.couponScope ?? null)
        setProductDiscount(data.data.productDiscount ?? 0)
        setDeliveryDiscount(data.data.deliveryDiscount ?? 0)
        setDiscountedProductTotal(data.data.discountedProductTotal ?? subtotal)
        setFinalDeliveryFeeDisplay(data.data.finalDeliveryFee ?? deliveryFee)
        setGrandTotal(data.data.grandTotal ?? (subtotal + deliveryFee - data.data.discount))
        setCouponCode(code.trim().toUpperCase())
        setCouponError("")
      } else {
        setCouponApplied(false)
        resetCouponDisplay()
        if (!quiet) setCouponError(data.error ?? "Invalid coupon")
      }
    } catch {
      if (!quiet) setCouponError("Failed to validate coupon")
    } finally {
      setCouponLoading(false)
    }
  }

  function handleRemoveCoupon() {
    setCouponCode("")
    setCouponApplied(false)
    setCouponError("")
    resetCouponDisplay()
  }

  async function handleSendOtp() {
    if (!phone.trim() || !isValidBdPhone(phone.trim())) {
      toast.error("Enter a valid Bangladesh mobile number")
      return
    }

    const e164Phone = normalizePhoneToE164(phone.trim())
    setOtpState("sending")
    setOtpError("")

    try {
      const response = await fetch("/api/checkout/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: e164Phone }),
      })
      const data = await response.json()
      if (data.success) {
        setOtpState("sent")
        const cooldown = data.data.cooldownSeconds ?? 30
        setCooldownRemaining(cooldown)
        startCooldown(cooldown)
        toast.success(`OTP sent to ${data.data.maskedPhone ?? e164Phone}`)
      } else {
        setOtpState("error")
        setOtpError(data.error ?? "Failed to send OTP")
        toast.error(data.error ?? "Failed to send OTP")
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
      setCooldownRemaining((previous) => {
        if (previous <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current)
          cooldownRef.current = null
          return 0
        }
        return previous - 1
      })
    }, 1000)
  }

  async function handleVerifyOtp() {
    if (!otpCode.trim()) {
      setOtpError("Enter the OTP code")
      return
    }
    if (!phone.trim() || !isValidBdPhone(phone.trim())) {
      toast.error("Invalid phone number")
      return
    }

    const e164Phone = normalizePhoneToE164(phone.trim())
    setOtpState("verifying")
    setOtpError("")

    try {
      const response = await fetch("/api/checkout/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: e164Phone, code: otpCode.trim() }),
      })
      const data = await response.json()
      if (data.success) {
        setOtpState("verified")
        setCheckoutVerificationToken(data.data.checkoutVerificationToken)
        setVerifiedPhone(phone)
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
        setOtpError(data.error ?? "Invalid OTP")
        toast.error(data.error ?? "Invalid OTP")
      }
    } catch {
      setOtpState("sent")
      setOtpError("Network error. Please try again.")
    }
  }

  const validateCurrentStep = useCallback((): string[] => {
    const errors: string[] = []
    switch (step) {
      case 0:
        if (hasVariants && !selectedVariant) errors.push("Please select an available size and color")
        if (hasVariants && selectedVariant && selectedStock < quantity) errors.push(`Only ${selectedStock} item(s) available for this variant`)
        break
      case 1:
        if (!name.trim()) errors.push("Full name is required")
        if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("Valid email is required")
        if (!phone.trim() || !isValidBdPhone(phone.trim())) errors.push("Enter a valid Bangladesh mobile number")
        if (isV2 && otpRequired && otpState !== "verified") errors.push("Please verify your phone with OTP before continuing")
        break
      case 2:
        if (!divisionId) errors.push("Division is required")
        if (!districtId) errors.push("District is required")
        if (!upazilaId) errors.push("Upazila / Thana is required")
        if (!fullAddress.trim()) errors.push("Full address is required")
        break
      case 3:
        if (couponCode.trim() && !couponApplied) errors.push("Apply or remove the coupon code before placing the order")
        if (!paymentMethodsLoading && !paymentMethods.some((method) => method.provider === "COD" && method.enabled)) {
          errors.push("Cash on Delivery is currently unavailable")
        }
        break
    }
    return errors
  }, [
    couponApplied,
    couponCode,
    districtId,
    divisionId,
    email,
    fullAddress,
    hasVariants,
    isV2,
    name,
    otpRequired,
    otpState,
    paymentMethods,
    paymentMethodsLoading,
    phone,
    quantity,
    selectedStock,
    selectedVariant,
    step,
    upazilaId,
  ])

  function goToStep(target: number) {
    if (target < 0 || target > 3) return
    if (target > step) {
      const errors = validateCurrentStep()
      setValidationErrors(errors)
      if (errors.length > 0) return
    }
    setStep(target)
    setValidationErrors([])
    scrollToCheckout()
  }

  function handleNext() {
    const errors = validateCurrentStep()
    setValidationErrors(errors)
    if (errors.length > 0) return
    if (step === 3) {
      placeOrder()
      return
    }
    setStep((current) => Math.min(current + 1, 3))
    scrollToCheckout()
  }

  function handleBack() {
    setStep((current) => Math.max(current - 1, 0))
    setValidationErrors([])
    scrollToCheckout()
  }

  async function placeOrder() {
    if (isSubmitting.current) return

    const errors = validateCurrentStep()
    setValidationErrors(errors)
    if (errors.length > 0) return

    if (isV2 && otpRequired && !checkoutVerificationToken) {
      toast.error("Please verify your phone with OTP before placing the order")
      return
    }

    const e164Phone = normalizePhoneToE164(phone.trim())
    isSubmitting.current = true
    setLoading(true)

    const payload: Record<string, unknown> = {
      name,
      email,
      phone: e164Phone,
      divisionId,
      divisionName,
      districtId,
      districtName,
      upazilaId,
      upazilaName,
      fullAddress,
      notes: note,
      paymentMethod: "cod",
      couponCode: couponApplied ? couponCode : undefined,
      items: [
        {
          productId: product.id,
          variantId: selectedVariant?.id,
          quantity,
        },
      ],
    }

    try {
      const abandonedCheckoutToken = localStorage.getItem(ABANDONED_CHECKOUT_TOKEN_KEY)
      if (abandonedCheckoutToken) payload.abandonedCheckoutToken = abandonedCheckoutToken
    } catch {}

    if (isV2) {
      payload.idempotencyKey = idempotencyKeyRef.current
      if (checkoutVerificationToken) payload.checkoutVerificationToken = checkoutVerificationToken
    }

    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (isV2) headers["X-Checkout-Session-Id"] = idempotencyKeyRef.current

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (data.success) {
        const order = data.data?.order
        if (data.data?.paymentInitData?.paymentUrl) {
          toast.error("This landing page accepts Cash on Delivery orders only.")
          return
        }

        if (order?.orderNumber) {
          try {
            localStorage.removeItem(ABANDONED_CHECKOUT_TOKEN_KEY)
          } catch {}

          setOrderResult({
            id: order.id,
            orderNumber: order.orderNumber,
            total: order.total,
            subtotal: order.subtotal,
            deliveryFee: order.deliveryFee,
            discount: order.discount,
            dueAmount: order.dueAmount ?? order.total,
            customerName: order.customerName,
            customerPhone: order.customerPhone,
            customerEmail: order.customerEmail,
            successToken: data.data?.successToken,
          })
          setStep(3)
          toast.success("Order placed successfully!")
          window.scrollTo({ top: 0, behavior: "smooth" })
        } else {
          toast.error("Order created, but the success summary could not be loaded.")
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

  if (orderResult) {
    const secureSummaryHref = orderResult.successToken
      ? `/order/success/${orderResult.orderNumber}?token=${encodeURIComponent(orderResult.successToken)}`
      : null

    return (
      <div className="min-h-screen bg-[#f8f6f1] px-4 py-12 text-zinc-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-lg border border-emerald-400/25 bg-emerald-400/10">
              <CheckCircle className="h-8 w-8 text-emerald-700" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">Order confirmed</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Thank you, {orderResult.customerName}</h1>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-zinc-400">
              {thankYouMessage} We will call {orderResult.customerPhone} before dispatch.
            </p>
          </div>

          <section className="mt-8 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Order number</p>
                <p className="mt-1 font-mono text-xl font-bold">{orderResult.orderNumber}</p>
              </div>
              <div className="sm:text-right">
                <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Total due</p>
                <p className="mt-1 text-xl font-bold">{formatTk(orderResult.total)}</p>
              </div>
            </div>
            <Separator className="my-5" />
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-500">Subtotal</span>
                <span>{formatTk(orderResult.subtotal)}</span>
              </div>
              {orderResult.discount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Discount</span>
                  <span>-{formatTk(orderResult.discount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-zinc-500">Delivery fee</span>
                <span>{formatTk(orderResult.deliveryFee)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Due on delivery</span>
                <span>{formatTk(orderResult.dueAmount)}</span>
              </div>
            </div>
          </section>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Link href={`/track-order?order=${orderResult.orderNumber}`} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 text-sm font-medium text-white hover:bg-orange-400">
              <Truck className="h-4 w-4" />
              Track Order
            </Link>
            {isLoggedIn ? (
              <Link href={`/order/${orderResult.orderNumber}/invoice`} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium hover:bg-zinc-100">
                <Printer className="h-4 w-4" />
                View/Print Invoice
              </Link>
            ) : secureSummaryHref ? (
              <Link href={secureSummaryHref} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium hover:bg-zinc-100">
                <Printer className="h-4 w-4" />
                View Order Summary
              </Link>
            ) : null}
            <Link href="/" className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium hover:bg-zinc-100">
              <ShoppingBag className="h-4 w-4" />
              Continue Shopping
            </Link>
            <Link href="/contact" className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium hover:bg-zinc-100">
              <HeadphonesIcon className="h-4 w-4" />
              Contact Support
            </Link>
          </div>

          {!isLoggedIn && (
            <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-50">
                  <UserPlus className="h-4 w-4 text-orange-700" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Create an account for invoice access</p>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">Guest customers can track the order now. Invoice access is available after login or order verification.</p>
                  <Link href="/auth/register" className="mt-3 inline-flex text-sm font-medium text-orange-700 hover:underline">
                    Create account
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderCheckoutStep = () => {
    if (step === 0) {
      return (
        <div className="space-y-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">Choose your set</p>
            <h3 className="mt-1 text-base font-semibold text-zinc-950"></h3>
          </div>
          {hasVariants ? (
            <>
              <div className="space-y-2">
                <Label className="text-xs text-zinc-400">Color</Label>
                <div className="flex flex-wrap gap-2">
                  {colors.map((color) => {
                    const available = colorIsAvailable(color)
                    const variant = product.variants.find((item) => item.color === color && item.colorHex)
                    return (
                      <button
                        key={color}
                        type="button"
                        onClick={() => selectColor(color)}
                        disabled={!available}
                        className={`flex h-9 items-center gap-2 rounded-md border px-3 text-xs transition ${
                          selectedColor === color
                            ? "border-orange-400 bg-orange-100 text-orange-700"
                            : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400"
                        } disabled:cursor-not-allowed disabled:opacity-40`}
                      >
                        <span className="h-4 w-4 rounded-full border border-zinc-300" style={{ backgroundColor: variant?.colorHex || "#27272a" }} />
                        {color}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-zinc-400">Size</Label>
                <div className="flex flex-wrap gap-2">
                  {sizes.map((size) => {
                    const available = sizeIsAvailable(size)
                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => selectSize(size)}
                        disabled={!available}
                        className={`h-9 min-w-10 rounded-md border px-3 text-xs font-medium transition ${
                          selectedSize === size
                            ? "border-orange-400 bg-orange-100 text-orange-700"
                            : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400"
                        } disabled:cursor-not-allowed disabled:opacity-40`}
                      >
                        {size}
                      </button>
                    )
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-md border border-zinc-200 bg-white p-3 text-xs text-zinc-400">Single standard option available.</div>
          )}
          <div className="flex items-center justify-between rounded-md border border-zinc-200 bg-white p-3">
            <div>
              <p className="text-xs font-medium text-zinc-800">{selectedVariant ? `${selectedVariant.color} / ${selectedVariant.size}` : product.name}</p>
              <p className="mt-0.5 text-[11px] text-zinc-500">{hasVariants ? "Selected option" : "Standard option"}</p>
            </div>
            <div className="flex items-center rounded-md border border-zinc-200">
              <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={quantity <= 1} className="flex h-8 w-8 items-center justify-center text-zinc-700 disabled:opacity-30">
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="w-8 text-center text-xs font-semibold tabular-nums text-zinc-950">{quantity}</span>
              <button type="button" onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))} disabled={quantity >= maxQuantity} className="flex h-8 w-8 items-center justify-center text-zinc-700 disabled:opacity-30">
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )
    }

    if (step === 1) {
      return (
        <div className="space-y-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">Contact</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="আপনার নাম" className="h-10 border-zinc-200 bg-white text-zinc-950 placeholder:text-zinc-400" />
            <Input value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 11))} placeholder="013XXXXXXXX" className="h-10 border-zinc-200 bg-white text-zinc-950 placeholder:text-zinc-400" />
            <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email address" className="h-10 border-zinc-200 bg-white text-zinc-950 placeholder:text-zinc-400 sm:col-span-2" />
          </div>
          {isV2 && otpRequired && (
            <div className="rounded-md border border-zinc-200 bg-white p-3">
              {otpProvider === "firebase" ? (
                <FirebaseOtpPanel
                  phone={phone}
                  disabled={loading}
                  onVerified={(token) => {
                    setOtpState("verified")
                    setCheckoutVerificationToken(token)
                    setVerifiedPhone(phone)
                    setOtpCode("")
                    setOtpError("")
                    if (cooldownRef.current) clearInterval(cooldownRef.current)
                    setCooldownRemaining(0)
                    toast.success("Phone verified successfully")
                  }}
                  onReset={clearPhoneVerification}
                />
              ) : otpState === "verified" ? (
                <div className="flex items-center justify-between text-sm text-emerald-700">
                  <span className="inline-flex items-center gap-2"><CheckCircle className="h-4 w-4" /> Phone verified</span>
                  <button type="button" onClick={clearPhoneVerification} className="text-xs text-orange-700">Change</button>
                </div>
              ) : (
                <div className="space-y-3">
                  <button type="button" onClick={handleSendOtp} disabled={!phone.trim() || !isValidBdPhone(phone.trim()) || otpState === "sending"} className="inline-flex h-9 items-center gap-2 rounded-md border border-zinc-300 px-3 text-xs text-zinc-800 disabled:opacity-40">
                    <Smartphone className="h-3.5 w-3.5" />
                    {otpState === "sending" ? "Sending..." : "Send OTP"}
                  </button>
                  {(otpState === "sent" || otpState === "verifying" || otpState === "error") && (
                    <div className="flex flex-wrap items-center gap-2">
                      <Input value={otpCode} onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" className="h-9 w-28 border-zinc-200 bg-[#f8f6f1] text-center font-mono text-zinc-950" />
                      <Button type="button" onClick={handleVerifyOtp} disabled={otpState === "verifying" || otpCode.length < 6} className="h-9 rounded-md bg-orange-500 text-xs hover:bg-orange-400">Verify</Button>
                      {cooldownRemaining > 0 && <span className="text-xs text-zinc-500">{cooldownRemaining}s</span>}
                    </div>
                  )}
                  {otpError && <p className="text-xs text-red-700">{otpError}</p>}
                </div>
              )}
            </div>
          )}
        </div>
      )
    }

    if (step === 2) {
      return (
        <div className="space-y-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">Address</p>
          </div>
          <Input value={fullAddress} onChange={(event) => setFullAddress(event.target.value)} placeholder="House, road, area, district..." className="h-10 border-zinc-200 bg-white text-zinc-950 placeholder:text-zinc-400" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              value={divisionId}
              onValueChange={(value) => {
                if (!value) return
                const division = divisions.find((item) => item.id === value)
                if (!division) return
                setDivisionId(division.id)
                setDivisionName(division.name)
                setDistrictId("")
                setDistrictName("")
                setUpazilaId("")
                setUpazilaName("")
                setDistricts(getDistrictsByDivision(value))
                setUpazilas([])
              }}
            >
              <SelectTrigger className="h-10 border-zinc-200 bg-white text-zinc-950"><SelectValue placeholder="Division" /></SelectTrigger>
              <SelectContent>{divisions.map((division) => <SelectItem key={division.id} value={division.id}>{division.name}</SelectItem>)}</SelectContent>
            </Select>
            <Select
              value={districtId}
              disabled={!divisionId}
              onValueChange={(value) => {
                if (!value) return
                const district = districts.find((item) => item.id === value)
                if (!district) return
                setDistrictId(district.id)
                setDistrictName(district.name)
                setUpazilaId("")
                setUpazilaName("")
                setUpazilas(getUpazilasByDistrict(value))
              }}
            >
              <SelectTrigger className="h-10 border-zinc-200 bg-white text-zinc-950"><SelectValue placeholder="District" /></SelectTrigger>
              <SelectContent>{districts.map((district) => <SelectItem key={district.id} value={district.id}>{district.name}</SelectItem>)}</SelectContent>
            </Select>
            <Select
              value={upazilaId}
              disabled={!districtId}
              onValueChange={(value) => {
                if (!value) return
                const upazila = upazilas.find((item) => item.id === value)
                if (!upazila) return
                setUpazilaId(upazila.id)
                setUpazilaName(upazila.name)
              }}
            >
              <SelectTrigger className="h-10 border-zinc-200 bg-white text-zinc-950"><SelectValue placeholder="Upazila / Thana" /></SelectTrigger>
              <SelectContent>{upazilas.map((upazila) => <SelectItem key={upazila.id} value={upazila.id}>{upazila.name}</SelectItem>)}</SelectContent>
            </Select>
            <Input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Note (optional)" className="h-10 border-zinc-200 bg-white text-zinc-950 placeholder:text-zinc-400" />
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">Review</p>
          </div>
        {landingProductSummaryEnabled && (
          <div className="rounded-md border border-zinc-200 bg-white p-3 text-xs text-zinc-700">
            <div className="flex justify-between"><span>{product.name}</span><span>{formatTk(subtotal)}</span></div>
            <p className="mt-1 text-zinc-500">{[selectedVariant?.color, selectedVariant?.size].filter(Boolean).join(" / ") || "Standard"} · Qty {quantity}</p>
          </div>
        )}
        <div className="space-y-2">
          {couponApplied ? (
            <div className="flex items-center justify-between rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
              <span>{couponCode} saved {formatTk(couponDiscount)}</span>
              <button type="button" onClick={handleRemoveCoupon} className="text-orange-700">Remove</button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input value={couponCode} onChange={(event) => { setCouponCode(event.target.value); setCouponError("") }} placeholder="Coupon code" className="h-10 border-zinc-200 bg-white text-zinc-950 placeholder:text-zinc-400" />
              <Button type="button" onClick={() => validateCoupon(couponCode)} disabled={couponLoading || !couponCode.trim()} className="h-10 rounded-md border border-zinc-200 bg-white text-xs text-zinc-900 hover:bg-zinc-100">Apply</Button>
            </div>
          )}
          {couponError && <p className="text-xs text-red-700">{couponError}</p>}
        </div>
        <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
          <div className="flex items-center gap-3 rounded-md border border-orange-500/25 bg-orange-50 p-3">
            <RadioGroupItem value="cod" id="landing-cod-dark" />
            <Label htmlFor="landing-cod-dark" className="text-sm text-orange-700">Cash on Delivery</Label>
          </div>
        </RadioGroup>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8f6f1] text-zinc-950">
      <section className="mx-auto max-w-[1500px] px-4 pb-12 pt-4 sm:px-6 lg:px-8">
        <header className="mb-4 flex items-center justify-between">
          <Link href="/" className="text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-500">DOSHOK</Link>
          <span className="rounded-full bg-orange-500/20 px-3 py-1 text-[10px] font-medium text-orange-700">
            {product.landingPageSetting?.urgencyCounterEnabled ? "Campaign live" : "Landing offer"}
          </span>
        </header>

        {sortedSections.map((section, sectionIndex) => {
          const sectionInfo = sectionTitles[section.key] || {}
          const title = sectionInfo.title || ""
          const subtitle = sectionInfo.subtitle || ""

          switch (section.key) {
            case "hero":
              return (
                <div key={section.key}>
                  <div className="relative overflow-hidden rounded-lg border border-zinc-200 bg-white">
                    {heroImage && <img src={heroImage} alt="" className="absolute inset-y-0 right-0 h-full w-3/5 object-cover opacity-55" />}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_32%,rgba(249,115,22,0.14),transparent_30%),linear-gradient(90deg,#f8f6f1_0%,rgba(248,246,241,0.96)_46%,rgba(248,246,241,0.68)_100%)]" />
                    <div className="relative min-h-[360px] px-4 py-5 sm:min-h-[520px] sm:px-8 sm:py-8">
                      {subtitle && <p className="mt-24 text-[10px] uppercase tracking-[0.22em] text-zinc-500 sm:mt-36">{subtitle}</p>}
                      <h1 className="mt-2 max-w-[320px] text-3xl font-semibold leading-[0.98] tracking-tight text-zinc-950 sm:text-5xl">
                        {product.landingHeadline || product.name}
                      </h1>
                      <p className="mt-3 max-w-sm text-xs leading-5 text-zinc-400 sm:text-sm">
                        {product.landingSubheadline || product.shortDescription || product.description}
                      </p>
                      <div className="mt-6 flex items-end gap-3">
                        <span className="text-3xl font-semibold">{formatTk(landingDisplayPrice)}</span>
                        {comparePrice > 0 && <span className="pb-1 text-sm text-zinc-500 line-through">{formatTk(comparePrice)}</span>}
                        {savings > 0 && <span className="mb-1 rounded-full bg-orange-500 px-2 py-1 text-[10px] text-white">Save {formatTk(savings)}</span>}
                      </div>
                      {landingOfferText && <p className="mt-2 text-xs font-medium text-orange-700">{landingOfferText}</p>}
                      <div className="mt-6 flex flex-wrap items-center gap-3">
                        {ctaLabel && (
                          <button type="button" onClick={scrollToCheckout} className="rounded-full bg-orange-500 px-5 py-2 text-xs font-semibold text-white hover:bg-orange-400">{ctaLabel}</button>
                        )}
                        {galleryImages.length > 1 && (
                          <button type="button" onClick={() => setSelectedImage(galleryImages[1])} className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-950">
                            View details <ChevronRight className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {benefits.length > 0 && (
                    <div className="grid grid-cols-4 border-b border-zinc-200 text-center">
                      {benefits.slice(0, 4).map((benefit) => (
                        <div key={benefit.title} className="border-r border-zinc-200 px-2 py-5 last:border-r-0">
                          {benefit.icon && <span className="text-lg">{benefit.icon}</span>}
                          <p className="text-[10px] text-zinc-500">{benefit.title}</p>
                          <p className="mt-1 truncate text-xs font-medium text-zinc-700">{benefit.description || ""}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )

            case "benefits":
              if (benefits.length === 0) return null
              return (
                <section key={section.key} className="py-8">
                  {subtitle && <p className="text-[10px] uppercase tracking-[0.24em] text-zinc-400">{subtitle}</p>}
                  {title && <h2 className="mt-1 text-2xl font-semibold">{title}</h2>}
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {benefits.map((item, index) => (
                      <div key={`${item.title}-${index}`} className="rounded-md border border-zinc-200 bg-white p-4">
                        {item.icon ? (
                          <span className="block text-lg">{item.icon}</span>
                        ) : (
                          <Package className="h-4 w-4 text-zinc-500" />
                        )}
                        <p className="mt-3 text-sm font-medium text-zinc-800">{item.title}</p>
                        <p className="mt-1 text-xs leading-5 text-zinc-500">{item.description || ""}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )

            case "gallery":
              if (!landingGalleryEnabled) return null
              const allGalleryImages = galleryImages.filter((img) => img !== selectedImage)
              return (
                <section key={section.key} className="py-8">
                  {subtitle && <p className="text-[10px] uppercase tracking-[0.24em] text-zinc-400">{subtitle}</p>}
                  {title && <h2 className="mt-1 text-2xl font-semibold leading-tight text-zinc-950 sm:text-3xl">{title}</h2>}
                  <div className="mt-5">
                    {/* Main large image */}
                    <div className="aspect-[16/9] overflow-hidden rounded-lg border border-zinc-200 bg-white sm:aspect-[2/1]">
                      {selectedImage ? (
                        <img src={selectedImage} alt={product.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-zinc-400">Image unavailable</div>
                      )}
                    </div>
                    {/* Thumbnail strip */}
                    {(galleryImages.length > 1 || Boolean(galleryVideoUrl)) && (
                      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                        {galleryImages.map((image, index) => (
                          <button
                            key={image}
                            type="button"
                            onClick={() => setSelectedImage(image)}
                            className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-md border ${
                              selectedImage === image ? "border-orange-500 ring-2 ring-orange-500/20" : "border-zinc-200"
                            }`}
                          >
                            <img src={image} alt="" className="h-full w-full object-cover" />
                          </button>
                        ))}
                        {galleryVideoUrl && (
                          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md border border-zinc-200 bg-zinc-100">
                            {galleryVideoEmbedUrl ? (
                              <iframe
                                src={galleryVideoEmbedUrl}
                                title={`${product.name} video`}
                                className="h-full w-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                allowFullScreen
                              />
                            ) : (
                              <video
                                src={galleryVideoUrl}
                                className="h-full w-full object-cover"
                                controls
                                playsInline
                                preload="metadata"
                              />
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </section>
              )

            case "variant":
              if (!landingVariantEnabled) return null
              return (
                <section key={section.key} className="space-y-5 border-b border-zinc-200 pb-8">
                  {subtitle && <p className="text-[10px] uppercase tracking-[0.24em] text-zinc-400">{subtitle}</p>}
                  {title && <h2 className="text-2xl font-semibold">{title}</h2>}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.24em] text-zinc-400">Color</p>
                      <div className="mt-2 flex gap-2">
                        {colors.map((color) => {
                          const variant = product.variants.find((item) => item.color === color && item.colorHex)
                          return <button key={color} type="button" onClick={() => selectColor(color)} className={`h-8 w-8 rounded-full border ${selectedColor === color ? "border-orange-400 ring-2 ring-orange-500/25" : "border-zinc-300"}`} style={{ backgroundColor: variant?.colorHex || "#27272a" }} aria-label={color} />
                        })}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-[0.24em] text-zinc-400">Size</p>
                      <p className="mt-3 text-xs text-zinc-500">{selectedVariant ? `${selectedVariant.size} selected` : "Select size"}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {sizes.map((size) => (
                      <button key={size} type="button" onClick={() => selectSize(size)} disabled={!sizeIsAvailable(size)} className={`h-8 rounded-md border px-3 text-xs ${selectedSize === size ? "border-orange-500 bg-orange-100 text-orange-700" : "border-zinc-200 text-zinc-400"} disabled:opacity-30`}>{size}</button>
                    ))}
                  </div>
                  <div className="flex items-center justify-between rounded-md border border-zinc-200 bg-white p-3">
                    <div>
                      <p className="text-sm font-semibold">{formatTk(displayTotal)}</p>
                      <p className="text-[11px] text-zinc-500">{quantity} item · {selectedVariant ? `${selectedVariant.color} / ${selectedVariant.size}` : "Standard"}</p>
                    </div>
                    {ctaLabel && (
                      <button type="button" onClick={scrollToCheckout} className="rounded-full border border-zinc-300 px-4 py-2 text-xs text-zinc-800 hover:border-orange-500">{ctaLabel}</button>
                    )}
                  </div>
                </section>
              )

            case "testimonials":
              if (!landingReviewsEnabled || landingTestimonials.length === 0) return null
              return (
                <section key={section.key} className="border-y border-zinc-200 py-8">
                  {subtitle && <p className="text-[10px] uppercase tracking-[0.24em] text-zinc-400">{subtitle}</p>}
                  {title && <h2 className="mt-1 text-2xl font-semibold">{title}</h2>}
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    {landingTestimonials.map((testimonial) => (
                      <article key={`${testimonial.name}-${testimonial.sortOrder}`} className="rounded-md border border-zinc-200 bg-white p-4">
                        <div className="flex items-center gap-2">
                          {testimonial.image && <img src={testimonial.image} alt="" className="h-8 w-8 rounded-full object-cover" />}
                          <div>
                            <p className="text-sm font-semibold text-zinc-900">{testimonial.name}</p>
                            <div className="mt-0.5 flex text-orange-400">{Array.from({ length: testimonial.rating }).map((_, item) => <Star key={item} className="h-3 w-3 fill-current" />)}</div>
                          </div>
                        </div>
                        <p className="mt-3 text-xs leading-5 text-zinc-600">{testimonial.text}</p>
                      </article>
                    ))}
                  </div>
                </section>
              )

            case "checkout":
              return (
                <section key={section.key} id="landing-checkout" className="py-8">
                  {subtitle && <p className="text-[10px] uppercase tracking-[0.24em] text-zinc-400">{subtitle}</p>}
                  {title && <h2 className="mt-1 text-2xl font-semibold">{title}</h2>}
                  <div className="mt-4 rounded-md border border-zinc-200 bg-white p-4">
                    <div className="mb-4 grid grid-cols-4 gap-1">
                      {STEPS.map((item) => (
                        <button key={item.index} type="button" onClick={() => goToStep(item.index)} className={`rounded-md border px-2 py-2 text-[10px] ${step === item.index ? "border-orange-500 bg-orange-100 text-orange-700" : item.index < step ? "border-zinc-300 text-zinc-700" : "border-zinc-200 text-zinc-400"}`}>{item.label}</button>
                      ))}
                    </div>
                    {validationErrors.length > 0 && (
                      <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                        {validationErrors.map((error) => <p key={error}>{error}</p>)}
                      </div>
                    )}
                    {renderCheckoutStep()}
                    <div className="mt-5 rounded-md border border-zinc-200 bg-[#f8f6f1] p-3 text-xs">
                      <div className="flex justify-between text-zinc-500"><span>Subtotal</span><span>{formatTk(subtotal)}</span></div>
                      {couponApplied && <div className="mt-2 flex justify-between text-emerald-700"><span>Discount</span><span>-{formatTk(couponDiscount)}</span></div>}
                      <div className="mt-2 flex justify-between text-zinc-500"><span>Delivery</span><span>{formatTk(deliveryFee)}</span></div>
                      <Separator className="my-3 bg-zinc-200" />
                      <div className="flex justify-between text-base font-semibold text-zinc-950"><span>Total</span><span>{formatTk(displayTotal)}</span></div>
                      {isV2 && <p className="mt-1 text-[11px] text-zinc-500">Due on delivery: {formatTk(computedPayment.dueAmount)}</p>}
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <button type="button" onClick={handleBack} disabled={step === 0 || loading} className="inline-flex h-10 items-center gap-1 rounded-md px-3 text-xs text-zinc-400 disabled:opacity-30"><ChevronLeft className="h-3.5 w-3.5" />Back</button>
                      <button type="button" onClick={handleNext} disabled={loading} className="h-10 rounded-md border border-orange-500 bg-orange-50 px-4 text-xs font-semibold text-orange-700 hover:bg-orange-500/20 disabled:opacity-50">
                        {step === 3 ? (loading ? "Confirming..." : `Confirm order · ${formatTk(displayTotal)}`) : "Next"}
                      </button>
                    </div>
                  </div>
                </section>
              )

            case "faq":
              if (!landingFaqEnabled || landingFaqs.length === 0) return null
              return (
                <section key={section.key} className="border-t border-zinc-200 py-8">
                  {subtitle && <p className="text-[10px] uppercase tracking-[0.24em] text-zinc-400">{subtitle}</p>}
                  {title && <h2 className="mt-1 text-2xl font-semibold">{title}</h2>}
                  <div className="mt-4 divide-y divide-zinc-200">
                    {landingFaqs.map((faq) => (
                      <details key={faq.question} className="group py-4">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium text-zinc-800">
                          {faq.question}
                          <Plus className="h-4 w-4 shrink-0 text-zinc-400 group-open:rotate-45" />
                        </summary>
                        <p className="mt-3 text-xs leading-6 text-zinc-500">{faq.answer}</p>
                      </details>
                    ))}
                  </div>
                </section>
              )

            default:
              return null
          }
        })}
      </section>
    </div>
  )
}

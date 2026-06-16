"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import type { DeliveryZone } from "@/types"
import { DELIVERY_ZONE_NAMES } from "@/types"
import { CheckCircle, Truck, Shield, Tag, CreditCard, Minus, Plus, ChevronLeft, ChevronRight, Smartphone, User, LogIn, UserPlus, Clock } from "lucide-react"
import Link from "next/link"
import { normalizePhoneToE164, isValidBdPhone } from "@/lib/checkout/phone"
import { FirebaseOtpPanel } from "@/components/store/firebase-otp-panel"
import { useSession } from "next-auth/react"
import { calculatePaymentAmounts, type PaymentRuleType } from "@/lib/checkout/payment-amount-client"
import { getDivisions, getDistrictsByDivision, getUpazilasByDistrict } from "@/lib/bangladesh-address"

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

type ProductWithVariants = {
  id: string
  name: string
  slug: string
  price: number
  oldPrice: number | null
  images: string[]
  description: string | null
  landingHeadline?: string | null
  landingSubheadline?: string | null
  landingCopy?: string | null
  landingHeroImage?: string | null
  paymentRuleOverride?: string | null
  paymentRuleValueOverride?: number | null
  variants: {
    id: string
    size: string
    color: string
    colorHex: string | null
    stock: number
  }[]
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
  } | null
}

type LandingPageClientProps = {
  product: ProductWithVariants
  slug: string
}

const STEPS = [
  { index: 0, label: "Select" },
  { index: 1, label: "Contact" },
  { index: 2, label: "Delivery" },
  { index: 3, label: "Payment" },
]

export function LandingPageClient({ product, slug }: LandingPageClientProps) {
  const [selectedSize, setSelectedSize] = useState("")
  const [selectedColor, setSelectedColor] = useState("")
  const [quantity, setQuantity] = useState(1)
  const [step, setStep] = useState(0)
  const [deliveryZone, setDeliveryZone] = useState<DeliveryZone>("dhaka")
  const [deliveryFees, setDeliveryFees] = useState<Record<DeliveryZone, number>>({ chatto: 60, dhaka: 100, outside: 130 })
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
  const [done, setDone] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  const [checkoutSettings, setCheckoutSettings] = useState<CheckoutSettings | null>(null)
  const [settingsLoading, setSettingsLoading] = useState(true)
  const idempotencyKeyRef = useRef<string>("")

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

  const isV2 = checkoutSettings?.checkoutV2Enabled ?? false
  const baseOtpRequired = checkoutSettings?.otpRequired ?? true
  const otpRequired = product.landingPageSetting?.otpOverrideEnabled
    ? (product.landingPageSetting?.otpOverride ?? baseOtpRequired)
    : baseOtpRequired
  const otpProvider = checkoutSettings?.otpProvider ?? "mock"

  // Form fields
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

  const [showRestoreNotice, setShowRestoreNotice] = useState(false)
  const restored = useRef(false)
  const restoredDraft = useRef<Record<string, unknown> | null>(null)

  useEffect(() => {
    setDivisions(getDivisions())
  }, [])

  const sizes = [...new Set(product.variants.map((v) => v.size))]
  const colors = [...new Set(product.variants.map((v) => v.color))]
  const selectedVariant = product.variants.find(
    (v) => v.size === selectedSize && v.color === selectedColor
  )
  const deliveryFee = deliveryFees[deliveryZone]
  const subtotal = product.price * quantity
  const discount = couponDiscount
  const displayTotal = isV2 && couponApplied
    ? (grandTotal > 0 ? grandTotal : discountedProductTotal + finalDeliveryFeeDisplay)
    : subtotal + deliveryFee - discount

  const effectiveGrandTotal = isV2 && couponApplied
    ? (grandTotal > 0 ? grandTotal : discountedProductTotal + finalDeliveryFeeDisplay)
    : subtotal + deliveryFee - discount
  const effectiveDeliveryFee = isV2 && couponApplied
    ? (finalDeliveryFeeDisplay > 0 ? finalDeliveryFeeDisplay : deliveryFee)
    : deliveryFee

  const landingPayRule = product.landingPageSetting?.paymentOverrideEnabled
    ? product.landingPageSetting?.paymentRuleOverride
    : null
  const productPayRule = product.paymentRuleOverride
  const effectivePayRule: PaymentRuleType = (landingPayRule || productPayRule || checkoutSettings?.defaultPaymentRule || "cod_only") as PaymentRuleType
  const effectivePayValue = (landingPayRule
    ? product.landingPageSetting?.paymentRuleValueOverride
    : productPayRule
      ? product.paymentRuleValueOverride
      : checkoutSettings?.defaultPaymentRuleValue) ?? null
  const computedPayment = calculatePaymentAmounts(effectiveGrandTotal, effectiveDeliveryFee, effectivePayRule, effectivePayValue)

  // Auto-apply coupon from URL, product default, or landing page setting
  useEffect(() => {
    const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null
    const urlCoupon = params?.get("coupon")
    const lpCoupon = product.landingPageSetting?.couponOverrideEnabled
      ? product.landingPageSetting?.autoCouponCode
      : null
    const code = urlCoupon || lpCoupon || product.defaultCouponCode || ""
    if (code && !couponApplied) {
      setCouponCode(code)
    }
  }, [])

  // Auto-validate coupon
  const autoValidated = useRef(false)
  useEffect(() => {
    if (couponCode && !couponApplied && !autoValidated.current) {
      autoValidated.current = true
      handleApplyCouponExternal(couponCode)
    }
  }, [couponCode])

  useEffect(() => {
    fetch("/api/payment-methods")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          const methods = d.data as PaymentMethodSetting[]
          setPaymentMethods(methods)
          const cod = methods.find((m) => m.provider === "COD")
          if (cod?.enabled) {
            setPaymentMethod("cod")
          }
        }
      })
      .catch(() => {})
      .finally(() => setPaymentMethodsLoading(false))
  }, [])

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
    if (typeof window !== "undefined" && window.crypto) {
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
  }, [phone, otpState, verifiedPhone])

  useEffect(() => {
    fetch("/api/delivery-fees")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && typeof d.data === "object" && !Array.isArray(d.data)) {
          const feeMap = d.data as Record<DeliveryZone, number>
          setDeliveryFees(feeMap)
        }
      })
      .catch(() => {})
  }, [])

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [])

  const validateCurrentStep = useCallback((): string[] => {
    const errors: string[] = []
    switch (step) {
      case 0:
        if (!selectedSize) errors.push("Please select a size")
        if (!selectedColor) errors.push("Please select a color")
        break
      case 1:
        if (!name.trim()) errors.push("Full name is required")
        if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
          errors.push("Valid email is required")
        if (!phone.trim() || !isValidBdPhone(phone.trim()))
          errors.push("Enter a valid Bangladesh mobile number (01XXXXXXXXX)")
        if (isV2 && otpRequired && otpState !== "verified") {
          errors.push("Please verify your phone with OTP before continuing")
        }
        break
      case 2:
        if (!districtId) errors.push("Division and district are required")
        if (!upazilaId) errors.push("Upazila / Thana is required")
        if (!fullAddress.trim()) errors.push("Full address is required")
        break
      case 3:
        if (couponCode.trim() && !couponApplied) {
          errors.push("Apply or remove the coupon code before continuing")
        }
        break
    }
    return errors
  }, [step, selectedSize, selectedColor, name, email, phone, divisionId, districtId, upazilaId, fullAddress, couponCode, couponApplied, isV2, otpRequired, otpState])

  const handleNext = useCallback(() => {
    const errors = validateCurrentStep()
    setValidationErrors(errors)
    if (errors.length === 0) {
      if (step === 3) {
        placeOrder()
      } else {
        setStep((s) => Math.min(s + 1, 3))
        scrollToTop()
      }
    }
  }, [validateCurrentStep, scrollToTop, step])

  const handleBack = useCallback(() => {
    setStep((s) => Math.max(s - 1, 0))
    scrollToTop()
    setValidationErrors([])
  }, [scrollToTop])

  async function handleApplyCouponExternal(code: string) {
    if (!code.trim()) return
    setCouponLoading(true)
    setCouponError("")
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim(), subtotal, deliveryFee }),
      })
      const d = await res.json()
      if (d.success) {
        setCouponApplied(true)
        setCouponDiscount(d.data.discount)
        setCouponScope(d.data.couponScope ?? null)
        setProductDiscount(d.data.productDiscount ?? 0)
        setDeliveryDiscount(d.data.deliveryDiscount ?? 0)
        setDiscountedProductTotal(d.data.discountedProductTotal ?? subtotal)
        setFinalDeliveryFeeDisplay(d.data.finalDeliveryFee ?? deliveryFee)
        setGrandTotal(d.data.grandTotal ?? (discountedProductTotal + finalDeliveryFeeDisplay))
        setCouponCode(code.trim().toUpperCase())
      }
    } catch {
    } finally {
      setCouponLoading(false)
    }
  }

  async function handleApplyCoupon() {
    if (!couponCode.trim()) return
    setCouponLoading(true)
    setCouponError("")
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode.trim(), subtotal, deliveryFee }),
      })
      const d = await res.json()
      if (d.success) {
        setCouponApplied(true)
        setCouponDiscount(d.data.discount)
        setCouponScope(d.data.couponScope ?? null)
        setProductDiscount(d.data.productDiscount ?? 0)
        setDeliveryDiscount(d.data.deliveryDiscount ?? 0)
        setDiscountedProductTotal(d.data.discountedProductTotal ?? subtotal)
        setFinalDeliveryFeeDisplay(d.data.finalDeliveryFee ?? deliveryFee)
        setGrandTotal(d.data.grandTotal ?? (discountedProductTotal + finalDeliveryFeeDisplay))
        setCouponCode(couponCode.trim().toUpperCase())
        setCouponError("")
      } else {
        setCouponApplied(false)
        setCouponDiscount(0)
        resetCouponDisplay()
        setCouponError(d.error ?? "Invalid coupon")
      }
    } catch {
      setCouponError("Failed to validate")
    } finally {
      setCouponLoading(false)
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
    if (!phone.trim() || !isValidBdPhone(phone.trim())) {
      toast.error("Invalid phone number")
      return
    }

    const e164Phone = normalizePhoneToE164(phone.trim())
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
        setOtpError(d.error ?? "Invalid OTP")
        toast.error(d.error ?? "Invalid OTP")
      }
    } catch {
      setOtpState("sent")
      setOtpError("Network error. Please try again.")
    }
  }

  async function placeOrder() {
    const e164Phone = normalizePhoneToE164(phone.trim())

    if (isV2 && otpRequired && !checkoutVerificationToken) {
      toast.error("Please verify your phone with OTP before placing the order")
      return
    }

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
      paymentMethod,
      couponCode: couponApplied ? couponCode : undefined,
      items: [
        {
          productId: product.id,
          variantId: selectedVariant?.id,
          quantity,
        },
      ],
    }

    if (isV2) {
      payload.idempotencyKey = idempotencyKeyRef.current
      if (checkoutVerificationToken) {
        payload.checkoutVerificationToken = checkoutVerificationToken
      }
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }
    if (isV2) {
      headers["X-Checkout-Session-Id"] = idempotencyKeyRef.current
    }

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (data.success) {
        const paymentInitData = data.data?.paymentInitData
        const order = data.data?.order
        const orderId = order?.id

        if (paymentInitData?.paymentUrl && orderId) {
          setLoading(false)
          window.location.href = paymentInitData.paymentUrl
          return
        }

        setDone(true)
        setLoading(false)
        toast.success("Order placed successfully!")
      } else {
        setLoading(false)
        toast.error(data.error ?? "Order failed")
      }
    } catch {
      setLoading(false)
      toast.error("Something went wrong")
    }
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-muted/20 px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-green-100 rounded-3xl flex items-center justify-center mx-auto mb-8">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Thank You!</h1>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            Your order has been placed successfully. We will contact you shortly to confirm.
          </p>
          {!isLoggedIn && (
            <div className="bg-primary/[0.03] border border-primary/10 rounded-2xl p-5 mb-6">
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <UserPlus className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-base font-semibold mb-1">Track future orders faster</h2>
              <p className="text-xs text-muted-foreground mb-4">
                Create an account to save your details and track all orders in one place.
              </p>
              <Link
                href="/auth/register"
                className="inline-flex h-10 items-center justify-center rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-all"
              >
                Create an Account
              </Link>
            </div>
          )}
          <div className="flex flex-col gap-3">
            <Button onClick={() => window.location.reload()} className="rounded-full h-12 px-10">
              Order Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-muted/10">
      {/* Hero */}
      <section
        className="relative min-h-[50vh] md:min-h-[60vh] flex items-center justify-center bg-cover bg-center"
        style={{ backgroundImage: `url(${product.landingHeroImage || product.images[0] || ""})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-black/20" />
        <div className="relative z-10 text-center text-white px-4 max-w-3xl">
          <p className="text-xs uppercase tracking-[0.2em] mb-4 text-white/60 font-medium">Limited Offer</p>
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold mb-4 tracking-tight leading-[1.1]">
            {product.landingHeadline || product.name}
          </h1>
          {product.landingSubheadline && (
            <p className="text-base md:text-lg text-white/80 mb-8 max-w-xl mx-auto leading-relaxed">{product.landingSubheadline}</p>
          )}
          <div className="flex items-center justify-center gap-4">
            <span className="text-3xl md:text-4xl font-bold">৳{product.price.toLocaleString()}</span>
            {product.oldPrice && (
              <span className="text-xl text-white/60 line-through">
                ৳{product.oldPrice.toLocaleString()}
              </span>
            )}
          </div>
        </div>
      </section>

      <div className="max-w-2xl mx-auto container-px py-8 md:py-12 space-y-8">
        {/* Identity section */}
        <div>
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

        {/* Progress indicator */}
        <div className="flex items-center justify-between max-w-lg mx-auto">
          {STEPS.map((s, i) => (
            <div key={s.index} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
                    i < step
                      ? "bg-primary text-primary-foreground"
                      : i === step
                        ? "bg-primary text-primary-foreground ring-2 ring-primary/30"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {i < step ? <CheckCircle className="h-3.5 w-3.5" /> : s.index + 1}
                </div>
                <span
                  className={`text-[10px] mt-1 font-medium ${
                    i === step ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-px w-6 md:w-10 mx-1.5 ${i < step ? "bg-primary" : "bg-muted-foreground/20"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Copy */}
        {product.landingCopy && step === 0 && (
          <section className="text-center bg-muted/20 rounded-2xl p-6 md:p-8">
            <p className="text-muted-foreground leading-relaxed max-w-lg mx-auto text-sm">
              {product.landingCopy}
            </p>
          </section>
        )}

        {/* Validation Errors */}
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

        {/* Step 0: Product Select */}
        {step === 0 && (
          <div className="space-y-6">
            <section className="space-y-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">Step 1</p>
              <h2 className="text-lg font-semibold">Select Size</h2>
              <div className="flex flex-wrap gap-2">
                {sizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`h-11 px-6 rounded-xl text-sm font-medium border transition-all ${
                      selectedSize === size
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-background text-foreground border-input hover:border-primary/50"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold">Select Color</h2>
              <div className="flex flex-wrap gap-2">
                {colors.map((color) => {
                  const variant = product.variants.find((v) => v.color === color)
                  const hasHex = variant?.colorHex
                  return (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={`flex items-center gap-2 h-11 px-6 rounded-xl text-sm font-medium border transition-all ${
                        selectedColor === color
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : "bg-background text-foreground border-input hover:border-primary/50"
                      }`}
                    >
                      {hasHex && (
                        <span
                          className="w-4 h-4 rounded-full border border-border"
                          style={{ backgroundColor: variant.colorHex! }}
                        />
                      )}
                      {color}
                    </button>
                  )
                })}
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold">Quantity</h2>
              <div className="flex items-center gap-3">
                <div className="flex items-center border border-input rounded-xl overflow-hidden">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                    className="h-11 w-11 flex items-center justify-center text-lg hover:bg-muted transition-colors disabled:opacity-40"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="text-base font-medium w-12 text-center tabular-nums border-x border-input">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="h-11 w-11 flex items-center justify-center text-lg hover:bg-muted transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </section>

            <div className="flex justify-end">
              <Button onClick={handleNext} disabled={!selectedSize || !selectedColor} className="gap-1.5 h-11 rounded-xl px-6">
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 1: Contact */}
        {step === 1 && (
          <section className="bg-muted/20 rounded-2xl p-6 md:p-8 space-y-5">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">Step 2</p>
            <h2 className="text-lg font-semibold">Contact Information</h2>
            <p className="text-xs text-muted-foreground -mt-3">We&apos;ll send OTP to your phone</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@example.com"
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))
                  }}
                  placeholder="1XXXXXXXXX"
                  className="h-11 rounded-xl"
                />
              </div>
            </div>

            {/* OTP Panel */}
            {isV2 && otpRequired && (
              <div className="border-t border-border/50 pt-5">
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
                      if (cooldownRef.current) {
                        clearInterval(cooldownRef.current)
                        cooldownRef.current = null
                      }
                      setCooldownRemaining(0)
                      toast.success("Phone verified successfully")
                    }}
                    onReset={() => {
                      setOtpState("idle")
                      setCheckoutVerificationToken(null)
                      setVerifiedPhone(null)
                    }}
                  />
                ) : (
                  <>
                    {otpState === "verified" ? (
                      <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-5 py-4">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <div>
                            <p className="text-sm font-medium text-green-700">Phone Verified</p>
                            <p className="text-xs text-green-600">{normalizePhoneToE164(phone)}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setOtpState("idle")
                            setCheckoutVerificationToken(null)
                            setVerifiedPhone(null)
                          }}
                          className="text-xs text-red-500 hover:text-red-700 font-medium"
                        >
                          Change
                        </button>
                      </div>
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
                            disabled={!phone.trim() || !isValidBdPhone(phone.trim())}
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
                              Enter the 6-digit code sent to {normalizePhoneToE164(phone)}
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
                  </>
                )}
              </div>
            )}

            <div className="flex justify-between gap-4">
              <Button type="button" variant="ghost" onClick={handleBack} className="gap-1.5">
                <ChevronLeft className="h-4 w-4" /> Back
              </Button>
              <Button type="button" onClick={handleNext} className="gap-1.5 h-11 rounded-xl px-6">
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </section>
        )}

        {/* Step 2: Delivery */}
        {step === 2 && (
          <section className="bg-muted/20 rounded-2xl p-6 md:p-8 space-y-5">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">Step 3</p>
            <h2 className="text-lg font-semibold">Delivery Address</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Division</Label>
                <Select
                  value={divisionId}
                  onValueChange={(v) => {
                    if (!v) return
                    const div = divisions.find((d) => d.id === v)
                    if (div) {
                      setDivisionId(div.id)
                      setDivisionName(div.name)
                      setDistrictId("")
                      setDistrictName("")
                      setUpazilaId("")
                      setUpazilaName("")
                      setDistricts(getDistrictsByDivision(v))
                      setUpazilas([])
                    }
                  }}
                >
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue placeholder="Select division" />
                  </SelectTrigger>
                  <SelectContent>
                    {divisions.map((div) => (
                      <SelectItem key={div.id} value={div.id}>
                        {div.name} {div.nameBn ? `(${div.nameBn})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>District</Label>
                <Select
                  value={districtId}
                  onValueChange={(v) => {
                    if (!v) return
                    const dist = districts.find((d) => d.id === v)
                    if (dist) {
                      setDistrictId(dist.id)
                      setDistrictName(dist.name)
                      setUpazilaId("")
                      setUpazilaName("")
                      setUpazilas(getUpazilasByDistrict(v))
                    }
                  }}
                  disabled={!divisionId}
                >
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue placeholder={divisionId ? "Select district" : "Select division first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {districts.map((dist) => (
                      <SelectItem key={dist.id} value={dist.id}>
                        {dist.name} {dist.nameBn ? `(${dist.nameBn})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Upazila / Thana</Label>
                <Select
                  value={upazilaId}
                  onValueChange={(v) => {
                    if (!v) return
                    const upa = upazilas.find((u) => u.id === v)
                    if (upa) {
                      setUpazilaId(upa.id)
                      setUpazilaName(upa.name)
                    }
                  }}
                  disabled={!districtId}
                >
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue placeholder={districtId ? "Select upazila/thana" : "Select district first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {upazilas.map((upa) => (
                      <SelectItem key={upa.id} value={upa.id}>
                        {upa.name} {upa.nameBn ? `(${upa.nameBn})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Delivery Area</Label>
                <div className="h-11 rounded-xl border border-input bg-muted/30 px-4 flex items-center text-sm">
                  <Truck className="h-4 w-4 mr-2 text-muted-foreground shrink-0" />
                  {districtId ? (
                    <span>{DELIVERY_ZONE_NAMES[deliveryZone as keyof typeof DELIVERY_ZONE_NAMES]} &mdash; ৳{deliveryFees[deliveryZone] ?? "—"}</span>
                  ) : (
                    <span className="text-muted-foreground">Select district for delivery info</span>
                  )}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Full Address</Label>
              <Input
                id="address"
                value={fullAddress}
                onChange={(e) => setFullAddress(e.target.value)}
                placeholder="House #, Road #, Area"
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="note">Order Note (optional)</Label>
              <Input
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Any special instructions?"
                className="h-11 rounded-xl"
              />
            </div>
            <div className="flex justify-between gap-4">
              <Button type="button" variant="ghost" onClick={handleBack} className="gap-1.5">
                <ChevronLeft className="h-4 w-4" /> Back
              </Button>
              <Button type="button" onClick={handleNext} className="gap-1.5 h-11 rounded-xl px-6">
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </section>
        )}

        {/* Step 3: Payment & Coupon */}
        {step === 3 && (
          <div className="space-y-6">
            {/* Coupon */}
            <section className="space-y-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Tag className="h-4 w-4" /> Coupon
              </h2>
              {couponApplied ? (
                <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-5 py-4">
                  <div className="flex items-center gap-2">
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
            </section>

            {/* Payment */}
            <section className="space-y-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <CreditCard className="h-4 w-4" /> Payment Method
              </h2>
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
                    }
                  }}
                  className="space-y-3"
                >
                  {paymentMethods.map((pm) => {
                    const isOnline = ONLINE_PROVIDERS.includes(pm.provider)
                    const isCod = pm.provider === "COD"
                    const isEnabled = pm.enabled
                    const isSelectable = isEnabled && isCod
                    return (
                      <div
                        key={pm.provider}
                        className={`flex items-start gap-4 rounded-xl border p-4 transition-all ${
                          paymentMethod === pm.provider.toLowerCase()
                            ? "border-primary bg-primary/5"
                            : isSelectable
                              ? "border-border/50 hover:border-muted-foreground/30"
                              : "border-border/30 opacity-50 cursor-not-allowed bg-muted/20"
                        }`}
                        onClick={() => {
                          if (isSelectable) {
                            setPaymentMethod(pm.provider.toLowerCase())
                          }
                        }}
                      >
                        <RadioGroupItem
                          value={pm.provider.toLowerCase()}
                          id={`lp-${pm.provider}`}
                          disabled={!isSelectable}
                        />
                        <div className="flex-1 min-w-0">
                          <Label
                            htmlFor={`lp-${pm.provider}`}
                            className={`font-medium text-sm ${isSelectable ? "cursor-pointer" : "cursor-not-allowed"}`}
                          >
                            {pm.displayName}
                            {!isSelectable && pm.enabled && (
                              <span className="ml-2 text-xs text-muted-foreground italic">
                                — Coming soon
                              </span>
                            )}

                          </Label>
                          {pm.instructions && isSelectable && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {pm.instructions}
                            </p>
                          )}
                          {isCod && pm.supportsCodDeliveryCharge && isSelectable && (
                            <p className="text-xs text-amber-600 mt-1">
                              Delivery charge prepayment will be required when online payment is activated.
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </RadioGroup>
              )}
            </section>

            {/* Summary */}
            <div className="bg-primary/5 border border-primary/10 rounded-2xl p-6 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal ({quantity} item{quantity > 1 ? "s" : ""})</span>
                <span className="font-medium">৳{subtotal.toLocaleString()}</span>
              </div>
              {isV2 && productDiscount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Product Discount {couponScope === "delivery" ? "" : `(${couponCode})`}</span>
                  <span>-৳{productDiscount.toLocaleString()}</span>
                </div>
              )}
              {isV2 && discountedProductTotal > 0 && discountedProductTotal !== subtotal && (
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Discounted Product Total</span>
                  <span>৳{discountedProductTotal.toLocaleString()}</span>
                </div>
              )}
              {!isV2 && discount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount ({couponCode})</span>
                  <span>-৳{discount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Delivery Fee</span>
                <span className="font-medium">৳{deliveryFee}</span>
              </div>
              {isV2 && deliveryDiscount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Delivery Discount {couponScope === "product" ? "" : `(${couponCode})`}</span>
                  <span>-৳{deliveryDiscount.toLocaleString()}</span>
                </div>
              )}
              {isV2 && finalDeliveryFeeDisplay > 0 && finalDeliveryFeeDisplay !== deliveryFee && (
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Final Delivery Fee</span>
                  <span>৳{finalDeliveryFeeDisplay.toLocaleString()}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>৳{displayTotal.toLocaleString()}</span>
              </div>
              {isV2 && (
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-sm text-primary font-medium">
                    <span>Pay Now</span>
                    <span>{computedPayment.payNow > 0 ? `৳${computedPayment.payNow.toLocaleString()}` : "—"}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Due on Delivery</span>
                    <span>{computedPayment.dueAmount > 0 ? `৳${computedPayment.dueAmount.toLocaleString()}` : "—"}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between gap-4">
              <Button type="button" variant="ghost" onClick={handleBack} className="gap-1.5">
                <ChevronLeft className="h-4 w-4" /> Back
              </Button>
              <Button type="button" onClick={handleNext} className="gap-1.5 h-11 rounded-xl px-6" disabled={loading}>
                {loading ? "Placing Order..." : `Place Order — ৳${displayTotal.toLocaleString()}`}
              </Button>
            </div>
          </div>
        )}

        {/* Trust indicators */}
        <section className="grid grid-cols-3 gap-4 text-center text-xs text-muted-foreground">
          <div className="flex flex-col items-center gap-1.5">
            <Truck className="h-4 w-4" />
            <span>Free delivery over ৳999</span>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <Shield className="h-4 w-4" />
            <span>Easy exchanges</span>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <CreditCard className="h-4 w-4" />
            <span>COD available</span>
          </div>
        </section>
      </div>
    </div>
  )
}

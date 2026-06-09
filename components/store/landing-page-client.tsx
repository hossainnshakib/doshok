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
import { CheckCircle, Truck, Shield, Tag, CreditCard, Minus, Plus, ChevronLeft, ChevronRight } from "lucide-react"
import { saveLandingDraft, loadLandingDraft, clearLandingDraft, clearBuyNowContext, clearAllLandingData, saveAbandonedCheckout, getDraftToken, maskEmail, maskPhone, formatRelativeTime } from "@/lib/checkout-draft"

type PaymentMethodSetting = {
  provider: string
  displayName: string
  enabled: boolean
  supportsFullPayment: boolean
  supportsPartialPayment: boolean
  supportsCodDeliveryCharge: boolean
  instructions: string | null
}

const ONLINE_PROVIDERS = ["BKASH", "NAGAD", "ROCKET", "UPAY", "SSLCOMMERZ", "AAMARPAY"]

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
  variants: {
    id: string
    size: string
    color: string
    colorHex: string | null
    stock: number
  }[]
  defaultCouponCode?: string | null
}

type LandingPageClientProps = {
  product: ProductWithVariants
  slug: string
}

const DELIVERY_FEES: Record<DeliveryZone, number> = {
  chatto: 60,
  dhaka: 100,
  outside: 130,
}

const STEPS = [
  { index: 0, label: "Select" },
  { index: 1, label: "Contact" },
  { index: 2, label: "Delivery" },
  { index: 3, label: "Payment" },
  { index: 4, label: "Verify" },
]

export function LandingPageClient({ product, slug }: LandingPageClientProps) {
  const [selectedSize, setSelectedSize] = useState("")
  const [selectedColor, setSelectedColor] = useState("")
  const [quantity, setQuantity] = useState(1)
  const [step, setStep] = useState(0)
  const [deliveryZone, setDeliveryZone] = useState<DeliveryZone>("dhaka")
  const [paymentMethod, setPaymentMethod] = useState<string>("cod")
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodSetting[]>([])
  const [paymentMethodsLoading, setPaymentMethodsLoading] = useState(true)
  const [phone, setPhone] = useState("")
  const [otp, setOtp] = useState("")
  const [loading, setLoading] = useState(false)
  const [otpEmail, setOtpEmail] = useState("")
  const [otpSent, setOtpSent] = useState(false)
  const [otpVerified, setOtpVerified] = useState(false)
  const [otpError, setOtpError] = useState("")
  const [couponCode, setCouponCode] = useState("")
  const [couponDiscount, setCouponDiscount] = useState(0)
  const [couponApplied, setCouponApplied] = useState(false)
  const [couponError, setCouponError] = useState("")
  const [couponLoading, setCouponLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  // Form fields
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [division, setDivision] = useState("")
  const [district, setDistrict] = useState("")
  const [thana, setThana] = useState("")
  const [fullAddress, setFullAddress] = useState("")
  const [note, setNote] = useState("")

  const [showRestoreNotice, setShowRestoreNotice] = useState(false)
  const restored = useRef(false)
  const restoredDraft = useRef<Record<string, unknown> | null>(null)

  // Restore draft on mount
  useEffect(() => {
    if (restored.current) return
    restored.current = true

    const saved = loadLandingDraft(slug)
    if (saved) {
      restoredDraft.current = saved as unknown as Record<string, unknown>
      if (saved.selectedSize) setSelectedSize(saved.selectedSize)
      if (saved.selectedColor) setSelectedColor(saved.selectedColor)
      if (saved.quantity) setQuantity(saved.quantity)
      if (saved.name) setName(saved.name)
      if (saved.email) setEmail(saved.email)
      if (saved.phone) setPhone(saved.phone)
      if (saved.division) setDivision(saved.division)
      if (saved.district) setDistrict(saved.district)
      if (saved.thana) setThana(saved.thana)
      if (saved.fullAddress) setFullAddress(saved.fullAddress)
      if (saved.note) setNote(saved.note)
      if (saved.selectedDeliveryZone) setDeliveryZone(saved.selectedDeliveryZone as DeliveryZone)
      if (saved.selectedPaymentMethod) setPaymentMethod(saved.selectedPaymentMethod)
      if (saved.couponCode) setCouponCode(saved.couponCode)
      if (saved.currentStep !== undefined) setStep(saved.currentStep)
      setShowRestoreNotice(true)
    }
  }, [slug])

  // Auto-save draft on field changes
  const persistDraft = useCallback(() => {
    saveLandingDraft(slug, {
      selectedSize, selectedColor, quantity,
      name, email, phone,
      division, district, thana, fullAddress, note,
      selectedDeliveryZone: deliveryZone,
      selectedPaymentMethod: paymentMethod,
      couponCode,
      currentStep: step,
    })
  }, [slug, selectedSize, selectedColor, quantity, name, email, phone, division, district, thana, fullAddress, note, deliveryZone, paymentMethod, couponCode, step])

  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(persistDraft, 500)
  }, [persistDraft])

  const sizes = [...new Set(product.variants.map((v) => v.size))]
  const colors = [...new Set(product.variants.map((v) => v.color))]
  const selectedVariant = product.variants.find(
    (v) => v.size === selectedSize && v.color === selectedColor
  )
  const deliveryFee = DELIVERY_FEES[deliveryZone]
  const subtotal = product.price * quantity
  const discount = couponDiscount
  const total = subtotal + deliveryFee - discount

  const lastAbandonedSave = useRef(0)
  const abandonedTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => {
    const now = Date.now()
    if (now - lastAbandonedSave.current < 5000) return
    if (!name && !email && !phone) return
    lastAbandonedSave.current = now
    if (abandonedTimerRef.current) clearTimeout(abandonedTimerRef.current)
    abandonedTimerRef.current = setTimeout(() => {
      saveAbandonedCheckout({
        name: name || undefined,
        email: email || undefined,
        phone: phone || undefined,
        productId: product.id,
        variantId: selectedVariant?.id,
        quantity,
        size: selectedSize || undefined,
        color: selectedColor || undefined,
        address: fullAddress || undefined,
        deliveryZone,
        couponCode: couponApplied ? couponCode : undefined,
        subtotal,
        discount,
        total,
        step: `step_${step}`,
        landingSlug: slug,
        source: "landing",
      })
    }, 2000)
    return () => { if (abandonedTimerRef.current) clearTimeout(abandonedTimerRef.current) }
  }, [name, email, phone, step, selectedSize, selectedColor, quantity, fullAddress, deliveryZone, couponApplied, couponCode, slug, selectedVariant])

  // Auto-apply coupon from URL or product default
  useEffect(() => {
    const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null
    const urlCoupon = params?.get("coupon")
    const code = urlCoupon || product.defaultCouponCode || ""
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
        if (!phone.trim() || phone.trim().length < 11)
          errors.push("Valid phone number (11+ digits) is required")
        break
      case 2:
        if (!division.trim()) errors.push("Division is required")
        if (!district.trim()) errors.push("District is required")
        if (!thana.trim()) errors.push("Thana is required")
        if (!fullAddress.trim()) errors.push("Full address is required")
        break
      case 3:
        if (couponCode.trim() && !couponApplied) {
          errors.push("Apply or remove the coupon code before continuing")
        }
        break
    }
    return errors
  }, [step, selectedSize, selectedColor, name, email, phone, division, district, thana, fullAddress, couponCode, couponApplied])

  const handleNext = useCallback(() => {
    const errors = validateCurrentStep()
    setValidationErrors(errors)
    if (errors.length === 0) {
      setStep((s) => Math.min(s + 1, 4))
      scrollToTop()
    }
  }, [validateCurrentStep, scrollToTop])

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
        body: JSON.stringify({ code: code.trim(), subtotal }),
      })
      const d = await res.json()
      if (d.success) {
        setCouponApplied(true)
        setCouponDiscount(d.data.discount)
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
        body: JSON.stringify({ code: couponCode.trim(), subtotal }),
      })
      const d = await res.json()
      if (d.success) {
        setCouponApplied(true)
        setCouponDiscount(d.data.discount)
        setCouponCode(couponCode.trim().toUpperCase())
        setCouponError("")
      } else {
        setCouponApplied(false)
        setCouponDiscount(0)
        setCouponError(d.error ?? "Invalid coupon")
      }
    } catch {
      setCouponError("Failed to validate")
    } finally {
      setCouponLoading(false)
    }
  }

  function handleRemoveCoupon() {
    setCouponCode("")
    setCouponDiscount(0)
    setCouponApplied(false)
    setCouponError("")
  }

  async function handleSendOtp() {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Please enter a valid email address")
      return
    }
    if (!phone || phone.length < 11) {
      toast.error("Please enter a valid phone number")
      return
    }
    setOtpEmail(email)
    setLoading(true)
    try {
      const res = await fetch("/api/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (data.success) {
        setOtpSent(true)
        toast.success("Verification code sent to your email")
      } else {
        toast.error(data.error ?? "Failed to send OTP")
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyOtp() {
    if (!otp || otp.length !== 6) {
      toast.error("Please enter the 6-digit code")
      return
    }
    if (!otpEmail) {
      toast.error("No email to verify")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: otpEmail, code: otp }),
      })
      const data = await res.json()
      if (data.success) {
        setOtpVerified(true)
        await placeOrder()
      } else {
        toast.error(data.error ?? "Invalid code")
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  async function placeOrder() {
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          division,
          district,
          thana,
          fullAddress,
          note,
          deliveryZone,
          paymentMethod,
          couponCode: couponApplied ? couponCode : undefined,
          items: [
            {
              productId: product.id,
              variantId: selectedVariant?.id,
              quantity,
              price: product.price,
            },
          ],
        }),
      })
      const data = await res.json()
      if (data.success) {
        clearLandingDraft(slug)
        clearBuyNowContext()
        setDone(true)
        toast.success("Order placed successfully!")
      } else {
        toast.error(data.error ?? "Order failed")
      }
    } catch {
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
        {/* Restore notice */}
        {showRestoreNotice && (
          <div className="rounded-2xl border border-primary/10 bg-primary/[0.03] shadow-sm">
            <div className="p-5 md:p-6">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <CheckCircle className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">Your previous checkout details are ready.</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Continue where you left off.</p>

                  {restoredDraft.current && typeof restoredDraft.current === "object" && (
                    <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-muted-foreground">
                      {(restoredDraft.current as { updatedAt?: number }).updatedAt && (
                        <span>Updated {formatRelativeTime((restoredDraft.current as { updatedAt: number }).updatedAt)}</span>
                      )}
                      <span>Step: {STEPS[step]?.label || `Step ${step + 1}`}</span>
                      {(restoredDraft.current as { selectedSize?: string }).selectedSize && (
                        <span>Size: {(restoredDraft.current as { selectedSize: string }).selectedSize}</span>
                      )}
                      {(restoredDraft.current as { selectedColor?: string }).selectedColor && (
                        <span>Color: {(restoredDraft.current as { selectedColor: string }).selectedColor}</span>
                      )}
                      {(restoredDraft.current as { quantity?: number }).quantity && (
                        <span>Qty: {(restoredDraft.current as { quantity: number }).quantity}</span>
                      )}
                      {(restoredDraft.current as { email?: string }).email && (
                        <span className="truncate">Email: {maskEmail((restoredDraft.current as { email: string }).email)}</span>
                      )}
                      {(restoredDraft.current as { phone?: string }).phone && (
                        <span className="truncate">Phone: {maskPhone((restoredDraft.current as { phone: string }).phone)}</span>
                      )}
                      {(restoredDraft.current as { selectedDeliveryZone?: string }).selectedDeliveryZone && (
                        <span className="truncate">
                          Delivery: {DELIVERY_ZONE_NAMES[(restoredDraft.current as { selectedDeliveryZone: string }).selectedDeliveryZone as DeliveryZone] || (restoredDraft.current as { selectedDeliveryZone: string }).selectedDeliveryZone}
                        </span>
                      )}
                      {(restoredDraft.current as { selectedPaymentMethod?: string }).selectedPaymentMethod && (
                        <span className="truncate">Payment: {(restoredDraft.current as { selectedPaymentMethod: string }).selectedPaymentMethod.toUpperCase()}</span>
                      )}
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => setShowRestoreNotice(false)}
                      className="inline-flex h-9 items-center justify-center rounded-xl bg-primary px-5 text-xs font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                    >
                      Continue checkout
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        clearAllLandingData(slug)
                        setShowRestoreNotice(false)
                        setName("")
                        setEmail("")
                        setPhone("")
                        setDivision("")
                        setDistrict("")
                        setThana("")
                        setFullAddress("")
                        setNote("")
                        setDeliveryZone("dhaka")
                        setPaymentMethod("cod")
                        setCouponCode("")
                        setCouponDiscount(0)
                        setCouponApplied(false)
                        setCouponError("")
                        setSelectedSize("")
                        setSelectedColor("")
                        setQuantity(1)
                        setOtp("")
                        setOtpEmail("")
                        setOtpSent(false)
                        setOtpVerified(false)
                        setOtpError("")
                        setStep(0)
                        setValidationErrors([])
                      }}
                      className="inline-flex h-9 items-center justify-center rounded-xl border border-input bg-background px-5 text-xs font-medium text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      Clear saved details
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

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
                  disabled={otpVerified}
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  className="h-11 rounded-xl"
                />
              </div>
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

        {/* Step 2: Delivery */}
        {step === 2 && (
          <section className="bg-muted/20 rounded-2xl p-6 md:p-8 space-y-5">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">Step 3</p>
            <h2 className="text-lg font-semibold">Delivery Address</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="division">Division</Label>
                <Input
                  id="division"
                  value={division}
                  onChange={(e) => setDivision(e.target.value)}
                  placeholder="Chattogram"
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="district">District</Label>
                <Input
                  id="district"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="Chattogram"
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="thana">Thana / Upazila</Label>
                <Input
                  id="thana"
                  value={thana}
                  onChange={(e) => setThana(e.target.value)}
                  placeholder="Kotwali"
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Delivery Zone</Label>
                <Select
                  value={deliveryZone}
                  onValueChange={(v) => setDeliveryZone(v as DeliveryZone)}
                >
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(DELIVERY_ZONE_NAMES).map(([key, name]) => (
                      <SelectItem key={key} value={key}>
                        {name} (৳{DELIVERY_FEES[key as DeliveryZone]})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                  onValueChange={(v) => setPaymentMethod(v)}
                  className="space-y-3"
                >
                  {paymentMethods.map((pm) => {
                    const isOnline = ONLINE_PROVIDERS.includes(pm.provider)
                    const isCod = pm.provider === "COD"
                    return (
                      <div
                        key={pm.provider}
                        className={`flex items-start gap-4 rounded-xl border p-4 transition-all ${
                          isOnline
                            ? "opacity-60 border-dashed bg-muted/20"
                            : paymentMethod === pm.provider.toLowerCase()
                              ? "border-primary bg-primary/5"
                              : "hover:border-muted-foreground/30"
                        }`}
                      >
                        <RadioGroupItem
                          value={pm.provider.toLowerCase()}
                          id={`lp-${pm.provider}`}
                          disabled={isOnline}
                        />
                        <div className="flex-1 min-w-0">
                          <Label
                            htmlFor={`lp-${pm.provider}`}
                            className={`font-medium text-sm ${
                              isOnline
                                ? "text-muted-foreground cursor-not-allowed"
                                : "cursor-pointer"
                            }`}
                          >
                            {pm.displayName}
                            {isOnline && (
                              <span className="ml-2 text-xs text-muted-foreground italic">
                                — Setup ready
                              </span>
                            )}
                          </Label>
                          {pm.instructions && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {pm.instructions}
                            </p>
                          )}
                          {isCod && pm.supportsCodDeliveryCharge && (
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
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Delivery Fee</span>
                <span className="font-medium">৳{deliveryFee}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount ({couponCode})</span>
                  <span>-৳{discount.toLocaleString()}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>৳{total.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex justify-between gap-4">
              <Button type="button" variant="ghost" onClick={handleBack} className="gap-1.5">
                <ChevronLeft className="h-4 w-4" /> Back
              </Button>
              <Button type="button" onClick={handleNext} className="gap-1.5 h-11 rounded-xl px-6">
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Verification */}
        {step === 4 && (
          <section className="space-y-6 max-w-sm mx-auto text-center">
            <div className="bg-muted/20 rounded-2xl p-8 space-y-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">Step 5</p>
              <h2 className="text-xl font-semibold">Email Verification</h2>

              {otpVerified ? (
                <div className="flex items-center justify-center gap-2 bg-green-50 border border-green-200 rounded-xl px-5 py-4">
                  <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
                  <span className="text-sm font-medium text-green-700">Email verified!</span>
                </div>
              ) : otpSent ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    A 6-digit code has been sent to <strong className="text-foreground">{otpEmail || email}</strong>
                  </p>
                  <Input
                    value={otp}
                    onChange={(e) => { setOtp(e.target.value); setOtpError("") }}
                    placeholder="000000"
                    maxLength={6}
                    className="text-center text-2xl tracking-[0.5em] font-mono h-14 rounded-xl"
                  />
                  {otpError && (
                    <p className="text-sm text-destructive">{otpError}</p>
                  )}
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleBack}
                      className="flex-1 h-12 rounded-xl"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" /> Back
                    </Button>
                    <Button
                      type="button"
                      className="flex-1 h-12 rounded-xl"
                      onClick={handleVerifyOtp}
                      disabled={loading || otp.length !== 6}
                    >
                      {loading ? "Verifying..." : "Verify & Place Order"}
                    </Button>
                  </div>
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    className="text-sm text-primary hover:underline"
                    disabled={loading}
                  >
                    Resend code
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    We&apos;ll send a verification code to <strong className="text-foreground">{email}</strong>
                  </p>
                  <Button
                    size="lg"
                    className="w-full h-12 md:h-14 rounded-xl text-base font-medium"
                    onClick={handleSendOtp}
                    disabled={loading}
                  >
                    {loading ? "Sending OTP..." : "Send Verification Code"}
                  </Button>
                  <div>
                    <Button type="button" variant="ghost" onClick={handleBack} className="gap-1.5">
                      <ChevronLeft className="h-4 w-4" /> Back
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </section>
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

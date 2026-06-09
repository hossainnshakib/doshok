"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { getCart, clearCart } from "@/lib/cart"
import type { CartItem, DeliveryZone } from "@/types"
import { DELIVERY_ZONE_NAMES } from "@/types"
import {
  CheckCircle, Shield, Tag, Truck, CreditCard, ArrowLeft, ChevronLeft, ChevronRight, Smartphone,
} from "lucide-react"
import Link from "next/link"
import { type CheckoutDraft, maskEmail, maskPhone, formatRelativeTime, saveAbandonedCheckout } from "@/lib/checkout-draft"
import { useCheckoutDraft } from "@/hooks/use-checkout-draft"
import { sendPhoneOtp, confirmOtpAndGetIdToken } from "@/lib/firebase-client"
import type { ConfirmationResult } from "@/lib/firebase-client"
import { useSession } from "next-auth/react"
import { User, LogIn } from "lucide-react"

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

const DELIVERY_FEES: Record<string, number> = {
  chatto: 60,
  dhaka: 100,
  outside: 130,
}

const STEPS = [
  { index: 0, label: "Contact", description: "Who & where to reach" },
  { index: 1, label: "Delivery", description: "Delivery address & zone" },
  { index: 2, label: "Offer & Payment", description: "Coupon & payment method" },
  { index: 3, label: "Verification", description: "Verify your phone" },
  { index: 4, label: "Confirm", description: "Review & place order" },
]

export function CheckoutForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isBuyNow = searchParams.has("productId")
  const recoveryToken = searchParams.get("recoveryToken")

  const { data: session } = useSession()
  const isLoggedIn = !!session?.user

  const {
    step, draft, restored, showRestoreNotice,
    goNext, goBack, updateField, updateFields, resetDraft, clearSavedDetails,
    dismissRestoreNotice, isFirstStep, isLastStep,
  } = useCheckoutDraft(session?.user?.id)

  const [items, setItems] = useState<(CartItem & { productName?: string })[]>([])
  const [deliveryZone, setDeliveryZone] = useState<DeliveryZone>("dhaka")
  const [paymentMethod, setPaymentMethod] = useState<string>("cod")
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodSetting[]>([])
  const [paymentMethodsLoading, setPaymentMethodsLoading] = useState(true)
  const [loading, setLoading] = useState(false)

  const [couponCode, setCouponCode] = useState("")
  const [couponDiscount, setCouponDiscount] = useState(0)
  const [couponApplied, setCouponApplied] = useState(false)
  const [couponError, setCouponError] = useState("")
  const [couponLoading, setCouponLoading] = useState(false)

  const [phoneOtpSent, setPhoneOtpSent] = useState(false)
  const [phoneOtpCode, setPhoneOtpCode] = useState("")
  const [phoneOtpVerified, setPhoneOtpVerified] = useState(false)
  const [phoneOtpLoading, setPhoneOtpLoading] = useState(false)
  const [phoneOtpError, setPhoneOtpError] = useState("")
  const [phoneVerifiedToken, setPhoneVerifiedToken] = useState("")
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null)
  const recaptchaContainerRef = useRef<HTMLDivElement>(null)

  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const formRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const urlCoupon = searchParams.get("coupon")
    if (urlCoupon) {
      setCouponCode(urlCoupon)
    }
  }, [searchParams])

  const autoValidatedRef = useRef(false)

  useEffect(() => {
    if (couponCode && !couponApplied) {
      validateCoupon(couponCode)
    }
  }, [items])

  useEffect(() => {
    if (restored && couponCode && !couponApplied && !autoValidatedRef.current) {
      autoValidatedRef.current = true
      validateCoupon(couponCode)
    }
  }, [restored, couponCode])

  const savedVerificationRef = useRef(false)
  useEffect(() => {
    if (!phoneOtpVerified || savedVerificationRef.current) return
    savedVerificationRef.current = true
    saveAbandonedCheckout({
      name: draft.name || undefined,
      email: draft.email || undefined,
      phone: draft.phone || undefined,
      step: `step_${step}`,
      source: "checkout",
      data: JSON.stringify({ phoneVerified: true, userId: session?.user?.id || undefined }),
    })
  }, [phoneOtpVerified])

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
        setItems([item])
      }
    } else {
      const cart = getCart()
      if (cart.length === 0) {
        router.push("/cart")
        return
      }
      setItems(cart)
    }
  }, [isBuyNow, searchParams, router])

  const recoveryPrefilled = useRef(false)

  useEffect(() => {
    if (!recoveryToken || recoveryPrefilled.current) return
    recoveryPrefilled.current = true

    fetch(`/api/recover-checkout?token=${encodeURIComponent(recoveryToken)}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.success || !d.data) return

        const rec = d.data
        const updates: Partial<CheckoutDraft> = {}

        if (rec.name) updates.name = rec.name
        if (rec.email) updates.email = rec.email
        if (rec.phone) updates.phone = rec.phone
        if (rec.address) updates.fullAddress = rec.address
        if (rec.deliveryZone) updates.selectedDeliveryZone = rec.deliveryZone
        if (rec.couponCode) updates.couponCode = rec.couponCode

        if (Object.keys(updates).length > 0) {
          updateFields(updates)
        }

        if (rec.couponCode) {
          setCouponCode(rec.couponCode)
        }

        if (rec.productId) {
          const item: CartItem & { productName?: string } = {
            productId: rec.productId,
            variantId: rec.variantId || undefined,
            name: "Restored Item",
            price: rec.subtotal > 0 ? Math.round(rec.subtotal / (rec.quantity || 1)) : 0,
            quantity: rec.quantity || 1,
            size: rec.size || undefined,
            color: rec.color || undefined,
          }
          fetch(`/api/products/${rec.productId}`)
            .then((r) => r.json())
            .then((pd) => {
              if (pd.success) {
                setItems([{ ...item, name: pd.data.name, productName: pd.data.name }])
              } else {
                setItems([item])
              }
            })
            .catch(() => setItems([item]))
        }
      })
      .catch(() => {})
  }, [recoveryToken, updateFields])

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
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [])

  const validateCurrentStep = useCallback((): string[] => {
    const errors: string[] = []
    switch (step) {
      case 0: {
        if (!draft.name.trim()) errors.push("Full name is required")
        if (!draft.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email))
          errors.push("Valid email is required")
        if (!draft.phone.trim() || draft.phone.trim().length < 11)
          errors.push("Valid phone number (11+ digits) is required")
        break
      }
      case 1: {
        if (!draft.division.trim()) errors.push("Division is required")
        if (!draft.district.trim()) errors.push("District is required")
        if (!draft.thana.trim()) errors.push("Thana is required")
        if (!draft.fullAddress.trim()) errors.push("Full address is required")
        break
      }
      case 2: {
        if (couponCode.trim() && !couponApplied) {
          errors.push("Apply or remove the coupon code before continuing")
        }
        break
      }
      case 3: {
        if (!phoneOtpVerified) {
          errors.push("Please verify your phone before placing the order")
        }
        break
      }
    }
    return errors
  }, [step, draft, couponCode, couponApplied, phoneOtpVerified])

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

  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0)
  const deliveryFee = DELIVERY_FEES[deliveryZone]
  const discount = couponDiscount
  const total = subtotal + deliveryFee - discount

  async function validateCoupon(code: string) {
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

  function handleApplyCoupon() {
    validateCoupon(couponCode)
  }

  function handleRemoveCoupon() {
    setCouponCode("")
    setCouponDiscount(0)
    setCouponApplied(false)
    setCouponError("")
    updateField("couponCode", "")
  }

  async function handleSendPhoneOtp() {
    const phone = draft.phone
    if (!phone || phone.length < 11) {
      toast.error("Please enter a valid phone number")
      return
    }
    setPhoneOtpLoading(true)
    setPhoneOtpError("")
    try {
      const result = await sendPhoneOtp(phone, "recaptcha-container")
      if (!result) {
        setPhoneOtpError("Phone verification is not configured. Please contact support.")
        toast.error("Phone verification unavailable")
        return
      }
      setConfirmationResult(result)
      setPhoneOtpSent(true)
      toast.success("Verification code sent to your phone")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send code"
      setPhoneOtpError(message)
      toast.error(message)
    } finally {
      setPhoneOtpLoading(false)
    }
  }

  async function handleVerifyPhoneOtp() {
    if (!phoneOtpCode || phoneOtpCode.length !== 6) {
      toast.error("Please enter the 6-digit code")
      return
    }
    if (!confirmationResult) {
      toast.error("Please request a code first")
      return
    }
    setPhoneOtpLoading(true)
    setPhoneOtpError("")
    try {
      const idTokenResult = await confirmOtpAndGetIdToken(confirmationResult, phoneOtpCode)
      if (!idTokenResult) {
        setPhoneOtpError("Invalid code. Please try again.")
        toast.error("Invalid code")
        return
      }

      const res = await fetch("/api/otp/verify-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firebaseIdToken: idTokenResult.idToken, phone: draft.phone }),
      })
      const d = await res.json()
      if (d.success) {
        setPhoneVerifiedToken(d.data.phoneVerifiedToken)
        setPhoneOtpVerified(true)
        toast.success("Phone verified!")
      } else {
        setPhoneOtpError(d.error ?? "Verification failed")
        toast.error(d.error ?? "Verification failed")
      }
    } catch {
      setPhoneOtpError("Something went wrong")
      toast.error("Something went wrong")
    } finally {
      setPhoneOtpLoading(false)
    }
  }

  function handleResendPhoneOtp() {
    setConfirmationResult(null)
    setPhoneOtpSent(false)
    setPhoneOtpCode("")
    setPhoneOtpError("")
    setTimeout(() => handleSendPhoneOtp(), 300)
  }

  async function handlePlaceOrder() {
    if (!phoneOtpVerified || !phoneVerifiedToken) {
      toast.error("Please verify your phone before placing the order")
      return
    }
    if (!draft.phone || draft.phone.length < 11) {
      toast.error("Please enter a valid phone number")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name,
          email: draft.email,
          phone: draft.phone,
          division: draft.division,
          district: draft.district,
          thana: draft.thana,
          fullAddress: draft.fullAddress,
          note: draft.note,
          deliveryZone,
          paymentMethod,
          couponCode: couponApplied ? couponCode : undefined,
          recoveryToken: recoveryToken || undefined,
          phoneVerifiedToken,
          items: items.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
            price: item.price,
          })),
        }),
      })
      const data = await res.json()
      if (data.success) {
        if (!isBuyNow) clearCart()
        resetDraft()
        window.dispatchEvent(new Event("cart-update"))
        const orderNumber = data.data?.order?.orderNumber
        if (orderNumber) {
          router.push(`/order/${orderNumber}`)
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
    }
  }

  if (items.length === 0) return null

  return (
    <div className="container mx-auto container-px py-8 md:py-12 max-w-6xl" ref={formRef}>
      {showRestoreNotice && (
        <div className="mb-6 rounded-2xl border border-primary/10 bg-primary/[0.03] shadow-sm">
          <div className="p-5 md:p-6">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <CheckCircle className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">We restored your checkout details.</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Continue where you left off.</p>

                {draft.updatedAt > 0 && (
                  <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-muted-foreground">
                    <span>Updated {formatRelativeTime(draft.updatedAt)}</span>
                    <span>Step: {STEPS[step]?.label || `Step ${step + 1}`}</span>
                    {draft.email && <span className="truncate">Email: {maskEmail(draft.email)}</span>}
                    {draft.phone && <span className="truncate">Phone: {maskPhone(draft.phone)}</span>}
                    {draft.selectedDeliveryZone && (
                      <span className="truncate">
                        Delivery: {DELIVERY_ZONE_NAMES[draft.selectedDeliveryZone as keyof typeof DELIVERY_ZONE_NAMES] || draft.selectedDeliveryZone}
                      </span>
                    )}
                    {draft.selectedPaymentMethod && (
                      <span className="truncate">Payment: {draft.selectedPaymentMethod.toUpperCase()}</span>
                    )}
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={dismissRestoreNotice}
                    className="inline-flex h-9 items-center justify-center rounded-xl bg-primary px-5 text-xs font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                  >
                    Continue checkout
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      clearSavedDetails()
                      setCouponCode("")
                      setCouponDiscount(0)
                      setCouponApplied(false)
                      setCouponError("")
                      setDeliveryZone("dhaka")
                      setPaymentMethod("cod")
                      setPhoneOtpSent(false)
                      setPhoneOtpCode("")
                      setPhoneOtpVerified(false)
                      setPhoneOtpError("")
                      setPhoneVerifiedToken("")
                      setConfirmationResult(null)
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

      {/* Identity section */}
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

      {/* Progress indicator */}
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2 font-medium">Secure Checkout</p>
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight">Checkout</h1>
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between max-w-3xl">
          {STEPS.map((s, i) => (
            <div key={s.index} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    i < step
                      ? "bg-primary text-primary-foreground"
                      : i === step
                        ? "bg-primary text-primary-foreground ring-2 ring-primary/30"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {i < step ? <CheckCircle className="h-4 w-4" /> : s.index + 1}
                </div>
                <span
                  className={`text-[10px] mt-1 font-medium hidden sm:block ${
                    i === step ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`h-px w-8 md:w-16 mx-2 ${
                    i < step ? "bg-primary" : "bg-muted-foreground/20"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main form area */}
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
                      <p className="text-xs text-muted-foreground">We&apos;ll send OTP to your phone</p>
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
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={draft.phone}
                      onChange={(e) => updateField("phone", e.target.value)}
                      placeholder="01XXXXXXXXX"
                      disabled={phoneOtpVerified}
                      className="h-11 rounded-xl"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 1: Delivery */}
          {step === 1 && (
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
                    <Input
                      id="division"
                      value={draft.division}
                      onChange={(e) => updateField("division", e.target.value)}
                      placeholder="Chattogram"
                      className="h-11 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="district">District</Label>
                    <Input
                      id="district"
                      value={draft.district}
                      onChange={(e) => updateField("district", e.target.value)}
                      placeholder="Chattogram"
                      className="h-11 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="thana">Thana / Upazila</Label>
                    <Input
                      id="thana"
                      value={draft.thana}
                      onChange={(e) => updateField("thana", e.target.value)}
                      placeholder="Kotwali"
                      className="h-11 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deliveryZone">Delivery Zone</Label>
                    <Select
                      value={deliveryZone}
                      onValueChange={(v) => {
                        if (!v) return
                        setDeliveryZone(v as DeliveryZone)
                        updateField("selectedDeliveryZone", v)
                      }}
                    >
                      <SelectTrigger className="h-11 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(DELIVERY_ZONE_NAMES).map(([key, name]) => (
                          <SelectItem key={key} value={key}>
                            {name} (৳{DELIVERY_FEES[key]})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fullAddress">Full Address</Label>
                  <Input
                    id="fullAddress"
                    value={draft.fullAddress}
                    onChange={(e) => updateField("fullAddress", e.target.value)}
                    placeholder="House #, Road #, Area"
                    className="h-11 rounded-xl"
                  />
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
              </CardContent>
            </Card>
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
                        setPaymentMethod(v)
                        updateField("selectedPaymentMethod", v)
                      }}
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
                              id={pm.provider}
                              disabled={isOnline}
                            />
                            <div className="flex-1 min-w-0">
                              <Label
                                htmlFor={pm.provider}
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
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 3: Verification */}
          {step === 3 && (
            <Card className="border-border/50 rounded-2xl shadow-sm">
              <CardContent className="p-6 md:p-8 space-y-4">
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-primary text-primary-foreground text-sm font-bold">5</span>
                  <div>
                    <h2 className="text-lg font-semibold">Phone Verification</h2>
                    <p className="text-xs text-muted-foreground">Verify your phone to place the order</p>
                  </div>
                </div>

                <div id="recaptcha-container" ref={recaptchaContainerRef} />

                {phoneOtpVerified ? (
                  <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-5 py-4">
                    <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
                    <span className="text-sm font-medium text-green-700">
                      Phone <strong>{maskPhone(draft.phone)}</strong> verified successfully
                    </span>
                  </div>
                ) : phoneOtpSent ? (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Smartphone className="h-4 w-4" />
                      A 6-digit code has been sent to <strong className="text-foreground">{maskPhone(draft.phone)}</strong>
                    </p>
                    <div className="flex gap-3">
                      <Input
                        value={phoneOtpCode}
                        onChange={(e) => { setPhoneOtpCode(e.target.value); setPhoneOtpError("") }}
                        placeholder="000000"
                        maxLength={6}
                        className="text-center text-lg tracking-[0.5em] w-40 font-mono h-12 rounded-xl"
                      />
                      <Button
                        type="button"
                        onClick={handleVerifyPhoneOtp}
                        disabled={phoneOtpLoading || phoneOtpCode.length !== 6}
                        className="h-12 rounded-xl"
                      >
                        {phoneOtpLoading ? "Verifying..." : "Verify"}
                      </Button>
                    </div>
                    {phoneOtpError && (
                      <p className="text-sm text-destructive">{phoneOtpError}</p>
                    )}
                    <button
                      type="button"
                      onClick={handleResendPhoneOtp}
                      className="text-sm text-primary hover:underline"
                      disabled={phoneOtpLoading}
                    >
                      Resend code
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Smartphone className="h-4 w-4" />
                      We&apos;ll send a verification code to <strong className="text-foreground">{maskPhone(draft.phone)}</strong>
                    </p>
                    <Button
                      type="button"
                      onClick={handleSendPhoneOtp}
                      disabled={phoneOtpLoading || !draft.phone}
                      className="h-12 rounded-xl"
                    >
                      {phoneOtpLoading ? "Sending..." : "Send Verification Code"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 4: Review & Place */}
          {step === 4 && (
            <div className="space-y-6">
              <Card className="border-border/50 rounded-2xl shadow-sm">
                <CardContent className="p-6 md:p-8 space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-primary text-primary-foreground text-sm font-bold">6</span>
                    <div>
                      <h2 className="text-lg font-semibold">Review Your Order</h2>
                      <p className="text-xs text-muted-foreground">Please confirm everything is correct</p>
                    </div>
                  </div>

                  <div className="space-y-4 divide-y divide-border/50">
                    <div className="space-y-2 pb-4">
                      <h3 className="text-sm font-medium text-muted-foreground">Contact</h3>
                      <p className="text-sm">{draft.name}</p>
                      <p className="text-sm">{draft.email}</p>
                      <p className="text-sm">{draft.phone}</p>
                    </div>
                    <div className="space-y-2 pb-4 pt-4">
                      <h3 className="text-sm font-medium text-muted-foreground">Delivery</h3>
                      <p className="text-sm">{draft.fullAddress}</p>
                      <p className="text-sm">{draft.thana}, {draft.district}, {draft.division}</p>
                      <p className="text-sm">{DELIVERY_ZONE_NAMES[deliveryZone as keyof typeof DELIVERY_ZONE_NAMES] || deliveryZone}</p>
                      {draft.note && <p className="text-sm text-muted-foreground italic">Note: {draft.note}</p>}
                    </div>
                    <div className="space-y-2 pb-4 pt-4">
                      <h3 className="text-sm font-medium text-muted-foreground">Payment</h3>
                      <p className="text-sm capitalize">{paymentMethod === "cod" ? "Cash on Delivery" : paymentMethod}</p>
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

              <Button
                size="lg"
                className="w-full h-12 md:h-14 text-base rounded-xl"
                onClick={handlePlaceOrder}
                disabled={loading}
              >
                {loading ? "Placing Order..." : `Place Order — ৳${total.toLocaleString()}`}
              </Button>
            </div>
          )}

          {/* Navigation */}
          {step < 4 && (
            <div className="flex items-center justify-between gap-4 pt-2">
              <div>
                {!isFirstStep ? (
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
                  {/* Items */}
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
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">৳{subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Delivery Fee</span>
                    <span className="font-medium">৳{deliveryFee}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount ({couponCode})</span>
                      <span>-৳{discount.toLocaleString()}</span>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="flex justify-between font-bold text-base">
                  <span>Total</span>
                  <span>৳{total.toLocaleString()}</span>
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

"use client"

import { useState, useEffect } from "react"
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
import { CheckCircle, Shield, Tag, Truck, CreditCard, ArrowLeft } from "lucide-react"
import Link from "next/link"

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

type FormData = {
  name: string
  email: string
  phone: string
  division: string
  district: string
  thana: string
  fullAddress: string
}

type CouponState = {
  code: string
  discount: number
  loading: boolean
  applied: boolean
  error: string
}

export function CheckoutForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isBuyNow = searchParams.has("productId")

  const [items, setItems] = useState<(CartItem & { productName?: string })[]>([])
  const [deliveryZone, setDeliveryZone] = useState<DeliveryZone>("dhaka")
  const [paymentMethod, setPaymentMethod] = useState<string>("cod")
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodSetting[]>([])
  const [paymentMethodsLoading, setPaymentMethodsLoading] = useState(true)
  const [loading, setLoading] = useState(false)
  const [coupon, setCoupon] = useState<CouponState>({
    code: searchParams.get("coupon") || "",
    discount: 0,
    loading: false,
    applied: false,
    error: "",
  })
  const [form, setForm] = useState<FormData>({
    name: "",
    email: "",
    phone: "",
    division: "",
    district: "",
    thana: "",
    fullAddress: "",
  })

  const [otpCode, setOtpCode] = useState("")
  const [otpSent, setOtpSent] = useState(false)
  const [otpVerified, setOtpVerified] = useState(false)
  const [otpLoading, setOtpLoading] = useState(false)
  const [otpError, setOtpError] = useState("")

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

  useEffect(() => {
    if (coupon.code && !coupon.applied) {
      validateCoupon(coupon.code)
    }
  }, [items])

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

  function updateForm(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0)
  const deliveryFee = DELIVERY_FEES[deliveryZone]
  const discount = coupon.discount
  const total = subtotal + deliveryFee - discount

  const canSendOtp = form.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) && !otpVerified

  async function validateCoupon(code: string) {
    if (!code.trim()) return
    setCoupon((prev) => ({ ...prev, loading: true, error: "" }))
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim(), subtotal }),
      })
      const d = await res.json()
      if (d.success) {
        setCoupon((prev) => ({
          ...prev,
          code: code.trim().toUpperCase(),
          discount: d.data.discount,
          applied: true,
          loading: false,
          error: "",
        }))
      } else {
        setCoupon((prev) => ({ ...prev, discount: 0, applied: false, loading: false, error: d.error ?? "Invalid coupon" }))
      }
    } catch {
      setCoupon((prev) => ({ ...prev, discount: 0, applied: false, loading: false, error: "Failed to validate" }))
    }
  }

  function handleApplyCoupon() {
    validateCoupon(coupon.code)
  }

  function handleRemoveCoupon() {
    setCoupon({ code: "", discount: 0, loading: false, applied: false, error: "" })
  }

  async function handleSendOtp() {
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      toast.error("Please enter a valid email address")
      return
    }
    setOtpLoading(true)
    setOtpError("")
    try {
      const res = await fetch("/api/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email }),
      })
      const d = await res.json()
      if (d.success) {
        setOtpSent(true)
        toast.success("Verification code sent to your email")
      } else {
        setOtpError(d.error ?? "Failed to send OTP")
        toast.error(d.error ?? "Failed to send OTP")
      }
    } catch {
      setOtpError("Something went wrong")
      toast.error("Something went wrong")
    } finally {
      setOtpLoading(false)
    }
  }

  async function handleVerifyOtp() {
    if (!otpCode || otpCode.length !== 6) {
      toast.error("Please enter the 6-digit code")
      return
    }
    setOtpLoading(true)
    setOtpError("")
    try {
      const res = await fetch("/api/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, code: otpCode }),
      })
      const d = await res.json()
      if (d.success) {
        setOtpVerified(true)
        toast.success("Email verified!")
      } else {
        setOtpError(d.error ?? "Invalid code")
        toast.error(d.error ?? "Invalid code")
      }
    } catch {
      setOtpError("Something went wrong")
      toast.error("Something went wrong")
    } finally {
      setOtpLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!otpVerified) {
      toast.error("Please verify your email before placing the order")
      return
    }
    if (!form.phone || form.phone.length < 11) {
      toast.error("Please enter a valid phone number")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          deliveryZone,
          paymentMethod,
          couponCode: coupon.applied ? coupon.code : undefined,
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
    <div className="container mx-auto container-px py-8 md:py-12 max-w-4xl">
      <Link href="/cart" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 transition-colors group mb-6">
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" /> Back to Cart
      </Link>

      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2 font-medium">Secure Checkout</p>
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight">Checkout</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Delivery Details */}
        <Card className="overflow-hidden border-border/50 rounded-2xl shadow-sm">
          <CardContent className="p-6 md:p-8 space-y-6">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-primary text-primary-foreground text-sm font-bold">1</span>
              <div>
                <h2 className="text-lg font-semibold">Delivery Details</h2>
                <p className="text-xs text-muted-foreground">Where should we send your order?</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => updateForm("name", e.target.value)}
                  required
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email <span className="text-destructive">*</span></Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => updateForm("email", e.target.value)}
                  required
                  disabled={otpVerified}
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => updateForm("phone", e.target.value)}
                  required
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="division">Division</Label>
                <Input
                  id="division"
                  value={form.division}
                  onChange={(e) => updateForm("division", e.target.value)}
                  required
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="district">District</Label>
                <Input
                  id="district"
                  value={form.district}
                  onChange={(e) => updateForm("district", e.target.value)}
                  required
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="thana">Thana</Label>
                <Input
                  id="thana"
                  value={form.thana}
                  onChange={(e) => updateForm("thana", e.target.value)}
                  required
                  className="h-11 rounded-xl"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullAddress">Full Address</Label>
              <Input
                id="fullAddress"
                value={form.fullAddress}
                onChange={(e) => updateForm("fullAddress", e.target.value)}
                required
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
                      {name} (৳{DELIVERY_FEES[key]})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Items */}
        <Card className="border-border/50 rounded-2xl shadow-sm">
          <CardContent className="p-6 md:p-8 space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-primary text-primary-foreground text-sm font-bold">2</span>
              <div>
                <h2 className="text-lg font-semibold">Items</h2>
                <p className="text-xs text-muted-foreground">{items.length} item{items.length > 1 ? "s" : ""}</p>
              </div>
            </div>
            <div className="divide-y divide-border/50">
              {items.map((item, i) => (
                <div key={i} className="flex justify-between py-3 text-sm first:pt-0 last:pb-0">
                  <span className="text-muted-foreground">
                    {item.name || "Product"}
                    {item.size ? ` (${item.size}` : ""}{item.color ? ` / ${item.color}` : ""}{item.size ? ")" : ""}
                    {" "}x{item.quantity}
                  </span>
                  <span className="font-medium">৳{(item.price * item.quantity).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Step 3: Email Verification */}
        <Card className="border-border/50 rounded-2xl shadow-sm">
          <CardContent className="p-6 md:p-8 space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-primary text-primary-foreground text-sm font-bold">3</span>
              <div>
                <h2 className="text-lg font-semibold">Email Verification</h2>
                <p className="text-xs text-muted-foreground">Verify your email to place the order</p>
              </div>
            </div>

            {otpVerified ? (
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-5 py-4">
                <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
                <span className="text-sm font-medium text-green-700">Email verified successfully</span>
              </div>
            ) : otpSent ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  A 6-digit code has been sent to <strong className="text-foreground">{form.email}</strong>
                </p>
                <div className="flex gap-3">
                  <Input
                    value={otpCode}
                    onChange={(e) => { setOtpCode(e.target.value); setOtpError("") }}
                    placeholder="000000"
                    maxLength={6}
                    className="text-center text-lg tracking-[0.5em] w-40 font-mono h-12 rounded-xl"
                  />
                  <Button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={otpLoading || otpCode.length !== 6}
                    className="h-12 rounded-xl"
                  >
                    {otpLoading ? "Verifying..." : "Verify"}
                  </Button>
                </div>
                {otpError && (
                  <p className="text-sm text-destructive">{otpError}</p>
                )}
                <button
                  type="button"
                  onClick={handleSendOtp}
                  className="text-sm text-primary hover:underline"
                  disabled={otpLoading}
                >
                  Resend code
                </button>
              </div>
            ) : (
              <Button
                type="button"
                onClick={handleSendOtp}
                disabled={otpLoading || !canSendOtp}
                className="h-12 rounded-xl"
              >
                {otpLoading ? "Sending..." : "Send Verification Code"}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Step 4: Coupon */}
        <Card className="border-border/50 rounded-2xl shadow-sm">
          <CardContent className="p-6 md:p-8 space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-primary text-primary-foreground text-sm font-bold">4</span>
              <div>
                <h2 className="text-lg font-semibold">Coupon</h2>
                <p className="text-xs text-muted-foreground">Have a discount code?</p>
              </div>
            </div>
            {coupon.applied ? (
              <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-5 py-4">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-700">{coupon.code}</span>
                  <span className="text-sm text-green-600">(-৳{coupon.discount.toLocaleString()})</span>
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
                  value={coupon.code}
                  onChange={(e) => setCoupon((prev) => ({ ...prev, code: e.target.value, error: "" }))}
                  placeholder="Enter coupon code"
                  className="flex-1 uppercase h-11 rounded-xl"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleApplyCoupon}
                  disabled={coupon.loading || !coupon.code.trim()}
                  className="h-11 rounded-xl"
                >
                  {coupon.loading ? "..." : "Apply"}
                </Button>
              </div>
            )}
            {coupon.error && (
              <p className="text-sm text-destructive">{coupon.error}</p>
            )}
          </CardContent>
        </Card>

        {/* Step 5: Payment Method */}
        <Card className="border-border/50 rounded-2xl shadow-sm">
          <CardContent className="p-6 md:p-8 space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-primary text-primary-foreground text-sm font-bold">5</span>
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

        {/* Order Summary */}
        <Card className="bg-primary/5 border-primary/10 rounded-2xl shadow-sm">
          <CardContent className="p-6 md:p-8 space-y-4">
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Order Summary</h2>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal ({items.length} item{items.length > 1 ? "s" : ""})</span>
                <span className="font-medium">৳{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivery Fee</span>
                <span className="font-medium">৳{deliveryFee.toLocaleString()}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount ({coupon.code})</span>
                  <span>-৳{discount.toLocaleString()}</span>
                </div>
              )}
            </div>
            <Separator />
            <div className="flex justify-between font-bold text-xl">
              <span>Total</span>
              <span>৳{total.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5" /> Your information is secure
          </p>
          <Button
            size="lg"
            className="h-12 md:h-14 px-10 text-base rounded-xl"
            type="submit"
            disabled={loading || !otpVerified}
          >
            {loading
              ? "Placing Order..."
              : otpVerified
                ? `Place Order — ৳${total.toLocaleString()}`
                : "Verify Email to Place Order"}
          </Button>
        </div>
      </form>
    </div>
  )
}

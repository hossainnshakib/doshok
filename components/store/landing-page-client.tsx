"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import type { DeliveryZone } from "@/types"
import { DELIVERY_ZONE_NAMES } from "@/types"
import { CheckCircle, Truck, Shield, Tag, CreditCard, Minus, Plus } from "lucide-react"

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

function useSaveAbandoned(params: {
  slug: string | null
  productId: string
  name: string
  phone: string
  step: string
  variantId?: string
  quantity: number
  size: string
  color: string
  deliveryZone: string
  address: string
  couponCode?: string
  subtotal: number
  discount: number
  total: number
}) {
  const { slug, productId, name, phone, step, variantId, quantity, size, color, deliveryZone, address, couponCode, subtotal, discount, total } = params
  const saved = useRef(false)

  useEffect(() => {
    if (!phone || saved.current) return
    const timer = setTimeout(() => {
      fetch("/api/abandoned", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          landingSlug: slug,
          productId,
          variantId,
          quantity,
          size,
          color,
          deliveryZone,
          address,
          name,
          phone,
          step,
          couponCode,
          subtotal,
          discount,
          total,
        }),
      }).catch(() => {})
      saved.current = true
    }, 3000)
    return () => clearTimeout(timer)
  }, [phone, step])
}

export function LandingPageClient({ product, slug }: LandingPageClientProps) {
  const [selectedSize, setSelectedSize] = useState("")
  const [selectedColor, setSelectedColor] = useState("")
  const [quantity, setQuantity] = useState(1)
  const [step, setStep] = useState<"select" | "checkout" | "otp" | "done">("select")
  const [deliveryZone, setDeliveryZone] = useState<DeliveryZone>("dhaka")
  const [paymentMethod, setPaymentMethod] = useState<string>("cod")
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodSetting[]>([])
  const [paymentMethodsLoading, setPaymentMethodsLoading] = useState(true)
  const [phone, setPhone] = useState("")
  const [otp, setOtp] = useState("")
  const [loading, setLoading] = useState(false)
  const [otpEmail, setOtpEmail] = useState("")
  const [couponCode, setCouponCode] = useState("")
  const [couponDiscount, setCouponDiscount] = useState(0)
  const [couponApplied, setCouponApplied] = useState(false)
  const [couponError, setCouponError] = useState("")
  const [couponLoading, setCouponLoading] = useState(false)

  const sizes = [...new Set(product.variants.map((v) => v.size))]
  const colors = [...new Set(product.variants.map((v) => v.color))]
  const selectedVariant = product.variants.find(
    (v) => v.size === selectedSize && v.color === selectedColor
  )
  const deliveryFee = DELIVERY_FEES[deliveryZone]
  const subtotal = product.price * quantity
  const discount = couponDiscount
  const total = subtotal + deliveryFee - discount

  useSaveAbandoned({
    slug,
    productId: product.id,
    name: "",
    phone,
    step,
    variantId: selectedVariant?.id,
    quantity,
    size: selectedSize,
    color: selectedColor,
    deliveryZone,
    address: "",
    couponCode: couponApplied ? couponCode : undefined,
    subtotal,
    discount,
    total,
  })

  useEffect(() => {
    const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null
    const urlCoupon = params?.get("coupon")
    const code = urlCoupon || product.defaultCouponCode || ""
    if (code && !couponApplied) {
      setCouponCode(code)
      handleApplyCouponExternal(code)
    }
  }, [])

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
    const emailValue = (document.getElementById("email") as HTMLInputElement)?.value
    if (!emailValue || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
      toast.error("Please enter a valid email address")
      return
    }
    if (!phone || phone.length < 11) {
      toast.error("Please enter a valid phone number")
      return
    }
    setOtpEmail(emailValue)
    setLoading(true)
    try {
      const res = await fetch("/api/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailValue }),
      })
      const data = await res.json()
      if (data.success) {
        setStep("otp")
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
          name: (document.getElementById("name") as HTMLInputElement)?.value,
          email: (document.getElementById("email") as HTMLInputElement)?.value,
          phone,
          division: (document.getElementById("division") as HTMLInputElement)?.value,
          district: (document.getElementById("district") as HTMLInputElement)?.value,
          thana: (document.getElementById("thana") as HTMLInputElement)?.value,
          fullAddress: (document.getElementById("address") as HTMLInputElement)?.value,
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
        if (paymentMethod === "bkash_partial" && data.data?.paymentUrl) {
          window.location.href = data.data.paymentUrl
        } else {
          setStep("done")
          toast.success("Order placed successfully!")
        }
      } else {
        toast.error(data.error ?? "Order failed")
      }
    } catch {
      toast.error("Something went wrong")
    }
  }

  if (step === "done") {
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
        {/* Copy */}
        {product.landingCopy && (
          <section className="text-center bg-muted/20 rounded-2xl p-6 md:p-8">
            <p className="text-muted-foreground leading-relaxed max-w-lg mx-auto text-sm">
              {product.landingCopy}
            </p>
          </section>
        )}

        {/* Select Step */}
        {step === "select" && (
          <>
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

            <Button
              size="lg"
              className="w-full h-12 md:h-14 rounded-xl text-base font-medium"
              disabled={!selectedSize || !selectedColor}
              onClick={() => setStep("checkout")}
            >
              Order Now — ৳{product.price * quantity}
            </Button>
          </>
        )}

        {/* Checkout Step */}
        {step === "checkout" && (
          <>
            <section className="bg-muted/20 rounded-2xl p-6 md:p-8 space-y-5">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">Step 2</p>
              <h2 className="text-lg font-semibold">Delivery Details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" required className="h-11 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" required className="h-11 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="division">Division</Label>
                  <Input id="division" required className="h-11 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="district">District</Label>
                  <Input id="district" required className="h-11 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="thana">Thana</Label>
                  <Input id="thana" required className="h-11 rounded-xl" />
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
                <Input id="address" required className="h-11 rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  type="tel"
                  required
                  className="h-11 rounded-xl"
                />
              </div>
            </section>

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
              <div className="flex justify-between font-bold text-lg pt-3 border-t border-primary/10">
                <span>Total</span>
                <span>৳{total.toLocaleString()}</span>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5" /> Secure checkout — Your information is safe
              </p>
              <Button
                size="lg"
                className="w-full h-12 md:h-14 rounded-xl text-base font-medium"
                onClick={handleSendOtp}
                disabled={loading}
              >
                {loading ? "Sending OTP..." : "Continue to Verification"}
              </Button>
            </div>
          </>
        )}

        {/* OTP Step */}
        {step === "otp" && (
          <section className="space-y-6 max-w-sm mx-auto text-center">
            <div className="bg-muted/20 rounded-2xl p-8">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium mb-2">Step 3</p>
              <h2 className="text-xl font-semibold mb-2">Enter OTP</h2>
              <p className="text-sm text-muted-foreground">
                A 6-digit code has been sent to <strong className="text-foreground">{otpEmail || "your email"}</strong>
              </p>
            </div>
            <Input
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="000000"
              maxLength={6}
              className="text-center text-2xl tracking-[0.5em] font-mono h-14 rounded-xl"
            />
            <Button
              size="lg"
              className="w-full h-12 md:h-14 rounded-xl text-base font-medium"
              onClick={handleVerifyOtp}
              disabled={loading}
            >
              {loading ? "Verifying..." : "Verify & Place Order"}
            </Button>
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

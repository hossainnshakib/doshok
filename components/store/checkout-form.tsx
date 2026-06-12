"use client"

import { useState, useEffect, useCallback, useRef } from "react"
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
import type { CartItem, DeliveryZone, UserAddress, AddressLabel } from "@/types"
import { DELIVERY_ZONE_NAMES, ADDRESS_LABELS } from "@/types"
import {
  CheckCircle, Shield, Tag, Truck, CreditCard, ArrowLeft, ChevronLeft, ChevronRight, Smartphone,
} from "lucide-react"
import Link from "next/link"
import { getPhoneInputValue, getPhoneDisplayE164 } from "@/lib/utils"
import { useSession } from "next-auth/react"
import { User, LogIn, MapPin, Home, Briefcase, Users } from "lucide-react"
import { getDivisions, getDistrictsByDivision, getUpazilasByDistrict } from "@/lib/bangladesh-address"
import { AddressCombobox } from "@/components/store/address-combobox"

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

const STEPS = [
  { index: 0, label: "Contact", description: "Who & where to reach" },
  { index: 1, label: "Delivery", description: "Delivery address & zone" },
  { index: 2, label: "Offer & Payment", description: "Coupon & payment method" },
  { index: 3, label: "Confirm", description: "Review & place order" },
]

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

  const [divisions, setDivisions] = useState<Awaited<ReturnType<typeof getDivisions>>>([])
  const [districts, setDistricts] = useState<Awaited<ReturnType<typeof getDistrictsByDivision>>>([])
  const [upazilas, setUpazilas] = useState<Awaited<ReturnType<typeof getUpazilasByDistrict>>>([])

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
    setDivisions(getDivisions())
  }, [])

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
    if (!isLoggedIn) return
    fetch("/api/account/profile")
      .then((r) => r.json())
      .then((d) => {
        if (!d.success || !d.data) return
        const profile = d.data as { firstName?: string; lastName?: string; email?: string; phone?: string | null }
        const updates: Partial<typeof draft> = {}
        if (profile.firstName || profile.lastName) {
          const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(" ")
          if (fullName && !draft.name) updates.name = fullName
        }
        if (profile.email && !draft.email) updates.email = profile.email
        if (profile.phone && !draft.phone) updates.phone = profile.phone
        if (Object.keys(updates).length > 0) {
          updateFields(updates)
        }
      })
      .catch(() => {})
  }, [isLoggedIn, updateFields])

  useEffect(() => {
    if (!isLoggedIn) return
    setAddressesLoading(true)
    fetch("/api/account/addresses")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          const addrs = d.data as UserAddress[]
          setSavedAddresses(addrs)
          const defaultAddr = addrs.find((a: UserAddress) => a.isDefault)
          if (defaultAddr && !draft.fullAddress) {
            setSelectedAddressId(defaultAddr.id)
            applyAddressToDraft(defaultAddr)
          }
        }
      })
      .catch(() => {})
      .finally(() => setAddressesLoading(false))
  }, [isLoggedIn])

  function applyAddressToDraft(addr: UserAddress) {
    updateFields({
      name: addr.recipientName,
      phone: getPhoneInputValue(addr.phone),
      divisionId: "",
      divisionName: addr.city,
      districtId: "",
      districtName: addr.city,
      upazilaId: "",
      upazilaName: addr.city,
      fullAddress: addr.addressLine1 + (addr.addressLine2 ? `, ${addr.addressLine2}` : ""),
      selectedDeliveryZone: addr.zone as DeliveryZone,
    })
    setDeliveryZone(addr.zone as DeliveryZone)
    setDistricts([])
    setUpazilas([])
  }

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
        if (!draft.phone.trim() || !/^1[3-9]\d{8}$/.test(draft.phone.trim()))
          errors.push("Enter a valid Bangladesh mobile number (01XXXXXXXXX)")
        break
      }
      case 1: {
        if (!draft.districtId) errors.push("Division and district are required")
        if (!draft.upazilaId) errors.push("Upazila / Thana is required")
        if (!draft.fullAddress.trim()) errors.push("Full address is required")
        break
      }
      case 2: {
        if (couponCode.trim() && !couponApplied) {
          errors.push("Apply or remove the coupon code before continuing")
        }
        break
      }
    }
    return errors
  }, [step, draft, couponCode, couponApplied])

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

  async function handlePlaceOrder() {
    if (!draft.phone || !/^1[3-9]\d{8}$/.test(draft.phone)) {
      toast.error("Enter a valid Bangladesh mobile number (01XXXXXXXXX)")
      return
    }

    const e164Phone = getPhoneDisplayE164(draft.phone)
    setLoading(true)
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
          note: draft.note,
          paymentMethod,
          couponCode: couponApplied ? couponCode : undefined,
          items: items.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
          })),
        }),
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
              isDefault: savedAddresses.length === 0,
            }),
          }).catch(() => {})
        }
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

        const orderNumber = order?.orderNumber
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
                    <div className="flex items-center gap-0 rounded-xl border bg-background overflow-hidden focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1 has-[:focus]:ring-primary">
                      <span className="px-4 py-2.5 text-sm font-medium bg-muted/50 border-r border-border text-muted-foreground select-none shrink-0">
                        +880
                      </span>
                      <Input
                        id="phone"
                        type="tel"
                        inputMode="tel"
                        value={draft.phone}
                        onChange={(e) => {
                          updateField("phone", getPhoneInputValue(e.target.value))
                        }}
                        placeholder="1XXXXXXXXX"
                        className="h-11 rounded-none border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                    </div>
                  </div>
                </div>
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
                        const isEnabled = pm.enabled
                        const isCod = pm.provider === "COD"
                        const isBkash = pm.provider === "BKASH"
                        const isSelectable = isEnabled && !isOnline || (isOnline && isBkash && isEnabled)

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
                              {isCod && isEnabled && (
                                <div className="mt-1.5 space-y-1">
                                  <p className="text-xs text-muted-foreground">
                                    Pay the full amount (৳{total.toLocaleString()}) when your order is delivered.
                                  </p>
                                  <p className="text-xs text-amber-600">
                                    No advance payment required.
                                  </p>
                                </div>
                              )}
                              {isBkash && isEnabled && (
                                <div className="mt-1.5 space-y-1">
                                  <p className="text-xs text-muted-foreground">
                                    Pay now with bKash to confirm your order instantly.
                                  </p>
                                  <p className="text-xs font-medium text-primary">
                                    Amount to pay: ৳{total.toLocaleString()}
                                  </p>
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
                              {isOnline && isEnabled && !isBkash && (
                                <p className="text-xs text-muted-foreground mt-1 italic">
                                  {pm.displayName} is not yet configured
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
                      <h3 className="text-sm font-medium text-muted-foreground">Contact</h3>
                      <p className="text-sm">{draft.name}</p>
                      <p className="text-sm">{draft.email}</p>
                      <p className="text-sm">{getPhoneDisplayE164(draft.phone)}</p>
                    </div>
                    <div className="space-y-2 pb-4 pt-4">
                      <h3 className="text-sm font-medium text-muted-foreground">Delivery</h3>
                      <p className="text-sm">{draft.fullAddress}</p>
                      <p className="text-sm">{draft.upazilaName}, {draft.districtName}, Bangladesh</p>
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

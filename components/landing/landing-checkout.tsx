"use client"

import { startTransition, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { toast } from "sonner"
import { CheckCircle2, CreditCard, Loader2, Lock } from "lucide-react"
import { getDistrictsByDivision, getDivisions } from "@/lib/bangladesh-address"
import { isValidBdPhone, normalizePhoneToE164 } from "@/lib/checkout/phone"
import type { CheckoutContent } from "@/lib/landing-pages/types"
import type { PublicLandingItem } from "./landing-sections"
import { useLandingPageState } from "./landing-page-state"
import { DistrictCombobox, type DistrictValue } from "@/components/store/district-combobox"
import { FirebaseOtpPanel } from "@/components/store/firebase-otp-panel"
import { cn } from "@/lib/utils"

const inputCls =
  "w-full px-3 py-2.5 bg-white border border-stone-300 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-stone-500 focus:ring-1 focus:ring-stone-500/20 transition-colors"
const labelCls = "block text-[11px] font-medium text-stone-600 mb-1 tracking-wide uppercase"

type PlacedOrder = { orderNumber: string; total: number; successToken: string }

export function CheckoutSection({
  pageId,
  content,
  items,
  isPreview,
}: {
  pageId: string
  content: CheckoutContent
  items: PublicLandingItem[]
  isPreview: boolean
}) {
  const { selectedItemIds, variantPicks, resetAll, matchedOffer, quote, setQuote, setMatchedOffer } = useLandingPageState()

  const [settings, setSettings] = useState<{ checkoutV2Enabled: boolean; otpRequired: boolean } | null>(null)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [divisionId, setDivisionId] = useState("")
  const [district, setDistrict] = useState<DistrictValue>({ districtId: null, districtName: "" })
  const [thana, setThana] = useState("")
  const [area, setArea] = useState("")
  const [fullAddress, setFullAddress] = useState("")
  const [note, setNote] = useState("")
  const [otpToken, setOtpToken] = useState<string | null>(null)
  const [quoting, setQuoting] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [placed, setPlaced] = useState<PlacedOrder | null>(null)
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID())

  const divisions = useMemo(() => getDivisions(), [])
  const districtOptions = useMemo(
    () => (divisionId ? getDistrictsByDivision(divisionId).map((d) => ({ id: d.id, name: d.name })) : []),
    [divisionId]
  )
  const otpRequired = !!settings && settings.checkoutV2Enabled && settings.otpRequired

  useEffect(() => {
    fetch("/api/checkout/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setSettings({ checkoutV2Enabled: !!d.data.checkoutV2Enabled, otpRequired: !!d.data.otpRequired })
        else setSettings({ checkoutV2Enabled: false, otpRequired: false })
      })
      .catch(() => setSettings({ checkoutV2Enabled: false, otpRequired: false }))
  }, [])

  useEffect(() => {
    if (selectedItemIds.length === 0 || isPreview) {
      startTransition(() => {
        setQuote(null)
        setMatchedOffer(null)
      })
      return
    }
    const t = setTimeout(async () => {
      setQuoting(true)
      try {
        const res = await fetch(`/api/landing-pages/${pageId}/checkout/quote`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ selectedItemIds, districtId: district.districtId }),
        })
        const data = await res.json()
        if (data.success) {
          setQuote({
            deliveryFee: data.data.deliveryFee,
            zone: data.data.zone,
            total: data.data.total,
            offerPrice: data.data.offerPrice,
            regularTotal: data.data.regularTotal,
            savings: data.data.savings,
          })
        } else {
          setQuote(null)
        }
      } catch {
        setQuote(null)
      } finally {
        setQuoting(false)
      }
    }, 350)
    return () => clearTimeout(t)
  }, [selectedItemIds, district.districtId, pageId, isPreview, setQuote, setMatchedOffer])

  const phoneOk = isValidBdPhone(phone.trim())
  const formOk =
    name.trim().length > 0 &&
    phoneOk &&
    divisionId !== "" &&
    district.districtName.trim() !== "" &&
    thana.trim() !== "" &&
    fullAddress.trim() !== ""

  const missingVariants = useMemo(() => {
    const missing: string[] = []
    for (const item of items) {
      if (!selectedItemIds.includes(item.id)) continue
      // Check if item has multiple genuine variants requiring selection
      const activeVariants = item.variants.filter((v) => v.active)
      if (activeVariants.length > 1 && !variantPicks[item.id]) {
        missing.push(item.id)
      }
    }
    return missing
  }, [items, selectedItemIds, variantPicks])

  const canSubmit =
    !isPreview &&
    !submitting &&
    selectedItemIds.length > 0 &&
    missingVariants.length === 0 &&
    formOk &&
    (!otpRequired || !!otpToken)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      let e164 = ""
      try {
        e164 = normalizePhoneToE164(phone.trim())
      } catch {
        setSubmitError("Enter a valid Bangladeshi mobile number.")
        setSubmitting(false)
        return
      }

      const itemSelections = selectedItemIds.map((lpId) => {
        const item = items.find((i) => i.id === lpId)
        const pick = variantPicks[lpId]
        return {
          landingPageItemId: lpId,
          quantity: 1,
          variantId: pick?.variantId,
        }
      })

      const res = await fetch(`/api/landing-pages/${pageId}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedItemIds,
          itemSelections,
          customer: { name: name.trim(), email: email.trim() || undefined, phone: e164 },
          address: {
            divisionId,
            districtId: district.districtId,
            districtName: district.districtName.trim(),
            upazilaName: thana.trim(),
            areaName: area.trim() || undefined,
            fullAddress: fullAddress.trim(),
          },
          note: note.trim() || undefined,
          paymentMethod: "cod",
          idempotencyKey,
          checkoutVerificationToken: otpToken ?? undefined,
          priceFingerprint: quote ? { offerPrice: quote.offerPrice, total: quote.total } : undefined,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setPlaced({ orderNumber: data.data.orderNumber, total: data.data.total, successToken: data.data.successToken })
        resetAll()
        setIdempotencyKey(crypto.randomUUID())
        setOtpToken(null)
      } else {
        setSubmitError(data.error ?? "Failed to place order. Please try again.")
        if (res.status === 409) toast.error(data.error ?? "Order could not be placed")
      }
    } catch {
      setSubmitError("Something went wrong. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  // Order placed success
  if (placed) {
    return (
      <section className="bg-stone-50">
        <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-6 md:py-10">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6 text-center sm:p-8">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" aria-hidden />
            <h2 className="mt-3 text-xl font-bold tracking-tight">{content.successHeading || "Order Placed!"}</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-stone-600">{content.successMessage}</p>
            <p className="mt-4 text-sm text-stone-500">
              Order number: <span className="font-bold text-stone-900 tabular-nums">{placed.orderNumber}</span>
            </p>
            <p className="mt-1 text-sm text-stone-500">
              Total due on delivery: <span className="font-bold text-stone-900 tabular-nums">৳{placed.total.toLocaleString()}</span>
            </p>
            <Link
              href={`/order/success/${placed.orderNumber}?token=${encodeURIComponent(placed.successToken)}`}
              className="mt-5 inline-flex h-10 items-center rounded-lg bg-stone-900 px-5 text-sm font-semibold text-white transition hover:bg-stone-800"
            >
              View receipt
            </Link>
          </div>
        </div>
      </section>
    )
  }

  // Checkout form
  const selected = items.filter((i) => selectedItemIds.includes(i.id))

  return (
    <section className="bg-stone-50">
      <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-6 md:py-10">
        <h2 className="text-lg md:text-xl font-bold text-stone-900 mb-0.5">
          {content.heading || "Complete Your Order"}
        </h2>
        {content.subheading && (
          <p className="text-sm text-stone-500 mb-5 md:mb-7">{content.subheading}</p>
        )}

        {isPreview && (
          <p className="mb-4 flex items-center gap-1.5 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs font-medium text-amber-700">
            <Lock className="h-3.5 w-3.5" aria-hidden /> Preview mode — checkout is disabled until the page is published.
          </p>
        )}

        {selectedItemIds.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-stone-200 p-6 text-center text-sm text-stone-500">
            Select items above to continue.
          </p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-7 lg:gap-10">
            {/* Form */}
            <form onSubmit={handleSubmit} className="lg:col-span-3 space-y-3.5">
              <fieldset disabled={isPreview || submitting} className="space-y-3.5 disabled:opacity-80">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className={labelCls}>Name *</label>
                    <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" autoComplete="name" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Mobile Number *</label>
                    <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01XXXXXXXXX" inputMode="tel" autoComplete="tel" className={inputCls} />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Email <span className="font-normal text-stone-400">(optional)</span></label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" className={inputCls} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className={labelCls}>Division *</label>
                    <select
                      value={divisionId}
                      onChange={(e) => {
                        setDivisionId(e.target.value)
                        setDistrict({ districtId: null, districtName: "" })
                      }}
                      className={cn(inputCls, "appearance-none")}
                    >
                      <option value="">Select</option>
                      {divisions.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <span className={labelCls}>District *</span>
                    <DistrictCombobox
                      options={districtOptions}
                      value={district}
                      onChange={setDistrict}
                      placeholder={divisionId ? "Search district..." : "Select division first"}
                      disabled={!divisionId}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className={labelCls}>Thana / Upazila *</label>
                    <input value={thana} onChange={(e) => setThana(e.target.value)} placeholder="e.g. Gulshan" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Area / Locality</label>
                    <input value={area} onChange={(e) => setArea(e.target.value)} placeholder="e.g. Sector 5" className={inputCls} />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Full Address *</label>
                  <textarea rows={2} value={fullAddress} onChange={(e) => setFullAddress(e.target.value)} placeholder="House/flat, road, area details..." className="w-full px-3 py-2.5 bg-white border border-stone-300 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-stone-500 focus:ring-1 focus:ring-stone-500/20 resize-none transition-colors" />
                </div>

                <div>
                  <label className={labelCls}>Note <span className="font-normal text-stone-400">(optional)</span></label>
                  <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Any special instructions..." maxLength={500} className={inputCls} />
                </div>

                {otpRequired && (
                  <div className="rounded-xl border border-stone-200 p-3">
                    <p className="text-xs font-semibold text-stone-700">Phone verification required</p>
                    <div className="mt-2">
                      <FirebaseOtpPanel
                        phone={phone}
                        disabled={!phoneOk}
                        onVerified={(token) => setOtpToken(token)}
                        onReset={() => setOtpToken(null)}
                      />
                    </div>
                  </div>
                )}

                {submitError && (
                  <p role="alert" className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs leading-relaxed text-red-700">
                    {submitError}
                  </p>
                )}
              </fieldset>

              {/* Mobile: order summary inline */}
              <div className="lg:hidden bg-white border border-stone-200 p-4">
                <OrderSummary
                  selected={selected}
                  quote={quote}
                  matchedOffer={matchedOffer}
                  quoting={quoting}
                  districtName={district.districtName}
                />
              </div>

              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full bg-stone-900 text-white text-sm font-semibold py-3.5 tracking-wider uppercase hover:bg-stone-800 transition-colors disabled:opacity-50"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Placing order...
                  </span>
                ) : (
                  content.submitButtonLabel || `Place Order — ৳${(quote?.total ?? 0).toLocaleString()}`
                )}
              </button>

              {missingVariants.length > 0 && (
                <p className="text-center text-xs text-amber-600">Choose variations for all selected items to continue.</p>
              )}

              <p className="text-[10px] text-stone-400 text-center">
                By placing this order you agree to our terms.
              </p>
            </form>

            {/* Desktop: sticky order summary */}
            <div className="hidden lg:block lg:col-span-2">
              <div className="lg:sticky lg:top-20 bg-white border border-stone-200 p-4 md:p-5">
                <OrderSummary
                  selected={selected}
                  quote={quote}
                  matchedOffer={matchedOffer}
                  quoting={quoting}
                  districtName={district.districtName}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Order Summary sub-component
// ---------------------------------------------------------------------------

function OrderSummary({
  selected,
  quote,
  matchedOffer,
  quoting,
  districtName,
}: {
  selected: PublicLandingItem[]
  quote: { regularTotal: number; offerPrice: number; savings: number; deliveryFee: number; total: number } | null
  matchedOffer: { offerName: string; savings: number } | null
  quoting: boolean
  districtName: string
}) {
  return (
    <>
      <h3 className="text-[15px] font-bold text-stone-900 mb-3">Your Order</h3>

      <div className="space-y-2.5 mb-3">
        {selected.map((item) => {
          const img = item.displayImage || item.images[0]
          return (
            <div key={item.id} className="flex items-center gap-3">
              {img ? (
                <Image
                  src={img}
                  alt={item.displayTitle || item.name}
                  width={40}
                  height={48}
                  className="w-10 h-12 shrink-0 rounded-sm object-cover"
                />
              ) : (
                <span className="grid w-10 h-12 shrink-0 place-items-center rounded-sm bg-stone-100 text-[8px] font-bold text-stone-300">
                  D
                </span>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-stone-800 truncate">{item.displayTitle?.trim() || item.name}</p>
                <p className="text-[10px] text-stone-400">Free Size</p>
              </div>
              <p className="text-[13px] font-medium text-stone-800">৳{item.price.toLocaleString()}</p>
            </div>
          )
        })}
      </div>

      <div className="border-t border-stone-100 pt-3 space-y-1.5 text-[13px]">
        {matchedOffer && matchedOffer.savings > 0 && (
          <>
            <div className="flex justify-between">
              <span className="text-stone-400 line-through">Regular</span>
              <span className="text-stone-400 line-through">৳{quote?.regularTotal?.toLocaleString() ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-purple-600 font-medium">Set saving</span>
              <span className="text-purple-600 font-medium">-৳{quote?.savings?.toLocaleString() ?? 0}</span>
            </div>
          </>
        )}
        <div className="flex justify-between">
          <span className="text-stone-500">Delivery {quoting ? "(calculating...)" : districtName ? `(${districtName})` : ""}</span>
          <span className="text-stone-700">{quote ? `৳${quote.deliveryFee.toLocaleString()}` : "—"}</span>
        </div>
        <div className="flex justify-between font-bold text-base pt-2 border-t border-stone-200">
          <span className="text-stone-900">Total</span>
          <span className="text-stone-900">৳{(quote?.total ?? 0).toLocaleString()}</span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-[11px] text-stone-500 mt-2.5">
        <CreditCard className="w-3.5 h-3.5" />
        <span>Cash on Delivery · Pay when it arrives</span>
      </div>
    </>
  )
}

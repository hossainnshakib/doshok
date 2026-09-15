"use client"

import { startTransition, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { DistrictCombobox, type DistrictValue } from "@/components/store/district-combobox"
import { FirebaseOtpPanel } from "@/components/store/firebase-otp-panel"
import { toast } from "sonner"
import { CheckCircle2, Loader2, Lock } from "lucide-react"
import { getDistrictsByDivision, getDivisions } from "@/lib/bangladesh-address"
import { isValidBdPhone, normalizePhoneToE164 } from "@/lib/checkout/phone"
import type { CheckoutContent, ResolvedOffer } from "@/lib/landing-pages/types"
import { useLandingPageState } from "./landing-page-state"
import { cn } from "@/lib/utils"

const inputCls =
  "h-10 w-full rounded-lg border border-border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
const labelCls = "text-xs font-medium text-slate-600"

type Quote = { deliveryFee: number; zone: string; total: number; offerPrice: number } | null

type PlacedOrder = { orderNumber: string; total: number; successToken: string }

export function CheckoutSection({
  pageId,
  content,
  offers,
  isPreview,
}: {
  pageId: string
  content: CheckoutContent
  offers: ResolvedOffer[]
  isPreview: boolean
}) {
  const { selectedOfferId, picks, resetAll } = useLandingPageState()
  const selected = offers.find((o) => o.offerId === selectedOfferId && o.valid) ?? null

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
  const [quote, setQuote] = useState<Quote>(null)
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

  // Authoritative delivery/total estimate for the selected offer + district.
  // The final submit recalculates and wins.
  useEffect(() => {
    if (!selected || isPreview) {
      startTransition(() => {
        setQuote(null)
      })
      return
    }
    const t = setTimeout(async () => {
      setQuoting(true)
      try {
        const res = await fetch(`/api/landing-pages/${pageId}/checkout/quote`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ offerId: selected.offerId, districtId: district.districtId }),
        })
        const data = await res.json()
        if (data.success) {
          setQuote({ deliveryFee: data.data.deliveryFee, zone: data.data.zone, total: data.data.total, offerPrice: data.data.offerPrice })
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
  }, [selected, district.districtId, pageId, isPreview])

  const requiredSlots = useMemo(() => {
    if (!selected) return []
    const slots: { key: string; linkId: string; slot: number }[] = []
    for (const item of selected.items) {
      for (let s = 0; s < item.quantity; s++) slots.push({ key: `${selected.offerId}:${item.landingPageProductId}:${s}`, linkId: item.landingPageProductId, slot: s })
    }
    return slots
  }, [selected])

  const missingVariants = requiredSlots.filter((s) => !picks[s.key]?.variantId)
  const phoneOk = isValidBdPhone(phone.trim())
  const formOk =
    name.trim().length > 0 &&
    phoneOk &&
    divisionId !== "" &&
    district.districtName.trim() !== "" &&
    thana.trim() !== "" &&
    fullAddress.trim() !== ""
  const canSubmit =
    !isPreview && !submitting && selected && missingVariants.length === 0 && formOk && (!otpRequired || !!otpToken)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit || !selected) return
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
      const selections = requiredSlots.map((s) => ({
        landingPageProductId: s.linkId,
        unitIndex: s.slot,
        variantId: picks[s.key].variantId,
      }))
      const res = await fetch(`/api/landing-pages/${pageId}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offerId: selected.offerId,
          selections,
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
          priceFingerprint: quote ? { offerPrice: selected.offerPrice, total: quote.total } : undefined,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setPlaced({ orderNumber: data.data.orderNumber, total: data.data.total, successToken: data.data.successToken })
        resetAll()
        setIdempotencyKey(crypto.randomUUID())
        setOtpToken(null)
      } else {
        // Price/stock conflicts come back as 409 with guidance; surface them
        // plainly and let the customer refresh or reselect.
        setSubmitError(data.error ?? "Failed to place order. Please try again.")
        if (res.status === 409) toast.error(data.error ?? "Order could not be placed")
      }
    } catch {
      setSubmitError("Something went wrong. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (placed) {
    return (
      <section aria-label={content.heading || "Checkout"} id="lp-checkout" className="mt-14 scroll-mt-6">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6 text-center sm:p-8">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" aria-hidden />
          <h2 className="mt-3 text-xl font-bold tracking-tight">{content.successHeading || "Order Placed!"}</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600">{content.successMessage}</p>
          <p className="mt-4 text-sm text-slate-500">
            Order number: <span className="font-bold text-slate-900 tabular-nums">{placed.orderNumber}</span>
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Total due on delivery: <span className="font-bold text-slate-900 tabular-nums">৳{placed.total.toLocaleString()}</span>
          </p>
          <Link
            href={`/order/success/${placed.orderNumber}?token=${encodeURIComponent(placed.successToken)}`}
            className="mt-5 inline-flex h-10 items-center rounded-lg bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            View receipt
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section aria-label={content.heading || "Checkout"} id="lp-checkout" className="mt-14 scroll-mt-6">
      <div className="text-center">
        <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{content.heading || "Complete Your Order"}</h2>
        {content.subheading && <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">{content.subheading}</p>}
      </div>

      {isPreview && (
        <p className="mx-auto mt-4 flex max-w-xl items-center justify-center gap-1.5 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs font-medium text-amber-700">
          <Lock className="h-3.5 w-3.5" aria-hidden /> Preview mode — checkout is disabled until the page is published.
        </p>
      )}

      {!selected ? (
        <p className="mx-auto mt-6 max-w-xl rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
          Select an offer above to continue.
        </p>
      ) : (
        <form
          onSubmit={handleSubmit}
          className={cn("mt-6 grid gap-5", content.layout === "split" ? "lg:grid-cols-[1fr_320px]" : "grid-cols-1")}
        >
          <fieldset disabled={isPreview || submitting} className="space-y-4 rounded-2xl border border-slate-200 p-4 sm:p-5 disabled:opacity-80">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="lp-name" className={labelCls}>Name</label>
                <input id="lp-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" autoComplete="name" className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="lp-phone" className={labelCls}>Mobile number</label>
                <input id="lp-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01XXXXXXXXX" inputMode="tel" autoComplete="tel" className={inputCls} aria-describedby="lp-phone-hint" />
                <p id="lp-phone-hint" className="text-[11px] text-slate-400">We&apos;ll call to confirm your order.</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="lp-email" className={labelCls}>Email <span className="font-normal text-slate-400">(optional)</span></label>
              <input id="lp-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" className={inputCls} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="lp-division" className={labelCls}>Division</label>
                <select
                  id="lp-division"
                  value={divisionId}
                  onChange={(e) => {
                    setDivisionId(e.target.value)
                    setDistrict({ districtId: null, districtName: "" })
                  }}
                  className={inputCls}
                >
                  <option value="">Select division</option>
                  {divisions.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <span className={labelCls} id="lp-district-label">District</span>
                <DistrictCombobox
                  options={districtOptions}
                  value={district}
                  onChange={setDistrict}
                  placeholder={divisionId ? "Search district..." : "Select division first"}
                  disabled={!divisionId}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="lp-thana" className={labelCls}>Thana / Upazila</label>
                <input id="lp-thana" value={thana} onChange={(e) => setThana(e.target.value)} placeholder="e.g. Mirpur" className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="lp-area" className={labelCls}>Area / Locality <span className="font-normal text-slate-400">(optional)</span></label>
                <input id="lp-area" value={area} onChange={(e) => setArea(e.target.value)} placeholder="Block, road, landmark" className={inputCls} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="lp-address" className={labelCls}>Full address</label>
              <textarea id="lp-address" value={fullAddress} onChange={(e) => setFullAddress(e.target.value)} rows={2} placeholder="House, road, area" className="min-h-16 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="lp-note" className={labelCls}>Note <span className="font-normal text-slate-400">(optional)</span></label>
              <input id="lp-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="Delivery instructions" className={inputCls} />
            </div>

            {otpRequired && (
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-xs font-semibold text-slate-700">Phone verification required</p>
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

            <div className="rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-500">
              Payment: <span className="font-semibold text-slate-800">Cash on Delivery</span> — pay ৳{(quote?.total ?? selected.offerPrice).toLocaleString()} when you receive your order.
            </div>

            {submitError && (
              <p role="alert" className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs leading-relaxed text-red-700">
                {submitError}
              </p>
            )}

            <Button type="submit" disabled={!canSubmit} className="h-11 w-full rounded-xl bg-slate-900 text-sm font-semibold hover:bg-slate-700 disabled:opacity-50">
              {submitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> Placing order...</>
              ) : (
                content.submitButtonLabel || "Place Order"
              )}
            </Button>
            {missingVariants.length > 0 && (
              <p className="text-center text-xs text-amber-600">Choose variations for every unit in the offer section above to continue.</p>
            )}
          </fieldset>

          {content.showOrderSummary && (
            <aside className="h-fit rounded-2xl border border-slate-200 p-4 sm:p-5 lg:sticky lg:top-6" aria-label="Order summary">
              <p className="text-sm font-bold">Order summary</p>
              <p className="mt-1 text-xs font-medium text-slate-600">{selected.offerName}</p>
              <ul className="mt-3 space-y-2">
                {selected.items.map((item) => (
                  <li key={item.landingPageProductId} className="text-xs text-slate-500">
                    <span className="font-medium text-slate-700">{item.displayName} ×{item.quantity}</span>
                    {item.requiresVariant && (
                      <ul className="mt-1 space-y-0.5 pl-3">
                        {Array.from({ length: item.quantity }, (_, s) => {
                          const pick = picks[`${selected.offerId}:${item.landingPageProductId}:${s}`]
                          const variant = item.variants.find((v) => v.id === pick?.variantId)
                          return (
                            <li key={s}>
                              Unit {s + 1}: {variant ? `${variant.size} / ${variant.color}` : <span className="text-amber-600">variation not chosen</span>}
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
              <dl className="mt-4 space-y-1.5 border-t border-slate-100 pt-3 text-xs tabular-nums">
                <div className="flex justify-between text-slate-500">
                  <dt>Offer price</dt>
                  <dd className="font-semibold text-slate-800">৳{selected.offerPrice.toLocaleString()}</dd>
                </div>
                <div className="flex justify-between text-slate-500">
                  <dt>Regular total</dt>
                  <dd className="line-through">৳{selected.regularTotal.toLocaleString()}</dd>
                </div>
                {selected.savings > 0 && (
                  <div className="flex justify-between font-medium text-emerald-600">
                    <dt>You save</dt>
                    <dd>৳{selected.savings.toLocaleString()}</dd>
                  </div>
                )}
                <div className="flex justify-between text-slate-500">
                  <dt>Delivery {quoting ? "(calculating...)" : district.districtName ? `(${district.districtName})` : ""}</dt>
                  <dd>{quote ? `৳${quote.deliveryFee.toLocaleString()}` : "—"}</dd>
                </div>
                <div className="flex justify-between border-t border-slate-100 pt-2 text-sm font-bold text-slate-900">
                  <dt>Total</dt>
                  <dd>৳{(quote?.total ?? selected.offerPrice).toLocaleString()}</dd>
                </div>
              </dl>
              {content.showTrustNote && content.trustNote && (
                <p className="mt-3 text-[11px] leading-relaxed text-slate-400">{content.trustNote}</p>
              )}
            </aside>
          )}
        </form>
      )}
    </section>
  )
}

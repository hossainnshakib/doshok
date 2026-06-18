"use client"

import { forwardRef, useImperativeHandle, useState } from "react"
import { GripVertical, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { ImageUploader } from "@/components/admin/image-uploader"
import { LandingHeroImage } from "@/components/admin/landing-hero-image"
import {
  PAYMENT_RULE_LABELS,
  PAYMENT_RULE_VALUES,
  type PaymentRuleType,
} from "@/lib/checkout/payment-rule.service"

export type LandingBenefitInput = { id?: string; icon: string; title: string; description: string; enabled: boolean; sortOrder: number }
export type LandingFaqItemInput = { id?: string; question: string; answer: string; enabled: boolean; sortOrder: number }
export type LandingTestimonialInput = { id?: string; name: string; rating: number; text: string; image: string; enabled: boolean; sortOrder: number }
export type LandingGalleryImageInput = { id?: string; url: string; sortOrder: number }
export type LandingSectionOrderItem = { key: string; enabled: boolean; order: number }

export type LandingCampaignSettingsData = {
  paymentOverrideEnabled: boolean
  paymentRuleOverride: string | null
  paymentRuleValueOverride: number | null
  otpOverrideEnabled: boolean
  otpOverride: boolean | null
  couponOverrideEnabled: boolean
  autoCouponCode: string | null
  deliveryOverrideEnabled: boolean
  deliveryFeeOverride: number | null
  quantityLimit: number | null
  customCta: string | null
  customThankYouMessage: string | null
  landingGalleryPrimaryImage: string | null
  landingGallerySecondaryImage: string | null
  landingGalleryTertiaryImage: string | null
  landingGalleryVideoUrl: string | null
  landingOfferText: string | null
  landingDisplayPrice: number | null
  landingDisplayOldPrice: number | null
  landingGalleryEnabled: boolean
  landingReviewsEnabled: boolean
  landingFaqEnabled: boolean
  landingHighlightsEnabled: boolean
  urgencyCounterEnabled: boolean
  hideNormalNavigation: boolean
  benefits: LandingBenefitInput[]
  faqItems: LandingFaqItemInput[]
  testimonials: LandingTestimonialInput[]
  galleryImages: LandingGalleryImageInput[]
  landingGalleryLayout: string | null
  landingVariantSectionEnabled: boolean
  landingProductSummaryEnabled: boolean
  landingCheckoutTitle: string | null
  landingCheckoutSubtitle: string | null
  landingCheckoutCta: string | null
  landingSectionOrder: LandingSectionOrderItem[]
}

const DEFAULT_SECTION_ORDER: LandingSectionOrderItem[] = [
  { key: "hero", enabled: true, order: 0 },
  { key: "benefits", enabled: true, order: 1 },
  { key: "gallery", enabled: true, order: 2 },
  { key: "variant", enabled: true, order: 3 },
  { key: "testimonials", enabled: true, order: 4 },
  { key: "checkout", enabled: true, order: 5 },
  { key: "faq", enabled: true, order: 6 },
]

export type LandingCampaignSettingsHandle = {
  getValue: () => LandingCampaignSettingsData
  setValue: (data: Partial<LandingCampaignSettingsData>) => void
  reset: () => void
}

type Props = {
  showCheckoutOverrides?: boolean
}

const defaultBenefits: LandingBenefitInput[] = []
const defaultFaqItems: LandingFaqItemInput[] = []
const defaultTestimonialItems: LandingTestimonialInput[] = []
const defaultGalleryImages: LandingGalleryImageInput[] = []

export const LandingCampaignSettings = forwardRef<LandingCampaignSettingsHandle, Props>(function LandingCampaignSettings(
  { showCheckoutOverrides = true },
  ref,
) {
  const [paymentOverrideEnabled, setPaymentOverrideEnabled] = useState(false)
  const [paymentRuleOverride, setPaymentRuleOverride] = useState("")
  const [paymentRuleValueOverride, setPaymentRuleValueOverride] = useState("")
  const [otpOverrideEnabled, setOtpOverrideEnabled] = useState(false)
  const [otpOverride, setOtpOverride] = useState(false)
  const [couponOverrideEnabled, setCouponOverrideEnabled] = useState(false)
  const [autoCouponCode, setAutoCouponCode] = useState("")
  const [deliveryOverrideEnabled, setDeliveryOverrideEnabled] = useState(false)
  const [deliveryFeeOverride, setDeliveryFeeOverride] = useState("")
  const [quantityLimit, setQuantityLimit] = useState("")
  const [customCta, setCustomCta] = useState("")
  const [customThankYouMessage, setCustomThankYouMessage] = useState("")
  const [galleryPrimaryImage, setGalleryPrimaryImage] = useState("")
  const [gallerySecondaryImage, setGallerySecondaryImage] = useState("")
  const [galleryTertiaryImage, setGalleryTertiaryImage] = useState("")
  const [galleryVideoUrl, setGalleryVideoUrl] = useState("")
  const [landingOfferText, setLandingOfferText] = useState("")
  const [landingDisplayPrice, setLandingDisplayPrice] = useState("")
  const [landingDisplayOldPrice, setLandingDisplayOldPrice] = useState("")
  const [landingGalleryEnabled, setLandingGalleryEnabled] = useState(true)
  const [landingReviewsEnabled, setLandingReviewsEnabled] = useState(true)
  const [landingFaqEnabled, setLandingFaqEnabled] = useState(true)
  const [landingHighlightsEnabled, setLandingHighlightsEnabled] = useState(true)
  const [urgencyCounterEnabled, setUrgencyCounterEnabled] = useState(false)
  const [hideNormalNavigation, setHideNormalNavigation] = useState(false)
  const [benefits, setBenefits] = useState<LandingBenefitInput[]>(defaultBenefits)
  const [faqItems, setFaqItems] = useState<LandingFaqItemInput[]>(defaultFaqItems)
  const [testimonialItems, setTestimonialItems] = useState<LandingTestimonialInput[]>(defaultTestimonialItems)
  const [galleryImageList, setGalleryImageList] = useState<LandingGalleryImageInput[]>(defaultGalleryImages)
  const [landingGalleryLayout, setLandingGalleryLayout] = useState("grid")
  const [landingVariantSectionEnabled, setLandingVariantSectionEnabled] = useState(true)
  const [landingProductSummaryEnabled, setLandingProductSummaryEnabled] = useState(true)
  const [landingCheckoutTitle, setLandingCheckoutTitle] = useState("")
  const [landingCheckoutSubtitle, setLandingCheckoutSubtitle] = useState("")
  const [landingCheckoutCta, setLandingCheckoutCta] = useState("")
  const [landingSectionOrder, setLandingSectionOrder] = useState<LandingSectionOrderItem[]>(DEFAULT_SECTION_ORDER)

  useImperativeHandle(ref, () => ({
    getValue(): LandingCampaignSettingsData {
      return {
        paymentOverrideEnabled,
        paymentRuleOverride: paymentOverrideEnabled ? (paymentRuleOverride || null) : null,
        paymentRuleValueOverride: paymentOverrideEnabled && paymentRuleValueOverride ? parseInt(paymentRuleValueOverride) : null,
        otpOverrideEnabled,
        otpOverride: otpOverrideEnabled ? otpOverride : null,
        couponOverrideEnabled,
        autoCouponCode: couponOverrideEnabled ? (autoCouponCode.toUpperCase() || null) : null,
        deliveryOverrideEnabled,
        deliveryFeeOverride: deliveryOverrideEnabled && deliveryFeeOverride ? parseInt(deliveryFeeOverride) : null,
        quantityLimit: quantityLimit ? parseInt(quantityLimit) : null,
        customCta: customCta || null,
        customThankYouMessage: customThankYouMessage || null,
        landingGalleryPrimaryImage: galleryPrimaryImage || null,
        landingGallerySecondaryImage: gallerySecondaryImage || null,
        landingGalleryTertiaryImage: galleryTertiaryImage || null,
        landingGalleryVideoUrl: galleryVideoUrl || null,
        landingOfferText: landingOfferText || null,
        landingDisplayPrice: landingDisplayPrice ? parseInt(landingDisplayPrice) : null,
        landingDisplayOldPrice: landingDisplayOldPrice ? parseInt(landingDisplayOldPrice) : null,
        landingGalleryEnabled,
        landingReviewsEnabled,
        landingFaqEnabled,
        landingHighlightsEnabled,
        urgencyCounterEnabled,
        hideNormalNavigation,
        benefits: benefits.filter((b) => b.title),
        faqItems: faqItems.filter((f) => f.question && f.answer),
        testimonials: testimonialItems.filter((t) => t.name && t.text),
        galleryImages: galleryImageList.filter((g) => g.url),
        landingGalleryLayout: landingGalleryLayout || null,
        landingVariantSectionEnabled,
        landingProductSummaryEnabled,
        landingCheckoutTitle: landingCheckoutTitle || null,
        landingCheckoutSubtitle: landingCheckoutSubtitle || null,
        landingCheckoutCta: landingCheckoutCta || null,
        landingSectionOrder,
      }
    },
    setValue(data: Partial<LandingCampaignSettingsData>) {
      if (data.paymentOverrideEnabled !== undefined) setPaymentOverrideEnabled(data.paymentOverrideEnabled)
      if (data.paymentRuleOverride !== undefined) setPaymentRuleOverride(data.paymentRuleOverride ?? "")
      if (data.paymentRuleValueOverride !== undefined) setPaymentRuleValueOverride(data.paymentRuleValueOverride?.toString() ?? "")
      if (data.otpOverrideEnabled !== undefined) setOtpOverrideEnabled(data.otpOverrideEnabled)
      if (data.otpOverride !== undefined) setOtpOverride(data.otpOverride ?? false)
      if (data.couponOverrideEnabled !== undefined) setCouponOverrideEnabled(data.couponOverrideEnabled)
      if (data.autoCouponCode !== undefined) setAutoCouponCode(data.autoCouponCode ?? "")
      if (data.deliveryOverrideEnabled !== undefined) setDeliveryOverrideEnabled(data.deliveryOverrideEnabled)
      if (data.deliveryFeeOverride !== undefined) setDeliveryFeeOverride(data.deliveryFeeOverride?.toString() ?? "")
      if (data.quantityLimit !== undefined) setQuantityLimit(data.quantityLimit?.toString() ?? "")
      if (data.customCta !== undefined) setCustomCta(data.customCta ?? "")
      if (data.customThankYouMessage !== undefined) setCustomThankYouMessage(data.customThankYouMessage ?? "")
      if (data.landingGalleryPrimaryImage !== undefined) setGalleryPrimaryImage(data.landingGalleryPrimaryImage ?? "")
      if (data.landingGallerySecondaryImage !== undefined) setGallerySecondaryImage(data.landingGallerySecondaryImage ?? "")
      if (data.landingGalleryTertiaryImage !== undefined) setGalleryTertiaryImage(data.landingGalleryTertiaryImage ?? "")
      if (data.landingGalleryVideoUrl !== undefined) setGalleryVideoUrl(data.landingGalleryVideoUrl ?? "")
      if (data.landingOfferText !== undefined) setLandingOfferText(data.landingOfferText ?? "")
      if (data.landingDisplayPrice !== undefined) setLandingDisplayPrice(data.landingDisplayPrice?.toString() ?? "")
      if (data.landingDisplayOldPrice !== undefined) setLandingDisplayOldPrice(data.landingDisplayOldPrice?.toString() ?? "")
      if (data.landingGalleryEnabled !== undefined) setLandingGalleryEnabled(data.landingGalleryEnabled)
      if (data.landingReviewsEnabled !== undefined) setLandingReviewsEnabled(data.landingReviewsEnabled)
      if (data.landingFaqEnabled !== undefined) setLandingFaqEnabled(data.landingFaqEnabled)
      if (data.landingHighlightsEnabled !== undefined) setLandingHighlightsEnabled(data.landingHighlightsEnabled)
      if (data.urgencyCounterEnabled !== undefined) setUrgencyCounterEnabled(data.urgencyCounterEnabled)
      if (data.hideNormalNavigation !== undefined) setHideNormalNavigation(data.hideNormalNavigation)
      if (data.benefits !== undefined) setBenefits(data.benefits.map((b) => ({ ...b, icon: b.icon ?? "", description: b.description ?? "" })))
      if (data.faqItems !== undefined) setFaqItems(data.faqItems.map((f) => ({ ...f })))
      if (data.testimonials !== undefined) setTestimonialItems(data.testimonials.map((t) => ({ ...t, image: t.image ?? "" })))
      if (data.galleryImages !== undefined) setGalleryImageList(data.galleryImages.map((g) => ({ ...g })))
      if (data.landingGalleryLayout !== undefined) setLandingGalleryLayout(data.landingGalleryLayout ?? "grid")
      if (data.landingVariantSectionEnabled !== undefined) setLandingVariantSectionEnabled(data.landingVariantSectionEnabled)
      if (data.landingProductSummaryEnabled !== undefined) setLandingProductSummaryEnabled(data.landingProductSummaryEnabled)
      if (data.landingCheckoutTitle !== undefined) setLandingCheckoutTitle(data.landingCheckoutTitle ?? "")
      if (data.landingCheckoutSubtitle !== undefined) setLandingCheckoutSubtitle(data.landingCheckoutSubtitle ?? "")
      if (data.landingCheckoutCta !== undefined) setLandingCheckoutCta(data.landingCheckoutCta ?? "")
      if (data.landingSectionOrder !== undefined) setLandingSectionOrder(data.landingSectionOrder)
    },
    reset() {
      setPaymentOverrideEnabled(false)
      setPaymentRuleOverride("")
      setPaymentRuleValueOverride("")
      setOtpOverrideEnabled(false)
      setOtpOverride(false)
      setCouponOverrideEnabled(false)
      setAutoCouponCode("")
      setDeliveryOverrideEnabled(false)
      setDeliveryFeeOverride("")
      setQuantityLimit("")
      setCustomCta("")
      setCustomThankYouMessage("")
      setGalleryPrimaryImage("")
      setGallerySecondaryImage("")
      setGalleryTertiaryImage("")
      setGalleryVideoUrl("")
      setLandingOfferText("")
      setLandingDisplayPrice("")
      setLandingDisplayOldPrice("")
      setLandingGalleryEnabled(true)
      setLandingReviewsEnabled(true)
      setLandingFaqEnabled(true)
      setLandingHighlightsEnabled(true)
      setUrgencyCounterEnabled(false)
      setHideNormalNavigation(false)
      setBenefits([])
      setFaqItems([])
      setTestimonialItems([])
      setGalleryImageList([])
      setLandingGalleryLayout("grid")
      setLandingVariantSectionEnabled(true)
      setLandingProductSummaryEnabled(true)
      setLandingCheckoutTitle("")
      setLandingCheckoutSubtitle("")
      setLandingCheckoutCta("")
      setLandingSectionOrder(DEFAULT_SECTION_ORDER)
    },
  }))

  return (
    <div className="space-y-4">
      {/* Landing Media Gallery */}
      <div className="mt-8 border-t pt-6 space-y-4">
        <h4 className="text-sm font-semibold text-slate-700">Landing Media Gallery</h4>
        <p className="text-xs text-slate-500">Gallery images displayed on the landing page. Click thumbnail to preview full image.</p>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Primary image</Label>
            <LandingHeroImage image={galleryPrimaryImage} onChange={(url) => setGalleryPrimaryImage(url)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Secondary image</Label>
            <LandingHeroImage image={gallerySecondaryImage} onChange={(url) => setGallerySecondaryImage(url)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Tertiary image</Label>
            <LandingHeroImage image={galleryTertiaryImage} onChange={(url) => setGalleryTertiaryImage(url)} />
          </div>
        </div>

        <div className="rounded-lg border border-slate-200/60 p-3 space-y-2">
          <Label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Video</Label>
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <Input
                value={galleryVideoUrl}
                onChange={(e) => setGalleryVideoUrl(e.target.value)}
                placeholder="YouTube, Vimeo or direct video URL"
                className="h-8 text-xs"
              />
            </div>
            {galleryVideoUrl && (
              <div className="h-12 w-16 shrink-0 overflow-hidden rounded border bg-slate-100">
                <div className="flex h-full items-center justify-center text-[18px]">▶</div>
              </div>
            )}
          </div>
          <p className="text-[10px] text-slate-400">Embed URLs (YouTube/Vimeo) are preferred over direct video files.</p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Gallery Layout</Label>
          <Select value={landingGalleryLayout} onValueChange={(v) => setLandingGalleryLayout(v ?? "grid")}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Gallery layout" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="grid">Grid</SelectItem>
              <SelectItem value="stacked">Stacked</SelectItem>
              <SelectItem value="carousel">Carousel</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Landing Offer Display */}
      <div className="mt-8 border-t pt-6 space-y-4">
        <h4 className="text-sm font-semibold text-slate-700">Landing Offer Display</h4>
        <div className="space-y-1.5">
          <Label htmlFor="landingOfferText">Offer text</Label>
          <Input
            id="landingOfferText"
            value={landingOfferText}
            onChange={(e) => setLandingOfferText(e.target.value)}
            placeholder="e.g. 7 days return + COD available"
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="landingDisplayPrice">Landing display price</Label>
            <Input id="landingDisplayPrice" type="number" min={0} value={landingDisplayPrice} onChange={(e) => setLandingDisplayPrice(e.target.value)} placeholder="Defaults to product price" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="landingDisplayOldPrice">Landing compare price</Label>
            <Input id="landingDisplayOldPrice" type="number" min={0} value={landingDisplayOldPrice} onChange={(e) => setLandingDisplayOldPrice(e.target.value)} placeholder="Must be greater than display/current price" />
          </div>
        </div>
        <p className="text-[10px] text-slate-400">Checkout still validates and charges through the product/variant checkout API.</p>
      </div>

      {/* Checkout Overrides */}
      {showCheckoutOverrides && (
        <>
          <div className="mt-8 border-t pt-6 space-y-4">
            <h4 className="text-sm font-semibold text-slate-700">Payment Override</h4>
            <div className="space-y-1.5">
              <Label>Enable Payment Override</Label>
              <Switch checked={paymentOverrideEnabled} onCheckedChange={setPaymentOverrideEnabled} />
            </div>
            {paymentOverrideEnabled && (
              <>
                <div className="space-y-1.5">
                  <Label>Payment Rule</Label>
                  <Select value={paymentRuleOverride} onValueChange={(v) => v != null && setPaymentRuleOverride(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select rule">
                        {(value: string | null) => value ? (PAYMENT_RULE_LABELS[value as PaymentRuleType] ?? value) : "Select rule"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_RULE_VALUES.map((value) => (
                        <SelectItem key={value} value={value}>
                          {PAYMENT_RULE_LABELS[value]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Payment Value</Label>
                  <Input type="number" min={0} value={paymentRuleValueOverride} onChange={(e) => setPaymentRuleValueOverride(e.target.value)} />
                </div>
              </>
            )}
          </div>

          <div className="mt-4 border-t pt-4 space-y-4">
            <h4 className="text-sm font-semibold text-slate-700">OTP Override</h4>
            <div className="space-y-1.5">
              <Label>Enable OTP Override</Label>
              <Switch checked={otpOverrideEnabled} onCheckedChange={setOtpOverrideEnabled} />
            </div>
            {otpOverrideEnabled && (
              <div className="space-y-1.5">
                <Label>Require OTP</Label>
                <Switch checked={otpOverride} onCheckedChange={setOtpOverride} />
              </div>
            )}
          </div>

          <div className="mt-4 border-t pt-4 space-y-4">
            <h4 className="text-sm font-semibold text-slate-700">Coupon Override</h4>
            <div className="space-y-1.5">
              <Label>Enable Coupon Override</Label>
              <Switch checked={couponOverrideEnabled} onCheckedChange={setCouponOverrideEnabled} />
            </div>
            {couponOverrideEnabled && (
              <div className="space-y-1.5">
                <Label>Auto-Apply Coupon</Label>
                <Input value={autoCouponCode} onChange={(e) => setAutoCouponCode(e.target.value)} placeholder="e.g. SUMMER20" className="uppercase" />
              </div>
            )}
          </div>

          <div className="mt-4 border-t pt-4 space-y-4">
            <h4 className="text-sm font-semibold text-slate-700">Delivery Override</h4>
            <div className="space-y-1.5">
              <Label>Enable Delivery Override</Label>
              <Switch checked={deliveryOverrideEnabled} onCheckedChange={setDeliveryOverrideEnabled} />
            </div>
            {deliveryOverrideEnabled && (
              <div className="space-y-1.5">
                <Label>Delivery Fee Override</Label>
                <Input type="number" min={0} value={deliveryFeeOverride} onChange={(e) => setDeliveryFeeOverride(e.target.value)} />
              </div>
            )}
          </div>
        </>
      )}

      {/* Campaign Settings */}
      <div className="mt-8 border-t pt-6 space-y-6">
        <h4 className="text-sm font-semibold text-slate-700">Campaign Settings</h4>

        <div className="space-y-1.5">
          <Label>Quantity Limit</Label>
          <Input type="number" min={0} value={quantityLimit} onChange={(e) => setQuantityLimit(e.target.value)} placeholder="Max per order" />
        </div>
        <div className="space-y-1.5">
          <Label>Custom CTA</Label>
          <Input value={customCta} onChange={(e) => setCustomCta(e.target.value)} placeholder="e.g. Get Yours Now" />
        </div>
        <div className="space-y-1.5">
          <Label>Custom Thank You Message</Label>
          <Textarea value={customThankYouMessage} onChange={(e) => setCustomThankYouMessage(e.target.value)} placeholder="Post-purchase message" />
        </div>

        {/* Benefits */}
        <div className="border-t pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold text-slate-700">Benefits / Trust Blocks</h4>
              <p className="text-xs text-slate-500">Key selling points shown on the landing page.</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => setBenefits([...benefits, { icon: "", title: "", description: "", enabled: true, sortOrder: benefits.length }])} className="rounded-lg h-8 text-xs">
              + Add benefit
            </Button>
          </div>
          {benefits.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-4 text-center">
              <p className="text-xs text-slate-500">No benefits added yet.</p>
            </div>
          ) : (
            benefits.map((b, i) => (
              <div key={i} className="rounded-lg border border-slate-200/60 p-3 space-y-3">
                <div className="grid gap-2 md:grid-cols-[100px_1fr]">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Icon</Label>
                    <Input value={b.icon} onChange={(e) => { const next = [...benefits]; next[i] = { ...next[i], icon: e.target.value }; setBenefits(next); }} className="h-8 text-xs" placeholder="e.g. 🚀" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Title</Label>
                    <Input value={b.title} onChange={(e) => { const next = [...benefits]; next[i] = { ...next[i], title: e.target.value }; setBenefits(next); }} className="h-8 text-xs" placeholder="e.g. Free Shipping" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Description</Label>
                  <Textarea value={b.description} onChange={(e) => { const next = [...benefits]; next[i] = { ...next[i], description: e.target.value }; setBenefits(next); }} rows={2} className="text-xs" placeholder="Brief description of the benefit." />
                </div>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs text-slate-600">
                    <Switch checked={b.enabled} onCheckedChange={(v) => { const next = [...benefits]; next[i] = { ...next[i], enabled: v }; setBenefits(next); }} />
                    Enabled
                  </label>
                  <Button type="button" variant="ghost" size="sm" className="h-7 text-red-400 hover:text-red-600" onClick={() => setBenefits(benefits.filter((_, idx) => idx !== i))}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* FAQ */}
        <div className="border-t pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold text-slate-700">Landing FAQ</h4>
              <p className="text-xs text-slate-500">Frequently asked questions shown on the landing page.</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => setFaqItems([...faqItems, { question: "", answer: "", enabled: true, sortOrder: faqItems.length }])} className="rounded-lg h-8 text-xs">
              + Add FAQ
            </Button>
          </div>
          {faqItems.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-4 text-center">
              <p className="text-xs text-slate-500">No FAQ items added yet.</p>
            </div>
          ) : (
            faqItems.map((f, i) => (
              <div key={i} className="rounded-lg border border-slate-200/60 p-3 space-y-3">
                <div className="space-y-1">
                  <Label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Question</Label>
                  <Input value={f.question} onChange={(e) => { const next = [...faqItems]; next[i] = { ...next[i], question: e.target.value }; setFaqItems(next); }} className="h-8 text-xs" placeholder="e.g. How long does delivery take?" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Answer</Label>
                  <Textarea value={f.answer} onChange={(e) => { const next = [...faqItems]; next[i] = { ...next[i], answer: e.target.value }; setFaqItems(next); }} rows={2} className="text-xs" placeholder="e.g. Dhaka 1-2 working days." />
                </div>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs text-slate-600">
                    <Switch checked={f.enabled} onCheckedChange={(v) => { const next = [...faqItems]; next[i] = { ...next[i], enabled: v }; setFaqItems(next); }} />
                    Enabled
                  </label>
                  <Button type="button" variant="ghost" size="sm" className="h-7 text-red-400 hover:text-red-600" onClick={() => setFaqItems(faqItems.filter((_, idx) => idx !== i))}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Testimonials */}
        <div className="border-t pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold text-slate-700">Landing Testimonials</h4>
              <p className="text-xs text-slate-500">Landing-only reviews. They do not update the normal product review system.</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => setTestimonialItems([...testimonialItems, { name: "", rating: 5, text: "", image: "", enabled: true, sortOrder: testimonialItems.length }])} className="rounded-lg h-8 text-xs">
              + Add testimonial
            </Button>
          </div>
          {testimonialItems.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-4 text-center">
              <p className="text-xs text-slate-500">No testimonials added yet.</p>
            </div>
          ) : (
            testimonialItems.map((t, i) => (
              <div key={i} className="rounded-lg border border-slate-200/60 p-3 space-y-3">
                <div className="grid gap-2 md:grid-cols-[1fr_100px]">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Name</Label>
                    <Input value={t.name} onChange={(e) => { const next = [...testimonialItems]; next[i] = { ...next[i], name: e.target.value }; setTestimonialItems(next); }} className="h-8 text-xs" placeholder="Customer name" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Rating</Label>
                    <Select value={t.rating.toString()} onValueChange={(v) => { const next = [...testimonialItems]; next[i] = { ...next[i], rating: parseInt(v ?? "5") }; setTestimonialItems(next); }}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Rating" />
                      </SelectTrigger>
                      <SelectContent>
                        {[5, 4, 3, 2, 1].map((r) => (
                          <SelectItem key={r} value={r.toString()}>{r} star{r > 1 ? "s" : ""}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Review Text</Label>
                  <Textarea value={t.text} onChange={(e) => { const next = [...testimonialItems]; next[i] = { ...next[i], text: e.target.value }; setTestimonialItems(next); }} rows={2} className="text-xs" placeholder="What the customer said." />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Image URL</Label>
                  <Input value={t.image} onChange={(e) => { const next = [...testimonialItems]; next[i] = { ...next[i], image: e.target.value }; setTestimonialItems(next); }} className="h-8 text-xs" placeholder="https://..." />
                </div>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs text-slate-600">
                    <Switch checked={t.enabled} onCheckedChange={(v) => { const next = [...testimonialItems]; next[i] = { ...next[i], enabled: v }; setTestimonialItems(next); }} />
                    Enabled
                  </label>
                  <Button type="button" variant="ghost" size="sm" className="h-7 text-red-400 hover:text-red-600" onClick={() => setTestimonialItems(testimonialItems.filter((_, idx) => idx !== i))}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Gallery Images (Additional) */}
        <div className="border-t pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold text-slate-700">Gallery Images (Additional)</h4>
              <p className="text-xs text-slate-500">Extra images for the landing page gallery.</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => setGalleryImageList([...galleryImageList, { url: "", sortOrder: galleryImageList.length }])} className="rounded-lg h-8 text-xs">
              + Add image
            </Button>
          </div>
          {galleryImageList.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-4 text-center">
              <p className="text-xs text-slate-500">No additional gallery images.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {galleryImageList.map((g, i) => (
                <div key={g.id || i} className="space-y-1.5">
                  <div className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                    {g.url ? (
                      <img src={g.url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[10px] text-slate-400">Empty</div>
                    )}
                    <div className="absolute right-1 top-1 flex gap-1 opacity-0 transition group-hover:opacity-100">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 rounded-full bg-white/80 p-0 text-red-500 hover:bg-white hover:text-red-600"
                        onClick={() => setGalleryImageList(galleryImageList.filter((_, idx) => idx !== i))}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <LandingHeroImage image={g.url} onChange={(url) => {
                    const next = [...galleryImageList]
                    next[i] = { ...next[i], url }
                    setGalleryImageList(next)
                  }} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Checkout Section */}
        <div className="border-t pt-6 space-y-4">
          <h4 className="text-sm font-semibold text-slate-700">Checkout Section</h4>
          <p className="text-xs text-slate-500">Customize the checkout section on the landing page.</p>
          <div className="space-y-1.5">
            <Label>Checkout Title</Label>
            <Input value={landingCheckoutTitle} onChange={(e) => setLandingCheckoutTitle(e.target.value)} placeholder="e.g. Ready to Order?" />
          </div>
          <div className="space-y-1.5">
            <Label>Checkout Subtitle</Label>
            <Input value={landingCheckoutSubtitle} onChange={(e) => setLandingCheckoutSubtitle(e.target.value)} placeholder="e.g. Secure checkout with multiple payment options" />
          </div>
          <div className="space-y-1.5">
            <Label>Checkout CTA</Label>
            <Input value={landingCheckoutCta} onChange={(e) => setLandingCheckoutCta(e.target.value)} placeholder="e.g. Order Now" />
          </div>
        </div>

        {/* Section Order / Visibility */}
        <div className="border-t pt-6 space-y-4">
          <h4 className="text-sm font-semibold text-slate-700">Section Order / Visibility</h4>
          <p className="text-xs text-slate-500">Enable or disable sections and control their order on the landing page.</p>
          <div className="space-y-2">
            {landingSectionOrder.map((section, i) => (
              <div key={section.key} className="flex items-center justify-between rounded-lg border border-slate-200/60 p-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-slate-600 min-w-[20px]">{section.order + 1}.</span>
                  <span className="text-xs font-medium text-slate-700 capitalize">{section.key}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex flex-col gap-0.5">
                    <button
                      type="button"
                      disabled={i === 0}
                      onClick={() => {
                        const next = [...landingSectionOrder]
                        const temp = next[i]
                        next[i] = { ...next[i - 1], order: next[i - 1].order }
                        next[i - 1] = { ...temp, order: temp.order }
                        setLandingSectionOrder(next.map((s, idx) => ({ ...s, order: idx })))
                      }}
                      className="disabled:opacity-30 text-slate-400 hover:text-slate-600"
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                    </button>
                    <button
                      type="button"
                      disabled={i === landingSectionOrder.length - 1}
                      onClick={() => {
                        const next = [...landingSectionOrder]
                        const temp = next[i]
                        next[i] = { ...next[i + 1], order: next[i + 1].order }
                        next[i + 1] = { ...temp, order: temp.order }
                        setLandingSectionOrder(next.map((s, idx) => ({ ...s, order: idx })))
                      }}
                      className="disabled:opacity-30 text-slate-400 hover:text-slate-600"
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                  </div>
                  <Switch
                    checked={section.enabled}
                    onCheckedChange={(v) => {
                      const next = [...landingSectionOrder]
                      next[i] = { ...next[i], enabled: v }
                      setLandingSectionOrder(next)
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Toggles */}
        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-xs font-medium text-slate-700">
            Show gallery
            <Switch checked={landingGalleryEnabled} onCheckedChange={setLandingGalleryEnabled} />
          </label>
          <label className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-xs font-medium text-slate-700">
            Show testimonials
            <Switch checked={landingReviewsEnabled} onCheckedChange={setLandingReviewsEnabled} />
          </label>
          <label className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-xs font-medium text-slate-700">
            Show FAQ
            <Switch checked={landingFaqEnabled} onCheckedChange={setLandingFaqEnabled} />
          </label>
          <label className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-xs font-medium text-slate-700">
            Show highlights
            <Switch checked={landingHighlightsEnabled} onCheckedChange={setLandingHighlightsEnabled} />
          </label>
          <label className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-xs font-medium text-slate-700">
            Show variant section
            <Switch checked={landingVariantSectionEnabled} onCheckedChange={setLandingVariantSectionEnabled} />
          </label>
          <label className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-xs font-medium text-slate-700">
            Show product summary
            <Switch checked={landingProductSummaryEnabled} onCheckedChange={setLandingProductSummaryEnabled} />
          </label>
        </div>
        <div className="space-y-1.5">
          <Label>Urgency Counter</Label>
          <Switch checked={urgencyCounterEnabled} onCheckedChange={setUrgencyCounterEnabled} />
        </div>
        <div className="space-y-1.5">
          <Label>Hide Normal Navigation</Label>
          <Switch checked={hideNormalNavigation} onCheckedChange={setHideNormalNavigation} />
        </div>
      </div>
    </div>
  )
})

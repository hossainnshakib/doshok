"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import {
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  Save,
  SendHorizonal,
  Trash2,
  X,
} from "lucide-react"
import { AdminBackLink, AdminPageHeader, AdminSectionCard, AdminStatusBadge } from "@/components/admin/admin-ui"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { ImageUploader } from "@/components/admin/image-uploader"
import {
  LandingCampaignSettings,
  type LandingCampaignSettingsHandle,
  type LandingCampaignSettingsData,
} from "@/components/admin/landing-campaign-settings"
import {
  PAYMENT_RULE_LABELS,
  PAYMENT_RULE_VALUES,
  type PaymentRuleType,
} from "@/lib/checkout/payment-rule.service"

export default function EditLandingPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const campaignRef = useRef<LandingCampaignSettingsHandle>(null)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)

  // Product fields (read-only reference)
  const [productName, setProductName] = useState("")
  const [productSlug, setProductSlug] = useState("")
  const [productCategory, setProductCategory] = useState("")
  const [productStatus, setProductStatus] = useState("Draft")
  const [productPrice, setProductPrice] = useState(0)

  // Landing presentation fields
  const [landingHeadline, setLandingHeadline] = useState("")
  const [landingSubheadline, setLandingSubheadline] = useState("")
  const [landingCopy, setLandingCopy] = useState("")
  const [landingHeroImage, setLandingHeroImage] = useState("")
  const [cta, setCta] = useState("")
  const [status, setStatus] = useState("Draft")
  const [defaultCouponCode, setDefaultCouponCode] = useState("")

  // SEO
  const [seoTitle, setSeoTitle] = useState("")
  const [seoDescription, setSeoDescription] = useState("")
  const [seoKeywords, setSeoKeywords] = useState("")
  const [seoImage, setSeoImage] = useState("")

  // Payment rule override (landing-level)
  const [paymentRuleOverride, setPaymentRuleOverride] = useState("")
  const [paymentRuleValueOverride, setPaymentRuleValueOverride] = useState("")

  useEffect(() => {
    Promise.all([
      fetch("/api/products/" + id).then((r) => r.json()),
    ])
      .then(([prodData]) => {
        if (prodData.success) {
          const p = prodData.data
          setProductName(p.name ?? "")
          setProductSlug(p.slug ?? "")
          setProductCategory(p.category?.name ?? "")
          setProductStatus(p.status ?? "Draft")
          setProductPrice(p.price ?? 0)
          setLandingHeadline(p.landingHeadline ?? "")
          setLandingSubheadline(p.landingSubheadline ?? "")
          setLandingCopy(p.landingCopy ?? "")
          setLandingHeroImage(p.landingHeroImage ?? "")
          setCta(p.landingPageSetting?.customCta ?? "")
          setStatus(p.status ?? "Draft")
          setDefaultCouponCode(p.defaultCouponCode ?? "")
          setSeoTitle(p.seoTitle ?? "")
          setSeoDescription(p.seoDescription ?? "")
          setSeoKeywords(p.seoKeywords ?? "")
          setSeoImage(p.seoImage ?? "")
          setPaymentRuleOverride(p.paymentRuleOverride ?? "")
          setPaymentRuleValueOverride(p.paymentRuleValueOverride?.toString() ?? "")

          const ls = p.landingPageSetting
          if (ls && campaignRef.current) {
            campaignRef.current.setValue(ls as Parameters<LandingCampaignSettingsHandle["setValue"]>[0])
          }
        } else {
          toast.error("Failed to load landing page")
          router.push("/admin/landing-pages")
        }
        setFetching(false)
      })
      .catch(() => {
        toast.error("Failed to load landing page")
        setFetching(false)
      })
  }, [id, router])

  async function handleSave(publishStatus?: string) {
    setLoading(true)
    try {
      const campaignVals = campaignRef.current?.getValue() ?? ({} as LandingCampaignSettingsData)
      const statusToSave = publishStatus || status

      const body: Record<string, unknown> = {
        status: statusToSave,
        landingHeadline: landingHeadline || undefined,
        landingSubheadline: landingSubheadline || undefined,
        landingCopy: landingCopy || undefined,
        landingHeroImage: landingHeroImage || undefined,
        seoTitle: seoTitle || undefined,
        seoDescription: seoDescription || undefined,
        seoKeywords: seoKeywords || undefined,
        seoImage: seoImage || undefined,
        defaultCouponCode: defaultCouponCode?.toUpperCase() || undefined,
        paymentRuleOverride: paymentRuleOverride || null,
        paymentRuleValueOverride: paymentRuleValueOverride ? parseInt(paymentRuleValueOverride) : null,
        landingPageSetting: {
          ...campaignVals,
          customCta: cta || null,
        },
      }

      const response = await fetch(`/api/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await response.json()
      if (data.success) {
        setStatus(statusToSave)
        toast.success(
          statusToSave === "Draft"
            ? "Landing page saved as draft"
            : statusToSave === "Active"
              ? "Landing page published"
              : "Landing page saved"
        )
        router.refresh()
      } else {
        toast.error(data.error ?? "Failed to save")
      }
    } catch {
      toast.error("Failed to save landing page")
    } finally {
      setLoading(false)
    }
  }

  if (fetching) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-slate-400">Loading...</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl space-y-5">
      <AdminPageHeader
        eyebrow="Commerce"
        title="Edit Landing Page"
        description="Manage landing page content, media, and campaign settings."
        backHref="/admin/landing-pages"
      />
      <AdminBackLink href="/admin/landing-pages" label="Back to Landing Pages" />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_300px] lg:gap-6">
        <div className="space-y-5">
          {/* Product Reference Card */}
          <AdminSectionCard title="Product Reference">
            <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50/50 p-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-700">{productName}</span>
                  <AdminStatusBadge status={productStatus} />
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  /{productSlug} · {productCategory} · ৳{productPrice.toLocaleString()}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-600">
                    Landing Page
                  </span>
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                    pageType: LANDING
                  </span>
                  <span className="text-[10px] text-slate-400">(read-only — type cannot be changed)</span>
                </div>
              </div>
              <Link
                href={`/l/${productSlug}?preview=1`}
                target="_blank"
                className="inline-flex items-center gap-1 rounded-md text-[11px] font-semibold h-7 px-2.5 text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Preview
              </Link>
            </div>
          </AdminSectionCard>

          {/* Landing Presentation */}
          <AdminSectionCard title="Landing Presentation">
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={(v) => v && setStatus(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Draft">Draft</SelectItem>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Hidden">Hidden</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>CTA label</Label>
                  <Input value={cta} onChange={(e) => setCta(e.target.value)} placeholder="এখনই অর্ডার করুন" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Headline</Label>
                <Input value={landingHeadline} onChange={(e) => setLandingHeadline(e.target.value)} placeholder="Landing headline" />
              </div>
              <div className="space-y-1.5">
                <Label>Subheadline</Label>
                <Input value={landingSubheadline} onChange={(e) => setLandingSubheadline(e.target.value)} placeholder="Short sales promise" />
              </div>
              <div className="space-y-1.5">
                <Label>Copy</Label>
                <Textarea rows={4} value={landingCopy} onChange={(e) => setLandingCopy(e.target.value)} placeholder="Landing copy for this campaign." />
              </div>
              <div className="space-y-2">
                <Label>Hero image</Label>
                <ImageUploader
                  images={landingHeroImage ? [landingHeroImage] : []}
                  onChange={(next) => setLandingHeroImage(next[0] || "")}
                  single
                  label=""
                  helperText="Main hero image for the landing page."
                  folder="landing"
                />
              </div>
            </div>
          </AdminSectionCard>

          {/* Checkout & Payment Override */}
          <AdminSectionCard title="Checkout & Payment Override">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Payment Rule Override</Label>
                <Select value={paymentRuleOverride} onValueChange={(v) => v != null && setPaymentRuleOverride(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Default">
                      {(value: string | null) => value ? (PAYMENT_RULE_LABELS[value as PaymentRuleType] ?? value) : "Default"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_RULE_VALUES.map((value) => (
                      <SelectItem key={value} value={value}>{PAYMENT_RULE_LABELS[value]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Payment Rule Value</Label>
                <Input type="number" min={0} value={paymentRuleValueOverride} onChange={(e) => setPaymentRuleValueOverride(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Default coupon code</Label>
                <Input value={defaultCouponCode} onChange={(e) => setDefaultCouponCode(e.target.value)} placeholder="WELCOME10" className="uppercase max-w-xs text-xs" />
              </div>
            </div>
          </AdminSectionCard>

          {/* Landing Campaign Settings — Media, Benefits, FAQ, Testimonials, Section Order */}
          <AdminSectionCard title="Landing Campaign Settings">
            <LandingCampaignSettings ref={campaignRef} showCheckoutOverrides />
          </AdminSectionCard>

          {/* SEO */}
          <AdminSectionCard title="SEO">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>SEO Title</Label>
                <Input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} placeholder="Custom title for search engines" />
              </div>
              <div className="space-y-1.5">
                <Label>SEO Description</Label>
                <Textarea value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} rows={2} placeholder="Meta description for search results" />
              </div>
              <div className="space-y-1.5">
                <Label>SEO Keywords</Label>
                <Input value={seoKeywords} onChange={(e) => setSeoKeywords(e.target.value)} placeholder="keyword1, keyword2, keyword3" />
              </div>
              <div className="space-y-2">
                <Label>SEO Image</Label>
                <ImageUploader
                  images={seoImage ? [seoImage] : []}
                  onChange={(imgs) => setSeoImage(imgs[0] || "")}
                  single
                  label=""
                  helperText="Image shown when the landing page is shared on social media."
                  folder="landing"
                />
              </div>
            </div>
          </AdminSectionCard>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="sticky top-6 space-y-4">
            <div className="rounded-xl border border-slate-200/60 bg-white p-4 shadow-sm">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Summary</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Product</span>
                  <span className="font-medium text-slate-700 text-right max-w-[130px] truncate">{productName || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">URL</span>
                  <span className="font-mono text-[10px] text-right max-w-[130px] truncate">/l/{productSlug}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Status</span>
                  <span><AdminStatusBadge status={status} /></span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Price</span>
                  <span className="font-semibold tabular-nums text-slate-800">{productPrice ? `৳${productPrice.toLocaleString()}` : "—"}</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200/60 bg-white p-4 shadow-sm">
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-3">Publish</h3>
              <div className="space-y-2">
                <Button
                  type="button"
                  disabled={loading}
                  onClick={() => handleSave("Draft")}
                  variant={status === "Draft" ? "default" : "outline"}
                  className="w-full h-9 rounded-lg justify-start gap-2 text-xs font-semibold"
                >
                  <Save className="h-3.5 w-3.5" /> Save Draft
                </Button>
                <Button
                  type="button"
                  disabled={loading}
                  onClick={() => handleSave("Active")}
                  className="w-full h-9 rounded-lg justify-start gap-2 text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white"
                >
                  <SendHorizonal className="h-3.5 w-3.5" /> Publish
                </Button>
                <Button
                  type="button"
                  disabled={loading}
                  onClick={() => handleSave("Hidden")}
                  variant="secondary"
                  className="w-full h-9 rounded-lg justify-start gap-2 text-xs font-semibold"
                >
                  <EyeOff className="h-3.5 w-3.5" /> Hide
                </Button>
              </div>
            </div>

            {productSlug && (
              <Link
                href={`/l/${productSlug}?preview=1`}
                target="_blank"
                className="inline-flex items-center justify-center gap-2 w-full h-9 rounded-lg border border-slate-200/60 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Preview Landing Page
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

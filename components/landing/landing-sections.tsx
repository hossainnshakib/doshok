"use client"

import Link from "next/link"
import Image from "next/image"
import {
  CreditCard,
  PackageCheck,
  ShieldCheck,
  Truck,
} from "lucide-react"
import { parseSectionContent } from "@/lib/landing-pages/section-schemas"
import type {
  CheckoutContent,
  FaqContent,
  HeroContent,
  ProductsContent,
  ResolvedOffer,
  ResolvedReview,
  ReviewsContent,
} from "@/lib/landing-pages/types"
import { cn } from "@/lib/utils"
import { FaqCompact } from "./faq-accordion"
import { LandingPageProvider } from "./landing-page-state"
import { CheckoutSection } from "./landing-checkout"
import { ProductSelector } from "./product-selector"

// ---------------------------------------------------------------------------
// Data shapes (as selected by the public page query)
// ---------------------------------------------------------------------------

export type PublicLandingItem = {
  id: string
  name: string
  description: string | null
  shortDescription: string | null
  price: number
  compareAtPrice: number | null
  images: string[]
  sku: string | null
  ctaLabel: string | null
  active: boolean
  isPrimary: boolean
  stock: number
  reservedStock: number
  sortOrder: number
  displayTitle: string | null
  displayDescription: string | null
  displayImage: string | null
  variants: { id: string; name: string; size: string | null; color: string | null; colorHex: string | null; stock: number; reservedStock: number; active: boolean }[]
}

export type PublicSection = {
  id: string
  type: string
  enabled: boolean
  sortOrder: number
  content: unknown
}

export type PublicReviewRef = {
  id: string
  rating: number
  title: string | null
  content: string
  isVerifiedBuyer: boolean
  user: { name: string | null } | null
  product: { name: string }
}

// ---------------------------------------------------------------------------
// HERO — Product hero matching prototype layout
// ---------------------------------------------------------------------------

function resolveHeroImages(
  content: HeroContent,
  items: PublicLandingItem[]
): { url: string; alt: string }[] {
  if (content.media.length > 0) {
    return content.media.map((m) => ({ url: m.url, alt: m.alt || "" }))
  }
  const images: { url: string; alt: string }[] = []
  for (const item of items.slice(0, 3)) {
    const img = item.displayImage || item.images[0]
    if (img) {
      images.push({ url: img, alt: item.displayTitle || item.name })
    }
  }
  return images
}

function HeroSection({ content, items }: { content: HeroContent; items: PublicLandingItem[] }) {
  const resolvedImages = resolveHeroImages(content, items)
  const mainItem = items[0]
  if (!mainItem) return null

  const itemName = mainItem.displayTitle?.trim() || mainItem.name
  const tagline = content.description || mainItem.shortDescription || mainItem.description || ""
  const hasOldPrice = mainItem.compareAtPrice && mainItem.compareAtPrice > mainItem.price

  return (
    <section className="bg-white">
      <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-4 md:py-8 lg:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12 items-start">
          {/* Left: Images */}
          {resolvedImages.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="relative overflow-hidden rounded-sm border border-stone-100">
                <Image
                  src={resolvedImages[0].url}
                  alt={resolvedImages[0].alt || itemName}
                  width={900}
                  height={900}
                  priority
                  className="w-full aspect-[3/4] md:aspect-[4/5] max-h-[480px] md:max-h-[560px] object-cover"
                />
                {hasOldPrice && (
                  <span className="absolute top-3 left-3 bg-red-600 text-white text-[11px] font-bold px-2.5 py-1 tracking-wide">
                    SAVE ৳{(mainItem.compareAtPrice! - mainItem.price).toLocaleString()}
                  </span>
                )}
              </div>
              {resolvedImages.length > 1 && (
                <div className="flex gap-1.5">
                  {resolvedImages.slice(0, 3).map((m, i) => (
                    <div
                      key={`${m.url}-${i}`}
                      className={cn(
                        "flex-1 aspect-square overflow-hidden rounded-sm border",
                        i === 0 ? "border-stone-900" : "border-stone-200 opacity-60"
                      )}
                    >
                      <Image
                        src={m.url}
                        alt={m.alt || `${itemName} ${i + 1}`}
                        width={200}
                        height={200}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Right: Info */}
          <div className="lg:sticky lg:top-20 lg:pt-4">
            {content.eyebrow && (
              <p className="text-[11px] tracking-[0.2em] uppercase text-stone-400 mb-1.5">
                {content.eyebrow}
              </p>
            )}
            <h1 className="text-3xl md:text-4xl lg:text-[2.6rem] font-bold text-stone-900 leading-[1.1] mb-2">
              {content.headline || itemName}
            </h1>
            {tagline && (
              <p className="text-stone-500 text-sm leading-relaxed mb-4 max-w-md">{tagline}</p>
            )}

            <div className="flex items-baseline gap-3 mb-4">
              <span className="text-2xl md:text-3xl font-bold text-stone-900">
                ৳{mainItem.price.toLocaleString()}
              </span>
              {hasOldPrice && (
                <span className="text-sm text-stone-400 line-through">
                  ৳{mainItem.compareAtPrice!.toLocaleString()}
                </span>
              )}
            </div>

            {/* Item details from displayDescription or description */}
            {(mainItem.displayDescription || mainItem.description) && (
              <ul className="space-y-1.5 mb-5">
                {(mainItem.displayDescription || mainItem.description || "")
                  .split("\n")
                  .filter(Boolean)
                  .slice(0, 5)
                  .map((d) => (
                    <li key={d} className="flex items-start gap-2 text-[13px] text-stone-600">
                      <ShieldCheck className="w-3.5 h-3.5 text-stone-400 mt-0.5 shrink-0" />
                      {d.trim()}
                    </li>
                  ))}
              </ul>
            )}

            <div className="flex items-center gap-4 text-xs text-stone-400 mb-5">
              <span className="flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5" /> Cash on Delivery
              </span>
              <span className="flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5" /> 3–5 day delivery
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// TRUST — Compact trust block matching prototype
// ---------------------------------------------------------------------------

function TrustSection() {
  return (
    <section className="bg-white border-b border-stone-200">
      <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-4 md:py-5">
        <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-8">
          <div className="flex items-center gap-4 text-xs text-stone-500">
            <span className="flex items-center gap-1">
              <CreditCard className="w-3.5 h-3.5 text-stone-400" /> Cash on Delivery
            </span>
            <span className="flex items-center gap-1">
              <Truck className="w-3.5 h-3.5 text-stone-400" /> Nationwide Delivery
            </span>
            <span className="flex items-center gap-1">
              <PackageCheck className="w-3.5 h-3.5 text-stone-400" /> Quality Checked
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// REVIEWS — Compact inline review (prototype style)
// ---------------------------------------------------------------------------

function ReviewsInline({ content, liveReviews }: { content: ReviewsContent; liveReviews: Map<string, PublicReviewRef> }) {
  const resolved: ResolvedReview[] = []
  for (const item of content.items) {
    if (item.kind === "custom") {
      resolved.push({
        id: item.id,
        kind: "custom",
        customerName: item.customerName,
        rating: item.rating,
        text: item.text,
        image: item.image || null,
        verified: false,
        productName: null,
      })
    } else {
      const live = liveReviews.get(item.reviewId)
      if (!live) continue
      resolved.push({
        id: item.id,
        kind: "reference",
        customerName: live.user?.name ?? "Customer",
        rating: live.rating,
        text: live.title ? `${live.title} — ${live.content}` : live.content,
        image: null,
        verified: live.isVerifiedBuyer,
        productName: live.product.name,
      })
    }
  }
  if (resolved.length === 0) return null

  const first = resolved[0]
  return (
    <section className="bg-white border-b border-stone-200">
      <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-4 md:py-5">
        <div className="mt-3 pt-3 border-t border-stone-100">
          <p className="text-[13px] text-stone-600 italic leading-relaxed">&ldquo;{first.text}&rdquo;</p>
          <p className="text-[11px] text-stone-400 mt-1">— {first.customerName}, verified buyer</p>
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// FAQ — Compact accordion matching prototype
// ---------------------------------------------------------------------------

function FaqSection({ content }: { content: FaqContent }) {
  if (content.items.length === 0) return null
  return (
    <FaqCompact
      heading={content.heading || "Common Questions"}
      items={content.items.map((item) => ({
        id: item.id,
        question: item.question,
        answer: item.answer,
      }))}
    />
  )
}

// ---------------------------------------------------------------------------
// Page view: compact prototype layout
// ---------------------------------------------------------------------------

export function LandingPageView({
  pageId,
  title,
  sections,
  items,
  liveReviews,
  isPreview,
  previewStatus,
}: {
  pageId: string
  title: string
  sections: PublicSection[]
  items: PublicLandingItem[]
  offers: ResolvedOffer[]
  liveReviews: Map<string, PublicReviewRef>
  isPreview: boolean
  previewStatus: string
}) {
  const ordered = [...sections].sort((a, b) => a.sortOrder - b.sortOrder).filter((s) => s.enabled)
  const defaultItemIds = items.length > 0 ? [items[0].id] : []

  // Parse sections
  const heroContent = ordered.find((s) => s.type === "HERO")
    ? parseSectionContent<HeroContent>("HERO", ordered.find((s) => s.type === "HERO")!.content)
    : null
  const productsContent = ordered.find((s) => s.type === "PRODUCTS")
    ? parseSectionContent<ProductsContent>("PRODUCTS", ordered.find((s) => s.type === "PRODUCTS")!.content)
    : null
  const checkoutContent = ordered.find((s) => s.type === "CHECKOUT")
    ? parseSectionContent<CheckoutContent>("CHECKOUT", ordered.find((s) => s.type === "CHECKOUT")!.content)
    : null
  const faqContent = ordered.find((s) => s.type === "FAQ")
    ? parseSectionContent<FaqContent>("FAQ", ordered.find((s) => s.type === "FAQ")!.content)
    : null
  const reviewsContent = ordered.find((s) => s.type === "REVIEWS")
    ? parseSectionContent<ReviewsContent>("REVIEWS", ordered.find((s) => s.type === "REVIEWS")!.content)
    : null

  const scrollToCheckout = () => {
    document.getElementById("lp-checkout")?.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Preview banner */}
      {isPreview && (
        <div className="bg-amber-400 px-4 py-2 text-center text-xs font-bold uppercase tracking-widest text-amber-950">
          {previewStatus === "published" ? "Admin preview" : `Preview — this page is ${previewStatus} and not public`}
        </div>
      )}

      <LandingPageProvider defaultItemIds={defaultItemIds}>
        {/* 1. Minimal Header */}
        <Header onOrder={scrollToCheckout} />

        {/* 2. Product Hero */}
        {heroContent && <HeroSection content={heroContent} items={items} />}

        {/* 3. Product Selection — Add More & Save */}
        {items.length > 0 ? (
          <div id="lp-products" className="scroll-mt-16">
            <ProductSelector
              items={items}
              heading={productsContent?.heading || "Add More & Save"}
              subheading={productsContent?.subheading || "Select your favourites — better set pricing applies automatically."}
              showPrice={productsContent?.showPrice ?? true}
              onContinue={scrollToCheckout}
            />
          </div>
        ) : (
          <section className="bg-stone-50 border-y border-stone-200">
            <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-8 text-center">
              <p className="text-sm text-stone-400">Products coming soon. Check back later.</p>
            </div>
          </section>
        )}

        {/* 4. Compact Trust */}
        <TrustSection />

        {/* Reviews inline */}
        {reviewsContent && (
          <ReviewsInline content={reviewsContent} liveReviews={liveReviews} />
        )}

        {/* 5. Inline Checkout */}
        <div id="lp-checkout" className="scroll-mt-16">
          {checkoutContent && (
            <CheckoutSection
              pageId={pageId}
              content={checkoutContent}
              items={items}
              isPreview={isPreview}
            />
          )}
        </div>

        {/* 6. Compact FAQ */}
        {faqContent && <FaqSection content={faqContent} />}

        {/* 7. Minimal Footer */}
        <MinimalFooter title={title} />
      </LandingPageProvider>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Minimal Header (prototype style)
// ---------------------------------------------------------------------------

function Header({ onOrder }: { onOrder: () => void }) {
  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-stone-200/60">
      <div className="max-w-[1280px] mx-auto px-4 md:px-8 h-14 flex items-center justify-between">
        <Link href="/" className="text-lg md:text-xl font-bold tracking-[0.15em] text-stone-900">
          DOSHOK
        </Link>
        <button
          onClick={onOrder}
          className="bg-stone-900 text-white text-xs font-semibold px-4 py-2 md:px-5 md:py-2.5 tracking-wide uppercase hover:bg-stone-800 transition-colors"
        >
          Order Now
        </button>
      </div>
    </header>
  )
}

// ---------------------------------------------------------------------------
// Minimal Footer (prototype style)
// ---------------------------------------------------------------------------

function MinimalFooter({ title }: { title: string }) {
  return (
    <footer className="bg-stone-950 text-white py-6">
      <div className="max-w-[1280px] mx-auto px-4 md:px-8 text-center">
        <Link href="/" className="text-sm tracking-[0.2em] font-bold">DOSHOK</Link>
        <p className="text-[11px] text-stone-500 mt-1.5">&copy; {new Date().getFullYear()} {title} · doshok.com</p>
      </div>
    </footer>
  )
}

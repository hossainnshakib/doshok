import Link from "next/link"
import Image from "next/image"
import {
  BadgeCheck,
  CreditCard,
  Headset,
  Leaf,
  PackageCheck,
  RefreshCcw,
  Ruler,
  ShieldCheck,
  Sparkles,
  Star,
  Truck,
  Zap,
  type LucideIcon,
} from "lucide-react"
import { parseSectionContent } from "@/lib/landing-pages/section-schemas"
import type {
  BenefitIcon,
  BenefitsContent,
  CheckoutContent,
  FaqContent,
  GalleryContent,
  HeroContent,
  HeroCta,
  OffersContent,
  ProductsContent,
  ResolvedOffer,
  ResolvedReview,
  ReviewsContent,
} from "@/lib/landing-pages/types"
import { cn } from "@/lib/utils"
import { OfferSelector } from "./offer-selector"
import { FaqAccordion } from "./faq-accordion"
import { LandingPageProvider } from "./landing-page-state"
import { CheckoutSection } from "./landing-checkout"

// ---------------------------------------------------------------------------
// Data shapes (as selected by the public page query)
// ---------------------------------------------------------------------------

export type PublicProductLink = {
  displayTitle: string | null
  displayDescription: string | null
  displayImage: string | null
  ctaLabel: string | null
  sortOrder: number
  product: {
    name: string
    slug: string
    images: string[]
    price: number
    oldPrice: number | null
    status: string
    shortDescription: string | null
    description: string | null
    variants: { stock: number; reservedStock: number }[]
  }
}

export type PublicSection = {
  id: string
  type: string
  enabled: boolean
  sortOrder: number
  content: unknown
}

// Live approved product review backing a "reference" review entry.
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
// Shared helpers
// ---------------------------------------------------------------------------

const BENEFIT_ICON_MAP: Record<BenefitIcon, LucideIcon> = {
  truck: Truck,
  shield: ShieldCheck,
  refresh: RefreshCcw,
  badge: BadgeCheck,
  sparkles: Sparkles,
  leaf: Leaf,
  ruler: Ruler,
  card: CreditCard,
  headset: Headset,
  package: PackageCheck,
  star: Star,
  zap: Zap,
}

function availableStock(variants: { stock: number; reservedStock: number }[]): number {
  return variants.reduce((sum, v) => sum + Math.max(0, v.stock - v.reservedStock), 0)
}

function truncate(text: string, max: number): string {
  const v = text.trim()
  return v.length > max ? `${v.slice(0, max).trimEnd()}…` : v
}

function resolveCtaHref(cta: HeroCta, linkedSlugs: Set<string>): string | null {
  switch (cta.target) {
    case "products":
      return "#lp-products"
    case "checkout":
      return "#lp-checkout"
    case "product":
      return cta.productSlug && linkedSlugs.has(cta.productSlug) ? `/products/${cta.productSlug}` : null
    case "custom":
      return cta.customPath && cta.customPath.startsWith("/") && !cta.customPath.startsWith("//")
        ? cta.customPath
        : null
    default:
      return null
  }
}

function CtaButton({ cta, links, variant }: { cta: HeroCta; links: Set<string>; variant: "primary" | "secondary" }) {
  const href = resolveCtaHref(cta, links) ?? (variant === "primary" ? "#lp-products" : null)
  if (!href || !cta.label.trim()) return null
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-11 items-center justify-center rounded-xl px-6 text-sm font-semibold transition",
        variant === "primary"
          ? "bg-slate-900 text-white hover:bg-slate-700"
          : "border border-slate-300 text-slate-800 hover:border-slate-500"
      )}
    >
      {cta.label.trim()}
    </Link>
  )
}

// ---------------------------------------------------------------------------
// HERO
// ---------------------------------------------------------------------------

function HeroMedia({ media, title, linkedSlugs }: { media: HeroContent["media"]; title: string; linkedSlugs: Set<string> }) {
  if (media.length === 0) return null
  const renderImg = (m: (typeof media)[number], i: number, cls: string, eager: boolean) => {
    const img = (
      <Image
        src={m.url}
        alt={m.alt || `${title} ${i + 1}`}
        width={900}
        height={900}
        sizes="(max-width: 768px) 100vw, 50vw"
        priority={eager}
        className={cn("h-full w-full object-cover", cls)}
      />
    )
    const slug = m.productSlug && linkedSlugs.has(m.productSlug) ? m.productSlug : null
    return slug ? (
      <Link key={`${m.url}-${i}`} href={`/products/${slug}`} className="block h-full w-full" aria-label={`View ${title}`}>
        {img}
      </Link>
    ) : (
      <span key={`${m.url}-${i}`} className="block h-full w-full">{img}</span>
    )
  }

  if (media.length === 1) {
    return <div className="overflow-hidden rounded-2xl border border-slate-100 aspect-[4/3]">{renderImg(media[0], 0, "", true)}</div>
  }
  if (media.length === 2) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {media.map((m, i) => (
          <div key={`${m.url}-${i}`} className="overflow-hidden rounded-2xl border border-slate-100 aspect-[3/4]">{renderImg(m, i, "", i === 0)}</div>
        ))}
      </div>
    )
  }
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="overflow-hidden rounded-2xl border border-slate-100 aspect-[3/4] row-span-2">{renderImg(media[0], 0, "", true)}</div>
      <div className="overflow-hidden rounded-2xl border border-slate-100 aspect-[3/4]">{renderImg(media[1], 1, "", false)}</div>
      <div className="overflow-hidden rounded-2xl border border-slate-100 aspect-[3/4]">{renderImg(media[2], 2, "", false)}</div>
    </div>
  )
}

function HeroSection({ content, links }: { content: HeroContent; links: PublicProductLink[] }) {
  const linkedSlugs = new Set(links.map((l) => l.product.slug))
  const hasCopy = content.eyebrow || content.headline || content.subheadline || content.description
  if (!hasCopy && content.media.length === 0) return null

  const firstPrice = links[0]?.product.price

  const copy = (
    <div className="min-w-0">
      {content.eyebrow && (
        <p className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-600">
          {content.eyebrow}
        </p>
      )}
      {content.headline && (
        <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">{content.headline}</h1>
      )}
      {content.subheadline && <p className="mt-2 text-lg font-medium text-slate-600">{content.subheadline}</p>}
      {content.description && <p className="mt-3 text-sm leading-relaxed text-slate-500">{content.description}</p>}
      {content.showPrice && firstPrice !== undefined && (
        <p className="mt-4 text-2xl font-bold tabular-nums">৳{firstPrice.toLocaleString()}</p>
      )}
      <div className="mt-6 flex flex-wrap gap-3">
        <CtaButton cta={content.primaryCta} links={linkedSlugs} variant="primary" />
        {content.secondaryCta && <CtaButton cta={content.secondaryCta} links={linkedSlugs} variant="secondary" />}
      </div>
      {content.trustLine && <p className="mt-4 text-xs text-slate-400">{content.trustLine}</p>}
    </div>
  )

  const media = <HeroMedia media={content.media} title={content.headline || "Landing"} linkedSlugs={linkedSlugs} />

  if (content.layout === "centered") {
    return (
      <section aria-label="Hero" className="text-center">
        <div className="mx-auto max-w-2xl">{copy}</div>
        {content.media.length > 0 && <div className="mx-auto mt-8 max-w-2xl">{media}</div>}
      </section>
    )
  }
  if (content.layout === "media-first") {
    return (
      <section aria-label="Hero">
        {content.media.length > 0 && <div className="mx-auto max-w-2xl">{media}</div>}
        <div className="mx-auto mt-8 max-w-2xl text-center">{copy}</div>
      </section>
    )
  }
  // split
  return (
    <section aria-label="Hero" className="grid items-center gap-8 md:grid-cols-2">
      {copy}
      {content.media.length > 0 ? media : null}
    </section>
  )
}

// ---------------------------------------------------------------------------
// BENEFITS
// ---------------------------------------------------------------------------

function BenefitsSection({ content }: { content: BenefitsContent }) {
  if (content.items.length === 0) return null
  const cols = content.items.length <= 2 ? "sm:grid-cols-2" : content.items.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-4"
  return (
    <section aria-label={content.heading || "Benefits"} className="mt-14">
      {(content.heading || content.subheading) && (
        <div className="text-center">
          {content.heading && <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{content.heading}</h2>}
          {content.subheading && <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">{content.subheading}</p>}
        </div>
      )}
      <ul className={cn("mt-6 grid gap-3", cols)}>
        {content.items.map((item) => {
          const Icon = BENEFIT_ICON_MAP[item.icon] ?? BadgeCheck
          return (
            <li key={item.id} className="rounded-2xl border border-slate-200 p-4">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-slate-900 text-white">
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <p className="mt-3 text-sm font-semibold">{item.title}</p>
              {item.description && <p className="mt-1 text-xs leading-relaxed text-slate-500">{item.description}</p>}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

// ---------------------------------------------------------------------------
// PRODUCTS
// ---------------------------------------------------------------------------

function ProductsSection({ content, links }: { content: ProductsContent; links: PublicProductLink[] }) {
  const active = links.filter((l) => l.product.status === "Active")
  if (active.length === 0) return null
  return (
    <section aria-label={content.heading || "Products"} id="lp-products" className="mt-14 scroll-mt-6">
      <div className="text-center">
        <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{content.heading || "Featured Products"}</h2>
        {content.subheading && <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">{content.subheading}</p>}
      </div>
      <div className="mt-6 space-y-3">
        {active.map((lp) => {
          const p = lp.product
          const stock = availableStock(p.variants)
          const label = lp.ctaLabel?.trim() || content.ctaLabel.trim() || "View"
          return (
            <article key={`${p.slug}-${lp.sortOrder}`} className="flex items-center gap-4 rounded-2xl border border-slate-200 p-4">
              {(lp.displayImage || p.images[0]) ? (
                <Image
                  src={lp.displayImage || p.images[0]}
                  alt={lp.displayTitle || p.name}
                  width={72}
                  height={72}
                  className="h-[72px] w-[72px] shrink-0 rounded-xl object-cover"
                />
              ) : (
                <span className="grid h-[72px] w-[72px] shrink-0 place-items-center rounded-xl bg-slate-100 text-lg font-bold text-slate-300" aria-hidden>D</span>
              )}
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-semibold">{lp.displayTitle?.trim() || p.name}</h3>
                {(lp.displayDescription || p.shortDescription || p.description) && (
                  <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">
                    {truncate(lp.displayDescription?.trim() || p.shortDescription?.trim() || p.description?.trim() || "", 160)}
                  </p>
                )}
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  {content.showPrice && (
                    <p className="text-sm font-bold tabular-nums">
                      ৳{p.price.toLocaleString()}
                      {content.showOldPrice && p.oldPrice && p.oldPrice > p.price && (
                        <span className="ml-2 text-xs font-medium text-slate-400 line-through">৳{p.oldPrice.toLocaleString()}</span>
                      )}
                    </p>
                  )}
                  {content.showStock && (
                    <span className={cn(
                      "text-[11px] font-semibold",
                      stock <= 0 ? "text-slate-400" : stock <= 5 ? "text-amber-600" : "text-emerald-600"
                    )}>
                      {stock <= 0 ? "Out of stock" : stock <= 5 ? `Only ${stock} left` : "In stock"}
                    </span>
                  )}
                </div>
              </div>
              <Link
                href={`/products/${p.slug}`}
                className="inline-flex h-9 shrink-0 items-center rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white transition hover:bg-slate-700"
              >
                {label}
              </Link>
            </article>
          )
        })}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// GALLERY
// ---------------------------------------------------------------------------

function GallerySection({ content }: { content: GalleryContent }) {
  if (content.items.length === 0) return null
  return (
    <section aria-label={content.heading || "Gallery"} className="mt-14">
      {(content.heading || content.subheading) && (
        <div className="text-center">
          {content.heading && <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{content.heading}</h2>}
          {content.subheading && <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">{content.subheading}</p>}
        </div>
      )}
      {content.layout === "editorial" ? (
        <div className="mt-6 grid grid-cols-2 gap-3">
          {content.items.map((item, i) => (
            <figure key={`${item.url}-${i}`} className={cn("overflow-hidden rounded-2xl border border-slate-100", i % 3 === 0 ? "col-span-2 aspect-[16/9]" : "aspect-square")}>
              <Image src={item.url} alt={item.alt || `Gallery image ${i + 1}`} width={900} height={700} sizes="(max-width: 768px) 100vw, 50vw" className="h-full w-full object-cover" loading="lazy" />
              {item.caption && <figcaption className="px-3 py-2 text-[11px] text-slate-500">{item.caption}</figcaption>}
            </figure>
          ))}
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {content.items.map((item, i) => (
            <figure key={`${item.url}-${i}`} className="overflow-hidden rounded-2xl border border-slate-100">
              <div className="aspect-square">
                <Image src={item.url} alt={item.alt || `Gallery image ${i + 1}`} width={600} height={600} sizes="(max-width: 768px) 50vw, 33vw" className="h-full w-full object-cover" loading="lazy" />
              </div>
              {item.caption && <figcaption className="px-3 py-2 text-[11px] text-slate-500">{item.caption}</figcaption>}
            </figure>
          ))}
        </div>
      )}
    </section>
  )
}

// ---------------------------------------------------------------------------
// OFFERS (relational offers + presentation-only section content)
// ---------------------------------------------------------------------------

function OffersSection({
  content,
  offers,
  isPreview,
}: {
  content: OffersContent
  offers: ResolvedOffer[]
  isPreview: boolean
}) {
  const valid = offers.filter((o) => o.valid)
  if (valid.length === 0 && !(isPreview && offers.length > 0)) return null
  return (
    <section aria-label={content.heading || "Offers"} id="lp-offers" className="mt-14 scroll-mt-6">
      <div className="text-center">
        <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{content.heading || "Choose Your Bundle"}</h2>
        {content.subheading && <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">{content.subheading}</p>}
      </div>
      <OfferSelector
        offers={offers}
        selectionLabel={content.selectionLabel}
        layout={content.layout}
        showRegularPrice={content.showRegularPrice}
        showSavings={content.showSavings}
        helperText={content.helperText}
        showInvalid={isPreview}
      />
    </section>
  )
}

// ---------------------------------------------------------------------------
// REVIEWS (custom testimonials + live approved product-review references)
// ---------------------------------------------------------------------------

function StarRow({ rating, label }: { rating: number; label: string }) {
  return (
    <span className="flex items-center gap-0.5" role="img" aria-label={label}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} className={cn("h-3.5 w-3.5", s <= rating ? "fill-amber-400 text-amber-400" : "text-slate-200")} aria-hidden />
      ))}
    </span>
  )
}

function ReviewsSection({ content, liveReviews }: { content: ReviewsContent; liveReviews: Map<string, PublicReviewRef> }) {
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
      // References read the live review: only still-approved reviews render,
      // and verified state always comes from the source model.
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

  return (
    <section aria-label={content.heading || "Reviews"} className="mt-14">
      <div className="text-center">
        <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{content.heading || "Customer Reviews"}</h2>
        {content.subheading && <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">{content.subheading}</p>}
      </div>
      <ul className={cn("mt-6 grid gap-3", content.layout === "list" ? "grid-cols-1" : "sm:grid-cols-2")}>
        {resolved.map((review) => (
          <li key={review.id} className="rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center gap-2">
              {review.image ? (
                <Image src={review.image} alt="" width={32} height={32} className="h-8 w-8 rounded-full object-cover" aria-hidden />
              ) : (
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-900 text-xs font-bold text-white" aria-hidden>
                  {review.customerName.trim().charAt(0).toUpperCase() || "D"}
                </span>
              )}
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-1.5 truncate text-xs font-semibold text-slate-800">
                  {review.customerName}
                  {review.verified && (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">
                      <BadgeCheck className="h-2.5 w-2.5" aria-hidden /> Verified Purchase
                    </span>
                  )}
                </p>
                {review.productName && <p className="truncate text-[11px] text-slate-400">{review.productName}</p>}
              </div>
              <span className="ml-auto shrink-0"><StarRow rating={review.rating} label={`${review.rating} out of 5 stars`} /></span>
            </div>
            <p className="mt-2.5 text-sm leading-relaxed text-slate-600">{review.text}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}

// ---------------------------------------------------------------------------
// FAQ (plain-text accordion; JSON-LD deferred)
// ---------------------------------------------------------------------------

function FaqSection({ content }: { content: FaqContent }) {
  if (content.items.length === 0) return null
  return (
    <section aria-label={content.heading || "FAQ"} className="mt-14">
      <div className="text-center">
        <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{content.heading || "Frequently Asked Questions"}</h2>
        {content.subheading && <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">{content.subheading}</p>}
      </div>
      <FaqAccordion items={content.items} />
    </section>
  )
}

// ---------------------------------------------------------------------------
// Page view: ordered, validated, fault-isolated section rendering
// ---------------------------------------------------------------------------

export function LandingPageView({
  pageId,
  title,
  sections,
  links,
  offers,
  liveReviews,
  isPreview,
  previewStatus,
}: {
  pageId: string
  title: string
  sections: PublicSection[]
  links: PublicProductLink[]
  offers: ResolvedOffer[]
  liveReviews: Map<string, PublicReviewRef>
  isPreview: boolean
  previewStatus: string
}) {
  const ordered = [...sections].sort((a, b) => a.sortOrder - b.sortOrder).filter((s) => s.enabled)
  // Checkout consumes the same valid offers the selector shows; in preview
  // it also sees invalid ones (rendered as unavailable, never purchasable).
  const checkoutOffers = isPreview ? offers : offers.filter((o) => o.valid)
  const initialSelectedOfferId = checkoutOffers.find((o) => o.valid)?.offerId ?? null

  return (
    <main className="min-h-screen bg-white text-slate-900">
      {isPreview && (
        <div className="bg-amber-400 px-4 py-2 text-center text-xs font-bold uppercase tracking-widest text-amber-950">
          {previewStatus === "published" ? "Admin preview" : `Preview — this page is ${previewStatus} and not public`}
        </div>
      )}
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
        <header className="text-center">
          <Link href="/" className="inline-flex items-center gap-2" aria-label="Doshok home">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-900 text-sm font-black text-white" aria-hidden>D</span>
            <span className="text-sm font-bold tracking-wide">DOSHOK<span className="text-[#ee2c3c]">.</span></span>
          </Link>
        </header>

        <LandingPageProvider offers={checkoutOffers} initialSelectedOfferId={initialSelectedOfferId}>
        <div className="mt-6">
          {ordered.map((section) => {
            // Each section is validated and isolated: invalid or
            // unimplemented content renders nothing, never a crash.
            try {
              switch (section.type) {
                case "HERO": {
                  const parsed = parseSectionContent<HeroContent>("HERO", section.content)
                  return parsed ? <HeroSection key={section.id} content={parsed} links={links} /> : null
                }
                case "BENEFITS": {
                  const parsed = parseSectionContent<BenefitsContent>("BENEFITS", section.content)
                  return parsed ? <BenefitsSection key={section.id} content={parsed} /> : null
                }
                case "PRODUCTS": {
                  const parsed = parseSectionContent<ProductsContent>("PRODUCTS", section.content)
                  return parsed ? <ProductsSection key={section.id} content={parsed} links={links} /> : null
                }
                case "GALLERY": {
                  const parsed = parseSectionContent<GalleryContent>("GALLERY", section.content)
                  return parsed ? <GallerySection key={section.id} content={parsed} /> : null
                }
                case "OFFERS": {
                  const parsed = parseSectionContent<OffersContent>("OFFERS", section.content)
                  return parsed ? <OffersSection key={section.id} content={parsed} offers={offers} isPreview={isPreview} /> : null
                }
                case "REVIEWS": {
                  const parsed = parseSectionContent<ReviewsContent>("REVIEWS", section.content)
                  return parsed ? <ReviewsSection key={section.id} content={parsed} liveReviews={liveReviews} /> : null
                }
                case "FAQ": {
                  const parsed = parseSectionContent<FaqContent>("FAQ", section.content)
                  return parsed ? <FaqSection key={section.id} content={parsed} /> : null
                }
                case "CHECKOUT": {
                  const parsed = parseSectionContent<CheckoutContent>("CHECKOUT", section.content)
                  return parsed ? (
                    <CheckoutSection
                      key={section.id}
                      pageId={pageId}
                      content={parsed}
                      offers={checkoutOffers}
                      isPreview={isPreview}
                    />
                  ) : null
                }
                default:
                  return null
                }
            } catch {
              return null
            }
          })}
        </div>
        </LandingPageProvider>

        <footer className="mt-12 border-t border-slate-100 pt-6 text-center">
          <p className="text-[11px] text-slate-400">{title}</p>
          <p className="mt-1 text-[11px] text-slate-400">Sold by Doshok · Cash on delivery available across Bangladesh</p>
          <Link href="/" className="mt-1 inline-block text-[11px] font-semibold text-slate-500 hover:text-slate-800">
            doshok.com
          </Link>
        </footer>
      </div>
    </main>
  )
}

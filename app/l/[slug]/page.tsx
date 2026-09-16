import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminPermission } from "@/lib/auth/admin"
import { LandingPageView, type PublicLandingItem, type PublicReviewRef, type PublicSection } from "@/components/landing/landing-sections"
import { resolveLandingOffers } from "@/lib/landing-pages/offer-pricing"
import { parseSectionContent } from "@/lib/landing-pages/section-schemas"
import type { ResolvedOffer, ReviewsContent } from "@/lib/landing-pages/types"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://doshok.com"

type LandingPagePublic = {
  id: string
  title: string
  slug: string
  status: string
  seoTitle: string | null
  seoDescription: string | null
  canonicalUrl: string | null
  ogTitle: string | null
  ogDescription: string | null
  ogImage: string | null
  robotsIndex: boolean
  robotsFollow: boolean
  sections: PublicSection[]
  items: PublicLandingItem[]
}

async function getLandingPage(slug: string, allowAnyStatus: boolean): Promise<LandingPagePublic | null> {
  const page = await prisma.landingPage.findFirst({
    where: allowAnyStatus ? { slug } : { slug, status: "published" },
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      seoTitle: true,
      seoDescription: true,
      canonicalUrl: true,
      ogTitle: true,
      ogDescription: true,
      ogImage: true,
      robotsIndex: true,
      robotsFollow: true,
      sections: {
        orderBy: { sortOrder: "asc" },
        select: { id: true, type: true, enabled: true, sortOrder: true, content: true },
      },
      items: {
        orderBy: { sortOrder: "asc" },
        where: { active: true },
        select: {
          id: true,
          name: true,
          description: true,
          shortDescription: true,
          price: true,
          compareAtPrice: true,
          images: true,
          sku: true,
          sortOrder: true,
          isPrimary: true,
          ctaLabel: true,
          stock: true,
          reservedStock: true,
          importedFromProductId: true,
          variants: {
            where: { active: true },
            orderBy: { sortOrder: "asc" },
            select: {
              id: true,
              name: true,
              size: true,
              color: true,
              colorHex: true,
              sku: true,
              priceOverride: true,
              stock: true,
              reservedStock: true,
              active: true,
              sortOrder: true,
            },
          },
        },
      },
    },
  })
  if (!page) return null as unknown as LandingPagePublic

  const items: PublicLandingItem[] = page.items.map((item) => ({
    id: item.id,
    name: item.name,
    description: item.description,
    shortDescription: item.shortDescription,
    price: item.price,
    compareAtPrice: item.compareAtPrice,
    images: item.images,
    sku: item.sku,
    ctaLabel: item.ctaLabel,
    active: true,
    isPrimary: item.isPrimary,
    stock: item.stock,
    reservedStock: item.reservedStock,
    sortOrder: item.sortOrder,
    displayTitle: item.name,
    displayDescription: item.description,
    displayImage: item.images[0] ?? null,
    variants: item.variants.map((v) => ({
      id: v.id,
      name: v.name,
      size: v.size,
      color: v.color,
      colorHex: v.colorHex,
      stock: v.stock,
      reservedStock: v.reservedStock,
      active: v.active,
    })),
  }))

  return { ...page, items } as LandingPagePublic
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ preview?: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const { preview } = await searchParams

  const isPreview = preview === "1"
  let canPreview = false
  if (isPreview) {
    const session = await requireAdminPermission("landing_pages")
    canPreview = !!session && !(session instanceof NextResponse)
  }

  const page = await getLandingPage(slug, isPreview && canPreview)
  if (!page) return { title: "Page Not Found – Doshok", robots: { index: false, follow: false } }

  const isPublic = page.status === "published" && !isPreview
  const title = (page.seoTitle || page.ogTitle || page.title).trim()
  const description = (page.seoDescription || page.ogDescription || "").trim() || undefined
  const heroImage = page.ogImage || page.items[0]?.displayImage || page.items[0]?.images[0] || undefined
  const canonical = page.canonicalUrl || `${SITE_URL}/l/${page.slug}`
  const ogDescription = (page.ogDescription || description || "").trim() || undefined

  if (!isPublic) {
    return {
      title: `${page.title} (Preview) – Doshok`,
      robots: { index: false, follow: false },
    }
  }

  return {
    title,
    ...(description ? { description } : {}),
    alternates: { canonical },
    robots: { index: page.robotsIndex, follow: page.robotsFollow },
    openGraph: {
      title: (page.ogTitle || title).trim(),
      ...(ogDescription ? { description: ogDescription } : {}),
      ...(heroImage ? { images: [{ url: heroImage }] } : {}),
      type: "website",
      url: canonical,
    },
    twitter: {
      card: "summary_large_image",
      title: (page.ogTitle || title).trim(),
      ...(ogDescription ? { description: ogDescription } : {}),
      ...(heroImage ? { images: [heroImage] } : {}),
    },
  }
}

export default async function LandingPagePublicPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ preview?: string }>
}) {
  const { slug } = await params
  const { preview } = await searchParams

  const isPreview = preview === "1"
  let canPreview = false
  if (isPreview) {
    const session = await requireAdminPermission("landing_pages")
    canPreview = !!session && !(session instanceof NextResponse)
  }

  const page = await getLandingPage(slug, isPreview && canPreview)
  if (!page) notFound()

  const allOffers: ResolvedOffer[] = await resolveLandingOffers(page.id)
  const offers = isPreview ? allOffers : allOffers.filter((o) => o.valid)

  const reviewIds = new Set<string>()
  for (const section of page.sections) {
    if (section.type !== "REVIEWS" || !section.enabled) continue
    const parsed = parseSectionContent<ReviewsContent>("REVIEWS", section.content)
    for (const item of parsed?.items ?? []) {
      if (item.kind === "reference") reviewIds.add(item.reviewId)
    }
  }
  const liveReviews = new Map<string, PublicReviewRef>()
  if (reviewIds.size > 0) {
    const rows = await prisma.productReview.findMany({
      where: { id: { in: [...reviewIds] }, status: "approved" },
      select: {
        id: true,
        rating: true,
        title: true,
        content: true,
        isVerifiedBuyer: true,
        user: { select: { name: true } },
        product: { select: { name: true } },
      },
    })
    for (const row of rows) liveReviews.set(row.id, row)
  }

  return (
    <LandingPageView
      pageId={page.id}
      title={page.title}
      sections={page.sections}
      items={page.items}
      offers={offers}
      liveReviews={liveReviews}
      isPreview={isPreview}
      previewStatus={page.status}
    />
  )
}

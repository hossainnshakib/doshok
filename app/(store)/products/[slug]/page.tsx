import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminPermission } from "@/lib/auth/admin"
import { ProductDetailClient } from "@/components/store/product-detail-client"
import { safeJsonLd } from "@/lib/json-ld"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://doshok.com"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const product = await prisma.product.findUnique({
    where: { slug, status: "Active" },
    select: {
      name: true,
      description: true,
      shortDescription: true,
      price: true,
      seoTitle: true,
      seoDescription: true,
      seoKeywords: true,
      seoImage: true,
      images: true,
    },
  })

  if (!product) return { title: "Product Not Found — Doshok" }

  const title = product.seoTitle || `${product.name} — Doshok`
  const description = product.seoDescription || product.shortDescription || product.description || `Shop ${product.name} at Doshok. ৳${product.price.toLocaleString("en-IN")}`
  const ogImage = product.seoImage || (product.images && product.images[0]) || undefined

  return {
    title,
    description,
    keywords: product.seoKeywords ? product.seoKeywords.split(",").map((k) => k.trim()) : undefined,
    alternates: { canonical: `${SITE_URL}/products/${slug}` },
    openGraph: ogImage
      ? {
          title,
          description,
          images: [{ url: ogImage }],
        }
      : undefined,
  }
}

type ProductSummary = {
  id: string
  name: string
  slug: string
  price: number
  oldPrice: number | null
  images: string[]
  category?: { name: string; slug: string }
  variants: { stock: number; reservedStock: number }[]
}

export default async function ProductDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ preview?: string }>
}) {
  const { slug } = await params
  const { preview } = await searchParams

  const isPreview = preview === "1"
  const previewSession = isPreview ? await requireAdminPermission("products") : null
  const canPreview = !!previewSession && !(previewSession instanceof NextResponse)

  const product = await prisma.product.findFirst({
    where: isPreview && canPreview ? { slug } : { slug, status: "Active" },
    include: {
      variants: true,
      category: true,
      specifications: { orderBy: { position: "asc" } },
      sizeCharts: { include: { sizeChart: { include: { rows: { orderBy: { position: "asc" } } } } } },
      relatedProducts: {
        include: { relatedProduct: { include: { variants: true, category: true } } },
        orderBy: { position: "asc" },
      },
      targetRelations: {
        include: { product: { include: { variants: true, category: true } } },
        orderBy: { position: "asc" },
      },
    },
  })

  if (!product) notFound()

  const explicitRelated = [
    ...product.relatedProducts
      .filter((r) => r.type === "RELATED" && r.relatedProduct.status === "Active")
      .map((r) => r.relatedProduct),
    ...product.targetRelations
      .filter((r) => r.type === "RELATED" && r.product.status === "Active")
      .map((r) => r.product),
  ]

  const crossSell = [
    ...product.relatedProducts
      .filter((r) => r.type === "CROSS_SELL" && r.relatedProduct.status === "Active")
      .map((r) => r.relatedProduct),
    ...product.targetRelations
      .filter((r) => r.type === "CROSS_SELL" && r.product.status === "Active")
      .map((r) => r.product),
  ]

  const upsell = [
    ...product.relatedProducts
      .filter((r) => r.type === "UPSELL" && r.relatedProduct.status === "Active")
      .map((r) => r.relatedProduct),
    ...product.targetRelations
      .filter((r) => r.type === "UPSELL" && r.product.status === "Active")
      .map((r) => r.product),
  ]

  let fallbackRelated: ProductSummary[] = []
  if (explicitRelated.length === 0) {
    fallbackRelated = await prisma.product.findMany({
      where: { status: "Active", id: { not: product.id }, categoryId: product.categoryId },
      include: { variants: true, category: true },
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
      take: 8,
    })
    if (fallbackRelated.length < 4) {
      const extra = await prisma.product.findMany({
        where: { status: "Active", id: { not: product.id }, categoryId: { not: product.categoryId } },
        include: { variants: true, category: true },
        orderBy: { createdAt: "desc" },
        take: 8,
      })
      fallbackRelated = [...fallbackRelated, ...extra].slice(0, 8)
    }
  }

  const mapSummary = (p: { id: string; name: string; slug: string; price: number; oldPrice: number | null; images: string[]; category?: { name: string; slug: string } | null; variants: { stock: number; reservedStock: number }[] }): ProductSummary => ({
    id: p.id, name: p.name, slug: p.slug, price: p.price, oldPrice: p.oldPrice, images: p.images, category: p.category ?? undefined,
    variants: p.variants.map((v) => ({ stock: v.stock, reservedStock: v.reservedStock })),
  })

  const relatedProducts: ProductSummary[] = explicitRelated.length > 0
    ? explicitRelated.map(mapSummary)
    : fallbackRelated.map(mapSummary)

  const crossSellProducts: ProductSummary[] = crossSell.map(mapSummary)
  const upsellProducts: ProductSummary[] = upsell.map(mapSummary)

  // Calculate available stock from variants
  const availableStock = product.variants.reduce(
    (sum, variant) => sum + Math.max(0, variant.stock - variant.reservedStock),
    0
  )

  // Get first SKU if available
  const firstSku = product.variants.find((v) => v.sku)?.sku

  // Build breadcrumb
  const breadcrumbList = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": product.category
      ? [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": SITE_URL },
          { "@type": "ListItem", "position": 2, "name": "Products", "item": `${SITE_URL}/products` },
          { "@type": "ListItem", "position": 3, "name": product.category.name, "item": `${SITE_URL}/products?category=${product.category.slug}` },
          { "@type": "ListItem", "position": 4, "name": product.name, "item": `${SITE_URL}/products/${slug}` },
        ]
      : [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": SITE_URL },
          { "@type": "ListItem", "position": 2, "name": "Products", "item": `${SITE_URL}/products` },
          { "@type": "ListItem", "position": 3, "name": product.name, "item": `${SITE_URL}/products/${slug}` },
        ],
  }

  // Build Product JSON-LD
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.name,
    "description": product.description || product.shortDescription || undefined,
    "image": product.images && product.images.length > 0 ? product.images : undefined,
    "brand": {
      "@type": "Brand",
      "name": "Doshok",
    },
    ...(firstSku && { "sku": firstSku }),
    "offers": {
      "@type": "Offer",
      "price": product.price,
      "priceCurrency": "BDT",
      "availability": availableStock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      "url": `${SITE_URL}/products/${slug}`,
    },
  }

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLd(productJsonLd),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLd(breadcrumbList),
        }}
      />
      <ProductDetailClient
        product={product as unknown as Parameters<typeof ProductDetailClient>[0]["product"]}
        relatedProducts={relatedProducts}
        crossSellProducts={crossSellProducts}
        upsellProducts={upsellProducts}
      />
    </div>
  )
}

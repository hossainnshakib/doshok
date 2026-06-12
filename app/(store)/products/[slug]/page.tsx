import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { ProductDetailClient } from "@/components/store/product-detail-client"

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
    openGraph: ogImage
      ? {
          title,
          description,
          images: [{ url: ogImage }],
        }
      : undefined,
  }
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
  const session = isPreview ? await auth() : null

  const product = await prisma.product.findFirst({
    where: isPreview && session?.user ? { slug } : { slug, status: "Active" },
    include: { variants: true, category: true, specifications: { orderBy: { position: "asc" } }, sizeCharts: { include: { sizeChart: { include: { rows: { orderBy: { position: "asc" } } } } } } },
  })

  if (!product) notFound()

  const sameCategoryProducts = await prisma.product.findMany({
    where: {
      status: "Active",
      id: { not: product.id },
      categoryId: product.categoryId,
    },
    include: { variants: true, category: true },
    orderBy: [
      { featured: "desc" },
      { createdAt: "desc" },
    ],
    take: 8,
  })

    const relatedProducts =
      sameCategoryProducts.length >= 4
        ? sameCategoryProducts.slice(0, 8)
        : await prisma.product.findMany({
            where: {
              status: "Active",
              id: { not: product.id },
            },
            include: { variants: true, category: true },
            orderBy: { createdAt: "desc" },
            take: 8,
          })

  return (
    <div>
      <ProductDetailClient product={product as unknown as Parameters<typeof ProductDetailClient>[0]["product"]} relatedProducts={relatedProducts} />
    </div>
  )
}
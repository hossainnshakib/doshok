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
    select: { name: true, description: true, price: true },
  })

  if (!product) return { title: "Product Not Found — Doshok" }

  return {
    title: `${product.name} — Doshok`,
    description: product.description ?? `Shop ${product.name} at Doshok. ৳${product.price.toLocaleString("en-IN")}`,
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
    include: { variants: true, category: true },
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
      <ProductDetailClient product={product} relatedProducts={relatedProducts} />
    </div>
  )
}
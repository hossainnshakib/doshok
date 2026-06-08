import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { ProductDetailClient } from "@/components/store/product-detail-client"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const product = await prisma.product.findUnique({
    where: { slug, published: true },
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
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const product = await prisma.product.findUnique({
    where: { slug, published: true },
    include: { variants: true, category: true },
  })

  if (!product) notFound()

  const relatedProducts = await prisma.product.findMany({
    where: {
      published: true,
      id: { not: product.id },
    },
    include: { variants: true, category: true },
    orderBy: [
      { featured: "desc" },
      { createdAt: "desc" },
    ],
    take: 8,
  })

  return (
    <div className="bg-[#eef2f5]">
      <ProductDetailClient product={product} relatedProducts={relatedProducts} />
    </div>
  )
}

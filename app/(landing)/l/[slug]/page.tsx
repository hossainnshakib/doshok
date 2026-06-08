import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { LandingPageClient } from "@/components/store/landing-page-client"

export default async function LandingPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const product = await prisma.product.findUnique({
    where: { slug, published: true },
    include: {
      variants: true,
      category: true,
    },
  })

  if (!product) notFound()

  return <LandingPageClient product={product} slug={slug} />
}

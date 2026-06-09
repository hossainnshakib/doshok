import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { LandingPageClient } from "@/components/store/landing-page-client"

export default async function LandingPage({
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
    where: isPreview && session?.user ? { slug, pageType: "LANDING" } : { slug, pageType: "LANDING", status: "Active" },
    include: {
      variants: true,
      category: true,
    },
  })

  if (!product) notFound()

  return <LandingPageClient product={product} slug={slug} />
}
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminPermission } from "@/lib/auth/admin"
import { LandingPageClient } from "@/components/store/landing-page-client"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const product = await prisma.product.findUnique({
    where: { slug, pageType: "LANDING", status: "Active" },
    select: {
      name: true,
      description: true,
      shortDescription: true,
      seoTitle: true,
      seoDescription: true,
      seoKeywords: true,
      seoImage: true,
      images: true,
    },
  })

  if (!product) return { title: "Landing Page — Doshok" }

  const title = product.seoTitle || `${product.name} — Doshok`
  const description = product.seoDescription || product.shortDescription || product.description || undefined
  const ogImage = product.seoImage || (product.images?.[0]) || undefined

  return {
    title,
    description,
    keywords: product.seoKeywords ? product.seoKeywords.split(",").map((k) => k.trim()) : undefined,
    openGraph: {
      title,
      description: description ?? undefined,
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: description ?? undefined,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  }
}

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
  const previewSession = isPreview ? await requireAdminPermission("products") : null
  const canPreview = !!previewSession && !(previewSession instanceof NextResponse)

  const product = await prisma.product.findFirst({
    where: isPreview && canPreview ? { slug, pageType: "LANDING" } : { slug, pageType: "LANDING", status: "Active" },
    include: {
      variants: true,
      category: true,
      landingPageSetting: true,
    },
  })

  if (!product) notFound()

  return <LandingPageClient product={product} slug={slug} />
}

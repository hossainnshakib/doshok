import { notFound } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { prisma } from "@/lib/prisma"
import SanitizedHTML from "@/components/sanitized-html"
import { ArrowLeft } from "lucide-react"
import type { Metadata } from "next"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const story = await prisma.story.findUnique({
    where: { slug, status: "active" },
  })

  if (!story) return {}

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://doshok.com"

  return {
    title: story.seoTitle || story.title,
    description: story.seoDescription || story.excerpt || undefined,
    keywords: story.seoKeywords || undefined,
    openGraph: {
      title: story.seoTitle || story.title,
      description: story.seoDescription || story.excerpt || undefined,
      images: story.seoImage || story.image || undefined,
      url: `${siteUrl}/stories/${slug}`,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: story.seoTitle || story.title,
      description: story.seoDescription || story.excerpt || undefined,
      images: story.seoImage || story.image || undefined,
    },
    alternates: {
      canonical: `${siteUrl}/stories/${slug}`,
    },
  }
}

export default async function StoryDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const story = await prisma.story.findUnique({
    where: { slug, status: "active" },
  })

  if (!story) notFound()

  return (
    <main className="container mx-auto container-px py-12 max-w-3xl">
      <Link
        href="/stories"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Stories
      </Link>

      {story.image && (
        <div className="relative aspect-video rounded-2xl overflow-hidden mb-8 bg-muted">
          <Image src={story.image} alt={story.title} fill className="object-cover" />
        </div>
      )}

      <article>
        <h1 className="text-3xl font-black tracking-tight md:text-4xl">{story.title}</h1>
        <SanitizedHTML html={story.content} className="mt-6 prose prose-sm max-w-none text-muted-foreground" />
      </article>
    </main>
  )
}
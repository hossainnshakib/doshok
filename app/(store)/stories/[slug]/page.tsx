import { notFound } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { prisma } from "@/lib/prisma"
import { processStoryContent } from "@/lib/story-html"
import StoryContent from "@/components/story-content"
import { ArrowLeft, Calendar, Clock, Share2 } from "lucide-react"
import type { Metadata } from "next"
import { safeJsonLd } from "@/lib/json-ld"

function readingTime(content: string): number {
  const text = content.replace(/<[^>]*>/g, "")
  const words = text.split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(words / 200))
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const story = await prisma.story.findUnique({
    where: { slug, status: "active" },
    include: { storyCategory: true },
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
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams?: Promise<{ preview?: string }>
}) {
  const { slug } = await params
  const sp = searchParams ? await searchParams : {}
  const isPreview = sp.preview === "1"

  const story = await prisma.story.findUnique({
    where: isPreview ? { slug } : { slug, status: "active" },
    include: { storyCategory: true },
  })

  if (!story) notFound()

  const storyHtml = processStoryContent(story.content)

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://doshok.com"
  const minutes = readingTime(story.content)
  const storyUrl = `${siteUrl}/stories/${slug}`

  const relatedStories = await prisma.story.findMany({
    where: {
      status: "active",
      id: { not: story.id },
      ...(story.storyCategoryId ? { storyCategoryId: story.storyCategoryId } : {}),
    },
    include: { storyCategory: true },
    orderBy: { createdAt: "desc" },
    take: 3,
  })

  const relatedProducts = story.storyCategoryId
    ? await prisma.product.findMany({
        where: { status: "Active" },
        include: { variants: true, category: true },
        orderBy: { createdAt: "desc" },
        take: 3,
      })
    : []

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": story.title,
    "description": story.excerpt || story.seoDescription || undefined,
    "image": story.seoImage || story.image || undefined,
    "author": {
      "@type": "Organization",
      "name": "Doshok",
      "url": siteUrl,
    },
    "publisher": {
      "@type": "Organization",
      "name": "Doshok",
      "url": siteUrl,
    },
    "datePublished": story.createdAt.toISOString(),
    "dateModified": story.updatedAt.toISOString(),
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": storyUrl,
    },
    "url": storyUrl,
  }

  return (
    <main className="container mx-auto container-px py-12">
      <article className="mx-auto max-w-[720px]">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: safeJsonLd(articleJsonLd),
          }}
        />
        <Link
          href="/stories"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Stories
        </Link>

        {story.image && (
          <div className="relative aspect-[16/9] rounded-2xl overflow-hidden mb-8 bg-muted">
            <Image src={story.image} alt={story.title} fill priority fetchPriority="high" className="object-cover" />
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 mb-4">
          {story.storyCategory && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-violet-50 text-violet-700">
              {story.storyCategory.name}
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" /> {formatDate(story.createdAt)}
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" /> {minutes} min read
          </span>
        </div>

        <h1 className="text-3xl font-black tracking-tight md:text-4xl md:leading-tight mb-4">{story.title}</h1>

        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <span className="font-medium text-foreground">Doshok</span>
          <span aria-hidden>&middot;</span>
          <time dateTime={story.createdAt.toISOString()}>{formatDate(story.createdAt)}</time>
        </div>

        {story.excerpt && (
          <p className="text-lg text-muted-foreground/80 leading-relaxed mb-8">{story.excerpt}</p>
        )}

        {story.tags && (
          <div className="flex flex-wrap gap-1.5 mb-8">
            {story.tags.split(",").map((tag) => (
              <span key={tag.trim()} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                {tag.trim()}
              </span>
            ))}
          </div>
        )}

        <div className="border-t border-border mb-8" />

        <StoryContent html={storyHtml} className="article-content" />

        <div className="border-t border-border mt-12 pt-8 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Share this story</span>
            <Share2 className="h-4 w-4" />
          </div>
          <div className="flex gap-3">
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(storyUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-xs font-medium text-slate-600 hover:bg-slate-200 transition-colors"
            >
              Facebook
            </a>
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(story.title)}&url=${encodeURIComponent(storyUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-xs font-medium text-slate-600 hover:bg-slate-200 transition-colors"
            >
              X
            </a>
          </div>
        </div>

        {relatedStories.length > 0 && (
          <section className="mt-16 border-t border-border pt-12">
            <h2 className="text-xl font-black tracking-tight mb-6">You May Also Like</h2>
            <div className="grid gap-6 sm:grid-cols-3">
              {relatedStories.map((rs) => (
                <Link key={rs.id} href={`/stories/${rs.slug}`} className="group">
                  {rs.image && (
                    <div className="relative aspect-[16/9] rounded-lg overflow-hidden bg-muted mb-3">
                      <Image src={rs.image} alt={rs.title} fill sizes="(max-width: 640px) 100vw, 33vw" className="object-cover group-hover:scale-105 transition-transform duration-300" />
                    </div>
                  )}
                  <h3 className="text-sm font-semibold group-hover:text-primary transition-colors">{rs.title}</h3>
                  {rs.excerpt && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{rs.excerpt}</p>}
                </Link>
              ))}
            </div>
          </section>
        )}

        {relatedProducts.length > 0 && (
          <section className="mt-12 border-t border-border pt-12">
            <h2 className="text-xl font-black tracking-tight mb-6">Shop the Collection</h2>
            <div className="grid gap-6 sm:grid-cols-3">
              {relatedProducts.map((product) => (
                <Link key={product.id} href={`/products/${product.slug}`} className="group">
                  <div className="relative aspect-square rounded-lg overflow-hidden bg-muted mb-3">
                    {product.images[0] ? (
                      <Image src={product.images[0]} alt={product.name} fill sizes="(max-width: 640px) 100vw, 33vw" className="object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground text-xs">No image</div>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold group-hover:text-primary transition-colors">{product.name}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">৳{product.price.toLocaleString()}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        <div className="mt-12 text-center">
          <Link
            href="/stories"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Stories
          </Link>
        </div>
      </article>
    </main>
  )
}

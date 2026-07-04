import { prisma } from "@/lib/prisma"
import Link from "next/link"
import Image from "next/image"
import type { Metadata } from "next"
import { ArrowRight, Search, X } from "lucide-react"
import styles from "./stories.module.css"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://doshok.com"

export const metadata: Metadata = {
  title: "Stories – Doshok",
  description: "Inside the Doshok wardrobe. Editorial notes, fabric choices, and the people shaping the brand.",
  alternates: { canonical: `${SITE_URL}/stories` },
}

export default async function StoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ storyCategoryId?: string; q?: string }>
}) {
  const { storyCategoryId: categoryFilter, q: searchQuery } = await searchParams

  const categories = await prisma.storyCategory.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  })

  const stories = await prisma.story.findMany({
    where: {
      status: "active",
      ...(categoryFilter ? { storyCategoryId: categoryFilter } : {}),
      ...(searchQuery ? {
        OR: [
          { title: { contains: searchQuery, mode: "insensitive" } },
          { excerpt: { contains: searchQuery, mode: "insensitive" } },
        ],
      } : {}),
    },
    include: { storyCategory: true },
    orderBy: { createdAt: "desc" },
  })

  if (stories.length === 0 && !categoryFilter && !searchQuery) {
    return (
      <main className="container mx-auto container-px py-16">
        <div className="text-center">
          <h1 className="text-3xl font-black">Stories</h1>
          <p className="mt-3 text-muted-foreground">No stories published yet. Check back soon.</p>
          <Link href="/products" className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-primary px-8 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Explore Products <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="container mx-auto container-px py-12">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-2">Stories</p>
        <h1 className="text-3xl font-black tracking-tight">Inside the Doshok wardrobe.</h1>
        <p className="mt-2 text-muted-foreground">Editorial notes from the workshop, city life, fabric choices, and the people shaping the brand.</p>
      </div>

      <form method="GET" className="mb-8 flex flex-wrap items-end gap-3">
        <div className="min-w-[180px]">
          <label className="block text-xs font-medium text-muted-foreground mb-1">Category</label>
          <select
            name="storyCategoryId"
            defaultValue={categoryFilter ?? ""}
            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm h-10 focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>
        <div className="min-w-[200px] flex-1">
          <label className="block text-xs font-medium text-muted-foreground mb-1">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input type="search" name="q" defaultValue={searchQuery ?? ""} placeholder="Search stories..." className="w-full rounded-lg border border-border bg-white pl-9 pr-3 py-2 text-sm h-10 focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
        </div>
        <button type="submit" className="inline-flex h-10 items-center justify-center rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
          Filter
        </button>
        {(categoryFilter || searchQuery) && (
          <Link href="/stories" className="inline-flex h-10 items-center justify-center rounded-full border border-border px-4 text-sm font-medium hover:bg-muted transition-colors">
            <X className="h-4 w-4 mr-1" /> Clear
          </Link>
        )}
      </form>

      {stories.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground">No stories match your filters.</p>
          <Link href="/stories" className="mt-4 inline-flex h-11 items-center justify-center rounded-full bg-primary px-8 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            View All Stories
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {stories.map((story) => (
            <Link key={story.id} href={`/stories/${story.slug}`} className={styles.card}>
              {story.image && (
                <div className={styles.cardImage}>
                  <Image src={story.image} alt={story.title} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className={styles.cardImageImg} />
                </div>
              )}
              <div className={styles.cardContent}>
                <div className="flex items-center gap-2 mb-1">
                  {story.storyCategory && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-violet-50 text-violet-700">{story.storyCategory.name}</span>
                  )}
                </div>
                <h2 className={styles.cardTitle}>{story.title}</h2>
                {story.excerpt && <p className={styles.cardExcerpt}>{story.excerpt}</p>}
                <span className={styles.cardReadMore}>
                  Read Story <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-12 text-center">
        <Link href="/products" className="inline-flex h-11 items-center justify-center rounded-full border border-border px-8 text-sm font-medium hover:bg-muted transition-colors">
          Explore Products <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </div>
    </main>
  )
}

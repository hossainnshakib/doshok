import { prisma } from "@/lib/prisma"
import Link from "next/link"
import type { Metadata } from "next"
import { ArrowRight } from "lucide-react"
import styles from "./stories.module.css"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://doshok.com"

export const metadata: Metadata = {
  title: "Stories – Doshok",
  description: "Inside the Doshok wardrobe. Editorial notes, fabric choices, and the people shaping the brand.",
  alternates: { canonical: `${SITE_URL}/stories` },
}

export default async function StoriesPage() {
  const stories = await prisma.story.findMany({
    where: { status: "active" },
    orderBy: { createdAt: "desc" },
  })

  if (stories.length === 0) {
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

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {stories.map((story) => (
          <Link key={story.id} href={`/stories/${story.slug}`} className={styles.card}>
            {story.image && (
              <div className={styles.cardImage}>
                <img src={story.image} alt={story.title} />
              </div>
            )}
            <div className={styles.cardContent}>
              <h2 className={styles.cardTitle}>{story.title}</h2>
              {story.excerpt && <p className={styles.cardExcerpt}>{story.excerpt}</p>}
              <span className={styles.cardReadMore}>
                Read Story <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-12 text-center">
        <Link href="/products" className="inline-flex h-11 items-center justify-center rounded-full border border-border px-8 text-sm font-medium hover:bg-muted transition-colors">
          Explore Products <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </div>
    </main>
  )
}
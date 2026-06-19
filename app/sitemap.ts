import { MetadataRoute } from "next"
import { prisma } from "@/lib/prisma"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://doshok.com"

const STATIC_ROUTES = [
  { path: "", priority: 1.0, changeFreq: "weekly" as const },
  { path: "/products", priority: 0.9, changeFreq: "daily" as const },
  { path: "/new-arrivals", priority: 0.8, changeFreq: "daily" as const },
  { path: "/stories", priority: 0.7, changeFreq: "weekly" as const },
  { path: "/about", priority: 0.5, changeFreq: "monthly" as const },
  { path: "/contact", priority: 0.5, changeFreq: "monthly" as const },
  { path: "/faq", priority: 0.5, changeFreq: "monthly" as const },
  { path: "/privacy", priority: 0.4, changeFreq: "monthly" as const },
  { path: "/terms", priority: 0.4, changeFreq: "monthly" as const },
  { path: "/delivery", priority: 0.5, changeFreq: "monthly" as const },
  { path: "/returns", priority: 0.5, changeFreq: "monthly" as const },
  { path: "/care-guide", priority: 0.4, changeFreq: "monthly" as const },
  { path: "/size-guide", priority: 0.5, changeFreq: "monthly" as const },
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${SITE_URL}${route.path}`,
    lastModified: new Date(),
    changeFrequency: route.changeFreq,
    priority: route.priority,
  }))

  try {
    const products = await prisma.product.findMany({
      where: { status: "Active" },
      select: { slug: true, updatedAt: true },
    })
    for (const product of products) {
      entries.push({
        url: `${SITE_URL}/products/${product.slug}`,
        lastModified: product.updatedAt,
        changeFrequency: "weekly",
        priority: 0.7,
      })
    }
  } catch {}

  try {
    const stories = await prisma.story.findMany({
      where: { status: "active" },
      select: { slug: true, updatedAt: true },
    })
    for (const story of stories) {
      entries.push({
        url: `${SITE_URL}/stories/${story.slug}`,
        lastModified: story.updatedAt,
        changeFrequency: "monthly",
        priority: 0.5,
      })
    }
  } catch {}

  try {
    const pages = await prisma.page.findMany({
      where: { status: "active" },
      select: { slug: true, updatedAt: true },
    })
    for (const page of pages) {
      entries.push({
        url: `${SITE_URL}/p/${page.slug}`,
        lastModified: page.updatedAt,
        changeFrequency: "monthly",
        priority: 0.4,
      })
    }
  } catch {}

  try {
    const categories = await prisma.category.findMany({
      select: { slug: true, updatedAt: true },
    })
    for (const category of categories) {
      entries.push({
        url: `${SITE_URL}/products?category=${category.slug}`,
        lastModified: category.updatedAt,
        changeFrequency: "weekly",
        priority: 0.5,
      })
    }
  } catch {}

  return entries
}

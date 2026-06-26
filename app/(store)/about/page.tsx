import type { Metadata } from "next"
import { InfoPage } from "@/components/store/info-page"
import { aboutPage } from "@/lib/info-pages"
import { getCmsPageData } from "@/lib/cms-pages"
import { prisma } from "@/lib/prisma"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://doshok.com"

export async function generateMetadata(): Promise<Metadata> {
  const cmsPage = await getCmsPageData("about")
  if (cmsPage) {
    return {
      title: `About – Doshok`,
      description: cmsPage.description,
      alternates: { canonical: `${SITE_URL}/about` },
      openGraph: {
        title: `About – Doshok`,
        description: cmsPage.description,
        url: `${SITE_URL}/about`,
      },
      twitter: { card: "summary_large_image", title: `About – Doshok`, description: cmsPage.description },
    }
  }
  return {
    title: "About – Doshok",
    description: "A wardrobe built in Bangladesh. Doshok is a single-house fashion label crafting clean essentials and occasion pieces for modern Bangladeshi life.",
    alternates: { canonical: `${SITE_URL}/about` },
    openGraph: {
      title: "About – Doshok",
      description: "A wardrobe built in Bangladesh. Doshok is a single-house fashion label crafting clean essentials and occasion pieces for modern Bangladeshi life.",
      url: `${SITE_URL}/about`,
    },
    twitter: { card: "summary_large_image", title: "About – Doshok", description: "A wardrobe built in Bangladesh. Doshok is a single-house fashion label crafting clean essentials and occasion pieces for modern Bangladeshi life." },
  }
}

export default async function AboutPage() {
  const [cmsPage, activeCategoryCount] = await Promise.all([
    getCmsPageData("about"),
    prisma.category.count({
      where: { products: { some: { status: "Active" } } },
    }),
  ])

  const base = cmsPage ?? aboutPage
  const page = {
    ...base,
    stats: base.stats?.map((stat) =>
      stat.label === "Categories"
        ? { ...stat, value: String(activeCategoryCount) }
        : stat
    ),
  }

  return <InfoPage page={page} />
}
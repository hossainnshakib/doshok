import type { Metadata } from "next"
import { InfoPage } from "@/components/store/info-page"
import { accessibilityPage } from "@/lib/info-pages"
import { getCmsPageData } from "@/lib/cms-pages"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://doshok.com"

export async function generateMetadata(): Promise<Metadata> {
  const cmsPage = await getCmsPageData("accessibility")
  if (cmsPage) {
    return {
      title: `${cmsPage.title} – Doshok`,
      description: cmsPage.description,
      alternates: { canonical: `${SITE_URL}/accessibility` },
      openGraph: { title: `${cmsPage.title} – Doshok`, description: cmsPage.description, url: `${SITE_URL}/accessibility` },
      twitter: { card: "summary_large_image", title: `${cmsPage.title} – Doshok`, description: cmsPage.description },
    }
  }
  return {
    title: "Accessibility – Doshok",
    description: accessibilityPage.description,
    alternates: { canonical: `${SITE_URL}/accessibility` },
    openGraph: { title: "Accessibility – Doshok", description: accessibilityPage.description, url: `${SITE_URL}/accessibility` },
    twitter: { card: "summary_large_image", title: "Accessibility – Doshok", description: accessibilityPage.description },
  }
}

export default async function AccessibilityPage() {
  const cmsPage = await getCmsPageData("accessibility")
  return <InfoPage page={cmsPage ?? accessibilityPage} />
}
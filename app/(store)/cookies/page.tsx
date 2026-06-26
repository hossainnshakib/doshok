import type { Metadata } from "next"
import { InfoPage } from "@/components/store/info-page"
import { cookiesPage } from "@/lib/info-pages"
import { getCmsPageData } from "@/lib/cms-pages"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://doshok.com"

export async function generateMetadata(): Promise<Metadata> {
  const cmsPage = await getCmsPageData("cookies")
  if (cmsPage) {
    return {
      title: `${cmsPage.title} – Doshok`,
      description: cmsPage.description,
      alternates: { canonical: `${SITE_URL}/cookies` },
      openGraph: { title: `${cmsPage.title} – Doshok`, description: cmsPage.description, url: `${SITE_URL}/cookies` },
      twitter: { card: "summary_large_image", title: `${cmsPage.title} – Doshok`, description: cmsPage.description },
    }
  }
  return {
    title: "Cookies – Doshok",
    description: cookiesPage.description,
    alternates: { canonical: `${SITE_URL}/cookies` },
    openGraph: { title: "Cookies – Doshok", description: cookiesPage.description, url: `${SITE_URL}/cookies` },
    twitter: { card: "summary_large_image", title: "Cookies – Doshok", description: cookiesPage.description },
  }
}

export default async function CookiesPage() {
  const cmsPage = await getCmsPageData("cookies")
  return <InfoPage page={cmsPage ?? cookiesPage} />
}
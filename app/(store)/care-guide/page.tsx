import type { Metadata } from "next"
import { InfoPage } from "@/components/store/info-page"
import { careGuidePage } from "@/lib/info-pages"
import { getCmsPageData } from "@/lib/cms-pages"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://doshok.com"

export async function generateMetadata(): Promise<Metadata> {
  const cmsPage = await getCmsPageData("care-guide")
  if (cmsPage) {
    return {
      title: `${cmsPage.title} – Doshok`,
      description: cmsPage.description,
      alternates: { canonical: `${SITE_URL}/care-guide` },
      openGraph: { title: `${cmsPage.title} – Doshok`, description: cmsPage.description, url: `${SITE_URL}/care-guide` },
      twitter: { card: "summary_large_image", title: `${cmsPage.title} – Doshok`, description: cmsPage.description },
    }
  }
  return {
    title: "Care Guide – Doshok",
    description: careGuidePage.description,
    alternates: { canonical: `${SITE_URL}/care-guide` },
    openGraph: { title: "Care Guide – Doshok", description: careGuidePage.description, url: `${SITE_URL}/care-guide` },
    twitter: { card: "summary_large_image", title: "Care Guide – Doshok", description: careGuidePage.description },
  }
}

export default async function CareGuidePage() {
  const cmsPage = await getCmsPageData("care-guide")
  return <InfoPage page={cmsPage ?? careGuidePage} />
}
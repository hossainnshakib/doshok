import type { Metadata } from "next"
import { InfoPage } from "@/components/store/info-page"
import { privacyPage } from "@/lib/info-pages"
import { getCmsPageData } from "@/lib/cms-pages"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://doshok.com"

export async function generateMetadata(): Promise<Metadata> {
  const cmsPage = await getCmsPageData("privacy")
  if (cmsPage) {
    return {
      title: `Privacy Policy – Doshok`,
      description: cmsPage.description,
      alternates: { canonical: `${SITE_URL}/privacy` },
      openGraph: { title: `Privacy Policy – Doshok`, description: cmsPage.description, url: `${SITE_URL}/privacy` },
      twitter: { card: "summary_large_image", title: `Privacy Policy – Doshok`, description: cmsPage.description },
    }
  }
  return {
    title: "Privacy Policy – Doshok",
    description: "Your data deserves careful handling. This policy explains what we collect, why, how we protect it, and how to contact Doshok about privacy requests.",
    alternates: { canonical: `${SITE_URL}/privacy` },
    openGraph: { title: "Privacy Policy – Doshok", description: "Your data deserves careful handling. This policy explains what we collect, why, how we protect it, and how to contact Doshok about privacy requests.", url: `${SITE_URL}/privacy` },
    twitter: { card: "summary_large_image", title: "Privacy Policy – Doshok", description: "Your data deserves careful handling. This policy explains what we collect, why, how we protect it, and how to contact Doshok about privacy requests." },
  }
}

export default async function PrivacyPage() {
  const cmsPage = await getCmsPageData("privacy")
  return <InfoPage page={cmsPage ?? privacyPage} />
}

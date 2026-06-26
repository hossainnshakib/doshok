import type { Metadata } from "next"
import { InfoPage } from "@/components/store/info-page"
import { faqPage } from "@/lib/info-pages"
import { getCmsPageData } from "@/lib/cms-pages"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://doshok.com"

export async function generateMetadata(): Promise<Metadata> {
  const cmsPage = await getCmsPageData("faq")
  if (cmsPage) {
    return {
      title: `FAQ – Doshok`,
      description: cmsPage.description,
      alternates: { canonical: `${SITE_URL}/faq` },
      openGraph: { title: `FAQ – Doshok`, description: cmsPage.description, url: `${SITE_URL}/faq` },
      twitter: { card: "summary_large_image", title: `FAQ – Doshok`, description: cmsPage.description },
    }
  }
  return {
    title: "FAQ – Doshok",
    description: "Find quick answers about orders, delivery, returns, payment, sizing, account support, and Doshok shopping basics.",
    alternates: { canonical: `${SITE_URL}/faq` },
    openGraph: { title: "FAQ – Doshok", description: "Find quick answers about orders, delivery, returns, payment, sizing, account support, and Doshok shopping basics.", url: `${SITE_URL}/faq` },
    twitter: { card: "summary_large_image", title: "FAQ – Doshok", description: "Find quick answers about orders, delivery, returns, payment, sizing, account support, and Doshok shopping basics." },
  }
}

export default async function FAQPage() {
  const cmsPage = await getCmsPageData("faq")
  return <InfoPage page={cmsPage ?? faqPage} />
}
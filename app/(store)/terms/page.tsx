import type { Metadata } from "next"
import { InfoPage } from "@/components/store/info-page"
import { termsPage } from "@/lib/info-pages"
import { getCmsPageData } from "@/lib/cms-pages"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://doshok.com"

export async function generateMetadata(): Promise<Metadata> {
  const cmsPage = await getCmsPageData("terms")
  if (cmsPage) {
    return {
      title: `Terms & Conditions – Doshok`,
      description: cmsPage.description,
      alternates: { canonical: `${SITE_URL}/terms` },
      openGraph: { title: `Terms & Conditions – Doshok`, description: cmsPage.description, url: `${SITE_URL}/terms` },
      twitter: { card: "summary_large_image", title: `Terms & Conditions – Doshok`, description: cmsPage.description },
    }
  }
  return {
    title: "Terms & Conditions – Doshok",
    description: "Clear terms for confident shopping. These terms explain how purchases, pricing, delivery, returns, account use, and content ownership work on Doshok.",
    alternates: { canonical: `${SITE_URL}/terms` },
    openGraph: { title: "Terms & Conditions – Doshok", description: "Clear terms for confident shopping. These terms explain how purchases, pricing, delivery, returns, account use, and content ownership work on Doshok.", url: `${SITE_URL}/terms` },
    twitter: { card: "summary_large_image", title: "Terms & Conditions – Doshok", description: "Clear terms for confident shopping. These terms explain how purchases, pricing, delivery, returns, account use, and content ownership work on Doshok." },
  }
}

export default async function TermsPage() {
  const cmsPage = await getCmsPageData("terms")
  return <InfoPage page={cmsPage ?? termsPage} />
}
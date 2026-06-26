import type { Metadata } from "next"
import { InfoPage } from "@/components/store/info-page"
import { returnsPage } from "@/lib/info-pages"
import { getCmsPageData } from "@/lib/cms-pages"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://doshok.com"

export async function generateMetadata(): Promise<Metadata> {
  const cmsPage = await getCmsPageData("returns")
  if (cmsPage) {
    return {
      title: `Return Policy – Doshok`,
      description: cmsPage.description,
      alternates: { canonical: `${SITE_URL}/returns` },
      openGraph: { title: `Return Policy – Doshok`, description: cmsPage.description, url: `${SITE_URL}/returns` },
      twitter: { card: "summary_large_image", title: `Return Policy – Doshok`, description: cmsPage.description },
    }
  }
  return {
    title: "Return Policy – Doshok",
    description: "Easy exchanges, clear rules. Doshok supports practical returns and exchanges for eligible items within 7 days of delivery.",
    alternates: { canonical: `${SITE_URL}/returns` },
    openGraph: { title: "Return Policy – Doshok", description: "Easy exchanges, clear rules. Doshok supports practical returns and exchanges for eligible items within 7 days of delivery.", url: `${SITE_URL}/returns` },
    twitter: { card: "summary_large_image", title: "Return Policy – Doshok", description: "Easy exchanges, clear rules. Doshok supports practical returns and exchanges for eligible items within 7 days of delivery." },
  }
}

export default async function ReturnsPage() {
  const cmsPage = await getCmsPageData("returns")
  return <InfoPage page={cmsPage ?? returnsPage} />
}

import type { Metadata } from "next"
import { InfoPage } from "@/components/store/info-page"
import { shippingPage } from "@/lib/info-pages"
import { getCmsPageData } from "@/lib/cms-pages"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://doshok.com"

export async function generateMetadata(): Promise<Metadata> {
  const cmsPage = await getCmsPageData("delivery")
  if (cmsPage) {
    return {
      title: `Delivery Policy – Doshok`,
      description: cmsPage.description,
      alternates: { canonical: `${SITE_URL}/delivery` },
      openGraph: { title: `Delivery Policy – Doshok`, description: cmsPage.description, url: `${SITE_URL}/delivery` },
      twitter: { card: "summary_large_image", title: `Delivery Policy – Doshok`, description: cmsPage.description },
    }
  }
  return {
    title: "Delivery Policy – Doshok",
    description: "Reliable delivery across Bangladesh. See delivery timelines, fees, packaging notes, and tracking guidance for Doshok orders.",
    alternates: { canonical: `${SITE_URL}/delivery` },
    openGraph: { title: "Delivery Policy – Doshok", description: "Reliable delivery across Bangladesh. See delivery timelines, fees, packaging notes, and tracking guidance for Doshok orders.", url: `${SITE_URL}/delivery` },
    twitter: { card: "summary_large_image", title: "Delivery Policy – Doshok", description: "Reliable delivery across Bangladesh. See delivery timelines, fees, packaging notes, and tracking guidance for Doshok orders." },
  }
}

export default async function DeliveryPage() {
  const cmsPage = await getCmsPageData("delivery")
  return <InfoPage page={cmsPage ?? shippingPage} />
}

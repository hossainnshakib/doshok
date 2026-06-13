import type { Metadata } from "next"
import { InfoPage } from "@/components/store/info-page"
import { shippingPage } from "@/lib/info-pages"
import { getCmsPageData } from "@/lib/cms-pages"

export async function generateMetadata(): Promise<Metadata> {
  const cmsPage = await getCmsPageData("delivery")
  if (cmsPage) {
    return {
      title: `Delivery Policy — Doshok`,
      description: cmsPage.description,
    }
  }
  return {
    title: "Delivery Policy — Doshok",
    description: "Reliable delivery across Bangladesh. See delivery timelines, fees, packaging notes, and tracking guidance for Doshok orders.",
  }
}

export default async function DeliveryPage() {
  const cmsPage = await getCmsPageData("delivery")
  return <InfoPage page={cmsPage ?? shippingPage} />
}

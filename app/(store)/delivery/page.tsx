import type { Metadata } from "next"
import { InfoPage } from "@/components/store/info-page"
import { shippingPage } from "@/lib/info-pages"

export const metadata: Metadata = {
  title: "Delivery Policy — Doshok",
  description: "Reliable delivery across Bangladesh. See delivery timelines, fees, packaging notes, and tracking guidance for Doshok orders.",
}

export default function DeliveryPage() {
  return <InfoPage page={shippingPage} />
}

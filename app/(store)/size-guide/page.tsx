import type { Metadata } from "next"
import { InfoPage } from "@/components/store/info-page"
import { sizeGuidePage } from "@/lib/info-pages"

export const metadata: Metadata = {
  title: "Size Guide — Doshok",
  description: "Find your best Doshok fit with general measurements for tops, bottoms, and product-specific fit notes.",
}

export default function SizeGuidePage() {
  return <InfoPage page={sizeGuidePage} />
}

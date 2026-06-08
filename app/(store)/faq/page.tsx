import type { Metadata } from "next"
import { InfoPage } from "@/components/store/info-page"
import { faqPage } from "@/lib/info-pages"

export const metadata: Metadata = {
  title: "FAQ — Doshok",
  description: "Find quick answers about orders, delivery, returns, payment, sizing, account support, and Doshok shopping basics.",
}

export default function FAQPage() {
  return <InfoPage page={faqPage} />
}

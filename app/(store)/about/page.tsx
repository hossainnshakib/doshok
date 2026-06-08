import type { Metadata } from "next"
import { InfoPage } from "@/components/store/info-page"
import { aboutPage } from "@/lib/info-pages"

export const metadata: Metadata = {
  title: "About — Doshok",
  description: "A wardrobe built in Bangladesh. Doshok is a single-house fashion label crafting clean essentials and occasion pieces for modern Bangladeshi life.",
}

export default function AboutPage() {
  return <InfoPage page={aboutPage} />
}

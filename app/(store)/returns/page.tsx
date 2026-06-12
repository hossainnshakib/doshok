import type { Metadata } from "next"
import { InfoPage } from "@/components/store/info-page"
import { returnsPage } from "@/lib/info-pages"

export const metadata: Metadata = {
  title: "Return Policy — Doshok",
  description: "Easy exchanges, clear rules. Doshok supports practical returns and exchanges for eligible items within 7 days of delivery.",
}

export default function ReturnsPage() {
  return <InfoPage page={returnsPage} />
}

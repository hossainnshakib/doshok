import type { Metadata } from "next"
import { InfoPage } from "@/components/store/info-page"
import { termsPage } from "@/lib/info-pages"

export const metadata: Metadata = {
  title: "Terms & Conditions — Doshok",
  description: "Clear terms for confident shopping. These terms explain how purchases, pricing, delivery, returns, account use, and content ownership work on Doshok.",
}

export default function TermsPage() {
  return <InfoPage page={termsPage} />
}

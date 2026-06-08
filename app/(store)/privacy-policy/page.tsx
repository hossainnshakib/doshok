import type { Metadata } from "next"
import { InfoPage } from "@/components/store/info-page"
import { privacyPage } from "@/lib/info-pages"

export const metadata: Metadata = {
  title: "Privacy Policy — Doshok",
  description: "Your data deserves careful handling. This policy explains what we collect, why, how we protect it, and how to contact Doshok about privacy requests.",
}

export default function PrivacyPolicyPage() {
  return <InfoPage page={privacyPage} />
}

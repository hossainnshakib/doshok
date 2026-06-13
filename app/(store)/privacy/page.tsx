import type { Metadata } from "next"
import { InfoPage } from "@/components/store/info-page"
import { privacyPage } from "@/lib/info-pages"
import { getCmsPageData } from "@/lib/cms-pages"

export async function generateMetadata(): Promise<Metadata> {
  const cmsPage = await getCmsPageData("privacy")
  if (cmsPage) {
    return {
      title: `Privacy Policy — Doshok`,
      description: cmsPage.description,
    }
  }
  return {
    title: "Privacy Policy — Doshok",
    description: "Your data deserves careful handling. This policy explains what we collect, why, how we protect it, and how to contact Doshok about privacy requests.",
  }
}

export default async function PrivacyPage() {
  const cmsPage = await getCmsPageData("privacy")
  return <InfoPage page={cmsPage ?? privacyPage} />
}

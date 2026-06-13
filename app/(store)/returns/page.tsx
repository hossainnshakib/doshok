import type { Metadata } from "next"
import { InfoPage } from "@/components/store/info-page"
import { returnsPage } from "@/lib/info-pages"
import { getCmsPageData } from "@/lib/cms-pages"

export async function generateMetadata(): Promise<Metadata> {
  const cmsPage = await getCmsPageData("returns")
  if (cmsPage) {
    return {
      title: `Return Policy — Doshok`,
      description: cmsPage.description,
    }
  }
  return {
    title: "Return Policy — Doshok",
    description: "Easy exchanges, clear rules. Doshok supports practical returns and exchanges for eligible items within 7 days of delivery.",
  }
}

export default async function ReturnsPage() {
  const cmsPage = await getCmsPageData("returns")
  return <InfoPage page={cmsPage ?? returnsPage} />
}

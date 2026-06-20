import type { Metadata } from "next"
import { prisma } from "@/lib/prisma"
import { InfoPage } from "@/components/store/info-page"
import { sizeGuidePage } from "@/lib/info-pages"
import { getCmsPageData } from "@/lib/cms-pages"
import type { InfoPageData, InfoPageSection } from "@/components/store/info-page"

export async function generateMetadata(): Promise<Metadata> {
  const cmsPage = await getCmsPageData("size-guide")
  if (cmsPage) {
    return {
      title: `${cmsPage.title} — Doshok`,
      description: cmsPage.description,
    }
  }
  return {
    title: "Size Guide — Doshok",
    description: "Find your best Doshok fit with general measurements for tops, bottoms, and product-specific fit notes.",
  }
}

export default async function SizeGuidePage() {
  const [cmsPage, sizeCharts] = await Promise.all([
    getCmsPageData("size-guide"),
    prisma.sizeChart.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        rows: { orderBy: { position: "asc" } },
        _count: { select: { products: true } },
      },
    }),
  ])

  const editorial = cmsPage ?? sizeGuidePage

  const chartSections: InfoPageSection[] = sizeCharts.length > 0
    ? sizeCharts.map((chart) => ({
        id: `chart-${chart.slug}`,
        title: chart.name,
        eyebrow: chart._count.products > 0 ? `${chart._count.products} product${chart._count.products === 1 ? "" : "s"}` : undefined,
        body: chart.description ? [chart.description] : undefined,
        table: (() => {
          const allKeys = new Set<string>()
          chart.rows.forEach((row) => {
            const m = row.measurements as Record<string, number>
            if (m) Object.keys(m).forEach((k) => allKeys.add(k))
          })
          const keys = Array.from(allKeys)
          return {
            headers: ["Size", ...keys],
            rows: chart.rows
              .filter((r) => r.label.trim())
              .sort((a, b) => a.position - b.position)
              .map((r) => {
                const m = r.measurements as Record<string, number>
                return [r.label, ...keys.map((k) => (m?.[k] != null ? String(m[k]) : "—"))]
              }),
          }
        })(),
      }))
    : [
        {
          id: "no-charts",
          title: "Size Charts",
          body: [
            "No size charts have been created yet. Product-specific sizing information will appear here once charts are added.",
          ],
        },
      ]

  const merged: InfoPageData = {
    ...editorial,
    sections: [...editorial.sections, ...chartSections],
  }

  return <InfoPage page={merged} />
}

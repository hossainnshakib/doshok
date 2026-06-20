import { prisma } from "@/lib/prisma"
import type { InfoPageData } from "@/components/store/info-page"

export async function getCmsPageData(slug: string): Promise<InfoPageData | null> {
  const page = await prisma.page.findUnique({
    where: { slug, status: "active" },
    select: { content: true },
  })

  if (!page?.content) return null

  const trimmed = page.content.trim()
  if (!trimmed.startsWith("{")) return null

  try {
    const data = JSON.parse(trimmed)
    if (data && typeof data === "object" && data.title) {
      if (data.sections !== undefined && !Array.isArray(data.sections)) return null
      return data as InfoPageData
    }
  } catch { }

  return null
}
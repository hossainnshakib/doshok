import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { success, error } from "@/lib/api-response"

export async function GET() {
  const config = await prisma.homepageConfig.findUnique({
    where: { id: "homepage" },
  })
  if (!config) return success(null)

  let featuredIds: string[] = []
  try {
    const parsed = JSON.parse(config.featuredIds)
    if (Array.isArray(parsed)) featuredIds = parsed
  } catch {}

  return success({
    ...config,
    featuredIds,
  })
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const featuredIds = Array.isArray(body.featuredIds)
      ? JSON.stringify(body.featuredIds)
      : body.featuredIds ?? "[]"
    const config = await prisma.homepageConfig.upsert({
      where: { id: "homepage" },
      update: {
        heroTitle: body.heroTitle,
        heroSubtitle: body.heroSubtitle,
        heroImage: body.heroImage,
        featuredIds,
      },
      create: {
        id: "homepage",
        heroTitle: body.heroTitle ?? "Doshok — Style That Speaks",
        heroSubtitle: body.heroSubtitle ?? "Premium Bangladeshi fashion.",
        heroImage: body.heroImage,
        featuredIds,
      },
    })
    return success(config)
  } catch {
    return error("Failed to update homepage")
  }
}

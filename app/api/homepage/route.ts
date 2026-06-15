import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { success, error } from "@/lib/api-response"
import { auth } from "@/lib/auth"

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
    const session = await auth()
    if (!session?.user) return error("Unauthorized", 401)
    if (session.user.role !== "admin") return error("Forbidden", 403)

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
        heroCTAText: body.heroCTAText,
        heroCTASecondaryText: body.heroCTASecondaryText,
        featuredIds,
        announcementBarText: body.announcementBarText ?? "",
        announcementBarEnabled: body.announcementBarEnabled ?? false,
        promoBannerText: body.promoBannerText ?? "",
        promoBannerImage: body.promoBannerImage ?? "",
        promoBannerLink: body.promoBannerLink ?? "",
        promoBannerEnabled: body.promoBannerEnabled ?? false,
      },
      create: {
        id: "homepage",
        heroTitle: body.heroTitle ?? "Doshok — Style That Speaks",
        heroSubtitle: body.heroSubtitle ?? "Premium Bangladeshi fashion.",
        heroImage: body.heroImage,
        heroCTAText: body.heroCTAText ?? "Shop Collection",
        heroCTASecondaryText: body.heroCTASecondaryText ?? "About Us",
        featuredIds,
        announcementBarText: body.announcementBarText ?? "",
        announcementBarEnabled: body.announcementBarEnabled ?? false,
        promoBannerText: body.promoBannerText ?? "",
        promoBannerImage: body.promoBannerImage ?? "",
        promoBannerLink: body.promoBannerLink ?? "",
        promoBannerEnabled: body.promoBannerEnabled ?? false,
      },
    })
    return success(config)
  } catch {
    return error("Failed to update homepage")
  }
}

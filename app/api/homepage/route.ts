import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { success, error } from "@/lib/api-response"
import { requireAdminPermission } from "@/lib/auth/admin"
import { parseSections, SECTION_TYPES } from "@/lib/homepage-sections"
import type { HomepageSection } from "@/lib/homepage-sections"
import { revalidatePath } from "next/cache"

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

  const sections = parseSections(config.sections)

  return success({
    ...config,
    featuredIds,
    sections,
  })
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireAdminPermission("cms")
    if (session instanceof NextResponse) return session

    const body = await request.json()
    const featuredIds = Array.isArray(body.featuredIds)
      ? JSON.stringify(body.featuredIds)
      : body.featuredIds ?? "[]"

    let sectionsJson = body.sections ?? "[]"
    if (Array.isArray(body.sections)) {
      const valid = body.sections.every(
        (s: HomepageSection) =>
          s &&
          typeof s === "object" &&
          typeof s.type === "string" &&
          SECTION_TYPES.includes(s.type as HomepageSection["type"]),
      )
      if (valid) {
        sectionsJson = JSON.stringify(body.sections)
      }
    }

    const config = await prisma.homepageConfig.upsert({
      where: { id: "homepage" },
      update: {
        heroTitle: body.heroTitle,
        heroSubtitle: body.heroSubtitle,
        heroImage: body.heroImage,
        heroCTAText: body.heroCTAText,
        heroCTASecondaryText: body.heroCTASecondaryText,
        heroCTAUrl: body.heroCTAUrl ?? "/products",
        heroCTASecondaryUrl: body.heroCTASecondaryUrl ?? "/new-arrivals",
        featuredIds,
        announcementBarText: body.announcementBarText ?? "",
        announcementBarEnabled: body.announcementBarEnabled ?? false,
        promoBannerText: body.promoBannerText ?? "",
        promoBannerImage: body.promoBannerImage ?? "",
        promoBannerLink: body.promoBannerLink ?? "",
        promoBannerEnabled: body.promoBannerEnabled ?? false,
        sections: sectionsJson,
      },
      create: {
        id: "homepage",
        heroTitle: body.heroTitle ?? "Doshok — Style That Speaks",
        heroSubtitle: body.heroSubtitle ?? "Premium Bangladeshi fashion.",
        heroImage: body.heroImage,
        heroCTAText: body.heroCTAText ?? "Shop Collection",
        heroCTASecondaryText: body.heroCTASecondaryText ?? "About Us",
        heroCTAUrl: body.heroCTAUrl ?? "/products",
        heroCTASecondaryUrl: body.heroCTASecondaryUrl ?? "/new-arrivals",
        featuredIds,
        announcementBarText: body.announcementBarText ?? "",
        announcementBarEnabled: body.announcementBarEnabled ?? false,
        promoBannerText: body.promoBannerText ?? "",
        promoBannerImage: body.promoBannerImage ?? "",
        promoBannerLink: body.promoBannerLink ?? "",
        promoBannerEnabled: body.promoBannerEnabled ?? false,
        sections: sectionsJson,
      },
    })
    revalidatePath("/", "page")
    return success(config)
  } catch {
    return error("Failed to update homepage")
  }
}

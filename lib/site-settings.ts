import { prisma } from "@/lib/prisma"

export type SiteSettingsData = {
  brandName: string
  tagline: string
  supportEmail: string
  phone: string
  whatsapp: string | null
  facebookUrl: string | null
  instagramUrl: string | null
  tiktokUrl: string | null
  youtubeUrl: string | null
  address: string
  footerText: string
  topbarText: string
  accentColor: string
  storefrontTone: string
  headerLogo: string | null
  footerLogo: string | null
  favicon: string | null
  appleTouchIcon: string | null
  defaultSeoTitle: string | null
  defaultSeoDescription: string | null
  defaultSeoImage: string | null
  defaultSeoKeywords: string | null
}

export async function getSiteSettings(): Promise<SiteSettingsData | null> {
  try {
    let settings = await prisma.siteSettings.findUnique({
      where: { id: "default" },
    })
    if (!settings) {
      settings = await prisma.siteSettings.create({ data: { id: "default" } })
    }
    return settings as unknown as SiteSettingsData
  } catch {
    return null
  }
}

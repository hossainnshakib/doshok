import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { success, error } from "@/lib/api-response"
import { auth } from "@/lib/auth"
import type { LegacyFooterLink, LegacyHeaderQuickLink } from "@/types"

function getLabelFromHref(href: string): string {
  const map: Record<string, string> = {
    "/products": "Products",
    "/new-arrivals": "New Arrivals",
    "/about": "About Doshok",
    "/contact": "Contact",
    "/faq": "FAQ",
    "/size-guide": "Size Guide",
    "/care-guide": "Care Guide",
    "/track-order": "Track Order",
    "/privacy": "Privacy Policy",
    "/terms": "Terms",
    "/return-policy": "Return Policy",
    "/delivery": "Delivery",
    "/shipping": "Shipping",
    "/cookies": "Cookies",
    "/help": "Help",
    "/policy": "Policy",
    "/stories": "Stories",
  }
  return map[href] || href.replace("/", "").replace(/-/g, " ")
}

export async function POST() {
  const session = await auth()
  if (!session?.user) return error("Unauthorized", 401)

  let settings = await prisma.siteSettings.findUnique({ where: { id: "default" } })
  if (!settings) {
    settings = await prisma.siteSettings.create({ data: { id: "default" } })
  }

  const existingItems = await prisma.menuItem.findMany()
  const existingKeys = new Set(
    existingItems.map((i) => `${i.location}::${i.title}::${i.url}`)
  )

  const imported: string[] = []
  const skipped: string[] = []

  let headerQuickLinks: LegacyHeaderQuickLink[] = []
  try {
    headerQuickLinks = JSON.parse(settings.headerQuickLinks || "[]")
  } catch {}

  for (let i = 0; i < headerQuickLinks.length; i++) {
    const href = headerQuickLinks[i]
    if (typeof href !== "string" || !href.trim()) continue
    const title = getLabelFromHref(href.trim())
    const key = `desktop::${title}::${href.trim()}`
    if (existingKeys.has(key)) {
      skipped.push(`desktop: ${title} (${href})`)
      continue
    }
    await prisma.menuItem.create({
      data: {
        title,
        url: href.trim(),
        target: "_self",
        location: "desktop",
        order: i,
      },
    })
    existingKeys.add(key)
    imported.push(`desktop: ${title} (${href})`)
  }

  let footerLinks: LegacyFooterLink[] = []
  try {
    footerLinks = JSON.parse(settings.footerLinks || "[]")
  } catch {}

  const groupOrder: Record<string, number> = { Shop: 0, Help: 1, Policy: 2 }
  const parentByGroup: Record<string, string> = {}

  for (const link of footerLinks) {
    if (!link.group || !link.label?.trim() || !link.href?.trim()) continue
    const group = link.group.trim()
    if (!parentByGroup[group]) {
      const parentKey = `footer::${group}::#`
      if (!existingKeys.has(parentKey)) {
        const parent = await prisma.menuItem.create({
          data: {
            title: group,
            url: "#",
            target: "_self",
            location: "footer",
            order: groupOrder[group] ?? 99,
          },
        })
        existingKeys.add(parentKey)
        parentByGroup[group] = parent.id
        imported.push(`footer parent: ${group}`)
      } else {
        const existing = existingItems.find(
          (i) => i.location === "footer" && i.title === group && i.url === "#"
        )
        parentByGroup[group] = existing?.id ?? ""
      }
    }
  }

  for (let i = 0; i < footerLinks.length; i++) {
    const link = footerLinks[i]
    if (!link.label?.trim() || !link.href?.trim()) continue
    const group = link.group?.trim() || "More"
    if (!parentByGroup[group]) {
      const parentKey = `footer::More::#`
      if (!existingKeys.has(parentKey)) {
        const parent = await prisma.menuItem.create({
          data: {
            title: "More",
            url: "#",
            target: "_self",
            location: "footer",
            order: 99,
          },
        })
        existingKeys.add(parentKey)
        parentByGroup[group] = parent.id
        imported.push("footer parent: More")
      } else {
        const existing = existingItems.find(
          (i) => i.location === "footer" && i.title === "More" && i.url === "#"
        )
        parentByGroup[group] = existing?.id ?? ""
      }
    }
    const parentId = parentByGroup[group]
    const title = link.label.trim()
    const href = link.href.trim()
    const key = `footer::${title}::${href}`
    if (existingKeys.has(key)) {
      skipped.push(`footer: ${title} (${href})`)
      continue
    }
    await prisma.menuItem.create({
      data: {
        title,
        url: href,
        target: "_self",
        location: "footer",
        parentId: parentId || null,
        order: i,
      },
    })
    existingKeys.add(key)
    imported.push(`footer: ${title} (${href})`)
  }

  return success({
    imported: imported.length,
    skipped: skipped.length,
    details: { imported, skipped },
  })
}
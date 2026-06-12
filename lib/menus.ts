import { prisma } from "@/lib/prisma"
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

export { getLabelFromHref }

export type MenuItemData = {
  id: string
  title: string
  url: string
  target: string
  order: number
  parentId: string | null
  children: MenuItemData[]
}

function buildTree(items: MenuItemData[]): MenuItemData[] {
  const map = new Map<string, MenuItemData>()
  const roots: MenuItemData[] = []

  items.forEach((item) => {
    map.set(item.id, { ...item, children: [] })
  })

  items.forEach((item) => {
    const node = map.get(item.id)!
    if (item.parentId && map.has(item.parentId)) {
      map.get(item.parentId)!.children.push(node)
    } else {
      roots.push(node)
    }
  })

  return roots
}

export async function getMenuItems(location: string): Promise<MenuItemData[]> {
  try {
    const items = await prisma.menuItem.findMany({
      where: { location },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    })
    return buildTree(items.map(item => ({
      id: item.id,
      title: item.title,
      url: item.url,
      target: item.target,
      order: item.order,
      parentId: item.parentId,
      children: [],
    })))
  } catch {
    return []
  }
}

export async function getDesktopMenu(): Promise<MenuItemData[]> {
  return getMenuItems("desktop")
}

export async function getMobileMenu(): Promise<MenuItemData[]> {
  return getMenuItems("mobile")
}

export async function getFooterMenu(): Promise<MenuItemData[]> {
  return getMenuItems("footer")
}
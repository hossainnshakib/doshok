import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { success, error } from "@/lib/api-response"
import { requireAdminPermission } from "@/lib/auth/admin"

function buildTree(items: any[]) {
  const map = new Map<string, any>()
  const roots: any[] = []
  items.forEach(item => {
    map.set(item.id, { ...item, children: [] })
  })
  items.forEach(item => {
    const node = map.get(item.id)!
    if (item.parentId && map.has(item.parentId)) {
      map.get(item.parentId)!.children.push(node)
    } else {
      roots.push(node)
    }
  })
  return roots
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const location = searchParams.get("location")

  const where = location ? { location } : {}

  const items = await prisma.menuItem.findMany({
    where,
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  })

  if (location) {
    return success(buildTree(items))
  }

  const locations = ["desktop", "mobile", "footer"]
  const result: Record<string, any[]> = {}
  for (const loc of locations) {
    const locItems = items.filter(i => i.location === loc)
    result[loc] = buildTree(locItems)
  }
  return success(result)
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdminPermission("cms")
    if (session instanceof NextResponse) return session

    const body = await request.json()
    if (!body.title || !body.url || !body.location) {
      return error("title, url, and location are required")
    }

    const item = await prisma.menuItem.create({
      data: {
        title: body.title,
        url: body.url,
        target: body.target ?? "_self",
        location: body.location,
        parentId: body.parentId ?? null,
        order: body.order ?? 0,
      },
    })
    return success(item, 201)
  } catch {
    return error("Failed to create menu item")
  }
}

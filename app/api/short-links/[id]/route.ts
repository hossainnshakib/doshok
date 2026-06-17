import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { shortLinkSchema } from "@/lib/validations"

const RESERVED_SLUGS = [
  "admin", "api", "account", "auth", "checkout", "cart",
  "products", "stories", "p", "l", "go", "feed",
  "order", "search", "track-order",
]

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }
    if (session.user.role !== "admin") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()

    if (body.slug) {
      if (RESERVED_SLUGS.includes(body.slug)) {
        return NextResponse.json({ success: false, error: "This slug is reserved" }, { status: 400 })
      }

      const existing = await prisma.shortLink.findFirst({ where: { slug: body.slug, id: { not: id } } })
      if (existing) {
        return NextResponse.json({ success: false, error: "Slug already in use" }, { status: 409 })
      }
    }

    const link = await prisma.shortLink.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.slug !== undefined && { slug: body.slug }),
        ...(body.destinationUrl !== undefined && { destinationUrl: body.destinationUrl }),
        ...(body.type !== undefined && { type: body.type }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.utmSource !== undefined && { utmSource: body.utmSource || null }),
        ...(body.utmMedium !== undefined && { utmMedium: body.utmMedium || null }),
        ...(body.utmCampaign !== undefined && { utmCampaign: body.utmCampaign || null }),
        ...(body.nofollow !== undefined && { nofollow: body.nofollow }),
        ...(body.expiresAt !== undefined && { expiresAt: body.expiresAt ? new Date(body.expiresAt) : null }),
      },
    })

    return NextResponse.json({ success: true, data: link })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to update short link" }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }
    if (session.user.role !== "admin") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params
    await prisma.shortLink.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to delete short link" }, { status: 500 })
  }
}

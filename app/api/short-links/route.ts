import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { shortLinkSchema } from "@/lib/validations"

const RESERVED_SLUGS = [
  "admin", "api", "account", "auth", "checkout", "cart",
  "products", "stories", "p", "l", "go", "feed",
  "order", "search", "track-order",
]

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
    }

    const links = await prisma.shortLink.findMany({
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ success: true, data: links })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to fetch short links" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }
    if (session.user.role !== "admin") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
    }

    const body = await req.json()
    const parsed = shortLinkSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message ?? "Validation failed" }, { status: 400 })
    }

    const { title, slug, destinationUrl, type, status, utmSource, utmMedium, utmCampaign, nofollow, expiresAt } = parsed.data

    if (RESERVED_SLUGS.includes(slug)) {
      return NextResponse.json({ success: false, error: "This slug is reserved" }, { status: 400 })
    }

    const existing = await prisma.shortLink.findUnique({ where: { slug } })
    if (existing) {
      return NextResponse.json({ success: false, error: "A short link with this slug already exists" }, { status: 409 })
    }

    const link = await prisma.shortLink.create({
      data: {
        title,
        slug,
        destinationUrl,
        type,
        status: status ?? "active",
        utmSource: utmSource || null,
        utmMedium: utmMedium || null,
        utmCampaign: utmCampaign || null,
        nofollow: nofollow ?? false,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    })

    return NextResponse.json({ success: true, data: link })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to create short link" }, { status: 500 })
  }
}

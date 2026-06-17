import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

    const link = await prisma.shortLink.findUnique({ where: { slug } })

    if (!link) {
      return NextResponse.redirect(new URL("/", _req.url))
    }

    if (link.status !== "active") {
      return NextResponse.redirect(new URL("/", _req.url))
    }

    if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
      return NextResponse.redirect(new URL("/", _req.url))
    }

    await prisma.shortLink.update({
      where: { id: link.id },
      data: {
        clickCount: { increment: 1 },
        lastClickedAt: new Date(),
      },
    })

    let destination = link.destinationUrl

    const utmParams: string[] = []
    if (link.utmSource) utmParams.push(`utm_source=${encodeURIComponent(link.utmSource)}`)
    if (link.utmMedium) utmParams.push(`utm_medium=${encodeURIComponent(link.utmMedium)}`)
    if (link.utmCampaign) utmParams.push(`utm_campaign=${encodeURIComponent(link.utmCampaign)}`)

    if (utmParams.length > 0) {
      const separator = destination.includes("?") ? "&" : "?"
      destination = `${destination}${separator}${utmParams.join("&")}`
    }

    if (link.type === "internal") {
      return NextResponse.redirect(new URL(destination, _req.url), 302)
    }

    return NextResponse.redirect(destination, 302)
  } catch {
    return NextResponse.redirect(new URL("/", _req.url))
  }
}

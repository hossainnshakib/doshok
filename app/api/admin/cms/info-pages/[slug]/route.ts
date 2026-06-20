import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminPermission } from "@/lib/auth/admin"
import {
  aboutPage,
  accessibilityPage,
  careGuidePage,
  cookiesPage,
  faqPage,
  privacyPage,
  returnsPage,
  shippingPage,
  sizeGuidePage,
  storiesPage,
  termsPage,
} from "@/lib/info-pages"
import type { InfoPageData } from "@/components/store/info-page"

const PAGE_DEFAULTS: Record<string, InfoPageData> = {
  about: aboutPage,
  accessibility: accessibilityPage,
  "care-guide": careGuidePage,
  cookies: cookiesPage,
  faq: faqPage,
  privacy: privacyPage,
  returns: returnsPage,
  delivery: shippingPage,
  "size-guide": sizeGuidePage,
  stories: storiesPage,
  terms: termsPage,
}

const INFO_PAGE_SLUGS = ["about", "terms", "delivery", "faq", "care-guide", "privacy", "returns", "cookies", "accessibility", "size-guide"]

const RESERVED_SLUGS = [...INFO_PAGE_SLUGS, "privacy-policy", "return-policy"]

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await requireAdminPermission("cms")
    if (session instanceof NextResponse) return session

    const { slug } = await params

    if (!RESERVED_SLUGS.includes(slug)) {
      return NextResponse.json({ success: false, error: "Unknown info page" }, { status: 404 })
    }

    const dbPage = await prisma.page.findUnique({ where: { slug } })
    const defaultData = PAGE_DEFAULTS[slug]

    let data: InfoPageData
    if (dbPage?.content?.trim().startsWith("{")) {
      try {
        data = JSON.parse(dbPage.content) as InfoPageData
      } catch {
        data = defaultData
      }
    } else {
      data = defaultData
    }

    return NextResponse.json({
      success: true,
      data: {
        slug,
        dbId: dbPage?.id ?? null,
        infoPageData: data,
      },
    })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to fetch info page" }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await requireAdminPermission("cms")
    if (session instanceof NextResponse) return session

    const { slug } = await params

    if (!RESERVED_SLUGS.includes(slug)) {
      return NextResponse.json({ success: false, error: "Unknown info page" }, { status: 404 })
    }

    const body = await req.json()
    const { title, infoPageData } = body

    if (!infoPageData) {
      return NextResponse.json({ success: false, error: "infoPageData is required" }, { status: 400 })
    }

    const content = JSON.stringify(infoPageData)

    const existing = await prisma.page.findUnique({ where: { slug } })

    if (existing) {
      await prisma.page.update({
        where: { id: existing.id },
        data: {
          title: title ?? slug,
          slug,
          content,
          status: "active",
        },
      })
    } else {
      await prisma.page.create({
        data: {
          title: title ?? slug,
          slug,
          content,
          status: "active",
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to save info page" }, { status: 500 })
  }
}

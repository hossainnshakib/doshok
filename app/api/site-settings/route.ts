import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { siteSettingsSchema } from "@/lib/validations"
import { requireAdminPermission } from "@/lib/auth/admin"

export async function GET() {
  try {
    let settings = await prisma.siteSettings.findUnique({
      where: { id: "default" },
    })
    if (!settings) {
      settings = await prisma.siteSettings.create({ data: { id: "default" } })
    }
    return NextResponse.json({ success: true, data: settings })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to fetch settings" }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireAdminPermission("settings")
    if (session instanceof NextResponse) return session

    const body = await request.json()
    const parsed = siteSettingsSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message ?? "Invalid data" }, { status: 400 })
    }

    const { footerLinks, headerQuickLinks, ...rest } = parsed.data
    const settings = await prisma.siteSettings.upsert({
      where: { id: "default" },
      update: { ...rest, footerLinks: footerLinks ?? "[]", headerQuickLinks: headerQuickLinks ?? "[]" },
      create: { id: "default", ...rest, footerLinks: footerLinks ?? "[]", headerQuickLinks: headerQuickLinks ?? "[]" },
    })

    return NextResponse.json({ success: true, data: settings })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to update settings" }, { status: 500 })
  }
}

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { z } from "zod"

const PAYMENT_RULES = ["cod_only", "full", "partial_percent", "fixed_advance", "delivery_charge_only"] as const

const updateSchema = z.object({
  checkoutV2Enabled: z.boolean().optional(),
  otpRequired: z.boolean().optional(),
  otpTtlSeconds: z.number().int().min(30).max(3600).optional(),
  otpCooldownSeconds: z.number().int().min(5).max(300).optional(),
  otpMaxResend: z.number().int().min(1).max(50).optional(),
  checkoutTokenTtlSeconds: z.number().int().min(60).max(7200).optional(),
  defaultPaymentRule: z.enum(PAYMENT_RULES).optional(),
  defaultPaymentRuleValue: z.number().int().min(0).nullable().optional(),
  onlineReservationHours: z.number().int().min(1).max(168).optional(),
  codReservationHours: z.number().int().min(1).max(720).optional(),
})

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }
    if (session.user.role !== "admin") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
    }

    let settings = await prisma.checkoutSetting.findUnique({
      where: { id: "checkout" },
    })
    if (!settings) {
      settings = await prisma.checkoutSetting.create({ data: { id: "checkout" } })
    }
    return NextResponse.json({ success: true, data: settings })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to fetch checkout settings" }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }
    if (session.user.role !== "admin") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message ?? "Invalid data" }, { status: 400 })
    }

    if (parsed.data.defaultPaymentRule === "partial_percent" && parsed.data.defaultPaymentRuleValue != null) {
      if (parsed.data.defaultPaymentRuleValue < 0 || parsed.data.defaultPaymentRuleValue > 100) {
        return NextResponse.json({ success: false, error: "Partial percent must be between 0 and 100" }, { status: 400 })
      }
    }

    const settings = await prisma.checkoutSetting.upsert({
      where: { id: "checkout" },
      update: parsed.data,
      create: { id: "checkout", ...parsed.data },
    })

    return NextResponse.json({ success: true, data: settings })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to update checkout settings" }, { status: 500 })
  }
}

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { requireAdminPermission } from "@/lib/auth/admin"

const PAYMENT_RULES = ["cod_only", "full", "partial_percent", "fixed_advance", "delivery_charge_only"] as const
const COD_ONLY_PAYMENT_RULE = "cod_only"

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
    const session = await requireAdminPermission("operations")
    if (session instanceof NextResponse) return session

    let settings = await prisma.checkoutSetting.findUnique({
      where: { id: "checkout" },
    })
    if (!settings) {
      settings = await prisma.checkoutSetting.create({ data: { id: "checkout" } })
    }
    return NextResponse.json({
      success: true,
      data: {
        ...settings,
        defaultPaymentRule: COD_ONLY_PAYMENT_RULE,
        defaultPaymentRuleValue: null,
      },
    })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to fetch checkout settings" }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireAdminPermission("operations")
    if (session instanceof NextResponse) return session

    const body = await request.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message ?? "Invalid data" }, { status: 400 })
    }

    if (parsed.data.defaultPaymentRule && parsed.data.defaultPaymentRule !== COD_ONLY_PAYMENT_RULE) {
      return NextResponse.json(
        { success: false, error: "Doshok V1.1 is COD-only. Advance or online payment rules are paused." },
        { status: 400 },
      )
    }

    const { onlineReservationHours: _onlineReservationHours, ...codCompatibleData } = parsed.data

    const data = {
      ...codCompatibleData,
      defaultPaymentRule: COD_ONLY_PAYMENT_RULE,
      defaultPaymentRuleValue: null,
    }

    const settings = await prisma.checkoutSetting.upsert({
      where: { id: "checkout" },
      update: data,
      create: { id: "checkout", ...data },
    })

    return NextResponse.json({ success: true, data: settings })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to update checkout settings" }, { status: 500 })
  }
}

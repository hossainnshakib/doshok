import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { success, error } from "@/lib/api-response"
import { requireAdminPermission } from "@/lib/auth/admin"
import { z } from "zod"

const couponSchema = z.object({
  code: z.string().min(1).transform((s) => s.toUpperCase()),
  discount: z.number().positive(),
  type: z.enum(["flat", "percent"]).default("flat"),
  scope: z.enum(["product", "delivery"]).default("product"),
  minOrder: z.number().nonnegative().default(0),
  maxUses: z.number().int().positive().optional(),
  maxUsesPerCustomer: z.number().int().positive().optional(),
  expiresAt: z.string().optional(),
  active: z.boolean().default(true),
}).superRefine((data, ctx) => {
  if (data.type === "percent" && data.discount > 100) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Percent discount cannot exceed 100",
      path: ["discount"],
    })
  }
})

export async function GET() {
  const session = await requireAdminPermission("operations")
  if (session instanceof NextResponse) return session

  const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } })
  return success(coupons)
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdminPermission("operations")
    if (session instanceof NextResponse) return session

    const body = await request.json()
    const parsed = couponSchema.safeParse(body)
    if (!parsed.success) return error(parsed.error.issues[0]?.message ?? "Invalid input")

    const coupon = await prisma.coupon.create({
      data: {
        ...parsed.data,
        expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
      },
    })
    return success(coupon, 201)
  } catch {
    return error("Failed to create coupon")
  }
}

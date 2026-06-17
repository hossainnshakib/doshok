import { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { success, error } from "@/lib/api-response"
import { rateLimitByIp } from "@/lib/rate-limit"

export const dynamic = "force-dynamic"

const statusSchema = z.enum(["active", "recovered", "expired"])

const patchSchema = z.object({
  status: statusSchema.optional(),
  lastStep: z.string().trim().max(60).optional(),
})

function isUsable(status: string, expiresAt: Date | null): boolean {
  return ["active", "recovered"].includes(status) && (!expiresAt || expiresAt > new Date())
}

function parseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function stripPaymentData(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value

  const source = value as Record<string, unknown>
  const checkout =
    source.checkout && typeof source.checkout === "object" && !Array.isArray(source.checkout)
      ? { ...(source.checkout as Record<string, unknown>) }
      : null

  if (checkout) {
    delete checkout.paymentMethod
    delete checkout.selectedPaymentMethod
  }

  return {
    ...source,
    ...(checkout ? { checkout } : {}),
  }
}

function isValidToken(token: string): boolean {
  return token.length >= 20 && token.length <= 200
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  if (!isValidToken(token)) return error("Invalid recovery link", 404)

  const draft = await prisma.abandonedCheckout.findUnique({
    where: { token },
    select: {
      token: true,
      cartItems: true,
      checkoutData: true,
      couponCode: true,
      subtotal: true,
      deliveryFee: true,
      discount: true,
      total: true,
      status: true,
      lastStep: true,
      expiresAt: true,
    },
  })

  if (!draft || !isUsable(draft.status, draft.expiresAt)) {
    return error("This recovery link has expired or is no longer available.", 404)
  }

  return success({
    token: draft.token,
    cartItems: parseJson<unknown[]>(draft.cartItems, []),
    checkoutData: stripPaymentData(parseJson<unknown>(draft.checkoutData, null)),
    couponCode: draft.couponCode,
    totals: {
      subtotal: draft.subtotal,
      deliveryFee: draft.deliveryFee,
      discount: draft.discount,
      total: draft.total,
    },
    status: draft.status,
    lastStep: draft.lastStep,
  })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { limited } = rateLimitByIp(request, 60, 60 * 1000)
    if (limited) return error("Too many requests. Please try again later.", 429)

    const { token } = await params
    if (!isValidToken(token)) return error("Invalid recovery link", 404)

    const body = await request.json().catch(() => ({}))
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) return error("Invalid abandoned checkout update")

    const existing = await prisma.abandonedCheckout.findUnique({
      where: { token },
      select: { status: true, expiresAt: true },
    })
    if (!existing || !isUsable(existing.status, existing.expiresAt)) {
      return error("This recovery link has expired or is no longer available.", 404)
    }

    const updated = await prisma.abandonedCheckout.update({
      where: { token },
      data: {
        status: parsed.data.status ?? existing.status,
        lastStep: parsed.data.lastStep,
        lastActivityAt: new Date(),
      },
      select: { token: true, status: true, lastActivityAt: true },
    })

    return success(updated)
  } catch {
    return error("Failed to update abandoned checkout")
  }
}

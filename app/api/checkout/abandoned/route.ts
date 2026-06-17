import { NextRequest } from "next/server"
import { z } from "zod"
import crypto from "crypto"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { success, error } from "@/lib/api-response"
import { rateLimitByIp } from "@/lib/rate-limit"

export const dynamic = "force-dynamic"

const EXPIRES_IN_MS = 7 * 24 * 60 * 60 * 1000

const abandonedSchema = z.object({
  token: z.string().trim().min(20).max(200).optional(),
  cartItems: z.array(z.unknown()).default([]),
  checkoutData: z.unknown().optional(),
  email: z.string().trim().email().optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  name: z.string().trim().max(120).optional().or(z.literal("")),
  couponCode: z.string().trim().max(80).optional().or(z.literal("")),
  subtotal: z.number().int().nonnegative().optional(),
  deliveryFee: z.number().int().nonnegative().optional(),
  discount: z.number().int().nonnegative().optional(),
  total: z.number().int().nonnegative().optional(),
  lastStep: z.string().trim().max(60).optional(),
})

function generateToken() {
  return crypto.randomBytes(32).toString("base64url")
}

function expiryDate() {
  return new Date(Date.now() + EXPIRES_IN_MS)
}

export async function POST(request: NextRequest) {
  try {
    const { limited } = rateLimitByIp(request, 40, 60 * 1000)
    if (limited) return error("Too many requests. Please try again later.", 429)

    const body = await request.json()
    const parsed = abandonedSchema.safeParse(body)
    if (!parsed.success) {
      return error(parsed.error.issues[0]?.message ?? "Invalid abandoned checkout draft")
    }

    const session = await auth()
    const userId = session?.user?.id ?? null
    const input = parsed.data
    const now = new Date()

    const data = {
      userId,
      email: input.email || null,
      phone: input.phone || null,
      name: input.name || null,
      cartItems: JSON.stringify(input.cartItems),
      checkoutData: input.checkoutData === undefined ? null : JSON.stringify(input.checkoutData),
      couponCode: input.couponCode || null,
      subtotal: input.subtotal ?? 0,
      deliveryFee: input.deliveryFee ?? 0,
      discount: input.discount ?? 0,
      total: input.total ?? 0,
      lastStep: input.lastStep || null,
      lastActivityAt: now,
      expiresAt: expiryDate(),
    }

    if (input.token) {
      const existing = await prisma.abandonedCheckout.findUnique({
        where: { token: input.token },
        select: { id: true, userId: true, status: true, expiresAt: true },
      })

      const canUpdate =
        existing &&
        ["active", "recovered"].includes(existing.status) &&
        (!existing.expiresAt || existing.expiresAt > now) &&
        (!existing.userId || !userId || existing.userId === userId)

      if (canUpdate) {
        const updated = await prisma.abandonedCheckout.update({
          where: { token: input.token },
          data: {
            ...data,
            userId: existing.userId ?? userId,
            status: "active",
          },
          select: { token: true, expiresAt: true },
        })
        return success(updated)
      }
    }

    const created = await prisma.abandonedCheckout.create({
      data: {
        ...data,
        token: generateToken(),
        status: "active",
      },
      select: { token: true, expiresAt: true },
    })

    return success(created, 201)
  } catch {
    return error("Failed to save abandoned checkout draft")
  }
}

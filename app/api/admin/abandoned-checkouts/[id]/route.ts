import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { success, error } from "@/lib/api-response"
import { requireAdminPermission } from "@/lib/auth/admin"

export const dynamic = "force-dynamic"

const updateSchema = z.object({
  status: z.enum(["active", "recovered", "converted", "expired"]),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdminPermission("orders")
    if (session instanceof NextResponse) return session

    const body = await request.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) return error("Invalid abandoned checkout status", 400)

    const { id } = await params
    const updated = await prisma.abandonedCheckout.update({
      where: { id },
      data: {
        status: parsed.data.status,
        lastActivityAt: new Date(),
      },
    })

    return success(updated)
  } catch {
    return error("Failed to update abandoned checkout")
  }
}

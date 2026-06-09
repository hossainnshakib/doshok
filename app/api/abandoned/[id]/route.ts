import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { success, error } from "@/lib/api-response"
import { abandonedPublicUpdateSchema, abandonedAdminUpdateSchema } from "@/lib/validations"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return error("Unauthorized", 401)

  const { id } = await params

  try {
    const item = await prisma.abandonedCheckout.findUnique({ where: { id } })
    if (!item) return error("Not found", 404)
    return success(item)
  } catch {
    return error("Failed to fetch abandoned checkout")
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const body = await request.json()

    if (body.draftToken) {
      const parsed = abandonedPublicUpdateSchema.safeParse(body)
      if (!parsed.success) {
return error("Invalid payload: " + parsed.error.issues.map(e => e.message).join(", "))
      }

      const existing = await prisma.abandonedCheckout.findUnique({ where: { id } })
      if (!existing) return error("Not found", 404)
      if (existing.draftToken !== parsed.data.draftToken) {
        return error("Forbidden", 403)
      }

      const { draftToken: _, cartData, selectedVariant, lastSeenAt, ...rest } = parsed.data

      const updateData: Record<string, unknown> = {
        ...rest,
        lastSeenAt: lastSeenAt ? new Date(lastSeenAt) : new Date(),
      }

      if (parsed.data.data !== undefined) {
        updateData.data = typeof parsed.data.data === "string"
          ? parsed.data.data
          : JSON.stringify(parsed.data.data)
      }

      const item = await prisma.abandonedCheckout.update({
        where: { id },
        data: updateData,
      })

      return success({ id: item.id, step: item.step })
    }

    const session = await auth()
    if (!session?.user) return error("Unauthorized", 401)

    const parsed = abandonedAdminUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return error("Invalid payload: " + parsed.error.issues.map(e => e.message).join(", "))
    }

    const item = await prisma.abandonedCheckout.update({
      where: { id },
      data: parsed.data,
    })
    return success({ id: item.id, contacted: item.contacted })
  } catch {
    return error("Failed to update abandoned checkout")
  }
}

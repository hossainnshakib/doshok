import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { addressSchema } from "@/lib/validations"
import { success, error } from "@/lib/api-response"

async function getOwnAddress(addressId: string, userId: string) {
  return prisma.userAddress.findFirst({
    where: { id: addressId, userId },
  })
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return error("Unauthorized", 401)

  const { id } = await params
  const address = await getOwnAddress(id, session.user.id)
  if (!address) return error("Address not found", 404)

  return success(address)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return error("Unauthorized", 401)

  const { id } = await params
  const existing = await getOwnAddress(id, session.user.id)
  if (!existing) return error("Address not found", 404)

  try {
    const body = await request.json()
    const parsed = addressSchema.safeParse(body)
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]
      return error(firstIssue?.message ?? "Invalid input")
    }

    const { isDefault, ...data } = parsed.data

    if (isDefault) {
      await prisma.userAddress.updateMany({
        where: { userId: session.user.id, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      })
    }

    const updated = await prisma.userAddress.update({
      where: { id },
      data: { ...data, isDefault },
    })

    return success(updated)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update address"
    return error(message)
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return error("Unauthorized", 401)

  const { id } = await params
  const existing = await getOwnAddress(id, session.user.id)
  if (!existing) return error("Address not found", 404)

  const wasDefault = existing.isDefault

  await prisma.userAddress.delete({ where: { id } })

  if (wasDefault) {
    const next = await prisma.userAddress.findFirst({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
    })
    if (next) {
      await prisma.userAddress.update({
        where: { id: next.id },
        data: { isDefault: true },
      })
    }
  }

  return success({ deleted: true })
}

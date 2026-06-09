import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { addressSchema } from "@/lib/validations"
import { success, error } from "@/lib/api-response"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return error("Unauthorized", 401)

  const addresses = await prisma.userAddress.findMany({
    where: { userId: session.user.id },
    orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
  })

  return success(addresses)
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return error("Unauthorized", 401)

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
        where: { userId: session.user.id, isDefault: true },
        data: { isDefault: false },
      })
    } else {
      const count = await prisma.userAddress.count({
        where: { userId: session.user.id },
      })
      if (count === 0) {
        await prisma.userAddress.create({
          data: { ...data, isDefault: true, userId: session.user.id },
        })
        return success({ message: "Address created as default (first address)" }, 201)
      }
    }

    const address = await prisma.userAddress.create({
      data: { ...data, isDefault: isDefault ?? false, userId: session.user.id },
    })

    return success(address, 201)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create address"
    return error(message)
  }
}

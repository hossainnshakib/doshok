import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { success, error } from "@/lib/api-response"
import { validateSuccessToken } from "@/lib/checkout/success-token"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  const { orderNumber } = await params
  const { searchParams } = new URL(request.url)
  const token = searchParams.get("token")

  if (!token) {
    return error("Access token is required", 401)
  }

  if (!validateSuccessToken(token, orderNumber)) {
    return error("Invalid or expired access token", 403)
  }

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: {
      items: true,
      address: true,
      transactions: {
        select: { id: true, trxId: true, status: true, amount: true, verifiedAt: true },
        orderBy: { verifiedAt: "desc" },
      },
    },
  })

  if (!order) return error("Not found", 404)

  return success(order)
}

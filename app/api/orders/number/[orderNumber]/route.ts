import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { success, error } from "@/lib/api-response"
import { phonesEqual, getPhoneInputValue } from "@/lib/utils"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  const { orderNumber } = await params
  const { searchParams } = new URL(request.url)
  const phone = searchParams.get("phone")

  if (!phone) {
    return error("Phone number is required for order lookup", 400)
  }

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: {
      items: true,
      address: true,
      transactions: {
        select: {
          id: true,
          trxId: true,
          status: true,
          amount: true,
          verifiedAt: true,
        },
        orderBy: { verifiedAt: "desc" },
      },
    },
  })

  if (!order) return error("Not found", 404)

  const normalizedPhone = getPhoneInputValue(phone)
  if (!phonesEqual(order.customerPhone, normalizedPhone)) {
    return error("Not found", 404)
  }

  return success(order)
}

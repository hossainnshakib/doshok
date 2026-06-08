import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { success, error } from "@/lib/api-response"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const phone = searchParams.get("phone")

  if (phone) {
    const orders = await prisma.order.findMany({
      where: { customerPhone: phone },
      include: { items: true, address: true },
      orderBy: { createdAt: "desc" },
    })
    return success(orders)
  }

  const orders = await prisma.order.findMany({
    include: { items: true, address: true },
    orderBy: { createdAt: "desc" },
  })
  return success(orders)
}

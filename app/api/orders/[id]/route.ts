import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { success, error } from "@/lib/api-response"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true, address: true },
  })

  if (!order) return error("Not found", 404)
  return success(order)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const body = await request.json()
    const order = await prisma.order.update({
      where: { id },
      data: body,
      include: { items: true, address: true },
    })
    return success(order)
  } catch {
    return error("Failed to update order")
  }
}

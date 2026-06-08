import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { success, error } from "@/lib/api-response"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const item = await prisma.abandonedCheckout.update({
      where: { id },
      data: body,
    })
    return success(item)
  } catch {
    return error("Failed to update abandoned checkout")
  }
}

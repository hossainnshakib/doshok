import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { success, error } from "@/lib/api-response"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const abandoned = await prisma.abandonedCheckout.create({ data: body })
    return success(abandoned, 201)
  } catch {
    return error("Failed to save abandoned checkout")
  }
}

export async function GET() {
  const items = await prisma.abandonedCheckout.findMany({
    orderBy: { createdAt: "desc" },
  })
  return success(items)
}

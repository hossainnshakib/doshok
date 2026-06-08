import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { success, error } from "@/lib/api-response"
import { categorySchema } from "@/lib/validations"

export async function GET() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  })
  return success(categories)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = categorySchema.safeParse(body)
    if (!parsed.success) return error(parsed.error.issues[0]?.message ?? "Invalid input")

    const category = await prisma.category.create({ data: parsed.data })
    return success(category, 201)
  } catch {
    return error("Failed to create category")
  }
}

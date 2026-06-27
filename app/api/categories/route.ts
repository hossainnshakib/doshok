import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { success, error } from "@/lib/api-response"
import { categorySchema } from "@/lib/validations"
import { requireAdminPermission } from "@/lib/auth/admin"
import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"

export async function GET() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { products: true } },
      parent: { select: { name: true } },
      children: { select: { id: true, name: true } },
    },
  })
  return success(categories)
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdminPermission("products")
    if (session instanceof NextResponse) return session

    const body = await request.json()
    const parsed = categorySchema.safeParse(body)
    if (!parsed.success) return error(parsed.error.issues[0]?.message ?? "Invalid input")

    const { parentId, ...rest } = parsed.data
    const category = await prisma.category.create({
      data: {
        ...rest,
        parentId: parentId || null,
      },
    })
    revalidatePath("/", "page")
    return success(category, 201)
  } catch {
    return error("Failed to create category")
  }
}

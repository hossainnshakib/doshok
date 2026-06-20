import { prisma } from "@/lib/prisma"

export async function generateOrderNumber(): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `DSK-${year}-`

  for (let attempt = 0; attempt < 10; attempt++) {
    const lastOrder = await prisma.order.findFirst({
      where: { orderNumber: { startsWith: prefix } },
      orderBy: { orderNumber: "desc" },
      select: { orderNumber: true },
    })

    const baseNum = lastOrder
      ? parseInt(lastOrder.orderNumber.split("-").pop() ?? "0", 10) + 1
      : 1

    const candidate = `${prefix}${String(baseNum + attempt).padStart(6, "0")}`

    const exists = await prisma.order.findUnique({
      where: { orderNumber: candidate },
      select: { id: true },
    })
    if (!exists) return candidate
  }

  const fallback = `${prefix}${Date.now()}`
  return fallback
}

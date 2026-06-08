import { prisma } from "@/lib/prisma"

export async function generateOrderNumber(): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `DSK-${year}-`

  const lastOrder = await prisma.order.findFirst({
    where: { orderNumber: { startsWith: prefix } },
    orderBy: { orderNumber: "desc" },
    select: { orderNumber: true },
  })

  let nextNum = 1
  if (lastOrder) {
    const parts = lastOrder.orderNumber.split("-")
    nextNum = parseInt(parts[parts.length - 1], 10) + 1
  }

  return `${prefix}${String(nextNum).padStart(6, "0")}`
}

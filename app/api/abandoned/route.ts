import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { success, error } from "@/lib/api-response"
import { abandonedCreateSchema } from "@/lib/validations"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const parsed = abandonedCreateSchema.safeParse(body)
    if (!parsed.success) {
      return error("Invalid payload: " + parsed.error.issues.map(e => e.message).join(", "))
    }

    const { draftToken, data, lastSeenAt, ...rest } = parsed.data

    if (!rest.email && !rest.phone) {
      return error("At least email or phone is required")
    }

    const upsertData: Record<string, unknown> = {
      ...rest,
      data: data ? (typeof data === "string" ? data : JSON.stringify(data)) : "{}",
      lastSeenAt: lastSeenAt ? new Date(lastSeenAt) : new Date(),
    }

    let abandoned = await prisma.abandonedCheckout.findUnique({
      where: { draftToken },
    })

    if (abandoned) {
      abandoned = await prisma.abandonedCheckout.update({
        where: { id: abandoned.id },
        data: upsertData,
      })
    } else {
      abandoned = await prisma.abandonedCheckout.create({
        data: {
          draftToken,
          ...upsertData,
        },
      })
    }

    return success({
      id: abandoned.id,
      draftToken: abandoned.draftToken,
      step: abandoned.step,
    })
  } catch (err) {
    console.error("POST /api/abandoned error:", err)
    return error("Failed to save abandoned checkout")
  }
}

export async function GET() {
  const session = await auth()
  if (!session?.user) return error("Unauthorized", 401)

  const items = await prisma.abandonedCheckout.findMany({
    orderBy: { createdAt: "desc" },
  })
  return success(items)
}

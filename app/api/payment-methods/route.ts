import { prisma } from "@/lib/prisma"
import { success, error } from "@/lib/api-response"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const methods = await prisma.paymentMethodSetting.findMany({
      where: { enabled: true },
      select: {
        provider: true,
        displayName: true,
        enabled: true,
        supportsFullPayment: true,
        supportsPartialPayment: true,
        supportsCodDeliveryCharge: true,
        instructions: true,
      },
    })

    return success(methods)
  } catch {
    return error("Failed to fetch payment methods")
  }
}

import { prisma } from "@/lib/prisma"
import { success, error } from "@/lib/api-response"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const methods = await prisma.courierProviderSetting.findMany({
      where: { enabled: true },
      select: {
        provider: true,
        displayName: true,
        enabled: true,
        isDefault: true,
        mode: true,
        instructions: true,
        pickupName: true,
        pickupPhone: true,
        pickupAddress: true,
        pickupCity: true,
        pickupZone: true,
      },
    })

    return success(methods)
  } catch {
    return error("Failed to fetch courier methods")
  }
}

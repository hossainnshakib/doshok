import { prisma } from "@/lib/prisma"
import type { DeliveryZone } from "@/types"

const ZONE_MAP: Record<DeliveryZone, string> = {
  chatto: "Inside Chattogram",
  dhaka: "Dhaka",
  outside: "Outside Dhaka",
}

export async function getDeliveryFee(zone: DeliveryZone): Promise<number> {
  const deliveryZone = await prisma.deliveryZone.findUnique({
    where: { name: ZONE_MAP[zone] },
  })
  return deliveryZone?.fee ?? 100
}

export function getDeliveryZoneName(zone: DeliveryZone): string {
  return ZONE_MAP[zone]
}

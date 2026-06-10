import { prisma } from "@/lib/prisma"
import type { DeliveryZone } from "@/types"

const ZONE_MAP: Record<DeliveryZone, string> = {
  chatto: "Inside Chattogram",
  dhaka: "Dhaka",
  outside: "Outside Dhaka",
}

export function autoDetectDeliveryZone(districtId: string): DeliveryZone {
  if (districtId === "dist-dhaka") return "dhaka"
  if (districtId === "dist-chattogram") return "chatto"
  return "outside"
}

export async function getDeliveryFee(zone: DeliveryZone): Promise<number> {
  const deliveryZone = await prisma.deliveryZone.findUnique({
    where: { name: ZONE_MAP[zone] },
  })
  return deliveryZone?.fee ?? 100
}

export async function getDeliveryFeeByDistrict(districtId: string): Promise<{ zone: DeliveryZone; fee: number }> {
  const zone = autoDetectDeliveryZone(districtId)
  const fee = await getDeliveryFee(zone)
  return { zone, fee }
}

export function getDeliveryZoneName(zone: DeliveryZone): string {
  return ZONE_MAP[zone]
}
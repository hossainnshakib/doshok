import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"

export const COURIER_PROVIDER_CODES = ["pathao"] as const
export type CourierProviderCode = typeof COURIER_PROVIDER_CODES[number]

export const COURIER_DELIVERY_TYPES = {
  NORMAL: "normal",
  EXPRESS: "express",
  PARTIAL: "partial",
} as const

export const COURIER_ITEM_TYPES = {
  PARCEL: "parcel",
  DOCUMENT: "document",
  ELECTRONICS: "electronics",
  FOOD: "food",
  LIQUID: "liquid",
  FRAGILE: "fragile",
} as const

export const COURIER_STATUS = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  PICKED: "picked",
  IN_TRANSIT: "in_transit",
  OUT_FOR_DELIVERY: "out_for_delivery",
  DELIVERED: "delivered",
  RETURNED: "returned",
  CANCELLED: "cancelled",
  FAILED: "failed",
} as const

export type CourierDeliveryType = typeof COURIER_DELIVERY_TYPES[keyof typeof COURIER_DELIVERY_TYPES]
export type CourierItemType = typeof COURIER_ITEM_TYPES[keyof typeof COURIER_ITEM_TYPES]
export type CourierStatusType = typeof COURIER_STATUS[keyof typeof COURIER_STATUS]

export interface CourierProviderSettings {
  code: string
  name: string
  isActive: boolean
  environment: "sandbox" | "live"
  baseUrl: string | null
  credentials: {
    clientId?: string
    clientSecret?: string
    username?: string
    password?: string
    defaultStoreId?: string
  } | null
  settings: {
    isActive?: boolean
  } | null
}

export interface CourierStoreData {
  storeId: string
  name: string | null
  merchantName: string | null
  isActive: boolean
}

export interface CourierCityData {
  cityId: string
  name: string
}

export interface CourierZoneData {
  zoneId: string
  cityId: string
  name: string
}

export interface CourierAreaData {
  areaId: string
  zoneId: string
  name: string
}

export async function getActiveCourierProvider(): Promise<CourierProviderSettings | null> {
  const provider = await prisma.courierProvider.findFirst({
    where: { isActive: true },
  })

  if (!provider) return null

  return {
    code: provider.code,
    name: provider.name,
    isActive: provider.isActive,
    environment: provider.environment as "sandbox" | "live",
    baseUrl: provider.baseUrl,
    credentials: provider.credentials as CourierProviderSettings["credentials"],
    settings: provider.settings as CourierProviderSettings["settings"],
  }
}

export async function getCourierProviderByCode(code: string): Promise<CourierProviderSettings | null> {
  const provider = await prisma.courierProvider.findUnique({
    where: { code },
  })

  if (!provider) return null

  return {
    code: provider.code,
    name: provider.name,
    isActive: provider.isActive,
    environment: provider.environment as "sandbox" | "live",
    baseUrl: provider.baseUrl,
    credentials: provider.credentials as CourierProviderSettings["credentials"],
    settings: provider.settings as CourierProviderSettings["settings"],
  }
}

export async function upsertCourierProvider(data: {
  code: string
  name: string
  isActive?: boolean
  environment?: "sandbox" | "live"
  baseUrl?: string | null
  credentials?: CourierProviderSettings["credentials"] | null
  settings?: CourierProviderSettings["settings"] | null
}) {
  return prisma.courierProvider.upsert({
    where: { code: data.code },
    update: {
      name: data.name,
      isActive: data.isActive ?? false,
      environment: data.environment ?? "sandbox",
      baseUrl: data.baseUrl,
      credentials: data.credentials as Prisma.InputJsonValue | undefined,
      settings: data.settings as Prisma.InputJsonValue | undefined,
    },
    create: {
      code: data.code,
      name: data.name,
      isActive: data.isActive ?? false,
      environment: data.environment ?? "sandbox",
      baseUrl: data.baseUrl,
      credentials: data.credentials as Prisma.InputJsonValue | undefined,
      settings: data.settings as Prisma.InputJsonValue | undefined,
    },
  })
}

export async function getCourierStores(providerCode: string): Promise<CourierStoreData[]> {
  const stores = await prisma.courierStore.findMany({
    where: { providerCode, isActive: true },
    orderBy: { name: "asc" },
  })

  return stores.map((s) => ({
    storeId: s.storeId,
    name: s.name,
    merchantName: s.merchantName,
    isActive: s.isActive,
  }))
}

export async function syncCourierStore(providerCode: string, storeData: {
  storeId: string
  name?: string | null
  merchantName?: string | null
}) {
  return prisma.courierStore.upsert({
    where: {
      providerCode_storeId: { providerCode, storeId: storeData.storeId },
    },
    update: {
      name: storeData.name,
      merchantName: storeData.merchantName,
    },
    create: {
      providerCode,
      storeId: storeData.storeId,
      name: storeData.name,
      merchantName: storeData.merchantName,
      isActive: true,
    },
  })
}

export async function getCourierCities(providerCode: string): Promise<CourierCityData[]> {
  return prisma.courierCity.findMany({
    where: { providerCode },
    orderBy: { name: "asc" },
  })
}

export async function syncCourierCity(providerCode: string, cityData: {
  cityId: string
  name: string
}) {
  return prisma.courierCity.upsert({
    where: {
      providerCode_cityId: { providerCode, cityId: cityData.cityId },
    },
    update: { name: cityData.name },
    create: { providerCode, cityId: cityData.cityId, name: cityData.name },
  })
}

export async function getCourierZones(providerCode: string, cityId?: string): Promise<CourierZoneData[]> {
  return prisma.courierZone.findMany({
    where: { providerCode, ...(cityId ? { cityId } : {}) },
    orderBy: { name: "asc" },
  })
}

export async function syncCourierZone(providerCode: string, zoneData: {
  zoneId: string
  cityId: string
  name: string
}) {
  return prisma.courierZone.upsert({
    where: {
      providerCode_zoneId: { providerCode, zoneId: zoneData.zoneId },
    },
    update: { cityId: zoneData.cityId, name: zoneData.name },
    create: { providerCode, zoneId: zoneData.zoneId, cityId: zoneData.cityId, name: zoneData.name },
  })
}

export async function getCourierAreas(providerCode: string, zoneId?: string): Promise<CourierAreaData[]> {
  return prisma.courierArea.findMany({
    where: { providerCode, ...(zoneId ? { zoneId } : {}) },
    orderBy: { name: "asc" },
  })
}

export async function syncCourierArea(providerCode: string, areaData: {
  areaId: string
  zoneId: string
  name: string
}) {
  return prisma.courierArea.upsert({
    where: {
      providerCode_areaId: { providerCode, areaId: areaData.areaId },
    },
    update: { zoneId: areaData.zoneId, name: areaData.name },
    create: { providerCode, areaId: areaData.areaId, zoneId: areaData.zoneId, name: areaData.name },
  })
}

export async function getOrderConsignment(orderId: string) {
  return prisma.courierConsignment.findUnique({
    where: { orderId },
  })
}

export async function upsertOrderConsignment(data: {
  orderId: string
  providerCode: string
  storeId?: string | null
  consignmentId?: string | null
  trackingCode?: string | null
  recipientName?: string | null
  recipientPhone?: string | null
  recipientAddress?: string | null
  deliveryType?: string | null
  itemType?: string | null
  itemQuantity?: number | null
  itemWeight?: number | null
  amountToCollect?: number | null
  deliveryFee?: number | null
  courierStatus?: string | null
  courierMessage?: string | null
  responseJson?: object | null
}) {
  return prisma.courierConsignment.upsert({
    where: { orderId: data.orderId },
    update: {
      providerCode: data.providerCode,
      storeId: data.storeId,
      consignmentId: data.consignmentId,
      trackingCode: data.trackingCode,
      recipientName: data.recipientName,
      recipientPhone: data.recipientPhone,
      recipientAddress: data.recipientAddress,
      deliveryType: data.deliveryType,
      itemType: data.itemType,
      itemQuantity: data.itemQuantity,
      itemWeight: data.itemWeight,
      amountToCollect: data.amountToCollect,
      deliveryFee: data.deliveryFee,
      courierStatus: data.courierStatus,
      courierMessage: data.courierMessage,
      responseJson: data.responseJson as Prisma.InputJsonValue | undefined,
      syncedAt: new Date(),
    },
    create: {
      orderId: data.orderId,
      providerCode: data.providerCode,
      storeId: data.storeId,
      consignmentId: data.consignmentId,
      trackingCode: data.trackingCode,
      recipientName: data.recipientName,
      recipientPhone: data.recipientPhone,
      recipientAddress: data.recipientAddress,
      deliveryType: data.deliveryType,
      itemType: data.itemType,
      itemQuantity: data.itemQuantity,
      itemWeight: data.itemWeight,
      amountToCollect: data.amountToCollect,
      deliveryFee: data.deliveryFee,
      courierStatus: data.courierStatus,
      courierMessage: data.courierMessage,
      responseJson: data.responseJson as Prisma.InputJsonValue | undefined,
      syncedAt: new Date(),
    },
  })
}

export async function updateConsignmentStatus(orderId: string, data: {
  courierStatus?: string | null
  courierMessage?: string | null
  deliveryFee?: number | null
  responseJson?: object | null
}) {
  return prisma.courierConsignment.update({
    where: { orderId },
    data: {
      courierStatus: data.courierStatus,
      courierMessage: data.courierMessage,
      deliveryFee: data.deliveryFee,
      responseJson: data.responseJson as Prisma.InputJsonValue | undefined,
      syncedAt: new Date(),
    },
  })
}

export interface CourierLogData {
  providerCode: string
  orderId?: string | null
  action: string
  requestUrl?: string | null
  requestMethod?: string | null
  requestBody?: object | null
  responseBody?: object | null
  responseStatus?: number | null
  errorMessage?: string | null
  durationMs?: number | null
}

export async function createCourierLog(data: CourierLogData) {
  return prisma.courierLog.create({
    data: {
      providerCode: data.providerCode,
      orderId: data.orderId,
      action: data.action,
      requestUrl: data.requestUrl,
      requestMethod: data.requestMethod,
      requestBody: data.requestBody as object | undefined,
      responseBody: data.responseBody as object | undefined,
      responseStatus: data.responseStatus,
      errorMessage: data.errorMessage,
      durationMs: data.durationMs,
    },
  })
}

export async function getCourierLogs(options: {
  providerCode?: string
  orderId?: string
  limit?: number
  offset?: number
}) {
  const where: Record<string, unknown> = {}
  if (options.providerCode) where.providerCode = options.providerCode
  if (options.orderId) where.orderId = options.orderId

  const [logs, total] = await Promise.all([
    prisma.courierLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: options.limit ?? 50,
      skip: options.offset ?? 0,
    }),
    prisma.courierLog.count({ where }),
  ])

  return { logs, total }
}

export async function saveCourierToken(providerCode: string, data: {
  accessToken: string
  refreshToken?: string | null
  expiresAt: Date
}) {
  return prisma.courierToken.upsert({
    where: { providerCode },
    update: {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresAt: data.expiresAt,
    },
    create: {
      providerCode,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresAt: data.expiresAt,
    },
  })
}

export async function getCourierToken(providerCode: string) {
  return prisma.courierToken.findUnique({
    where: { providerCode },
  })
}

export async function deleteCourierToken(providerCode: string) {
  return prisma.courierToken.delete({
    where: { providerCode },
  })
}

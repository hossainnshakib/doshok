import {
  getPathaoEndpoints,
  pathaoRequest,
  type PathaoApiResponse,
  PATHAO_PROVIDER_CODE,
} from "./client"
import {
  getValidToken,
} from "./auth"
import {
  getCourierProviderByCode,
  syncCourierCity,
  syncCourierZone,
  syncCourierArea,
  syncCourierStore,
  type CourierCityData,
  type CourierZoneData,
  type CourierAreaData,
  type CourierStoreData,
} from "@/lib/courier"

export interface PathaoCity {
  city_id: number
  city_name: string
  city_name_en: string
}

export interface PathaoZone {
  zone_id: number
  city_id: number
  zone_name: string
  zone_name_en: string
}

export interface PathaoArea {
  area_id: number
  zone_id: number
  area_name: string
  area_name_en: string
}

export interface PathaoStore {
  store_id: number
  name: string
  merchant_name: string
  pickup_address: string
  is_active: boolean
}

export async function getCities(): Promise<PathaoApiResponse<PathaoCity[]>> {
  const provider = await getCourierProviderByCode(PATHAO_PROVIDER_CODE)
  const environment = provider?.environment ?? "sandbox"

  const tokenResult = await getValidToken(environment)
  if (!tokenResult.success) {
    return {
      success: false,
      data: [],
      message: tokenResult.message,
    }
  }

  const endpoints = getPathaoEndpoints(environment)

  return pathaoRequest<PathaoCity[]>(
    endpoints.CITIES,
    {
      accessToken: tokenResult.data.accessToken,
      action: "get_cities",
      environment,
    }
  )
}

export async function getZones(cityId: number): Promise<PathaoApiResponse<PathaoZone[]>> {
  const provider = await getCourierProviderByCode(PATHAO_PROVIDER_CODE)
  const environment = provider?.environment ?? "sandbox"

  const tokenResult = await getValidToken(environment)
  if (!tokenResult.success) {
    return {
      success: false,
      data: [],
      message: tokenResult.message,
    }
  }

  const endpoints = getPathaoEndpoints(environment)

  return pathaoRequest<PathaoZone[]>(
    `${endpoints.ZONES}?city_id=${cityId}`,
    {
      accessToken: tokenResult.data.accessToken,
      action: `get_zones_city_${cityId}`,
      environment,
    }
  )
}

export async function getAreas(zoneId: number): Promise<PathaoApiResponse<PathaoArea[]>> {
  const provider = await getCourierProviderByCode(PATHAO_PROVIDER_CODE)
  const environment = provider?.environment ?? "sandbox"

  const tokenResult = await getValidToken(environment)
  if (!tokenResult.success) {
    return {
      success: false,
      data: [],
      message: tokenResult.message,
    }
  }

  const endpoints = getPathaoEndpoints(environment)

  return pathaoRequest<PathaoArea[]>(
    `${endpoints.AREAS}?zone_id=${zoneId}`,
    {
      accessToken: tokenResult.data.accessToken,
      action: `get_areas_zone_${zoneId}`,
      environment,
    }
  )
}

export async function getStores(): Promise<PathaoApiResponse<PathaoStore[]>> {
  const provider = await getCourierProviderByCode(PATHAO_PROVIDER_CODE)
  const environment = provider?.environment ?? "sandbox"

  const tokenResult = await getValidToken(environment)
  if (!tokenResult.success) {
    return {
      success: false,
      data: [],
      message: tokenResult.message,
    }
  }

  const endpoints = getPathaoEndpoints(environment)

  return pathaoRequest<PathaoStore[]>(
    endpoints.STORES,
    {
      accessToken: tokenResult.data.accessToken,
      action: "get_stores",
      environment,
    }
  )
}

export async function syncAllCities(): Promise<{ synced: number; errors: string[] }> {
  const provider = await getCourierProviderByCode(PATHAO_PROVIDER_CODE)
  const environment = provider?.environment ?? "sandbox"

  const result = await getCities()
  const errors: string[] = []

  if (!result.success || !result.data) {
    return { synced: 0, errors: [result.message || "Failed to fetch cities"] }
  }

  let synced = 0
  for (const city of result.data) {
    try {
      await syncCourierCity(PATHAO_PROVIDER_CODE, environment, {
        cityId: String(city.city_id),
        name: city.city_name_en || city.city_name,
      })
      synced++
    } catch (err) {
      errors.push(`City ${city.city_id}: ${err instanceof Error ? err.message : "Unknown error"}`)
    }
  }

  return { synced, errors }
}

export async function syncZonesForCity(cityId: string): Promise<{ synced: number; errors: string[] }> {
  const provider = await getCourierProviderByCode(PATHAO_PROVIDER_CODE)
  const environment = provider?.environment ?? "sandbox"

  const result = await getZones(Number(cityId))
  const errors: string[] = []

  if (!result.success || !result.data) {
    return { synced: 0, errors: [result.message || "Failed to fetch zones"] }
  }

  let synced = 0
  for (const zone of result.data) {
    try {
      await syncCourierZone(PATHAO_PROVIDER_CODE, environment, {
        zoneId: String(zone.zone_id),
        cityId: cityId,
        name: zone.zone_name_en || zone.zone_name,
      })
      synced++
    } catch (err) {
      errors.push(`Zone ${zone.zone_id}: ${err instanceof Error ? err.message : "Unknown error"}`)
    }
  }

  return { synced, errors }
}

export async function syncAreasForZone(zoneId: string): Promise<{ synced: number; errors: string[] }> {
  const provider = await getCourierProviderByCode(PATHAO_PROVIDER_CODE)
  const environment = provider?.environment ?? "sandbox"

  const result = await getAreas(Number(zoneId))
  const errors: string[] = []

  if (!result.success || !result.data) {
    return { synced: 0, errors: [result.message || "Failed to fetch areas"] }
  }

  let synced = 0
  for (const area of result.data) {
    try {
      await syncCourierArea(PATHAO_PROVIDER_CODE, environment, {
        areaId: String(area.area_id),
        zoneId: zoneId,
        name: area.area_name_en || area.area_name,
      })
      synced++
    } catch (err) {
      errors.push(`Area ${area.area_id}: ${err instanceof Error ? err.message : "Unknown error"}`)
    }
  }

  return { synced, errors }
}

export async function syncAllStores(): Promise<{ synced: number; errors: string[] }> {
  const provider = await getCourierProviderByCode(PATHAO_PROVIDER_CODE)
  const environment = provider?.environment ?? "sandbox"

  const result = await getStores()
  const errors: string[] = []

  if (!result.success || !result.data) {
    return { synced: 0, errors: [result.message || "Failed to fetch stores"] }
  }

  let synced = 0
  for (const store of result.data) {
    try {
      await syncCourierStore(PATHAO_PROVIDER_CODE, environment, {
        storeId: String(store.store_id),
        name: store.name,
        merchantName: store.merchant_name,
      })
      synced++
    } catch (err) {
      errors.push(`Store ${store.store_id}: ${err instanceof Error ? err.message : "Unknown error"}`)
    }
  }

  return { synced, errors }
}

export async function getLocalCities(): Promise<CourierCityData[]> {
  const provider = await getCourierProviderByCode(PATHAO_PROVIDER_CODE)
  const environment = provider?.environment ?? "sandbox"
  const { getCourierCities } = await import("@/lib/courier")
  return getCourierCities(PATHAO_PROVIDER_CODE, environment)
}

export async function getLocalZones(cityId?: string): Promise<CourierZoneData[]> {
  const provider = await getCourierProviderByCode(PATHAO_PROVIDER_CODE)
  const environment = provider?.environment ?? "sandbox"
  const { getCourierZones } = await import("@/lib/courier")
  return getCourierZones(PATHAO_PROVIDER_CODE, environment, cityId)
}

export async function getLocalAreas(zoneId?: string): Promise<CourierAreaData[]> {
  const provider = await getCourierProviderByCode(PATHAO_PROVIDER_CODE)
  const environment = provider?.environment ?? "sandbox"
  const { getCourierAreas } = await import("@/lib/courier")
  return getCourierAreas(PATHAO_PROVIDER_CODE, environment, zoneId)
}

export async function getLocalStores(): Promise<CourierStoreData[]> {
  const provider = await getCourierProviderByCode(PATHAO_PROVIDER_CODE)
  const environment = provider?.environment ?? "sandbox"
  const { getCourierStores } = await import("@/lib/courier")
  return getCourierStores(PATHAO_PROVIDER_CODE, environment)
}

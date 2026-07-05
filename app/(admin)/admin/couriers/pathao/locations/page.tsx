"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"
import { RefreshCw, ChevronDown, ChevronRight } from "lucide-react"
import { AdminPageHeader, AdminBackLink, AdminTableShell, AdminEmptyState } from "@/components/admin/admin-ui"

type City = { cityId: string; name: string }
type Zone = { zoneId: string; cityId: string; name: string }
type Area = { areaId: string; zoneId: string; name: string }

export default function AdminPathaoLocationsPage() {
  const [cities, setCities] = useState<City[]>([])
  const [zones, setZones] = useState<Zone[]>([])
  const [areas, setAreas] = useState<Area[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [expandedCity, setExpandedCity] = useState<string | null>(null)
  const [expandedZone, setExpandedZone] = useState<string | null>(null)

  async function loadLocations() {
    try {
      const [citiesRes, zonesRes, areasRes] = await Promise.all([
        fetch("/api/admin/courier/pathao/locations?type=cities"),
        fetch("/api/admin/courier/pathao/locations?type=zones"),
        fetch("/api/admin/courier/pathao/locations?type=areas"),
      ])
      const [citiesData, zonesData, areasData] = await Promise.all([
        citiesRes.json(),
        zonesRes.json(),
        areasRes.json(),
      ])
      if (citiesData.success) setCities(citiesData.data)
      if (zonesData.success) setZones(zonesData.data)
      if (areasData.success) setAreas(areasData.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { queueMicrotask(() => { void loadLocations() }) }, [])

  async function handleSyncCities() {
    setSyncing("cities")
    try {
      const res = await fetch("/api/admin/courier/pathao/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync_cities" }),
      })
      const d = await res.json()
      if (d.success) {
        toast.success(`Synced ${d.data.synced} cities`)
        loadLocations()
      } else {
        toast.error(d.error || "Sync failed")
      }
    } catch {
      toast.error("Sync failed")
    } finally {
      setSyncing(null)
    }
  }

  async function handleSyncZones(cityId: string) {
    setSyncing(`zones-${cityId}`)
    try {
      const res = await fetch("/api/admin/courier/pathao/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync_zones", cityId }),
      })
      const d = await res.json()
      if (d.success) {
        toast.success(`Synced ${d.data.synced} zones`)
        loadLocations()
      } else {
        toast.error(d.error || "Sync failed")
      }
    } catch {
      toast.error("Sync failed")
    } finally {
      setSyncing(null)
    }
  }

  async function handleSyncAreas(zoneId: string) {
    setSyncing(`areas-${zoneId}`)
    try {
      const res = await fetch("/api/admin/courier/pathao/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync_areas", zoneId }),
      })
      const d = await res.json()
      if (d.success) {
        toast.success(`Synced ${d.data.synced} areas`)
        loadLocations()
      } else {
        toast.error(d.error || "Sync failed")
      }
    } catch {
      toast.error("Sync failed")
    } finally {
      setSyncing(null)
    }
  }

  function getZonesForCity(cityId: string) {
    return zones.filter((z) => z.cityId === cityId)
  }

  function getAreasForZone(zoneId: string) {
    return areas.filter((a) => a.zoneId === zoneId)
  }

  if (loading) {
    return (
      <div className="space-y-5">
        <AdminPageHeader eyebrow="Operations" title="Pathao Locations" description="Sync and manage cities, zones, and areas from Pathao." backHref="/admin/couriers/pathao" />
        <p className="text-sm text-slate-400 py-8">Loading...</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Operations"
        title="Pathao Locations"
        description="Sync and manage cities, zones, and areas from Pathao."
        backHref="/admin/couriers/pathao"
      />
      <AdminBackLink href="/admin/couriers/pathao" label="Back to Pathao Settings" />

      <div className="flex justify-end">
        <Button onClick={handleSyncCities} disabled={syncing !== null} className="h-9 rounded-lg px-4 text-xs font-semibold">
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${syncing === "cities" ? "animate-spin" : ""}`} />
          {syncing === "cities" ? "Syncing..." : "Sync Cities"}
        </Button>
      </div>

      {cities.length === 0 ? (
        <AdminEmptyState
          title="No locations yet"
          description="Sync cities from Pathao to get started."
        />
      ) : (
        <div className="space-y-3">
          {cities.map((city) => {
            const cityZones = getZonesForCity(city.cityId)
            const isCityExpanded = expandedCity === city.cityId

            return (
              <div key={city.cityId} className="rounded-xl border border-slate-200/70 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3">
                  <button
                    onClick={() => setExpandedCity(isCityExpanded ? null : city.cityId)}
                    className="flex items-center gap-2 text-left"
                  >
                    {isCityExpanded ? (
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    )}
                    <span className="text-sm font-semibold text-slate-800">{city.name}</span>
                    <span className="text-xs text-slate-400">({cityZones.length} zones)</span>
                  </button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleSyncZones(city.cityId)}
                    disabled={syncing !== null}
                    className="h-7 rounded-md px-2 text-[10px]"
                  >
                    <RefreshCw className={`h-3 w-3 mr-1 ${syncing === `zones-${city.cityId}` ? "animate-spin" : ""}`} />
                    Sync Zones
                  </Button>
                </div>

                {isCityExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/50">
                    {cityZones.length === 0 ? (
                      <p className="px-4 py-3 text-xs text-slate-400">No zones. Click Sync Zones to fetch.</p>
                    ) : (
                      <div className="p-3 space-y-2">
                        {cityZones.map((zone) => {
                          const zoneAreas = getAreasForZone(zone.zoneId)
                          const isZoneExpanded = expandedZone === zone.zoneId

                          return (
                            <div key={zone.zoneId} className="rounded-lg border border-slate-200 bg-white">
                              <div className="flex items-center justify-between px-3 py-2">
                                <button
                                  onClick={() => setExpandedZone(isZoneExpanded ? null : zone.zoneId)}
                                  className="flex items-center gap-2 text-left"
                                >
                                  {isZoneExpanded ? (
                                    <ChevronDown className="h-3 w-3 text-slate-400" />
                                  ) : (
                                    <ChevronRight className="h-3 w-3 text-slate-400" />
                                  )}
                                  <span className="text-xs font-medium text-slate-700">{zone.name}</span>
                                  <span className="text-[10px] text-slate-400">({zoneAreas.length} areas)</span>
                                </button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleSyncAreas(zone.zoneId)}
                                  disabled={syncing !== null}
                                  className="h-6 rounded-md px-1.5 text-[10px]"
                                >
                                  <RefreshCw className={`h-2.5 w-2.5 mr-1 ${syncing === `areas-${zone.zoneId}` ? "animate-spin" : ""}`} />
                                  Sync
                                </Button>
                              </div>

                              {isZoneExpanded && (
                                <div className="border-t border-slate-100 px-3 py-2">
                                  {zoneAreas.length === 0 ? (
                                    <p className="text-[10px] text-slate-400 py-1">No areas. Click Sync to fetch.</p>
                                  ) : (
                                    <div className="flex flex-wrap gap-1">
                                      {zoneAreas.map((area) => (
                                        <span
                                          key={area.areaId}
                                          className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600"
                                        >
                                          {area.name}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

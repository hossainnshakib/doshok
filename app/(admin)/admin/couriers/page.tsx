"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { Truck, Settings, MapPin, List, FileText, ChevronRight } from "lucide-react"
import { AdminPageHeader } from "@/components/admin/admin-ui"

interface CourierProvider {
  id: string
  code: string
  name: string
  isActive: boolean
  environment: string
}

export default function AdminCouriersPage() {
  const [providers, setProviders] = useState<CourierProvider[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    try {
      const res = await fetch("/api/admin/courier/providers")
      const d = await res.json()
      if (d.success) {
        setProviders(d.data)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { queueMicrotask(() => { void load() }) }, [])

  const pathaoProvider = providers.find(p => p.code === "pathao")

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Operations"
        title="Couriers"
        description="Manage courier integrations for order delivery."
        backHref="/admin/operations"
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200/70 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-blue-50 text-blue-600">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Pathao</h3>
              <p className="text-xs text-slate-500">
                {pathaoProvider?.isActive ? "Active" : "Inactive"}
                {pathaoProvider?.environment === "live" ? " • Live" : " • Sandbox"}
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <Link
              href="/admin/couriers/pathao"
              className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Settings className="h-3.5 w-3.5" />
                Settings
              </span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/admin/couriers/pathao/stores"
              className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <span className="flex items-center gap-2">
                <List className="h-3.5 w-3.5" />
                Stores
              </span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/admin/couriers/pathao/locations"
              className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <span className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5" />
                Locations
              </span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/admin/couriers/pathao/logs"
              className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <span className="flex items-center gap-2">
                <FileText className="h-3.5 w-3.5" />
                Logs
              </span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

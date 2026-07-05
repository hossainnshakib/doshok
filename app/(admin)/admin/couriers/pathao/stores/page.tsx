"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"
import { RefreshCw, Upload } from "lucide-react"
import { AdminPageHeader, AdminBackLink, AdminTableShell, AdminEmptyState } from "@/components/admin/admin-ui"

type Store = {
  storeId: string
  name: string | null
  merchantName: string | null
  isActive: boolean
}

export default function AdminPathaoStoresPage() {
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  async function load() {
    try {
      const res = await fetch("/api/admin/courier/pathao/stores")
      const d = await res.json()
      if (d.success) {
        setStores(d.data)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { queueMicrotask(() => { void load() }) }, [])

  async function handleSync() {
    setSyncing(true)
    try {
      const res = await fetch("/api/admin/courier/pathao/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync_stores" }),
      })
      const d = await res.json()
      if (d.success) {
        toast.success(`Synced ${d.data.synced} stores`)
        load()
      } else {
        toast.error(d.error || "Sync failed")
      }
    } catch {
      toast.error("Sync failed")
    } finally {
      setSyncing(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-5">
        <AdminPageHeader eyebrow="Operations" title="Pathao Stores" description="Manage Pathao store configurations." backHref="/admin/couriers/pathao" />
        <p className="text-sm text-slate-400 py-8">Loading...</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Operations"
        title="Pathao Stores"
        description="Manage Pathao store configurations for order delivery."
        backHref="/admin/couriers/pathao"
      />
      <AdminBackLink href="/admin/couriers/pathao" label="Back to Pathao Settings" />

      <div className="flex justify-end">
        <Button onClick={handleSync} disabled={syncing} className="h-9 rounded-lg px-4 text-xs font-semibold">
          <Upload className={`h-3.5 w-3.5 mr-1.5 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Syncing..." : "Sync Stores from Pathao"}
        </Button>
      </div>

      {stores.length === 0 ? (
        <AdminEmptyState
          title="No stores yet"
          description="Sync stores from Pathao to see them here."
        />
      ) : (
        <AdminTableShell>
          <Table>
            <TableHeader>
              <TableRow className="border-slate-100">
                <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Store ID</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Name</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Merchant</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stores.map((store) => (
                <TableRow key={store.storeId} className="border-slate-50 hover:bg-slate-50/60">
                  <TableCell className="font-mono text-xs font-semibold text-slate-700">{store.storeId}</TableCell>
                  <TableCell className="text-xs text-slate-600">{store.name || "—"}</TableCell>
                  <TableCell className="text-xs text-slate-600">{store.merchantName || "—"}</TableCell>
                  <TableCell className="text-xs">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      store.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                    }`}>
                      {store.isActive ? "Active" : "Inactive"}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </AdminTableShell>
      )}
    </div>
  )
}

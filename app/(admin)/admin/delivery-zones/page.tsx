"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"
import { Plus, Pencil, Trash2, Check, X } from "lucide-react"
import { AdminBackLink, AdminEmptyState, AdminPageHeader, AdminSectionCard, AdminTableShell } from "@/components/admin/admin-ui"

type DeliveryZone = {
  id: string; name: string; fee: number
}

export default function AdminDeliveryZonesPage() {
  const [zones, setZones] = useState<DeliveryZone[]>([])
  const [newName, setNewName] = useState("")
  const [newFee, setNewFee] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editFee, setEditFee] = useState("")
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)

  async function load() {
    const res = await fetch("/api/delivery-zones")
    const d = await res.json()
    if (d.success) setZones(d.data)
    setInitialLoading(false)
  }

  useEffect(() => { queueMicrotask(() => { void load() }) }, [])

  if (initialLoading) {
    return (
      <div className="space-y-5">
        <AdminPageHeader eyebrow="Operations" title="Delivery Zones" description="Control checkout delivery fees by customer area." />
        <div className="flex items-center justify-center py-16">
          <p className="text-sm text-slate-400">Loading zones...</p>
        </div>
      </div>
    )
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim() || !newFee) return
    const fee = Number(newFee)
    if (!Number.isFinite(fee) || fee < 0) {
      toast.error("Fee must be a non-negative number")
      return
    }
    setLoading(true)
    const res = await fetch("/api/delivery-zones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), fee }),
    })
    const d = await res.json()
    if (d.success) {
      toast.success("Zone created")
      setNewName("")
      setNewFee("")
      load()
    } else {
      toast.error(d.error ?? "Failed")
    }
    setLoading(false)
  }

  function startEdit(zone: DeliveryZone) {
    setEditingId(zone.id)
    setEditName(zone.name)
    setEditFee(String(zone.fee))
  }

  async function saveEdit(id: string) {
    const fee = Number(editFee)
    if (!editName.trim() || !Number.isFinite(fee) || fee < 0) {
      toast.error("Name and a non-negative fee are required")
      return
    }
    const res = await fetch(`/api/delivery-zones/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim(), fee }),
    })
    const d = await res.json()
    if (d.success) {
      toast.success("Zone updated")
      setEditingId(null)
      load()
    } else {
      toast.error(d.error ?? "Failed")
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete delivery zone "${name}"?`)) return
    const res = await fetch(`/api/delivery-zones/${id}`, { method: "DELETE" })
    const d = await res.json()
    if (d.success) {
      toast.success("Zone deleted")
      load()
    } else {
      toast.error(d.error ?? "Failed")
    }
  }

  return (
    <div className="space-y-5">
      <AdminPageHeader eyebrow="Operations" title="Delivery Zones" description="Control checkout delivery fees by customer area." backHref="/admin/operations" />
      <AdminBackLink href="/admin/operations" label="Back to Operations Hub" />

      <AdminSectionCard title="Create Delivery Zone" description="Add a new zone with a flat delivery fee charged at checkout.">
        <form onSubmit={handleCreate} className="grid gap-3 md:grid-cols-[1fr_140px_auto] md:items-end">
          <div className="space-y-1">
            <Label htmlFor="zoneName" className="text-xs font-medium text-slate-600">Zone name</Label>
            <Input id="zoneName" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Inside Dhaka" className="h-9 text-xs" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="zoneFee" className="text-xs font-medium text-slate-600">Fee (৳)</Label>
            <Input id="zoneFee" type="number" min={0} value={newFee} onChange={(e) => setNewFee(e.target.value)} placeholder="e.g. 100" className="h-9 text-xs" required />
          </div>
          <Button type="submit" disabled={loading} className="h-9 rounded-lg px-4 text-xs font-semibold">
            <Plus className="h-3.5 w-3.5 mr-1" /> Add zone
          </Button>
        </form>
      </AdminSectionCard>

      {zones.length === 0 ? (
        <AdminEmptyState title="No delivery zones yet" description="Create zones so checkout can calculate delivery fees." />
      ) : (
      <AdminTableShell>
      <Table>
        <TableHeader>
          <TableRow className="border-slate-100">
            <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Name</TableHead>
            <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Fee</TableHead>
            <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {zones.map((zone) => (
            <TableRow key={zone.id} className={`border-slate-50 hover:bg-slate-50/60 ${editingId === zone.id ? "bg-slate-50/60" : ""}`}>
              {editingId === zone.id ? (
                <>
                  <TableCell>
                    <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8 text-xs" />
                  </TableCell>
                  <TableCell>
                    <Input type="number" min={0} value={editFee} onChange={(e) => setEditFee(e.target.value)} className="h-8 w-24 text-xs" />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => saveEdit(zone.id)}>
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </>
              ) : (
                <>
                  <TableCell className="text-xs font-semibold text-slate-800">{zone.name}</TableCell>
                  <TableCell className="text-xs font-semibold tabular-nums text-slate-700">৳{zone.fee.toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(zone)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => handleDelete(zone.id, zone.name)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </AdminTableShell>
      )}
    </div>
  )
}

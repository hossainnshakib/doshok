"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "sonner"
import { Plus, Pencil, Trash2, Check, X } from "lucide-react"
import { AdminEmptyState, AdminPageHeader, AdminSectionCard, AdminTableShell } from "@/components/admin/admin-ui"

type DeliveryZone = {
  id: string
  name: string
  fee: number
}

export default function AdminDeliveryZonesPage() {
  const [zones, setZones] = useState<DeliveryZone[]>([])
  const [newName, setNewName] = useState("")
  const [newFee, setNewFee] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editFee, setEditFee] = useState("")
  const [loading, setLoading] = useState(false)

  async function load() {
    const res = await fetch("/api/delivery-zones")
    const d = await res.json()
    if (d.success) setZones(d.data)
  }

  useEffect(() => { load() }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName || !newFee) return
    setLoading(true)
    const res = await fetch("/api/delivery-zones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, fee: Number(newFee) }),
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
    const res = await fetch(`/api/delivery-zones/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName, fee: Number(editFee) }),
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
    <div className="space-y-6">
      <AdminPageHeader eyebrow="Settings" title="Delivery Zones" description="Control checkout delivery fees by customer area." />

      <AdminSectionCard title="Create Delivery Zone" description="Keep names short and recognizable for checkout.">
          <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-[1fr_160px_auto] md:items-end">
            <div className="space-y-1">
              <Label htmlFor="zoneName">Zone Name</Label>
              <Input
                id="zoneName"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Inside Dhaka"
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="zoneFee">Fee (৳)</Label>
              <Input
                id="zoneFee"
                type="number"
                value={newFee}
                onChange={(e) => setNewFee(e.target.value)}
                placeholder="100"
                required
              />
            </div>
            <Button type="submit" disabled={loading}>
              <Plus className="h-4 w-4 mr-1" /> Add Zone
            </Button>
          </form>
      </AdminSectionCard>

      {zones.length === 0 ? (
        <AdminEmptyState title="No delivery zones yet" description="Create zones so checkout can calculate delivery fees." />
      ) : (
      <AdminTableShell>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Fee</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {zones.map((zone) => (
            <TableRow key={zone.id}>
              {editingId === zone.id ? (
                <>
                  <TableCell>
                    <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8" />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={editFee}
                      onChange={(e) => setEditFee(e.target.value)}
                      className="h-8 w-24"
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => saveEdit(zone.id)}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingId(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </>
              ) : (
                <>
                  <TableCell className="font-medium">{zone.name}</TableCell>
                  <TableCell>৳{zone.fee.toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEdit(zone)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(zone.id, zone.name)}
                      >
                        <Trash2 className="h-4 w-4" />
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

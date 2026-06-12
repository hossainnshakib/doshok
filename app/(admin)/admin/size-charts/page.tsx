"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"
import { Plus, Pencil, Trash2, ChevronRight } from "lucide-react"
import { AdminEmptyState, AdminPageHeader, AdminSectionCard, AdminTableShell } from "@/components/admin/admin-ui"
import { slugifyName } from "@/lib/slug"

type SizeChartRow = {
  id: string
  label: string
  position: number
  measurements: Record<string, number>
}

type SizeChartWithMeta = {
  id: string
  name: string
  slug: string
  description?: string | null
  rows: SizeChartRow[]
  _count: { products: number }
  createdAt: string
}

export default function AdminSizeChartsPage() {
  const router = useRouter()
  const [charts, setCharts] = useState<SizeChartWithMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
  const [description, setDescription] = useState("")
  const [creating, setCreating] = useState(false)

  async function loadCharts() {
    const res = await fetch("/api/size-charts")
    if (!res.ok) return
    const data = await res.json()
    if (data.success) setCharts(data.data ?? [])
    setLoading(false)
  }

  useEffect(() => { loadCharts() }, [])

  function handleNameChange(value: string) {
    setName(value)
    if (!slugManuallyEdited && value.trim()) {
      setSlug(slugifyName(value))
    }
  }

  function handleSlugChange(value: string) {
    setSlug(value)
    setSlugManuallyEdited(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      toast.error("Name is required")
      return
    }
    setCreating(true)
    const res = await fetch("/api/size-charts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, slug: slug || slugifyName(name), description }),
    })
    const data = await res.json()
    if (data.success) {
      toast.success("Size chart created")
      setName("")
      setSlug("")
      setSlugManuallyEdited(false)
      setDescription("")
      loadCharts()
      router.push(`/admin/size-charts/${data.data.id}`)
    } else {
      toast.error(data.error ?? "Failed to create")
    }
    setCreating(false)
  }

  async function deleteChart(id: string, chartName: string) {
    if (!confirm(`Delete size chart "${chartName}"?`)) return
    const res = await fetch(`/api/size-charts/${id}`, { method: "DELETE" })
    const data = await res.json()
    if (data.success) {
      toast.success("Size chart deleted")
      loadCharts()
    } else {
      toast.error(data.error ?? "Failed to delete")
    }
  }

  if (loading) {
    return (
      <div className="space-y-5">
        <AdminPageHeader eyebrow="Commerce" title="Size Charts" description="Manage reusable size charts for products." />
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-600" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <AdminPageHeader eyebrow="Commerce" title="Size Charts" description="Manage reusable size charts for products." />

      <AdminSectionCard title="Create Size Chart" description="Create a new size chart. You can add sizes and measurements after creation.">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="chartName">Name</Label>
              <Input
                id="chartName"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Asian Shirt"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="chartSlug">Slug</Label>
              <Input
                id="chartSlug"
                value={slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                placeholder="e.g. asian-shirt"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="chartDesc">Description (optional)</Label>
            <Input
              id="chartDesc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this size chart"
            />
          </div>
          <Button type="submit" disabled={creating} className="h-9 rounded-lg px-5 text-xs font-semibold">
            {creating ? "Creating..." : "Create size chart"}
          </Button>
        </form>
      </AdminSectionCard>

      {charts.length === 0 ? (
        <AdminEmptyState
          title="No size charts yet"
          description="Create a size chart to attach to products."
        />
      ) : (
        <AdminTableShell>
          <Table>
            <TableHeader>
              <TableRow className="border-slate-100">
                <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Name</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Slug</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Rows</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold text-center">Products</TableHead>
                <TableHead className="text-right text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {charts.map((chart) => (
                <TableRow key={chart.id} className="border-slate-50 hover:bg-slate-50/60">
                  <TableCell className="text-xs font-semibold text-slate-800">{chart.name}</TableCell>
                  <TableCell className="font-mono text-[11px] text-slate-500">{chart.slug}</TableCell>
                  <TableCell className="text-xs text-slate-500">{chart.rows.length} sizes</TableCell>
                  <TableCell className="text-center text-xs tabular-nums font-semibold">{chart._count.products}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => router.push(`/admin/size-charts/${chart.id}`)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-red-400 hover:text-red-600"
                        onClick={() => deleteChart(chart.id, chart.name)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
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
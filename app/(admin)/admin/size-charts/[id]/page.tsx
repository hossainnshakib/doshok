"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Plus, Trash2, Save, ArrowLeft } from "lucide-react"
import { AdminPageHeader, AdminSectionCard } from "@/components/admin/admin-ui"
import { slugifyName } from "@/lib/slug"

type SizeChartRowData = {
  id?: string
  label: string
  position: number
  measurements: Record<string, number>
}

type SizeChartDetail = {
  id: string
  name: string
  slug: string
  description?: string | null
  rows: SizeChartRowData[]
  createdAt: string
}

type SizeChartRowForTable = {
  label: string
  measurements: Record<string, number>
}

export default function AdminSizeChartEditPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [chart, setChart] = useState<SizeChartDetail | null>(null)
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
  const [description, setDescription] = useState("")
  const [tableRows, setTableRows] = useState<SizeChartRowForTable[]>([])
  const [measurementKeys, setMeasurementKeys] = useState<string[]>([])
  const [newMeasurementKey, setNewMeasurementKey] = useState("")
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  async function loadChart() {
    const res = await fetch(`/api/size-charts/${id}`)
    if (!res.ok) {
      toast.error("Size chart not found")
      router.push("/admin/size-charts")
      return
    }
    const data = await res.json()
    if (!data.success) {
      toast.error(data.error ?? "Failed to load")
      router.push("/admin/size-charts")
      return
    }

    const chartData = data.data
    setChart(chartData)
    setName(chartData.name)
    setSlug(chartData.slug)
    setDescription(chartData.description ?? "")

    if (chartData.rows && chartData.rows.length > 0) {
      const keys = new Set<string>()
      chartData.rows.forEach((row: SizeChartRowData) => {
        Object.keys(row.measurements).forEach((k) => keys.add(k))
      })
      setMeasurementKeys(Array.from(keys))
      setTableRows(chartData.rows.map((row: SizeChartRowData) => ({
        label: row.label,
        measurements: row.measurements,
      })))
    }
    setLoading(false)
  }

  useEffect(() => { loadChart() }, [id])

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

  function addRow() {
    setTableRows([...tableRows, { label: "", measurements: {} }])
  }

  function removeRow(index: number) {
    setTableRows(tableRows.filter((_, i) => i !== index))
  }

  function updateRowLabel(index: number, label: string) {
    const updated = [...tableRows]
    updated[index] = { ...updated[index], label }
    setTableRows(updated)
  }

  function updateMeasurement(rowIndex: number, key: string, value: string) {
    const updated = [...tableRows]
    const numValue = parseFloat(value) || 0
    updated[rowIndex] = {
      ...updated[rowIndex],
      measurements: { ...updated[rowIndex].measurements, [key]: numValue },
    }
    setTableRows(updated)
  }

  function addMeasurementKey() {
    const trimmed = newMeasurementKey.trim()
    if (trimmed && !measurementKeys.includes(trimmed)) {
      setMeasurementKeys([...measurementKeys, trimmed])
      setNewMeasurementKey("")
    }
  }

  function removeMeasurementKey(key: string) {
    setMeasurementKeys(measurementKeys.filter((k) => k !== key))
    setTableRows(tableRows.map((row) => {
      const updated = { ...row.measurements }
      delete updated[key]
      return { ...row, measurements: updated }
    }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      toast.error("Name is required")
      return
    }

    setSaving(true)
    const res = await fetch(`/api/size-charts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        slug,
        description,
        rows: tableRows.map((row, index) => ({
          label: row.label,
          position: index,
          measurements: row.measurements,
        })),
      }),
    })
    const data = await res.json()
    if (data.success) {
      toast.success("Size chart saved")
      setChart(data.data)
      loadChart()
    } else {
      toast.error(data.error ?? "Failed to save")
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="space-y-5">
        <AdminPageHeader
          eyebrow="Commerce"
          title="Edit Size Chart"
          backHref="/admin/size-charts"
        />
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-600" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Commerce"
        title={name || "Edit Size Chart"}
        description="Add sizes and measurements. Each row represents a size (e.g., S, M, L). Each column represents a measurement type (e.g., Chest, Length)."
        backHref="/admin/size-charts"
      />

      <form onSubmit={handleSave} className="space-y-5">
        <AdminSectionCard title="Chart Details">
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
          <div className="space-y-1.5 mt-4">
            <Label htmlFor="chartDesc">Description (optional)</Label>
            <Input
              id="chartDesc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this size chart"
            />
          </div>
        </AdminSectionCard>

        <AdminSectionCard title="Measurements" description="Add measurement columns first, then fill in values for each size.">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {measurementKeys.map((key) => (
                <div key={key} className="flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                  {key}
                  <button
                    type="button"
                    onClick={() => removeMeasurementKey(key)}
                    className="ml-1 text-slate-400 hover:text-red-500"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newMeasurementKey}
                onChange={(e) => setNewMeasurementKey(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addMeasurementKey())}
                placeholder="e.g. Chest, Length, Shoulder"
                className="h-8 text-xs"
              />
              <Button type="button" variant="outline" size="sm" onClick={addMeasurementKey} className="h-8 text-xs">
                <Plus className="h-3 w-3 mr-1" /> Add
              </Button>
            </div>
          </div>
        </AdminSectionCard>

        <AdminSectionCard title="Size Rows" description="Add a row for each size. Leave the label empty to skip that row.">
          <div className="space-y-3">
            {tableRows.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No sizes added yet. Click the button below to add sizes.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left py-2 pr-3 font-semibold text-slate-500 w-20">Size</th>
                      {measurementKeys.map((key) => (
                        <th key={key} className="text-center py-2 px-2 font-semibold text-slate-500 min-w-[80px]">{key}</th>
                      ))}
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.map((row, rowIndex) => (
                      <tr key={rowIndex} className="border-b border-slate-50">
                        <td className="py-2 pr-3">
                          <Input
                            value={row.label}
                            onChange={(e) => updateRowLabel(rowIndex, e.target.value)}
                            placeholder="e.g. S"
                            className="h-8 text-xs font-medium"
                          />
                        </td>
                        {measurementKeys.map((key) => (
                          <td key={key} className="py-2 px-2">
                            <Input
                              type="number"
                              value={row.measurements[key] ?? ""}
                              onChange={(e) => updateMeasurement(rowIndex, key, e.target.value)}
                              placeholder="—"
                              className="h-8 text-xs text-center"
                            />
                          </td>
                        ))}
                        <td className="py-2 pl-2">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-red-400 hover:text-red-600"
                            onClick={() => removeRow(rowIndex)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <Button type="button" variant="outline" size="sm" onClick={addRow} className="h-8 text-xs">
              <Plus className="h-3 w-3 mr-1" /> Add size
            </Button>
          </div>
        </AdminSectionCard>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.push("/admin/size-charts")} className="h-9 rounded-lg px-5 text-xs font-semibold">
            <ArrowLeft className="h-3 w-3 mr-1" /> Back
          </Button>
          <Button type="submit" disabled={saving} className="h-9 rounded-lg px-5 text-xs font-semibold">
            <Save className="h-3 w-3 mr-1" /> {saving ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </form>
    </div>
  )
}
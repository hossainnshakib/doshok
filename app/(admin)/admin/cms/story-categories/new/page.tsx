"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { AdminPageHeader, AdminPageShell } from "@/components/admin/admin-ui"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

export default function NewStoryCategoryPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [sortOrder, setSortOrder] = useState("0")
  const [isActive, setIsActive] = useState(true)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch("/api/story-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description || null,
          sortOrder: parseInt(sortOrder, 10) || 0,
          isActive,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Category created")
        router.push("/admin/cms/story-categories")
      } else {
        toast.error(data.error)
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="CMS"
        title="New Story Category"
        description="Create a new category for editorial stories."
        backHref="/admin/cms/story-categories"
      />
      <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200/60 bg-white p-6 space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-600">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm h-9 focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-600">Sort Order</label>
            <input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm h-9 focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-600">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-600">Status</label>
          <select value={isActive ? "active" : "inactive"} onChange={(e) => setIsActive(e.target.value === "active")} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm h-9 focus:outline-none focus:ring-2 focus:ring-primary/20">
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div className="flex gap-3 pt-2 border-t border-border">
          <Button type="button" variant="outline" className="rounded-lg" onClick={() => router.push("/admin/cms/story-categories")}>Cancel</Button>
          <Button type="submit" className="rounded-lg bg-slate-900 hover:bg-slate-800" disabled={saving}>
            {saving ? "Saving..." : "Create Category"}
          </Button>
        </div>
      </form>
    </AdminPageShell>
  )
}

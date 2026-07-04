"use client"

import { startTransition, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { AdminPageHeader, AdminPageShell } from "@/components/admin/admin-ui"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

export default function EditStoryCategoryPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [sortOrder, setSortOrder] = useState("0")
  const [isActive, setIsActive] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    startTransition(() => setLoading(true))
    fetch(`/api/story-categories/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setName(d.data.name)
          setDescription(d.data.description ?? "")
          setSortOrder(String(d.data.sortOrder))
          setIsActive(d.data.isActive)
        } else {
          toast.error("Category not found")
          router.push("/admin/cms/story-categories")
        }
      })
      .catch(() => {
        toast.error("Failed to load category")
        router.push("/admin/cms/story-categories")
      })
      .finally(() => setLoading(false))
  }, [id, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch(`/api/story-categories/${id}`, {
        method: "PATCH",
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
        toast.success("Category updated")
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
        title={loading ? "Loading..." : `Edit: ${name}`}
        description="Edit this story category."
        backHref="/admin/cms/story-categories"
      />
      {loading ? (
        <div className="rounded-xl border border-slate-200/60 bg-white p-8 text-center text-sm text-slate-400">Loading...</div>
      ) : (
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
              {saving ? "Saving..." : "Update Category"}
            </Button>
          </div>
        </form>
      )}
    </AdminPageShell>
  )
}

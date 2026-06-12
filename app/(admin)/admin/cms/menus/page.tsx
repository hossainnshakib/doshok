"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { AdminPageHeader, AdminSectionCard, AdminEmptyState } from "@/components/admin/admin-ui"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Plus, Pencil, Trash2, ExternalLink, Menu as MenuIcon } from "lucide-react"
import { cn } from "@/lib/utils"

type MenuItem = {
  id: string
  title: string
  url: string
  target: string
  location: string
  parentId: string | null
  order: number
  createdAt: string
  updatedAt: string
  children?: MenuItem[]
}

type MenuFormData = {
  title: string
  url: string
  target: string
  location: string
  parentId: string | null
  order: number
}

const LOCATIONS = ["desktop", "mobile", "footer"] as const
const TARGETS = ["_self", "_blank"] as const

export default function CMSMenusPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [formData, setFormData] = useState<MenuFormData>({
    title: "",
    url: "",
    target: "_self",
    location: "desktop",
    parentId: null,
    order: 0,
  })

  useEffect(() => {
    fetchMenuItems()
  }, [])

  async function fetchMenuItems() {
    setLoading(true)
    try {
      const res = await fetch("/api/menus")
      const data = await res.json()
      if (data.success) {
        setMenuItems(data.data)
      }
    } catch {
      toast.error("Failed to load menu items")
    } finally {
      setLoading(false)
    }
  }

  function openCreate() {
    setEditingId(null)
    setFormData({ title: "", url: "", target: "_self", location: "desktop", parentId: null, order: 0 })
    setDialogOpen(true)
  }

  function openEdit(item: MenuItem) {
    setEditingId(item.id)
    setFormData({
      title: item.title,
      url: item.url,
      target: item.target,
      location: item.location,
      parentId: item.parentId,
      order: item.order,
    })
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!formData.title.trim()) {
      toast.error("Title is required")
      return
    }
    if (!formData.url.trim()) {
      toast.error("URL is required")
      return
    }

    setSaving(true)
    try {
      const method = editingId ? "PATCH" : "POST"
      const url = editingId ? `/api/menus/${editingId}` : "/api/menus"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(editingId ? "Menu item updated" : "Menu item created")
        setDialogOpen(false)
        fetchMenuItems()
      } else {
        toast.error(data.error ?? "Failed to save")
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/menus/${id}`, { method: "DELETE" })
      const data = await res.json()
      if (data.success) {
        toast.success("Menu item deleted")
        fetchMenuItems()
      } else {
        toast.error(data.error ?? "Failed to delete")
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setDeletingId(null)
    }
  }

  function getParentTitle(parentId: string | null): string {
    if (!parentId) return "—"
    const findItem = (items: MenuItem[]): MenuItem | undefined => {
      for (const item of items) {
        if (item.id === parentId) return item
        if (item.children) {
          const found = findItem(item.children)
          if (found) return found
        }
      }
      return undefined
    }
    const parent = findItem(menuItems)
    return parent?.title ?? "—"
  }

  function renderLocationBadge(location: string) {
    const styles: Record<string, string> = {
      desktop: "bg-blue-100 text-blue-700",
      mobile: "bg-purple-100 text-purple-700",
      footer: "bg-amber-100 text-amber-700",
    }
    return (
      <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold", styles[location] ?? "bg-slate-100 text-slate-600")}>
        {location}
      </span>
    )
  }

  function renderTableRows(items: MenuItem[], depth = 0): React.ReactNode[] {
    const rows: React.ReactNode[] = []
    for (const item of items) {
      rows.push(
        <tr key={item.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60 transition-colors">
          <td className="px-4 py-3">
            <div className="flex items-center gap-2">
              {depth > 0 && <span className="text-slate-300">└</span>}
              <span className={cn("text-sm font-medium text-slate-900", depth > 0 && "text-slate-600")}>
                {item.title}
              </span>
            </div>
          </td>
          <td className="px-4 py-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 font-mono truncate max-w-[160px]">{item.url}</span>
              {item.target === "_blank" && <ExternalLink className="h-3 w-3 text-slate-400 shrink-0" />}
            </div>
          </td>
          <td className="px-4 py-3">{renderLocationBadge(item.location)}</td>
          <td className="px-4 py-3 text-sm text-slate-500">{getParentTitle(item.parentId)}</td>
          <td className="px-4 py-3 text-sm text-slate-400 tabular-nums">{item.order}</td>
          <td className="px-4 py-3">
            <div className="flex items-center gap-1">
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                onClick={() => openEdit(item)}
                className="h-7 w-7 text-slate-400 hover:text-slate-700"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                onClick={() => handleDelete(item.id)}
                disabled={deletingId === item.id}
                className="h-7 w-7 text-slate-400 hover:text-red-500"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </td>
        </tr>
      )
      if (item.children?.length) {
        rows.push(...renderTableRows(item.children, depth + 1))
      }
    }
    return rows
  }

  function getAvailableParents(excludeId?: string): MenuItem[] {
    const flat: MenuItem[] = []
    const flatten = (items: MenuItem[], depth = 0) => {
      for (const item of items) {
        if (item.id !== excludeId) {
          flat.push({ ...item, title: "  ".repeat(depth) + item.title })
        }
        if (item.children?.length) {
          flatten(item.children, depth + 1)
        }
      }
    }
    flatten(menuItems)
    return flat
  }

  const allItems = getAvailableParents(editingId ?? undefined)

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="CMS"
        title="Navigation Menus"
        description="Manage menu items for desktop, mobile, and footer navigation."
        backHref="/admin/cms"
      />

      <AdminSectionCard
        title="Menu Items"
        description="Create and manage navigation links. Child items appear as sub-menu."
      >
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-slate-400">Loading menu items...</p>
          </div>
        ) : menuItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <div className="text-center">
              <MenuIcon className="mx-auto mb-3 h-8 w-8 text-slate-300" />
              <h2 className="text-sm font-semibold text-slate-700">No menu items yet</h2>
              <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-slate-400">Create your first menu item to start building the navigation.</p>
            </div>
            <Button onClick={openCreate} className="h-8 rounded-lg text-xs font-semibold">
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Menu Item
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">Title</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">URL</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">Location</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">Parent</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">Order</th>
                  <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody>{renderTableRows(menuItems)}</tbody>
            </table>
          </div>
        )}
      </AdminSectionCard>

      <div className="flex justify-start">
        <Button onClick={openCreate} className="h-9 rounded-lg px-5 text-xs font-semibold">
          <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Menu Item
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Menu Item" : "Add Menu Item"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. New Arrivals"
                className="text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="url">URL *</Label>
              <Input
                id="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder="/new-arrivals or https://..."
                className="text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="location">Location *</Label>
                <Select value={formData.location} onValueChange={(v) => v && setFormData({ ...formData, location: v })}>
                  <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LOCATIONS.map((loc) => (
                      <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="target">Target</Label>
                <Select value={formData.target} onValueChange={(v) => v && setFormData({ ...formData, target: v })}>
                  <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TARGETS.map((t) => (
                      <SelectItem key={t} value={t}>{t === "_self" ? "Same tab" : "New tab"}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="parent">Parent Menu (optional)</Label>
              <Select
                value={formData.parentId ?? "none"}
                onValueChange={(v) => setFormData({ ...formData, parentId: v === "none" ? null : v })}
              >
                <SelectTrigger className="text-sm"><SelectValue placeholder="No parent" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No parent (top-level)</SelectItem>
                  {allItems.map((item) => (
                    <SelectItem key={item.id} value={item.id}>{item.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="order">Order</Label>
              <Input
                id="order"
                type="number"
                min={0}
                value={formData.order}
                onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                className="text-sm"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="h-9 rounded-lg text-xs">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="h-9 rounded-lg text-xs bg-emerald-500 hover:bg-emerald-600 text-white">
              {saving ? "Saving..." : editingId ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
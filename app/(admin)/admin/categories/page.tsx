"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { ImageIcon, Pencil, Trash2, Check, X } from "lucide-react"
import { AdminEmptyState, AdminPageHeader, AdminSectionCard, AdminTableShell, AdminStatusBadge } from "@/components/admin/admin-ui"
import { ImageUploader } from "@/components/admin/image-uploader"
import { slugifyName } from "@/lib/slug"

type CategoryWithMeta = {
  id: string
  name: string
  slug: string
  image?: string | null
  parentId?: string | null
  parent?: { name: string } | null
  _count: { products: number }
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<CategoryWithMeta[]>([])
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
  const [image, setImage] = useState<string[]>([])
  const [isSubcategory, setIsSubcategory] = useState(false)
  const [parentId, setParentId] = useState("")
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editSlug, setEditSlug] = useState("")
  const [editSlugManuallyEdited, setEditSlugManuallyEdited] = useState(false)
  const [editImage, setEditImage] = useState<string[]>([])
  const [editIsSubcategory, setEditIsSubcategory] = useState(false)
  const [editParentId, setEditParentId] = useState("")

  async function loadCategories() {
    const res = await fetch("/api/categories")
    if (!res.ok) {
      console.error("Failed to load categories:", res.status, res.statusText)
      return
    }
    const text = await res.text()
    if (!text) return
    try {
      const data = JSON.parse(text)
      if (data.success) setCategories(data.data ?? [])
    } catch (e) {
      console.error("Failed to parse categories response:", e)
    }
  }

  useEffect(() => { loadCategories() }, [])

  const parentCategories = categories.filter((c) => !c.parentId)

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

  function handleEditNameChange(value: string) {
    setEditName(value)
    if (!editSlugManuallyEdited && value.trim()) {
      setEditSlug(slugifyName(value))
    }
  }

  function handleEditSlugChange(value: string) {
    setEditSlug(value)
    setEditSlugManuallyEdited(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        slug,
        image: image[0] || undefined,
        parentId: isSubcategory && parentId ? parentId : null,
      }),
    })
    if (!res.ok) {
      toast.error("Failed to create category")
      setLoading(false)
      return
    }
    const data = await res.json()
    if (data.success) {
      toast.success(isSubcategory ? "Subcategory created" : "Category created")
      setName("")
      setSlug("")
      setSlugManuallyEdited(false)
      setImage([])
      setIsSubcategory(false)
      setParentId("")
      loadCategories()
    } else {
      toast.error(data.error ?? "Failed")
    }
    setLoading(false)
  }

  function startEdit(cat: CategoryWithMeta) {
    setEditingId(cat.id)
    setEditName(cat.name)
    setEditSlug(cat.slug)
    setEditSlugManuallyEdited(false)
    setEditImage(cat.image ? [cat.image] : [])
    setEditIsSubcategory(!!cat.parentId)
    setEditParentId(cat.parentId || "")
  }

  async function saveEdit(id: string) {
    const res = await fetch(`/api/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editName,
        slug: editSlug,
        image: editImage[0] || undefined,
        parentId: editIsSubcategory && editParentId ? editParentId : null,
      }),
    })
    if (!res.ok) {
      toast.error("Failed to update category")
      return
    }
    const data = await res.json()
    if (data.success) {
      toast.success("Category updated")
      setEditingId(null)
      setEditSlugManuallyEdited(false)
      loadCategories()
    } else {
      toast.error(data.error ?? "Failed to update")
    }
  }

  async function deleteCategory(id: string, name: string) {
    if (!confirm(`Delete category "${name}"? This cannot be undone.`)) return
    const res = await fetch(`/api/categories/${id}`, { method: "DELETE" })
    if (!res.ok) {
      toast.error("Failed to delete category")
      return
    }
    const data = await res.json()
    if (data.success) {
      toast.success("Category deleted")
      loadCategories()
    } else {
      toast.error(data.error ?? "Failed to delete")
    }
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader eyebrow="Commerce" title="Categories" description="Organize the single-brand catalog into browsable storefront collections." backHref="/admin/commerce" />

      <AdminSectionCard title="Create Category" description="Use clean, lowercase slugs for filtering. Subcategories are organized under parent categories.">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="catName">Category name</Label>
              <Input id="catName" value={name} onChange={(e) => handleNameChange(e.target.value)} placeholder="e.g. Panjabi" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="catSlug">Slug</Label>
              <Input id="catSlug" value={slug} onChange={(e) => handleSlugChange(e.target.value)} placeholder="e.g. panjabi" required />
              {slugManuallyEdited && <span className="text-[10px] text-muted-foreground">manually set</span>}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isSubcategory"
              checked={isSubcategory}
              onChange={(e) => {
                setIsSubcategory(e.target.checked)
                if (!e.target.checked) setParentId("")
              }}
              className="h-4 w-4 rounded border-neutral-300"
            />
            <Label htmlFor="isSubcategory" className="text-sm font-medium cursor-pointer">This is a subcategory</Label>
          </div>

          {isSubcategory && (
            <div className="space-y-1">
              <Label htmlFor="parentId">Parent Category</Label>
              <Select value={parentId} onValueChange={(v) => v && setParentId(v)}>
                <SelectTrigger id="parentId">
                  <SelectValue placeholder="Choose a parent category" />
                </SelectTrigger>
                <SelectContent>
                  {parentCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <ImageUploader
            images={image}
            onChange={setImage}
            single
            label="Category image (optional)"
            helperText="Upload a category icon or image."
            folder="categories"
          />

          <Button type="submit" disabled={loading} className="h-10 rounded-full px-6">
            {loading ? "Creating..." : isSubcategory ? "Add subcategory" : "Add category"}
          </Button>
        </form>
      </AdminSectionCard>

      {categories.length === 0 ? (
        <AdminEmptyState title="No categories yet" description="Add categories so customers can browse and filter products." />
      ) : (
      <AdminTableShell>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">Image</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Slug</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Parent</TableHead>
            <TableHead className="text-center">Products</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {categories.map((cat) => (
            <TableRow key={cat.id}>
              {editingId === cat.id ? (
                <>
                  <TableCell>
                    <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-muted">
                      {editImage[0] ? (
                        <img src={editImage[0]} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Input value={editName} onChange={(e) => handleEditNameChange(e.target.value)} className="h-8" />
                  </TableCell>
                  <TableCell>
                    <Input value={editSlug} onChange={(e) => handleEditSlugChange(e.target.value)} className="h-8 font-mono text-sm" />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={editIsSubcategory}
                          onChange={(e) => {
                            setEditIsSubcategory(e.target.checked)
                            if (!e.target.checked) setEditParentId("")
                          }}
                          className="h-3.5 w-3.5 rounded border-neutral-300"
                        />
                        <span className="text-xs">Subcategory</span>
                      </div>
                      {editIsSubcategory && (
                        <Select value={editParentId} onValueChange={(v) => v && setEditParentId(v)}>
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue placeholder="Parent" />
                          </SelectTrigger>
                          <SelectContent>
                            {parentCategories.filter((c) => c.id !== cat.id).map((c) => (
                              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {cat.parent?.name || "—"}
                  </TableCell>
                  <TableCell className="text-center font-medium tabular-nums">{cat._count.products}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => saveEdit(cat.id)}>
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
                  <TableCell>
                    <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-muted">
                      {cat.image ? (
                        <img src={cat.image} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{cat.name}</TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">{cat.slug}</TableCell>
                  <TableCell>
                    {cat.parentId ? (
                      <AdminStatusBadge status="Subcategory" />
                    ) : (
                      <AdminStatusBadge status="Parent" />
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {cat.parent?.name || "—"}
                  </TableCell>
                  <TableCell className="text-center font-medium tabular-nums">{cat._count.products}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEdit(cat)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteCategory(cat.id, cat.name)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </>
              )}
            </TableRow>
          ))}
          {editingId && categories.find((c) => c.id === editingId) && (
            <TableRow>
              <TableCell colSpan={7} className="bg-muted/30 py-3">
                <ImageUploader
                  images={editImage}
                  onChange={setEditImage}
                  single
                  label="Category image (optional)"
                  helperText="Upload a category icon or image."
                  folder="categories"
                />
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      </AdminTableShell>
      )}
    </div>
  )
}
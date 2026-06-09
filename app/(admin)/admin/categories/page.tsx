"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"
import { ImageIcon, Pencil, Trash2, Check, X } from "lucide-react"
import { AdminEmptyState, AdminPageHeader, AdminSectionCard, AdminTableShell, AdminStatusBadge } from "@/components/admin/admin-ui"
import { ImageUploader } from "@/components/admin/image-uploader"

type CategoryWithCount = {
  id: string
  name: string
  slug: string
  image?: string | null
  _count: { products: number }
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<CategoryWithCount[]>([])
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [image, setImage] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editSlug, setEditSlug] = useState("")
  const [editImage, setEditImage] = useState<string[]>([])

  async function loadCategories() {
    const res = await fetch("/api/categories")
    const data = await res.json()
    if (data.success) setCategories(data.data)
  }

  useEffect(() => { loadCategories() }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, slug, image: image[0] || undefined }),
    })
    const data = await res.json()
    if (data.success) {
      toast.success("Category created")
      setName("")
      setSlug("")
      setImage([])
      loadCategories()
    } else {
      toast.error(data.error ?? "Failed")
    }
    setLoading(false)
  }

  function startEdit(cat: CategoryWithCount) {
    setEditingId(cat.id)
    setEditName(cat.name)
    setEditSlug(cat.slug)
    setEditImage(cat.image ? [cat.image] : [])
  }

  async function saveEdit(id: string) {
    const res = await fetch(`/api/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName, slug: editSlug, image: editImage[0] || undefined }),
    })
    const data = await res.json()
    if (data.success) {
      toast.success("Category updated")
      setEditingId(null)
      loadCategories()
    } else {
      toast.error(data.error ?? "Failed to update")
    }
  }

  async function deleteCategory(id: string, name: string) {
    if (!confirm(`Delete category "${name}"? This cannot be undone.`)) return
    const res = await fetch(`/api/categories/${id}`, { method: "DELETE" })
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
      <AdminPageHeader eyebrow="Commerce" title="Categories" description="Organize the single-brand catalog into browsable storefront collections." />

      <AdminSectionCard title="Create Category" description="Use clean, lowercase, URL-friendly slugs for filtering products on the storefront.">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <div className="space-y-1">
              <Label htmlFor="catName">Category name</Label>
              <Input id="catName" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Panjabi" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="catSlug">Slug</Label>
              <Input id="catSlug" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="e.g. panjabi" required />
            </div>
            <Button type="submit" disabled={loading} className="h-10 rounded-full px-5">
              Add category
            </Button>
          </div>
          <ImageUploader
            images={image}
            onChange={setImage}
            single
            label="Category image (optional)"
            helperText="Upload a category icon or image."
            folder="categories"
          />
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
                    <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8" />
                  </TableCell>
                  <TableCell>
                    <Input value={editSlug} onChange={(e) => setEditSlug(e.target.value)} className="h-8 font-mono text-sm" />
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
              <TableCell colSpan={5} className="bg-muted/30 py-3">
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
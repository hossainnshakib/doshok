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
  seoTitle?: string | null
  seoDescription?: string | null
  seoKeywords?: string | null
  seoImage?: string | null
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
  const [seoTitle, setSeoTitle] = useState("")
  const [seoDescription, setSeoDescription] = useState("")
  const [seoKeywords, setSeoKeywords] = useState("")
  const [seoImage, setSeoImage] = useState<string[]>([])
  const [editSeoTitle, setEditSeoTitle] = useState("")
  const [editSeoDescription, setEditSeoDescription] = useState("")
  const [editSeoKeywords, setEditSeoKeywords] = useState("")
  const [editSeoImage, setEditSeoImage] = useState<string[]>([])

  async function loadCategories() {
    const res = await fetch("/api/categories")
    if (!res.ok) return
    const text = await res.text()
    if (!text) return
    try {
      const data = JSON.parse(text)
      if (data.success) setCategories(data.data ?? [])
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => { queueMicrotask(() => { void loadCategories() }) }, [])

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
        seoTitle: seoTitle || undefined,
        seoDescription: seoDescription || undefined,
        seoKeywords: seoKeywords || undefined,
        seoImage: seoImage[0] || undefined,
      }),
    })
    const data = await res.json()
    if (data.success) {
      toast.success(isSubcategory ? "Subcategory created" : "Category created")
      setName("")
      setSlug("")
      setSlugManuallyEdited(false)
      setImage([])
      setSeoTitle("")
      setSeoDescription("")
      setSeoKeywords("")
      setSeoImage([])
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
    setEditSeoTitle(cat.seoTitle || "")
    setEditSeoDescription(cat.seoDescription || "")
    setEditSeoKeywords(cat.seoKeywords || "")
    setEditSeoImage(cat.seoImage ? [cat.seoImage] : [])
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
        seoTitle: editSeoTitle || undefined,
        seoDescription: editSeoDescription || undefined,
        seoKeywords: editSeoKeywords || undefined,
        seoImage: editSeoImage[0] || undefined,
      }),
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
    <div className="space-y-5">
      <AdminPageHeader eyebrow="Commerce" title="Categories" description="Organize the catalog into browsable storefront collections." backHref="/admin/commerce" />

      <AdminSectionCard title="Create Category" description="Use clean, lowercase slugs for filtering. Subcategories are organized under parent categories.">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="catName">Category name</Label>
              <Input id="catName" value={name} onChange={(e) => handleNameChange(e.target.value)} placeholder="e.g. Panjabi" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="catSlug">Slug</Label>
              <Input id="catSlug" value={slug} onChange={(e) => handleSlugChange(e.target.value)} placeholder="e.g. panjabi" />
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
              className="h-4 w-4 rounded border-slate-300"
            />
            <Label htmlFor="isSubcategory" className="text-xs font-medium cursor-pointer text-slate-700">This is a subcategory</Label>
          </div>

          {isSubcategory && (
            <div className="space-y-1.5">
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

          <div className="border-t border-slate-200 pt-4 mt-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">SEO Settings</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="catSeoTitle">SEO Title</Label>
                <Input id="catSeoTitle" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} placeholder="e.g. Premium Panjabi Collection" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="catSeoKeywords">SEO Keywords</Label>
                <Input id="catSeoKeywords" value={seoKeywords} onChange={(e) => setSeoKeywords(e.target.value)} placeholder="e.g. panjabi, kurta, men's fashion" />
              </div>
            </div>
            <div className="space-y-1.5 mt-3">
              <Label htmlFor="catSeoDescription">SEO Description</Label>
              <textarea
                id="catSeoDescription"
                value={seoDescription}
                onChange={(e) => setSeoDescription(e.target.value)}
                placeholder="Brief description for search engines"
                className="flex min-h-[60px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-0 resize-y"
              />
            </div>
            <div className="mt-3">
              <ImageUploader
                images={seoImage}
                onChange={setSeoImage}
                single
                label="SEO Image (optional)"
                helperText="Social sharing image (1200×630 recommended)."
                folder="categories"
              />
            </div>
          </div>

          <Button type="submit" disabled={loading} className="h-9 rounded-lg px-5 text-xs font-semibold">
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
          <TableRow className="border-slate-100">
            <TableHead className="w-[48px] text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Img</TableHead>
            <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Name</TableHead>
            <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Slug</TableHead>
            <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Type</TableHead>
            <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Parent</TableHead>
            <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold text-center">Products</TableHead>
            <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {categories.map((cat) => (
            <TableRow key={cat.id} className="border-slate-50 hover:bg-slate-50/60">
              {editingId === cat.id ? (
                <>
                  <TableCell>
                    <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-md bg-slate-100">
                      {editImage[0] ? (
                        <img src={editImage[0]} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <ImageIcon className="h-3.5 w-3.5 text-slate-300" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Input value={editName} onChange={(e) => handleEditNameChange(e.target.value)} className="h-8 text-xs" />
                  </TableCell>
                  <TableCell>
                    <Input value={editSlug} onChange={(e) => handleEditSlugChange(e.target.value)} className="h-8 font-mono text-[11px]" />
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
                          className="h-3.5 w-3.5 rounded border-slate-300"
                        />
                        <span className="text-[11px] text-slate-500">Subcategory</span>
                      </div>
                      {editIsSubcategory && (
                        <Select value={editParentId} onValueChange={(v) => v && setEditParentId(v)}>
                          <SelectTrigger className="h-7 text-[11px]">
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
                  <TableCell className="text-xs text-slate-500">{cat.parent?.name || "—"}</TableCell>
                  <TableCell className="text-center text-xs tabular-nums font-semibold">{cat._count.products}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => saveEdit(cat.id)}>
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
                  <TableCell>
                    <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-md bg-slate-100">
                      {cat.image ? (
                        <img src={cat.image} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <ImageIcon className="h-3.5 w-3.5 text-slate-300" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs font-semibold text-slate-800">{cat.name}</TableCell>
                  <TableCell className="font-mono text-[11px] text-slate-500">{cat.slug}</TableCell>
                  <TableCell>
                    <AdminStatusBadge status={cat.parentId ? "Subcategory" : "Parent"} />
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">{cat.parent?.name || "—"}</TableCell>
                  <TableCell className="text-center text-xs tabular-nums font-semibold">{cat._count.products}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(cat)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => deleteCategory(cat.id, cat.name)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </>
              )}
            </TableRow>
          ))}
          {editingId && categories.find((c) => c.id === editingId) && (
            <TableRow>
              <TableCell colSpan={7} className="bg-slate-50/50 py-3 px-3">
                <ImageUploader
                  images={editImage}
                  onChange={setEditImage}
                  single
                  label="Category image (optional)"
                  helperText=""
                  folder="categories"
                />
              </TableCell>
            </TableRow>
          )}
          {editingId && categories.find((c) => c.id === editingId) && (
            <TableRow>
              <TableCell colSpan={7} className="bg-slate-50/50 py-3 px-3 border-t-0">
                <div className="space-y-3">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">SEO Settings</h4>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-[11px] text-slate-500">SEO Title</Label>
                      <Input value={editSeoTitle} onChange={(e) => setEditSeoTitle(e.target.value)} className="h-8 text-xs" placeholder="e.g. Premium Panjabi Collection" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-slate-500">SEO Keywords</Label>
                      <Input value={editSeoKeywords} onChange={(e) => setEditSeoKeywords(e.target.value)} className="h-8 text-xs" placeholder="e.g. panjabi, kurta" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-slate-500">SEO Description</Label>
                    <textarea
                      value={editSeoDescription}
                      onChange={(e) => setEditSeoDescription(e.target.value)}
                      placeholder="Brief description for search engines"
                      className="flex min-h-[50px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-0 resize-y"
                    />
                  </div>
                  <ImageUploader
                    images={editSeoImage}
                    onChange={setEditSeoImage}
                    single
                    label="SEO Image (optional)"
                    helperText="Social sharing image."
                    folder="categories"
                  />
                </div>
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

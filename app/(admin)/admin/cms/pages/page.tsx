"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { AdminPageHeader, AdminTableShell, AdminStatusBadge, AdminPageShell, AdminEmptyState } from "@/components/admin/admin-ui"
import { Button } from "@/components/ui/button"
import { Trash2, Plus, Edit, Eye, X } from "lucide-react"
import { toast } from "sonner"
import { ImageUploader } from "@/components/admin/image-uploader"
import dynamic from "next/dynamic"
import { cn } from "@/lib/utils"

const RichTextEditor = dynamic(() => import("@/components/admin/rich-text-editor"), { ssr: false })

type Page = {
  id: string
  title: string
  slug: string
  excerpt: string | null
  status: string
  createdAt: string
}

export default function AdminPagesPage() {
  const [pages, setPages] = useState<Page[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all")
  const [modal, setModal] = useState<"create" | "edit" | null>(null)
  const [editing, setEditing] = useState<Page | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchPages()
  }, [filter])

  async function fetchPages() {
    setLoading(true)
    try {
      const res = await fetch(`/api/pages?status=${filter}`)
      const data = await res.json()
      if (data.success) setPages(data.data)
    } catch { }
    setLoading(false)
  }

  async function handleSave(formData: FormData) {
    setSaving(true)
    try {
      const payload = {
        title: formData.get("title") as string,
        slug: (formData.get("slug") as string).toLowerCase().replace(/\s+/g, "-"),
        excerpt: formData.get("excerpt") as string || null,
        content: formData.get("content") as string,
        seoTitle: formData.get("seoTitle") as string || null,
        seoDescription: formData.get("seoDescription") as string || null,
        seoImage: formData.get("seoImage") as string || null,
        status: formData.get("status") as string,
      }

      const url = editing ? `/api/pages/${editing.id}` : "/api/pages"
      const method = editing ? "PATCH" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!data.success) {
        toast.error(data.error)
        return
      }
      toast.success(editing ? "Page updated" : "Page created")
      setModal(null)
      setEditing(null)
      fetchPages()
    } catch {
      toast.error("Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this page?")) return
    const res = await fetch(`/api/pages/${id}`, { method: "DELETE" })
    const data = await res.json()
    if (data.success) {
      toast.success("Page deleted")
      fetchPages()
    } else {
      toast.error(data.error)
    }
  }

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="CMS"
        title="Pages"
        description="Manage storefront information pages."
        backHref="/admin/cms"
      />

      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg border border-slate-200/60 bg-white p-1">
          {["all", "active", "draft"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-md transition-colors capitalize",
                filter === f ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-700"
              )}
            >
              {f}
            </button>
          ))}
        </div>
        <Button
          size="sm"
          className="h-8 rounded-md text-xs font-semibold bg-slate-900 hover:bg-slate-800"
          onClick={() => { setEditing(null); setModal("create") }}
        >
          <Plus className="h-3.5 w-3.5 mr-1" /> New Page
        </Button>
      </div>

      <AdminTableShell>
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-400">Loading...</div>
        ) : pages.length === 0 ? (
          <AdminEmptyState title="No pages found" description="Create your first page to get started." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Title</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Slug</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pages.map((page) => (
                <tr key={page.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-800">{page.title}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">/{page.slug}</td>
                  <td className="px-4 py-3"><AdminStatusBadge status={page.status} /></td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{new Date(page.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => {
                          const w = window.open(`/${page.slug}`, "_blank")
                          if (w) w.focus()
                        }}
                        className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                        title="Preview"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => { setEditing(page); setModal("edit") }}
                        className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(page.id)}
                        className="p-1.5 rounded-md text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </AdminTableShell>

      {modal && (
        <PageModal
          page={editing}
          onSave={handleSave}
          onClose={() => { setModal(null); setEditing(null) }}
          saving={saving}
        />
      )}
    </AdminPageShell>
  )
}

function PageModal({
  page,
  onSave,
  onClose,
  saving,
}: {
  page: Page | null
  onSave: (data: FormData) => void
  onClose: () => void
  saving: boolean
}) {
  const [title, setTitle] = useState(page?.title ?? "")
  const [slug, setSlug] = useState(page?.slug ?? "")
  const [excerpt, setExcerpt] = useState(page?.excerpt ?? "")
  const [content, setContent] = useState("")
  const [seoTitle, setSeoTitle] = useState("")
  const [seoDescription, setSeoDescription] = useState("")
  const [seoImage, setSeoImage] = useState("")
  const [status, setStatus] = useState(page?.status ?? "draft")
  const [loading, setLoading] = useState(Boolean(page))

  useEffect(() => {
    if (!page) return
    setLoading(true)
    fetch(`/api/pages/${page.id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          const p = d.data
          setTitle(p.title)
          setSlug(p.slug)
          setExcerpt(p.excerpt ?? "")
          setContent(p.content ?? "")
          setSeoTitle(p.seoTitle ?? "")
          setSeoDescription(p.seoDescription ?? "")
          setSeoImage(p.seoImage ?? "")
          setStatus(p.status)
        }
      })
      .finally(() => setLoading(false))
  }, [page])

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    onSave(formData)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-background p-6 shadow-2xl">
        <button onClick={onClose} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground">
          <X className="h-5 w-5" />
        </button>
        <h2 className="text-lg font-bold mb-5">{page ? "Edit Page" : "New Page"}</h2>
        {loading ? (
          <div className="py-8 text-center text-sm text-slate-400">Loading page data...</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input type="hidden" name="seoImage" value={seoImage} />
            <input type="hidden" name="status" value={status} />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600">Title</label>
                <input name="title" value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm h-9 focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600">Slug</label>
                <input name="slug" value={slug} onChange={(e) => setSlug(e.target.value)} required className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm h-9 font-mono focus:outline-none focus:ring-2 focus:ring-primary/20" />
                {["about","terms","delivery","faq","care-guide","privacy","privacy-policy","return-policy","returns","cookies","accessibility","size-guide"].includes(slug.trim().toLowerCase()) && (
                  <p className="text-[11px] text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5 leading-relaxed mt-1">
                    This slug is used by a built-in info page. Rich text content here will not override the structured built-in page in V1.1.
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">Excerpt</label>
              <textarea name="excerpt" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={2} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">Content</label>
              <RichTextEditor value={content} onChange={setContent} />
              <input type="hidden" name="content" value={content} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600">SEO Title</label>
                <input name="seoTitle" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm h-9 focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600">SEO Description</label>
                <input name="seoDescription" value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm h-9 focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">SEO Image</label>
              <ImageUploader
                images={seoImage ? [seoImage] : []}
                onChange={(imgs) => setSeoImage(imgs[0] || "")}
                single
                label=""
                helperText=""
                folder="pages"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm h-9 focus:outline-none focus:ring-2 focus:ring-primary/20">
                <option value="draft">Draft</option>
                <option value="active">Active</option>
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1 rounded-lg" onClick={onClose}>Cancel</Button>
              <Button type="submit" className="flex-1 rounded-lg bg-slate-900 hover:bg-slate-800" disabled={saving}>
                {saving ? "Saving..." : page ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
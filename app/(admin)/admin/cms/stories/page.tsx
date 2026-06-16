"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { AdminPageHeader, AdminTableShell, AdminStatusBadge, AdminPageShell } from "@/components/admin/admin-ui"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Trash2, Plus, Edit, Eye, X } from "lucide-react"
import { toast } from "sonner"
import { ImageUploader } from "@/components/admin/image-uploader"
import { cn } from "@/lib/utils"

type Story = {
  id: string
  title: string
  slug: string
  excerpt: string | null
  content: string
  image: string | null
  seoTitle: string | null
  seoDescription: string | null
  seoImage: string | null
  seoKeywords: string | null
  status: string
  createdAt: string
  updatedAt: string
}

export default function AdminStoriesPage() {
  const { data: session } = useSession()
  const [stories, setStories] = useState<Story[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all")
  const [modal, setModal] = useState<"create" | "edit" | null>(null)
  const [editing, setEditing] = useState<Story | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchStories()
  }, [filter])

  async function fetchStories() {
    setLoading(true)
    try {
      const res = await fetch(`/api/stories?status=${filter}`)
      const data = await res.json()
      if (data.success) setStories(data.data)
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
        image: formData.get("image") as string || null,
        status: formData.get("status") as string,
        seoTitle: formData.get("seoTitle") as string || null,
        seoDescription: formData.get("seoDescription") as string || null,
        seoImage: formData.get("seoImage") as string || null,
        seoKeywords: formData.get("seoKeywords") as string || null,
      }

      const url = editing ? `/api/stories/${editing.id}` : "/api/stories"
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
      toast.success(editing ? "Story updated" : "Story created")
      setModal(null)
      setEditing(null)
      fetchStories()
    } catch {
      toast.error("Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this story?")) return
    const res = await fetch(`/api/stories/${id}`, { method: "DELETE" })
    const data = await res.json()
    if (data.success) {
      toast.success("Story deleted")
      fetchStories()
    } else {
      toast.error(data.error)
    }
  }

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="CMS"
        title="Stories"
        description="Editorial content and brand storytelling."
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
          className="h-8 rounded-md text-xs font-semibold bg-emerald-500 hover:bg-emerald-600"
          onClick={() => { setEditing(null); setModal("create") }}
        >
          <Plus className="h-3.5 w-3.5 mr-1" /> New Story
        </Button>
      </div>

      <AdminTableShell>
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-400">Loading...</div>
        ) : stories.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">No stories found.</div>
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
              {stories.map((story) => (
                <tr key={story.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-800">{story.title}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">/{story.slug}</td>
                  <td className="px-4 py-3"><AdminStatusBadge status={story.status} /></td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{new Date(story.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => {
                          const w = window.open(`/stories/${story.slug}`, "_blank")
                          if (w) w.focus()
                        }}
                        className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                        title="Preview"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => { setEditing(story); setModal("edit") }}
                        className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(story.id)}
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
        <StoryModal
          story={editing}
          onSave={handleSave}
          onClose={() => { setModal(null); setEditing(null) }}
          saving={saving}
        />
      )}
    </AdminPageShell>
  )
}

function StoryModal({
  story,
  onSave,
  onClose,
  saving,
}: {
  story: Story | null
  onSave: (data: FormData) => void
  onClose: () => void
  saving: boolean
}) {
  const [title, setTitle] = useState(story?.title ?? "")
  const [slug, setSlug] = useState(story?.slug ?? "")
  const [excerpt, setExcerpt] = useState(story?.excerpt ?? "")
  const [content, setContent] = useState(story?.content ?? "")
  const [image, setImage] = useState(story?.image ?? "")
  const [status, setStatus] = useState(story?.status ?? "draft")
  const [seoTitle, setSeoTitle] = useState(story?.seoTitle ?? "")
  const [seoDescription, setSeoDescription] = useState(story?.seoDescription ?? "")
  const [seoImage, setSeoImage] = useState(story?.seoImage ?? "")
  const [seoKeywords, setSeoKeywords] = useState(story?.seoKeywords ?? "")

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
        <h2 className="text-lg font-bold mb-5">{story ? "Edit Story" : "New Story"}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="hidden" name="image" value={image} />
          <input type="hidden" name="status" value={status} />
          <input type="hidden" name="seoTitle" value={seoTitle} />
          <input type="hidden" name="seoDescription" value={seoDescription} />
          <input type="hidden" name="seoImage" value={seoImage} />
          <input type="hidden" name="seoKeywords" value={seoKeywords} />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">Title</label>
              <input name="title" value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm h-9 focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">Slug</label>
              <input name="slug" value={slug} onChange={(e) => setSlug(e.target.value)} required className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm h-9 font-mono focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-600">Excerpt</label>
            <textarea name="excerpt" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={2} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-600">Content (HTML)</label>
            <textarea name="content" value={content} onChange={(e) => setContent(e.target.value)} required rows={8} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-600">Cover Image</label>
            <ImageUploader
              images={image ? [image] : []}
              onChange={(imgs) => setImage(imgs[0] || "")}
              single
              label=""
              helperText=""
              folder="stories"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-600">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm h-9 focus:outline-none focus:ring-2 focus:ring-primary/20">
              <option value="draft">Draft</option>
              <option value="active">Active</option>
            </select>
          </div>
          <div className="border-t border-border pt-4 mt-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">SEO</p>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600">SEO Title</label>
                <input name="seoTitle" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm h-9 focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600">SEO Description</label>
                <textarea name="seoDescription" value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} rows={2} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600">SEO Keywords</label>
                <input name="seoKeywords" value={seoKeywords} onChange={(e) => setSeoKeywords(e.target.value)} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm h-9 focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="comma, separated, values" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600">SEO Image</label>
                <ImageUploader
                  images={seoImage ? [seoImage] : []}
                  onChange={(imgs) => setSeoImage(imgs[0] || "")}
                  single
                  label=""
                  helperText=""
                  folder="stories"
                />
              </div>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1 rounded-lg" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-1 rounded-lg bg-emerald-500 hover:bg-emerald-600" disabled={saving}>
              {saving ? "Saving..." : story ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
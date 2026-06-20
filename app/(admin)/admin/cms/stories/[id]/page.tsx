"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { AdminPageHeader, AdminPageShell } from "@/components/admin/admin-ui"
import { Button } from "@/components/ui/button"
import { ImageUploader } from "@/components/admin/image-uploader"
import { toast } from "sonner"
import dynamic from "next/dynamic"

const RichTextEditor = dynamic(() => import("@/components/admin/rich-text-editor"), { ssr: false })

export default function EditStoryPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [title, setTitle] = useState("")
  const [slug, setSlug] = useState("")
  const [excerpt, setExcerpt] = useState("")
  const [content, setContent] = useState("")
  const [image, setImage] = useState("")
  const [status, setStatus] = useState("draft")
  const [seoTitle, setSeoTitle] = useState("")
  const [seoDescription, setSeoDescription] = useState("")
  const [seoImage, setSeoImage] = useState("")
  const [seoKeywords, setSeoKeywords] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/stories/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          const s = d.data
          setTitle(s.title)
          setSlug(s.slug)
          setExcerpt(s.excerpt ?? "")
          setContent(s.content ?? "")
          setImage(s.image ?? "")
          setStatus(s.status)
          setSeoTitle(s.seoTitle ?? "")
          setSeoDescription(s.seoDescription ?? "")
          setSeoImage(s.seoImage ?? "")
          setSeoKeywords(s.seoKeywords ?? "")
        } else {
          toast.error("Story not found")
          router.push("/admin/cms/stories")
        }
      })
      .catch(() => {
        toast.error("Failed to load story")
        router.push("/admin/cms/stories")
      })
      .finally(() => setLoading(false))
  }, [id, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch(`/api/stories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          slug: slug.toLowerCase().replace(/\s+/g, "-"),
          excerpt: excerpt || null,
          content,
          image: image || null,
          status,
          seoTitle: seoTitle || null,
          seoDescription: seoDescription || null,
          seoImage: seoImage || null,
          seoKeywords: seoKeywords || null,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Story updated")
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
        title={loading ? "Loading..." : `Edit: ${title}`}
        description="Edit this story."
        backHref="/admin/cms/stories"
      />
      {loading ? (
        <div className="rounded-xl border border-slate-200/60 bg-white p-8 text-center text-sm text-slate-400">Loading...</div>
      ) : (
        <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200/60 bg-white p-6 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm h-9 focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">Slug</label>
              <input value={slug} onChange={(e) => setSlug(e.target.value)} required className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm h-9 font-mono focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-600">Excerpt</label>
            <textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={2} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-600">Content</label>
            <RichTextEditor value={content} onChange={setContent} />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-600">Cover Image</label>
            <ImageUploader images={image ? [image] : []} onChange={(imgs) => setImage(imgs[0] || "")} single label="" helperText="" folder="stories" />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-600">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm h-9 focus:outline-none focus:ring-2 focus:ring-primary/20">
              <option value="draft">Draft</option>
              <option value="active">Active</option>
            </select>
          </div>

          <div className="border-t border-border pt-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">SEO</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600">SEO Title</label>
                <input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm h-9 focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600">SEO Keywords</label>
                <input value={seoKeywords} onChange={(e) => setSeoKeywords(e.target.value)} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm h-9 focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="comma, separated, values" />
              </div>
            </div>
            <div className="space-y-1.5 mt-3">
              <label className="text-xs font-medium text-slate-600">SEO Description</label>
              <textarea value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} rows={2} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div className="space-y-1.5 mt-3">
              <label className="text-xs font-medium text-slate-600">SEO Image</label>
              <ImageUploader images={seoImage ? [seoImage] : []} onChange={(imgs) => setSeoImage(imgs[0] || "")} single label="" helperText="" folder="stories" />
            </div>
          </div>

          <div className="flex gap-3 pt-2 border-t border-border">
            <Button type="button" variant="outline" className="rounded-lg" onClick={() => router.push("/admin/cms/stories")}>Cancel</Button>
            <Button type="submit" className="rounded-lg bg-slate-900 hover:bg-slate-800" disabled={saving}>
              {saving ? "Saving..." : "Update Story"}
            </Button>
          </div>
        </form>
      )}
    </AdminPageShell>
  )
}

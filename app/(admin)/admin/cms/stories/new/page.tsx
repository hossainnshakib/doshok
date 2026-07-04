"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AdminPageHeader, AdminPageShell } from "@/components/admin/admin-ui"
import { Button } from "@/components/ui/button"
import { ImageUploader } from "@/components/admin/image-uploader"
import { toast } from "sonner"
import dynamic from "next/dynamic"
import Link from "next/link"

const RichTextEditor = dynamic(() => import("@/components/admin/rich-text-editor"), { ssr: false })

type StoryCategory = { id: string; name: string; slug: string }

export default function NewStoryPage() {
  const router = useRouter()
  const [categories, setCategories] = useState<StoryCategory[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)

  const [title, setTitle] = useState("")
  const [slug, setSlug] = useState("")
  const [excerpt, setExcerpt] = useState("")
  const [content, setContent] = useState("")
  const [image, setImage] = useState("")
  const [status, setStatus] = useState("draft")
  const [storyCategoryId, setStoryCategoryId] = useState("")
  const [tags, setTags] = useState("")
  const [seoTitle, setSeoTitle] = useState("")
  const [seoDescription, setSeoDescription] = useState("")
  const [seoImage, setSeoImage] = useState("")
  const [seoKeywords, setSeoKeywords] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch("/api/story-categories?all=true")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setCategories(d.data)
      })
      .catch(() => {})
      .finally(() => setCategoriesLoading(false))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch("/api/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          slug: slug.toLowerCase().replace(/\s+/g, "-"),
          excerpt: excerpt || null,
          content,
          image: image || null,
          storyCategoryId: storyCategoryId || null,
          tags: tags || null,
          status,
          seoTitle: seoTitle || null,
          seoDescription: seoDescription || null,
          seoImage: seoImage || null,
          seoKeywords: seoKeywords || null,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Story created")
        router.push(`/admin/cms/stories/${data.data.id}`)
      } else {
        toast.error(data.error)
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  const hasCategories = categories.length > 0

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="CMS"
        title="New Story"
        description="Create a new editorial story."
        backHref="/admin/cms/stories"
      />
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px] items-start">
          <div className="space-y-5 rounded-xl border border-slate-200/60 bg-white p-6">
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
          </div>

          <div className="space-y-4 sticky top-6">
            <div className="rounded-xl border border-slate-200/60 bg-white p-4 space-y-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</p>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm h-9 focus:outline-none focus:ring-2 focus:ring-primary/20">
                <option value="draft">Draft</option>
                <option value="active">Active</option>
              </select>
              <p className="text-[11px] text-slate-400">{status === "active" ? "Published and visible on the storefront." : "Only visible to admins."}</p>
            </div>

            <div className="rounded-xl border border-slate-200/60 bg-white p-4 space-y-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Organization</p>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600">Category</label>
                {categoriesLoading ? (
                  <div className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm h-9 flex items-center text-slate-400">Loading...</div>
                ) : !hasCategories ? (
                  <div className="w-full rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-sm h-9 flex items-center justify-between">
                    <span className="text-slate-400">No categories found.</span>
                    <Link href="/admin/cms/story-categories/new" className="text-xs font-semibold text-primary hover:underline">Create Category</Link>
                  </div>
                ) : (
                  <select value={storyCategoryId} onChange={(e) => setStoryCategoryId(e.target.value)} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm h-9 focus:outline-none focus:ring-2 focus:ring-primary/20">
                    <option value="">None</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600">Tags</label>
                <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="comma, separated" className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm h-9 focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
            </div>

            <div className="rounded-xl border border-slate-200/60 bg-white p-4 space-y-3">
              <details className="group">
                <summary className="text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer list-none flex items-center gap-2 [&::-webkit-details-marker]:hidden before:content-['▶'] before:text-[10px] before:text-slate-400 group-open:before:content-['▼']">
                  SEO
                </summary>
                <div className="mt-3 space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-600">SEO Title</label>
                    <input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm h-9 focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-600">SEO Description</label>
                    <textarea value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} rows={2} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-600">SEO Keywords</label>
                    <input value={seoKeywords} onChange={(e) => setSeoKeywords(e.target.value)} placeholder="comma, separated" className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm h-9 focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-600">SEO Image</label>
                    <ImageUploader images={seoImage ? [seoImage] : []} onChange={(imgs) => setSeoImage(imgs[0] || "")} single label="" helperText="" folder="stories" />
                  </div>
                </div>
              </details>
            </div>

            <div className="flex gap-3 pt-1">
              <Button type="button" variant="outline" className="rounded-lg text-sm flex-1" onClick={() => router.push("/admin/cms/stories")}>Cancel</Button>
              <Button type="submit" className="rounded-lg bg-slate-900 hover:bg-slate-800 text-sm flex-1" disabled={saving}>
                {saving ? "Saving..." : "Create Story"}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </AdminPageShell>
  )
}

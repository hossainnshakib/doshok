"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { AdminPageHeader, AdminPageShell } from "@/components/admin/admin-ui"
import { Button } from "@/components/ui/button"
import { ImageUploader } from "@/components/admin/image-uploader"
import { toast } from "sonner"
import dynamic from "next/dynamic"

const RichTextEditor = dynamic(() => import("@/components/admin/rich-text-editor"), { ssr: false })

const RESERVED_INFO_SLUGS = new Set([
  "about", "terms", "delivery", "faq", "care-guide",
  "privacy", "privacy-policy", "return-policy", "returns",
  "cookies", "accessibility", "size-guide",
])

export default function NewCustomPagePage() {
  const router = useRouter()

  const [title, setTitle] = useState("")
  const [slug, setSlug] = useState("")
  const [excerpt, setExcerpt] = useState("")
  const [content, setContent] = useState("")
  const [seoTitle, setSeoTitle] = useState("")
  const [seoDescription, setSeoDescription] = useState("")
  const [seoImage, setSeoImage] = useState("")
  const [status, setStatus] = useState("draft")
  const [saving, setSaving] = useState(false)

  const slugClean = slug.trim().toLowerCase()
  const isReserved = RESERVED_INFO_SLUGS.has(slugClean)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isReserved) {
      toast.error(`"${slugClean}" is a built-in system page. Use the system page editor instead.`)
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          slug: slugClean.replace(/\s+/g, "-"),
          excerpt: excerpt || null,
          content,
          seoTitle: seoTitle || null,
          seoDescription: seoDescription || null,
          seoImage: seoImage || null,
          status,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Page created")
        router.push(`/admin/cms/pages/${data.data.id}`)
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
        title="New Page"
        description="Create a new custom page."
        backHref="/admin/cms/pages"
      />
      <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200/60 bg-white p-6 space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-600">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm h-9 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-600">Slug</label>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              required
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm h-9 font-mono focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            {isReserved && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 mt-1">
                <p className="text-[11px] text-amber-700 leading-relaxed">
                  &ldquo;{slugClean}&rdquo; is a built-in system page. Use{" "}
                  <a href={`/admin/cms/info-pages/${slugClean}`} className="font-semibold underline">the system page editor</a> instead.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-600">Excerpt</label>
          <textarea
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-600">Content</label>
          <RichTextEditor value={content} onChange={setContent} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-600">SEO Title</label>
            <input
              value={seoTitle}
              onChange={(e) => setSeoTitle(e.target.value)}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm h-9 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-600">SEO Description</label>
            <input
              value={seoDescription}
              onChange={(e) => setSeoDescription(e.target.value)}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm h-9 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
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
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm h-9 focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="draft">Draft</option>
            <option value="active">Active</option>
          </select>
        </div>

        <div className="flex gap-3 pt-2 border-t border-border">
          <Button type="button" variant="outline" className="rounded-lg" onClick={() => router.push("/admin/cms/pages")}>
            Cancel
          </Button>
          <Button
            type="submit"
            className="rounded-lg bg-slate-900 hover:bg-slate-800"
            disabled={saving || isReserved}
          >
            {saving ? "Saving..." : isReserved ? "Reserved slug" : "Create Page"}
          </Button>
        </div>
      </form>
    </AdminPageShell>
  )
}

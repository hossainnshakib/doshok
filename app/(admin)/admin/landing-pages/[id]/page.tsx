"use client"

import { startTransition, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { AdminPageHeader, AdminPageShell, AdminStatusBadge, AdminFormSection } from "@/components/admin/admin-ui"
import { Button } from "@/components/ui/button"
import { ImageUploader } from "@/components/admin/image-uploader"
import { toast } from "sonner"
import { Eye } from "lucide-react"
import { LandingSectionsPanel, type LandingPageItem, type LandingSectionRow } from "@/components/admin/landing-sections-panel"
import { DeleteLandingPageButton } from "@/components/admin/delete-landing-page-button"

type LandingPageDetail = {
  id: string
  title: string
  slug: string
  status: string
  creationMode: string
  template: string | null
  seoTitle: string | null
  seoDescription: string | null
  canonicalUrl: string | null
  ogTitle: string | null
  ogDescription: string | null
  ogImage: string | null
  robotsIndex: boolean
  robotsFollow: boolean
  publishedAt: string | null
  archivedAt: string | null
  items: LandingPageItem[]
  sections: LandingSectionRow[]
}

export default function EditLandingPagePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [page, setPage] = useState<LandingPageDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const [title, setTitle] = useState("")
  const [slug, setSlug] = useState("")
  const [seoTitle, setSeoTitle] = useState("")
  const [seoDescription, setSeoDescription] = useState("")
  const [canonicalUrl, setCanonicalUrl] = useState("")
  const [ogTitle, setOgTitle] = useState("")
  const [ogDescription, setOgDescription] = useState("")
  const [ogImage, setOgImage] = useState("")
  const [robotsIndex, setRobotsIndex] = useState(false)
  const [robotsFollow, setRobotsFollow] = useState(true)

  useEffect(() => {
    startTransition(() => {
      setLoading(true)
    })
    fetch(`/api/landing-pages/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          const p: LandingPageDetail = d.data
          setPage(p)
          setTitle(p.title)
          setSlug(p.slug)
          setSeoTitle(p.seoTitle ?? "")
          setSeoDescription(p.seoDescription ?? "")
          setCanonicalUrl(p.canonicalUrl ?? "")
          setOgTitle(p.ogTitle ?? "")
          setOgDescription(p.ogDescription ?? "")
          setOgImage(p.ogImage ?? "")
          setRobotsIndex(p.robotsIndex)
          setRobotsFollow(p.robotsFollow)
        } else {
          toast.error("Landing page not found")
          router.push("/admin/landing-pages")
        }
      })
      .catch(() => {
        toast.error("Failed to load landing page")
        router.push("/admin/landing-pages")
      })
      .finally(() => setLoading(false))
  }, [id, router, refreshKey])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch(`/api/landing-pages/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          slug: slug.trim().toLowerCase().replace(/\s+/g, "-"),
          seoTitle: seoTitle || null,
          seoDescription: seoDescription || null,
          canonicalUrl: canonicalUrl || null,
          ogTitle: ogTitle || null,
          ogDescription: ogDescription || null,
          ogImage: ogImage || null,
          robotsIndex,
          robotsFollow,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Landing page updated")
        setRefreshKey((k) => k + 1)
      } else {
        toast.error(data.error ?? "Update failed")
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  async function handleStatus(next: "draft" | "published" | "archived") {
    const labels = { draft: "move back to draft", published: "publish", archived: "archive" }
    if (!confirm(`Are you sure you want to ${labels[next]} this landing page?`)) return
    setSaving(true)
    try {
      const res = await fetch(`/api/landing-pages/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(next === "published" ? "Landing page published" : next === "archived" ? "Landing page archived" : "Moved back to draft")
        setRefreshKey((k) => k + 1)
      } else {
        toast.error(data.error ?? "Status change failed")
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <AdminPageShell>
        <AdminPageHeader eyebrow="Marketing" title="Loading..." backHref="/admin/landing-pages" />
        <div className="rounded-xl border border-slate-200/60 bg-white p-8 text-center text-sm text-slate-400">Loading...</div>
      </AdminPageShell>
    )
  }

  if (!page) return null
  const previewUrl = `/l/${page.slug}?preview=1`
  const liveUrl = `/l/${page.slug}`

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="Marketing"
        title={`Edit: ${page.title}`}
        description={`${page.creationMode === "existing_product" ? "From product" : "Custom"} · Created as ${page.creationMode === "existing_product" ? "EXISTING_PRODUCT" : "CUSTOM"}`}
        backHref="/admin/landing-pages"
      />

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200/60 bg-white p-3">
        <AdminStatusBadge status={page.status} />
        {page.publishedAt && (
          <span className="text-[11px] text-slate-400">Published {new Date(page.publishedAt).toLocaleString()}</span>
        )}
        {page.archivedAt && (
          <span className="text-[11px] text-slate-400">Archived {new Date(page.archivedAt).toLocaleString()}</span>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <a
            href={page.status === "published" ? liveUrl : previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 h-8 rounded-md border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <Eye className="h-3.5 w-3.5" /> {page.status === "published" ? "View Live" : "Preview"}
          </a>
          {page.status !== "published" && (
            <Button size="sm" className="h-8 rounded-md bg-emerald-600 hover:bg-emerald-700 text-xs" disabled={saving} onClick={() => handleStatus("published")}>
              Publish
            </Button>
          )}
          {page.status === "published" && (
            <Button size="sm" variant="outline" className="h-8 rounded-md text-xs" disabled={saving} onClick={() => handleStatus("draft")}>
              Unpublish
            </Button>
          )}
          {page.status !== "archived" && (
            <Button size="sm" variant="outline" className="h-8 rounded-md text-xs" disabled={saving} onClick={() => handleStatus("archived")}>
              Archive
            </Button>
          )}
          <DeleteLandingPageButton
            pageId={page.id}
            pageTitle={page.title}
            onDeleted={() => router.push("/admin/landing-pages")}
          />
        </div>
      </div>

      <form onSubmit={handleSave} className="rounded-xl border border-slate-200/60 bg-white p-6 space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-600">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} required
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm h-9 focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-600">Slug <span className="text-slate-400 font-normal">(/l/{slug || "…"})</span></label>
            <input value={slug} onChange={(e) => setSlug(e.target.value)} required
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm h-9 font-mono focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
        </div>

        <AdminFormSection title="SEO" description="Stored independently from the product. Drafts and previews always render noindex.">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">SEO Title</label>
              <input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm h-9 focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">Canonical URL <span className="text-slate-400 font-normal">(optional — defaults to the landing URL)</span></label>
              <input value={canonicalUrl} onChange={(e) => setCanonicalUrl(e.target.value)} placeholder={`/l/${page.slug}`}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm h-9 font-mono focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
          </div>
          <div className="space-y-1.5 mt-4">
            <label className="text-xs font-medium text-slate-600">SEO Description</label>
            <textarea value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} rows={2}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 mt-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">OG Title</label>
              <input value={ogTitle} onChange={(e) => setOgTitle(e.target.value)}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm h-9 focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">OG Description</label>
              <input value={ogDescription} onChange={(e) => setOgDescription(e.target.value)}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm h-9 focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
          </div>
          <div className="space-y-1.5 mt-4">
            <label className="text-xs font-medium text-slate-600">OG Image</label>
            <ImageUploader images={ogImage ? [ogImage] : []} onChange={(imgs) => setOgImage(imgs[0] || "")} single label="" helperText="" folder="landing-pages" />
          </div>
          <div className="flex flex-wrap gap-4 mt-4">
            <label className="flex items-center gap-2 text-xs text-slate-600">
              <input type="checkbox" checked={robotsIndex} onChange={(e) => setRobotsIndex(e.target.checked)} className="h-3.5 w-3.5 rounded" />
              Allow search indexing (published only)
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-600">
              <input type="checkbox" checked={robotsFollow} onChange={(e) => setRobotsFollow(e.target.checked)} className="h-3.5 w-3.5 rounded" />
              Allow link following
            </label>
          </div>
        </AdminFormSection>

        <div className="flex gap-3 pt-2 border-t border-border">
          <Button type="button" variant="outline" className="rounded-lg" onClick={() => router.push("/admin/landing-pages")}>
            Back
          </Button>
          <Button type="submit" className="rounded-lg bg-slate-900 hover:bg-slate-800" disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>

      <LandingSectionsPanel
        pageId={page.id}
        sections={page.sections}
        items={page.items}
        onChanged={() => setRefreshKey((k) => k + 1)}
      />
    </AdminPageShell>
  )
}

"use client"

import { useEffect, useState } from "react"
import { AdminPageHeader, AdminTableShell, AdminStatusBadge, AdminPageShell } from "@/components/admin/admin-ui"
import { Button } from "@/components/ui/button"
import { Trash2, Plus, Edit, X, Copy } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type ShortLink = {
  id: string
  title: string
  slug: string
  destinationUrl: string
  type: string
  status: string
  clickCount: number
  lastClickedAt: string | null
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
  nofollow: boolean
  expiresAt: string | null
  createdAt: string
  updatedAt: string
}

export default function AdminShortLinksPage() {
  const [links, setLinks] = useState<ShortLink[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<"create" | "edit" | null>(null)
  const [editing, setEditing] = useState<ShortLink | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchLinks()
  }, [])

  async function fetchLinks() {
    setLoading(true)
    try {
      const res = await fetch("/api/short-links")
      const data = await res.json()
      if (data.success) setLinks(data.data)
    } catch {}
    setLoading(false)
  }

  async function handleSave(formData: FormData) {
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        title: formData.get("title") as string,
        slug: ((formData.get("slug") as string) ?? "").toLowerCase().replace(/\s+/g, "-"),
        destinationUrl: formData.get("destinationUrl") as string,
        type: formData.get("type") as string,
        status: formData.get("status") as string,
        utmSource: (formData.get("utmSource") as string) || null,
        utmMedium: (formData.get("utmMedium") as string) || null,
        utmCampaign: (formData.get("utmCampaign") as string) || null,
        nofollow: formData.get("nofollow") === "true",
        expiresAt: (formData.get("expiresAt") as string) || null,
      }

      const url = editing ? `/api/short-links/${editing.id}` : "/api/short-links"
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
      toast.success(editing ? "Short link updated" : "Short link created")
      setModal(null)
      setEditing(null)
      fetchLinks()
    } catch {
      toast.error("Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this short link?")) return
    const res = await fetch(`/api/short-links/${id}`, { method: "DELETE" })
    const data = await res.json()
    if (data.success) {
      toast.success("Short link deleted")
      fetchLinks()
    } else {
      toast.error(data.error)
    }
  }

  function copyShortUrl(slug: string) {
    const base = process.env.NEXT_PUBLIC_SITE_URL || "https://doshok.com"
    const url = `${base}/go/${slug}`
    navigator.clipboard.writeText(url)
    toast.success("Short URL copied")
  }

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="CMS"
        title="Short Links"
        description="Manage short URLs for marketing campaigns, social links, and landing pages."
        backHref="/admin/cms"
      />

      <div className="flex items-center justify-between gap-3">
        <div />
        <Button
          size="sm"
          className="h-8 rounded-md text-xs font-semibold bg-slate-900 hover:bg-slate-800"
          onClick={() => { setEditing(null); setModal("create") }}
        >
          <Plus className="h-3.5 w-3.5 mr-1" /> New Short Link
        </Button>
      </div>

      <AdminTableShell>
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-400">Loading...</div>
        ) : links.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">No short links found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Title</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Slug</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Destination</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Clicks</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Last Click</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {links.map((link) => (
                <tr key={link.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-800 max-w-[160px] truncate" title={link.title}>{link.title}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">/go/{link.slug}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 max-w-[180px] truncate" title={link.destinationUrl}>{link.destinationUrl}</td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold",
                      link.type === "internal" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                    )}>
                      {link.type}
                    </span>
                  </td>
                  <td className="px-4 py-3"><AdminStatusBadge status={link.status} /></td>
                  <td className="px-4 py-3 text-slate-600 font-medium">{link.clickCount}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {link.lastClickedAt ? new Date(link.lastClickedAt).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => copyShortUrl(link.slug)}
                        className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                        title="Copy short URL"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => { setEditing(link); setModal("edit") }}
                        className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(link.id)}
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
        <ShortLinkModal
          link={editing}
          onSave={handleSave}
          onClose={() => { setModal(null); setEditing(null) }}
          saving={saving}
        />
      )}
    </AdminPageShell>
  )
}

function ShortLinkModal({
  link,
  onSave,
  onClose,
  saving,
}: {
  link: ShortLink | null
  onSave: (data: FormData) => void
  onClose: () => void
  saving: boolean
}) {
  const [title, setTitle] = useState(link?.title ?? "")
  const [slug, setSlug] = useState(link?.slug ?? "")
  const [destinationUrl, setDestinationUrl] = useState(link?.destinationUrl ?? "")
  const [type, setType] = useState(link?.type ?? "internal")
  const [status, setStatus] = useState(link?.status ?? "active")
  const [utmSource, setUtmSource] = useState(link?.utmSource ?? "")
  const [utmMedium, setUtmMedium] = useState(link?.utmMedium ?? "")
  const [utmCampaign, setUtmCampaign] = useState(link?.utmCampaign ?? "")
  const [nofollow, setNofollow] = useState(link?.nofollow ?? false)
  const [expiresAt, setExpiresAt] = useState(link?.expiresAt ? link.expiresAt.slice(0, 16) : "")

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
        <h2 className="text-lg font-bold mb-5">{link ? "Edit Short Link" : "New Short Link"}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="hidden" name="nofollow" value={String(nofollow)} />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">Title</label>
              <input name="title" value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm h-9 focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">Slug</label>
              <input name="slug" value={slug} onChange={(e) => setSlug(e.target.value)} required className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm h-9 font-mono focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="my-campaign" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-600">Destination URL</label>
            <input
              name="destinationUrl"
              value={destinationUrl}
              onChange={(e) => setDestinationUrl(e.target.value)}
              required
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm h-9 font-mono focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder={type === "internal" ? "/products" : "https://example.com/page"}
            />
            <p className="text-[10px] text-slate-400">
              {type === "internal" ? "Must start with / for internal links" : "Must start with http:// or https:// for external links"}
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">Type</label>
              <select name="type" value={type} onChange={(e) => setType(e.target.value)} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm h-9 focus:outline-none focus:ring-2 focus:ring-primary/20">
                <option value="internal">Internal</option>
                <option value="external">External</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">Status</label>
              <select name="status" value={status} onChange={(e) => setStatus(e.target.value)} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm h-9 focus:outline-none focus:ring-2 focus:ring-primary/20">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div className="border-t border-border pt-4 mt-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">UTM Parameters</p>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600">Source</label>
                <input name="utmSource" value={utmSource} onChange={(e) => setUtmSource(e.target.value)} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm h-9 font-mono focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="facebook" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600">Medium</label>
                <input name="utmMedium" value={utmMedium} onChange={(e) => setUtmMedium(e.target.value)} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm h-9 font-mono focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="social" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600">Campaign</label>
                <input name="utmCampaign" value={utmCampaign} onChange={(e) => setUtmCampaign(e.target.value)} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm h-9 font-mono focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="summer_sale" />
              </div>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">Nofollow</label>
              <select value={nofollow ? "true" : "false"} onChange={(e) => setNofollow(e.target.value === "true")} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm h-9 focus:outline-none focus:ring-2 focus:ring-primary/20">
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">Expires At</label>
              <input name="expiresAt" type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm h-9 focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1 rounded-lg" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-1 rounded-lg bg-slate-900 hover:bg-slate-800" disabled={saving}>
              {saving ? "Saving..." : link ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

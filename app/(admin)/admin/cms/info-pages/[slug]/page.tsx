"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { AdminPageHeader, AdminPageShell } from "@/components/admin/admin-ui"
import { InfoPageEditor } from "@/components/admin/info-page-editor"
import { toast } from "sonner"
import type { InfoPageData } from "@/components/store/info-page"

export default function InfoPageEditPage() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()

  const [data, setData] = useState<InfoPageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/admin/cms/info-pages/${slug}`)
        const json = await res.json()
        if (json.success) {
          setData(json.data.infoPageData)
        } else {
          toast.error(json.error || "Failed to load info page")
          router.push("/admin/cms/info-pages")
        }
      } catch {
        toast.error("Failed to load info page")
        router.push("/admin/cms/info-pages")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [slug, router])

  async function handleSave(infoPageData: InfoPageData) {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/cms/info-pages/${slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: slug, infoPageData }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success("Info page saved")
      } else {
        toast.error(json.error || "Failed to save")
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  const isSizeGuide = slug === "size-guide"

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="CMS"
        title={`Edit: /${slug}`}
        description="Edit the structured content of this built-in info page."
        backHref="/admin/cms/info-pages"
      />

      {isSizeGuide && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-3">
          <div>
            <p className="text-xs font-semibold text-emerald-800">Size Charts are managed separately</p>
            <p className="text-[11px] text-emerald-700 mt-0.5 leading-relaxed">
              Measurement tables are sourced from the Size Charts system and automatically rendered on the public page.
              This editor controls the intro, hero, and measuring instructions only.
            </p>
          </div>
          <a
            href="/admin/size-charts"
            className="inline-flex items-center gap-1.5 rounded-md bg-emerald-100 px-3 py-1.5 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-200 transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            Manage Size Charts &rarr;
          </a>
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-slate-200/60 bg-white p-8 text-center text-sm text-slate-400">
          Loading...
        </div>
      ) : data ? (
        <InfoPageEditor initialData={data} onSave={handleSave} saving={saving} hideTables={isSizeGuide} />
      ) : null}
    </AdminPageShell>
  )
}

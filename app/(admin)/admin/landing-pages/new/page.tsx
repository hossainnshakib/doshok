"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { AdminPageHeader, AdminPageShell } from "@/components/admin/admin-ui"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Package, PenLine, Search, Check } from "lucide-react"
import { cn } from "@/lib/utils"

type ProductHit = {
  id: string
  name: string
  slug: string
  price: number
  oldPrice: number | null
  images: string[]
  status: string
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
}

export default function NewLandingPagePage() {
  const router = useRouter()
  const [mode, setMode] = useState<"existing_product" | "custom">("existing_product")

  // Existing-product state
  const [query, setQuery] = useState("")
  const [hits, setHits] = useState<ProductHit[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<ProductHit | null>(null)

  // Shared state
  const [title, setTitle] = useState("")
  const [slug, setSlug] = useState("")
  const [slugTouched, setSlugTouched] = useState(false)
  const [saving, setSaving] = useState(false)

  // Debounced product search
  useEffect(() => {
    if (mode !== "existing_product") return
    const t = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/landing-pages/product-search?search=${encodeURIComponent(query)}`)
        const data = await res.json()
        if (data.success) setHits(data.data)
      } catch {
        toast.error("Product search failed")
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => clearTimeout(t)
  }, [query, mode])

  function handleTitleChange(v: string) {
    setTitle(v)
    if (!slugTouched) setSlug(slugify(v))
  }

  function handleSelect(p: ProductHit) {
    setSelected(p)
    if (!title) setTitle(p.name)
    if (!slugTouched) setSlug(slugify(p.name))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (mode === "existing_product" && !selected) {
      toast.error("Select a product first")
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/landing-pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          slug: slugify(slug),
          creationMode: mode,
          sourceProductId: mode === "existing_product" ? selected?.id : undefined,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Landing page created as draft")
        router.push(`/admin/landing-pages/${data.data.id}`)
      } else {
        toast.error(data.error ?? "Failed to create landing page")
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
        eyebrow="Marketing"
        title="New Landing Page"
        description="Create a draft campaign page. It stays private until you publish it."
        backHref="/admin/landing-pages"
      />

      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setMode("existing_product")}
          className={cn(
            "flex items-start gap-3 rounded-xl border p-4 text-left transition",
            mode === "existing_product"
              ? "border-slate-900 bg-white shadow-sm ring-1 ring-slate-900"
              : "border-slate-200 bg-white hover:border-slate-300"
          )}
        >
          <span className={cn(
            "grid h-9 w-9 shrink-0 place-items-center rounded-lg",
            mode === "existing_product" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500"
          )}>
            <Package className="h-4 w-4" />
          </span>
          <span>
            <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              Create from Existing Product
              {mode === "existing_product" && <Check className="h-3.5 w-3.5 text-emerald-600" />}
            </span>
            <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
              Pick a product — title, slug, SEO and imagery are prefilled. Commerce stays linked to the real product.
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => setMode("custom")}
          className={cn(
            "flex items-start gap-3 rounded-xl border p-4 text-left transition",
            mode === "custom"
              ? "border-slate-900 bg-white shadow-sm ring-1 ring-slate-900"
              : "border-slate-200 bg-white hover:border-slate-300"
          )}
        >
          <span className={cn(
            "grid h-9 w-9 shrink-0 place-items-center rounded-lg",
            mode === "custom" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500"
          )}>
            <PenLine className="h-4 w-4" />
          </span>
          <span>
            <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              Create New Landing Page
              {mode === "custom" && <Check className="h-3.5 w-3.5 text-emerald-600" />}
            </span>
            <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
              Start blank with just a title and slug. Link products later from the editor.
            </span>
          </span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200/60 bg-white p-6 space-y-5">
        {mode === "existing_product" && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-600">Source product</label>
            {selected ? (
              <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50/60 p-3">
                {selected.images[0] ? (
                  <Image src={selected.images[0]} alt={selected.name} width={40} height={40} className="h-10 w-10 rounded-md object-cover" />
                ) : (
                  <span className="grid h-10 w-10 place-items-center rounded-md bg-slate-100">
                    <Package className="h-4 w-4 text-slate-400" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800">{selected.name}</p>
                  <p className="font-mono text-[11px] text-slate-500">/{selected.slug} · ৳{selected.price.toLocaleString()} · {selected.status}</p>
                </div>
                <Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={() => setSelected(null)}>
                  Change
                </Button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search products by name or slug..."
                    className="w-full rounded-lg border border-border bg-white pl-8 pr-3 py-2 text-sm h-9 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-100 divide-y divide-slate-100">
                  {searching ? (
                    <p className="p-4 text-center text-xs text-slate-400">Searching...</p>
                  ) : hits.length === 0 ? (
                    <p className="p-4 text-center text-xs text-slate-400">No products found.</p>
                  ) : (
                    hits.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelect(p)}
                        className="flex w-full items-center gap-3 p-2.5 text-left hover:bg-slate-50 transition-colors"
                      >
                        {p.images[0] ? (
                          <Image src={p.images[0]} alt={p.name} width={36} height={36} className="h-9 w-9 shrink-0 rounded-md object-cover" />
                        ) : (
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-slate-100">
                            <Package className="h-4 w-4 text-slate-400" />
                          </span>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-slate-800">{p.name}</span>
                          <span className="block font-mono text-[11px] text-slate-400">/{p.slug} · {p.status}</span>
                        </span>
                        <span className="shrink-0 text-xs font-semibold text-slate-600">৳{p.price.toLocaleString()}</span>
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-600">Title</label>
            <input
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              required
              placeholder={mode === "existing_product" ? "Prefilled from product on select" : "Eid Campaign 2026"}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm h-9 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-600">Slug <span className="text-slate-400 font-normal">(public URL: /l/{slugify(slug) || "…"})</span></label>
            <input
              value={slug}
              onChange={(e) => { setSlug(e.target.value); setSlugTouched(true) }}
              required
              placeholder="essential-shirt-eid-offer"
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm h-9 font-mono focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <p className="text-[11px] text-slate-400">Lowercase letters, numbers and hyphens only. Must be unique across landing pages.</p>
          </div>
        </div>

        <div className="flex gap-3 pt-2 border-t border-border">
          <Button type="button" variant="outline" className="rounded-lg" onClick={() => router.push("/admin/landing-pages")}>
            Cancel
          </Button>
          <Button
            type="submit"
            className="rounded-lg bg-slate-900 hover:bg-slate-800"
            disabled={saving || (mode === "existing_product" && !selected)}
          >
            {saving ? "Creating..." : "Create Draft"}
          </Button>
        </div>
      </form>
    </AdminPageShell>
  )
}

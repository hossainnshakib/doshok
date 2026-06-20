import { prisma } from "@/lib/prisma"
import { requireAdminPagePermission } from "@/lib/auth/admin-page"
import { requireAdminPermission } from "@/lib/auth/admin"
import Link from "next/link"
import { AdminPageHeader, AdminPageShell, AdminStatusBadge } from "@/components/admin/admin-ui"
import { Plus, FileText, ExternalLink, Eye, Edit, Trash2 } from "lucide-react"
import { redirect } from "next/navigation"

const SYSTEM_PAGES = [
  { slug: "about", label: "About", description: "Brand story, values, and process." },
  { slug: "terms", label: "Terms & Conditions", description: "Site usage, orders, pricing, and legal terms." },
  { slug: "delivery", label: "Delivery Policy", description: "Delivery zones, timelines, fees, and packaging." },
  { slug: "faq", label: "FAQ", description: "Frequently asked questions about orders and support." },
  { slug: "care-guide", label: "Care Guide", description: "Fabric care instructions for wardrobe staples." },
  { slug: "privacy", label: "Privacy Policy", description: "Data collection, usage, and protection." },
  { slug: "returns", label: "Return Policy", description: "Return window, process, and eligibility." },
  { slug: "cookies", label: "Cookie Policy", description: "Cookie usage and management." },
  { slug: "accessibility", label: "Accessibility", description: "Accessibility commitments and improvements." },
  { slug: "size-guide", label: "Size Guide", description: "Measurement guides for tops and bottoms." },
]

async function deletePageAction(formData: FormData) {
  "use server"
  const res = await requireAdminPermission("cms")
  if (res instanceof Response) return
  const id = formData.get("id") as string
  if (!id) return
  await prisma.page.delete({ where: { id } })
  redirect("/admin/cms/pages")
}

export default async function PagesPage() {
  await requireAdminPagePermission("cms")

  const [dbPages, customPages] = await Promise.all([
    prisma.page.findMany({
      where: { slug: { in: SYSTEM_PAGES.map((p) => p.slug) } },
      select: { slug: true, content: true, updatedAt: true },
    }),
    prisma.page.findMany({
      where: { slug: { notIn: SYSTEM_PAGES.map((p) => p.slug) } },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, slug: true, status: true, createdAt: true },
    }),
  ])

  const dbPageMap = new Map(dbPages.map((p) => [p.slug, p]))

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="CMS"
        title="Pages"
        description="Manage system and custom pages."
      />

      <div className="flex items-center justify-end mb-5">
        <Link
          href="/admin/cms/pages/new"
          className="inline-flex items-center gap-1.5 h-8 rounded-md bg-slate-900 hover:bg-slate-800 text-white px-3 text-xs font-semibold transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> New Page
        </Link>
      </div>

      <div className="mb-8">
        <h2 className="text-sm font-semibold text-slate-800 mb-3">System Pages</h2>
        <p className="text-xs text-slate-400 mb-4">Built-in pages with structured content editors.</p>
        <div className="space-y-2">
          {SYSTEM_PAGES.map(({ slug, label, description }) => {
            const dbPage = dbPageMap.get(slug)
            const hasOverride = dbPage?.content?.trim().startsWith("{")
            return (
              <Link
                key={slug}
                href={`/admin/cms/info-pages/${slug}`}
                className="flex items-center gap-4 rounded-xl border border-slate-200/60 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                  <FileText className="h-5 w-5 text-slate-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-800">{label}</p>
                    <span className="text-[11px] text-slate-400 font-mono">/{slug}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">{description}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {hasOverride ? (
                    <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">
                      Customized
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-slate-500">
                      Default
                    </span>
                  )}
                  <ExternalLink className="h-4 w-4 text-slate-300" />
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-slate-800 mb-3">Custom Pages</h2>
        <p className="text-xs text-slate-400 mb-4">User-created rich text pages.</p>
        {customPages.length === 0 ? (
          <div className="rounded-xl border border-slate-200/60 bg-white p-8 text-center">
            <FileText className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-600">No custom pages yet</p>
            <p className="text-xs text-slate-400 mt-1">Create your first custom page to get started.</p>
            <Link
              href="/admin/cms/pages/new"
              className="inline-flex items-center gap-1.5 mt-4 h-8 rounded-md bg-slate-900 hover:bg-slate-800 text-white px-3 text-xs font-semibold transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> New Page
            </Link>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200/60 bg-white overflow-hidden">
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
                {customPages.map((page) => (
                  <tr key={page.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800">{page.title}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">/{page.slug}</td>
                    <td className="px-4 py-3"><AdminStatusBadge status={page.status} /></td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{new Date(page.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <a
                          href={`/${page.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                          title="Preview"
                        >
                          <Eye className="h-4 w-4" />
                        </a>
                        <Link
                          href={`/admin/cms/pages/${page.id}`}
                          className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <form action={deletePageAction} className="inline">
                          <input type="hidden" name="id" value={page.id} />
                          <button
                            type="submit"
                            onClick={(e) => { if (!confirm("Delete this page?")) e.preventDefault() }}
                            className="p-1.5 rounded-md text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminPageShell>
  )
}

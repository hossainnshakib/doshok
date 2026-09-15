import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { requireAdminPagePermission } from "@/lib/auth/admin-page"
import { requireAdminPermission } from "@/lib/auth/admin"
import { AdminPageHeader, AdminPageShell, AdminStatusBadge, AdminTableShell } from "@/components/admin/admin-ui"
import { ConfirmSubmitButton } from "@/components/admin/confirm-button"
import { Plus, Eye, Edit, Archive, Trash2, Search } from "lucide-react"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

async function publishAction(formData: FormData) {
  "use server"
  const res = await requireAdminPermission("landing_pages")
  if (res instanceof Response) return
  const id = formData.get("id") as string
  if (!id) return
  const page = await prisma.landingPage.findUnique({ where: { id } })
  if (!page || !page.title || !page.slug) return
  await prisma.landingPage.update({
    where: { id },
    data: { status: "published", publishedAt: new Date(), archivedAt: null },
  })
  revalidatePath("/admin/landing-pages")
}

async function unpublishAction(formData: FormData) {
  "use server"
  const res = await requireAdminPermission("landing_pages")
  if (res instanceof Response) return
  const id = formData.get("id") as string
  if (!id) return
  await prisma.landingPage.update({
    where: { id },
    data: { status: "draft", publishedAt: null, archivedAt: null },
  })
  revalidatePath("/admin/landing-pages")
}

async function archiveAction(formData: FormData) {
  "use server"
  const res = await requireAdminPermission("landing_pages")
  if (res instanceof Response) return
  const id = formData.get("id") as string
  if (!id) return
  await prisma.landingPage.update({
    where: { id },
    data: { status: "archived", archivedAt: new Date() },
  })
  revalidatePath("/admin/landing-pages")
}

async function deleteAction(formData: FormData) {
  "use server"
  const res = await requireAdminPermission("landing_pages")
  if (res instanceof Response) return
  const id = formData.get("id") as string
  if (!id) return
  const page = await prisma.landingPage.findUnique({ where: { id }, select: { status: true } })
  if (!page) return
  // Prefer archive for published pages; hard-delete drafts/archived only.
  if (page.status === "published") {
    await prisma.landingPage.update({
      where: { id },
      data: { status: "archived", archivedAt: new Date() },
    })
  } else {
    await prisma.landingPage.delete({ where: { id } })
  }
  redirect("/admin/landing-pages")
}

const STATUS_FILTERS = ["all", "draft", "published", "archived"] as const

export default async function LandingPagesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string }>
}) {
  await requireAdminPagePermission("landing_pages")
  const { search = "", status = "all" } = await searchParams

  const where: Record<string, unknown> = {}
  if (status !== "all" && (STATUS_FILTERS as readonly string[]).includes(status)) {
    where.status = status
  }
  if (search.trim()) {
    where.OR = [
      { title: { contains: search.trim(), mode: "insensitive" } },
      { slug: { contains: search.trim(), mode: "insensitive" } },
    ]
  }

  const landingPages = await prisma.landingPage.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: 100,
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      creationMode: true,
      publishedAt: true,
      updatedAt: true,
      sourceProduct: { select: { id: true, name: true, slug: true } },
      _count: { select: { products: true } },
    },
  })

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="Marketing"
        title="Landing Pages"
        description="Campaign landing pages served at /l/[slug]. Drafts are preview-only; published pages are public."
      />

      <div className="flex flex-wrap items-center gap-2">
        <form action="/admin/landing-pages" method="get" className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          <input
            name="search"
            defaultValue={search}
            placeholder="Search title or slug..."
            className="h-8 w-56 rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300"
          />
          {status !== "all" && <input type="hidden" name="status" value={status} />}
        </form>
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-0.5">
          {STATUS_FILTERS.map((s) => (
            <Link
              key={s}
              href={`/admin/landing-pages?${new URLSearchParams({ ...(search ? { search } : {}), ...(s !== "all" ? { status: s } : {}) }).toString()}`}
              className={`rounded-md px-2.5 py-1 text-[11px] font-semibold capitalize transition-colors ${
                status === s ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {s === "all" ? "All" : s}
            </Link>
          ))}
        </div>
        <div className="ml-auto">
          <Link
            href="/admin/landing-pages/new"
            className="inline-flex items-center gap-1.5 h-8 rounded-md bg-slate-900 hover:bg-slate-800 text-white px-3 text-xs font-semibold transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> New Landing Page
          </Link>
        </div>
      </div>

      <AdminTableShell>
        {landingPages.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm font-medium text-slate-600">No landing pages found</p>
            <p className="text-xs text-slate-400 mt-1">Create your first campaign landing page to get started.</p>
            <Link
              href="/admin/landing-pages/new"
              className="inline-flex items-center gap-1.5 mt-4 h-8 rounded-md bg-slate-900 hover:bg-slate-800 text-white px-3 text-xs font-semibold transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> New Landing Page
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Title</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Slug</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Mode</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Source Product</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Updated</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {landingPages.map((page) => (
                <tr key={page.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-800 max-w-[200px] truncate" title={page.title}>
                    {page.title}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">/l/{page.slug}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-600">
                      {page.creationMode === "existing_product" ? "Product" : "Custom"}
                    </span>
                  </td>
                  <td className="px-4 py-3"><AdminStatusBadge status={page.status} /></td>
                  <td className="px-4 py-3 text-xs text-slate-500 max-w-[160px] truncate" title={page.sourceProduct?.name ?? ""}>
                    {page.sourceProduct ? (
                      <Link href={`/products/${page.sourceProduct.slug}`} target="_blank" className="hover:text-slate-800 hover:underline">
                        {page.sourceProduct.name}
                      </Link>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {new Date(page.updatedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <a
                        href={page.status === "published" ? `/l/${page.slug}` : `/l/${page.slug}?preview=1`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                        title={page.status === "published" ? "View live page" : "Preview draft"}
                      >
                        <Eye className="h-4 w-4" />
                      </a>
                      <Link
                        href={`/admin/landing-pages/${page.id}`}
                        className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </Link>
                      {page.status === "draft" && (
                        <form action={publishAction} className="inline">
                          <input type="hidden" name="id" value={page.id} />
                          <button
                            type="submit"
                            className="rounded-md bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 text-[11px] font-semibold transition-colors"
                            title="Publish"
                          >
                            Publish
                          </button>
                        </form>
                      )}
                      {page.status === "published" && (
                        <form action={unpublishAction} className="inline">
                          <input type="hidden" name="id" value={page.id} />
                          <button
                            type="submit"
                            className="rounded-md bg-amber-100 hover:bg-amber-200 text-amber-700 px-2 py-1 text-[11px] font-semibold transition-colors"
                            title="Move back to draft"
                          >
                            Unpublish
                          </button>
                        </form>
                      )}
                      {page.status !== "archived" && (
                        <form action={archiveAction} className="inline">
                          <input type="hidden" name="id" value={page.id} />
                          <ConfirmSubmitButton
                            message="Archive this landing page? It will no longer be public."
                            className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                            title="Archive"
                          >
                            <Archive className="h-4 w-4" />
                          </ConfirmSubmitButton>
                        </form>
                      )}
                      <form action={deleteAction} className="inline">
                          <input type="hidden" name="id" value={page.id} />
                          <ConfirmSubmitButton
                            message={page.status === "published" ? "Published pages are archived, not deleted. Archive this page?" : "Delete this landing page?"}
                            className="p-1.5 rounded-md text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </ConfirmSubmitButton>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </AdminTableShell>
    </AdminPageShell>
  )
}

import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { requireAdminPagePermission } from "@/lib/auth/admin-page"
import { AdminPageHeader, AdminPageShell } from "@/components/admin/admin-ui"
import { Plus, Edit, Trash2, Layers } from "lucide-react"
import { cn } from "@/lib/utils"
import { DeleteStoryCategoryButton } from "./delete-button"

export default async function AdminStoryCategoriesPage() {
  await requireAdminPagePermission("cms")

  const categories = await prisma.storyCategory.findMany({
    orderBy: { sortOrder: "asc" },
  })

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="CMS"
        title="Story Categories"
        description="Manage editorial story categories."
        backHref="/admin/cms"
      />

      <div className="flex justify-end mb-4">
        <Link
          href="/admin/cms/story-categories/new"
          className="inline-flex items-center gap-1.5 h-8 rounded-md px-3 text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> New Category
        </Link>
      </div>

      <div className="rounded-xl border border-slate-200/60 bg-white overflow-hidden">
        {categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="rounded-full bg-slate-100 p-3 mb-3">
              <Layers className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-700">No categories yet</p>
            <p className="text-xs text-slate-500 mt-1">Create your first story category.</p>
            <Link
              href="/admin/cms/story-categories/new"
              className="mt-4 inline-flex items-center gap-1.5 h-8 rounded-md px-3 text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> New Category
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Slug</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Sort Order</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {categories.map((cat) => (
                <tr key={cat.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-800">{cat.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">/{cat.slug}</td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                      cat.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                    )}>
                      {cat.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{cat.sortOrder}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/admin/cms/story-categories/${cat.id}`}
                        className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </Link>
                      <DeleteStoryCategoryButton id={cat.id} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminPageShell>
  )
}

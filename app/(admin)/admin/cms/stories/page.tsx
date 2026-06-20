import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { requireAdminPagePermission } from "@/lib/auth/admin-page"
import { redirect } from "next/navigation"
import { AdminPageHeader, AdminPageShell } from "@/components/admin/admin-ui"
import { Plus, Edit, Eye, Trash2, BookOpen } from "lucide-react"
import { cn } from "@/lib/utils"

async function deleteStoryAction(formData: FormData) {
  "use server"
  const { requireAdminPermission } = await import("@/lib/auth/admin")
  const res = await requireAdminPermission("cms")
  if (res instanceof Response) return
  const id = formData.get("id") as string
  if (!id) return
  await prisma.story.delete({ where: { id } })
  redirect("/admin/cms/stories")
}

export default async function AdminStoriesPage() {
  await requireAdminPagePermission("cms")

  const stories = await prisma.story.findMany({
    orderBy: { createdAt: "desc" },
  })

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="CMS"
        title="Stories"
        description="Editorial content and brand storytelling."
        backHref="/admin/cms"
      />

      <div className="flex justify-end">
        <Link
          href="/admin/cms/stories/new"
          className="inline-flex items-center gap-1.5 h-8 rounded-md px-3 text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> New Story
        </Link>
      </div>

      <div className="rounded-xl border border-slate-200/60 bg-white overflow-hidden">
        {stories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="rounded-full bg-slate-100 p-3 mb-3">
              <BookOpen className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-700">No stories yet</p>
            <p className="text-xs text-slate-500 mt-1">Create your first story to get started.</p>
            <Link
              href="/admin/cms/stories/new"
              className="mt-4 inline-flex items-center gap-1.5 h-8 rounded-md px-3 text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> New Story
            </Link>
          </div>
        ) : (
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
              {stories.map((story) => (
                <tr key={story.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-800">{story.title}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">/{story.slug}</td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                      story.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                    )}>
                      {story.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {story.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/stories/${story.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                        title="Preview"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      <Link
                        href={`/admin/cms/stories/${story.id}`}
                        className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </Link>
                      <form action={deleteStoryAction} className="inline">
                        <input type="hidden" name="id" value={story.id} />
                        <button
                          type="submit"
                          onClick={(e) => { if (!confirm("Delete this story?")) e.preventDefault() }}
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
        )}
      </div>
    </AdminPageShell>
  )
}
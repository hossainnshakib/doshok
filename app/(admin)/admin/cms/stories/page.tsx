import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { requireAdminPagePermission } from "@/lib/auth/admin-page"
import { AdminPageHeader, AdminPageShell } from "@/components/admin/admin-ui"
import { Plus, Edit, Eye, BookOpen } from "lucide-react"
import { cn } from "@/lib/utils"
import { DeleteStoryButton } from "./delete-button"
import { PublishButton, DraftButton } from "./status-toggle"

function readingTime(content: string): string {
  const text = content.replace(/<[^>]*>/g, "")
  const words = text.split(/\s+/).filter(Boolean).length
  const minutes = Math.max(1, Math.ceil(words / 200))
  return `${minutes} min`
}

export default async function AdminStoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ storyCategoryId?: string }>
}) {
  await requireAdminPagePermission("cms")

  const { storyCategoryId: categoryFilter } = await searchParams

  const categories = await prisma.storyCategory.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  })

  const stories = await prisma.story.findMany({
    where: categoryFilter ? { storyCategoryId: categoryFilter } : {},
    include: { storyCategory: true },
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

      <div className="flex items-center justify-between gap-3">
        <form method="GET" className="flex items-center gap-2">
          <select
            name="storyCategoryId"
            defaultValue={categoryFilter ?? ""}
            className="rounded-lg border border-border bg-white px-3 py-2 text-xs h-8 focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          <button type="submit" className="inline-flex items-center h-8 rounded-md px-3 text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors">
            Filter
          </button>
        </form>
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
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Reading Time</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Published Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Tags</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stories.map((story) => (
                <tr key={story.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-800">{story.title}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {story.storyCategory ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-violet-50 text-violet-700">{story.storyCategory.name}</span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                      story.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                    )}>
                      {story.status === "active" ? "Active" : "Draft"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {readingTime(story.content)}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {story.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {story.tags ? (
                      <div className="flex flex-wrap gap-1">
                        {story.tags.split(",").map((tag) => (
                          <span key={tag.trim()} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">{tag.trim()}</span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/stories/${story.slug}?preview=1`}
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
                      {story.status === "draft" && <PublishButton id={story.id} />}
                      {story.status === "active" && <DraftButton id={story.id} />}
                      <DeleteStoryButton id={story.id} />
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

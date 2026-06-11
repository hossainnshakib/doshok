import { AdminPageHeader } from "@/components/admin/admin-ui"

export default function CMStoriesPage() {
  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="CMS"
        title="Stories / About"
        description="Brand storytelling, editorial content, team stories, and brand history management."
        backHref="/admin/cms"
      />
      <div className="rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
          <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-slate-800">Stories module coming soon</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
          Editorial content, brand stories, team features, and About page management will be available here.
        </p>
      </div>
    </div>
  )
}
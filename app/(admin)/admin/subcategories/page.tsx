import Link from "next/link"
import { AdminPageHeader } from "@/components/admin/admin-ui"
import { ArrowRight, FolderTree } from "lucide-react"

export default function SubcategoriesPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader eyebrow="Commerce" title="Subcategories" description="Sub-categories are now managed inside the Categories module." />
      <div className="rounded-[1.5rem] border border-dashed border-black/10 bg-white p-12 text-center">
        <FolderTree className="mx-auto mb-4 h-10 w-10 text-neutral-300" />
        <h2 className="text-lg font-black tracking-[-0.02em]">Subcategories are managed inside Categories</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-neutral-500">
          Create sub-categories by checking &quot;This is a subcategory&quot; in the Categories module and selecting a parent category.
        </p>
        <Link
          href="/admin/categories"
          className="mt-5 inline-flex h-10 items-center justify-center rounded-full bg-neutral-950 px-5 text-sm font-bold text-white hover:bg-black transition-colors"
        >
          Go to Categories <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}

import { AdminEmptyState, AdminPageHeader } from "@/components/admin/admin-ui"
import { Tag } from "lucide-react"

export default function SizeChartsPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader eyebrow="Commerce" title="Size Charts" description="Create and manage size guides for products and categories." />
      <AdminEmptyState
          title="Size charts module"
          description="Size guides and measurement tables for products will be managed here."
        />
    </div>
  )
}
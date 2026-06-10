import { AdminEmptyState, AdminPageHeader } from "@/components/admin/admin-ui"

export default function ReviewsPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader eyebrow="Customers" title="Product Reviews" description="Manage customer reviews and ratings for products." backHref="/admin/customers" />
      <AdminEmptyState
          title="No reviews yet"
          description="Customer reviews and ratings will appear here once available."
        />
    </div>
  )
}
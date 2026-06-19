import { AdminBackLink, AdminPageHeader } from "@/components/admin/admin-ui"
import { ProductForm } from "@/components/admin/product-form"

export default function NewProductPage() {
  return (
    <div className="max-w-6xl space-y-5">
      <AdminPageHeader eyebrow="Commerce" title="New Product" description="Add a catalog item with pricing, variants, and images." />
      <AdminBackLink href="/admin/products" label="Back to Products" />
      <ProductForm mode="create" />
    </div>
  )
}

import { AdminBackLink, AdminPageHeader } from "@/components/admin/admin-ui"
import { ProductForm } from "@/components/admin/product-form"

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  return (
    <div className="max-w-6xl space-y-5">
      <AdminPageHeader eyebrow="Commerce" title="Edit Product" description="Update catalog details, stock variants, and publishing status." />
      <AdminBackLink href="/admin/products" label="Back to Products" />
      <ProductForm mode="edit" productId={id} />
    </div>
  )
}

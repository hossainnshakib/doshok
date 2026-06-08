import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AdminEmptyState, AdminPageHeader, AdminStatusBadge, AdminTableShell } from "@/components/admin/admin-ui"

export default async function AdminProductsPage() {
  const products = await prisma.product.findMany({
    include: { category: true, variants: true },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Commerce"
        title="Products"
        description={`${products.length} product${products.length === 1 ? "" : "s"} in the Doshok catalog.`}
        action={{ label: "Add Product", href: "/admin/products/new" }}
      />

      {products.length === 0 ? (
        <AdminEmptyState title="No products yet" description="Create the first product to start building the storefront catalog." action={{ label: "Add Product", href: "/admin/products/new" }} />
      ) : (
      <AdminTableShell>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Variants</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => {
              const totalStock = product.variants.reduce((s, v) => s + v.stock, 0)
              return (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell className="text-muted-foreground">{product.category.name}</TableCell>
                  <TableCell>৳{product.price.toLocaleString()}</TableCell>
                  <TableCell>
                    <AdminStatusBadge status={product.pageType} />
                  </TableCell>
                  <TableCell>{product.variants.length}</TableCell>
                  <TableCell>{totalStock}</TableCell>
                  <TableCell>
                    <AdminStatusBadge status={product.published} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/admin/products/${product.id}`} className="inline-flex items-center justify-center rounded-xl text-sm font-medium h-8 px-3 hover:bg-muted hover:text-foreground transition-colors">
                      Edit
                    </Link>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </AdminTableShell>
      )}
    </div>
  )
}

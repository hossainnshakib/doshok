import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ExternalLink, ArrowLeft } from "lucide-react"
import { AdminEmptyState, AdminPageHeader, AdminStatusBadge, AdminTableShell } from "@/components/admin/admin-ui"

export default async function AdminLandingPagesPage() {
  const landingProducts = await prisma.product.findMany({
    where: { pageType: "LANDING" },
    include: { category: true, variants: true },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="space-y-6">
      <AdminPageHeader eyebrow="CMS" title="Landing Pages" description={`${landingProducts.length} landing page${landingProducts.length === 1 ? "" : "s"} for campaign traffic.`} action={{ label: "New Landing Page", href: "/admin/products/new" }} />

      <Link href="/admin/cms" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group">
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
        Back to CMS Hub
      </Link>

      {landingProducts.length === 0 ? (
        <AdminEmptyState title="No landing pages yet" description="Create a product with page type set to Landing to use it for ad traffic." action={{ label: "Create Landing Page", href: "/admin/products/new" }} />
      ) : (
        <AdminTableShell>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Headline</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {landingProducts.map((product) => (
              <TableRow key={product.id}>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell className="font-mono text-sm">{product.slug}</TableCell>
                <TableCell className="max-w-[200px] truncate text-muted-foreground">
                  {product.landingHeadline || "-"}
                </TableCell>
                <TableCell>{product.category.name}</TableCell>
                <TableCell>
                  <AdminStatusBadge status={product.status} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Link
                      href={`/l/${product.slug}?preview=1`}
                      target="_blank"
                      className="inline-flex items-center gap-1 rounded-md text-sm font-medium h-7 px-2.5 hover:bg-muted hover:text-foreground"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Preview
                    </Link>
                    <Link href={`/admin/products/${product.id}`} className="inline-flex items-center justify-center rounded-md text-sm font-medium h-7 px-2.5 hover:bg-muted hover:text-foreground">
                      Edit
                    </Link>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </AdminTableShell>
      )}
    </div>
  )
}
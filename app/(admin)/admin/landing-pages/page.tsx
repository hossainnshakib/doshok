import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ExternalLink } from "lucide-react"
import { AdminEmptyState, AdminPageHeader, AdminStatusBadge, AdminTableShell } from "@/components/admin/admin-ui"

export default async function AdminLandingPagesPage() {
  const landingProducts = await prisma.product.findMany({
    where: { pageType: "LANDING" },
    include: { category: true, variants: true },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="space-y-5">
      <AdminPageHeader eyebrow="Commerce" title="Landing Pages" description={`${landingProducts.length} landing page${landingProducts.length === 1 ? "" : "s"} for campaign traffic.`} action={{ label: "New Landing Page", href: "/admin/landing-pages/new" }} backHref="/admin/products" />

      {landingProducts.length === 0 ? (
        <AdminEmptyState title="No landing pages yet" description="Create a focused sales page from an existing product or new landing product/content." action={{ label: "Create Landing Page", href: "/admin/landing-pages/new" }} />
      ) : (
        <AdminTableShell>
        <Table>
          <TableHeader>
            <TableRow className="border-slate-100">
              <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Product</TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Slug</TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Headline</TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Category</TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Status</TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {landingProducts.map((product) => (
              <TableRow key={product.id} className="border-slate-50 hover:bg-slate-50/60">
                <TableCell className="text-xs font-semibold text-slate-800">{product.name}</TableCell>
                <TableCell className="font-mono text-[11px] text-slate-500">/{product.slug}</TableCell>
                <TableCell className="max-w-[160px] truncate text-xs text-slate-500">
                  {product.landingHeadline || "—"}
                </TableCell>
                <TableCell className="text-xs text-slate-500">{product.category.name}</TableCell>
                <TableCell>
                  <AdminStatusBadge status={product.status} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Link
                      href={`/l/${product.slug}?preview=1`}
                      target="_blank"
                      className="inline-flex items-center gap-1 rounded-md text-[11px] font-semibold h-7 px-2.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Preview
                    </Link>
                    <Link href={`/admin/landing-pages/${product.id}`} className="inline-flex items-center justify-center rounded-md text-[11px] font-semibold h-7 px-2.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors">
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

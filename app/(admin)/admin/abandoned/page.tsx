import { prisma } from "@/lib/prisma"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { AdminEmptyState, AdminPageHeader, AdminStatusBadge, AdminTableShell } from "@/components/admin/admin-ui"

export default async function AdminAbandonedPage() {
  const abandoned = await prisma.abandonedCheckout.findMany({
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="space-y-6">
      <AdminPageHeader eyebrow="Sales" title="Abandoned Checkouts" description={`${abandoned.length} checkout lead${abandoned.length === 1 ? "" : "s"} captured before order completion.`} />

      {abandoned.length === 0 ? (
        <AdminEmptyState title="No abandoned checkouts" description="Recovered checkout leads will appear here when customers leave checkout unfinished." />
      ) : (
      <AdminTableShell>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Step</TableHead>
            <TableHead>Coupon</TableHead>
            <TableHead>Est. Value</TableHead>
            <TableHead>Product</TableHead>
            <TableHead>Contacted</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {abandoned.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.name || "-"}</TableCell>
              <TableCell className="font-mono">{item.phone || "-"}</TableCell>
              <TableCell>{item.email || "-"}</TableCell>
              <TableCell>
                <Badge variant="secondary">{item.step}</Badge>
              </TableCell>
              <TableCell className="font-mono text-sm">
                {item.couponCode || "-"}
              </TableCell>
              <TableCell>
                {item.total > 0 ? `৳${item.total.toLocaleString()}` : "-"}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground max-w-[160px] truncate">
                {item.productId ? (
                  <span className="font-mono text-xs">{item.productId.substring(0, 8)}...</span>
                ) : item.landingSlug ? (
                  <span>/{item.landingSlug}</span>
                ) : "-"}
              </TableCell>
              <TableCell>
                <AdminStatusBadge status={item.contacted ? "Contacted" : "Not Contacted"} />
              </TableCell>
              <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                {item.createdAt.toLocaleDateString()}
              </TableCell>
              <TableCell className="text-right">
                <Link
                  href={`/admin/abandoned/${item.id}`}
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium h-7 px-2.5 hover:bg-muted hover:text-foreground"
                >
                  Details
                </Link>
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

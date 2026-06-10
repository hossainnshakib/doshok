import { prisma } from "@/lib/prisma"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
            <TableHead>Customer</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Step</TableHead>
            <TableHead>Coupon</TableHead>
            <TableHead>Est. Value</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Contacted</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {abandoned.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{item.name || "—"}</TableCell>
              <TableCell className="font-mono text-sm">{item.phone || "—"}</TableCell>
              <TableCell className="text-muted-foreground">{item.email || "—"}</TableCell>
              <TableCell>
                <AdminStatusBadge status={item.step} />
              </TableCell>
              <TableCell className="font-mono text-sm">{item.couponCode || "—"}</TableCell>
              <TableCell className="font-medium tabular-nums">
                {item.total > 0 ? `৳${item.total.toLocaleString()}` : "—"}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground max-w-[160px] truncate">
                {item.landingSlug ? (
                  <span className="font-mono">/{item.landingSlug}</span>
                ) : item.productId ? (
                  <span>Product page</span>
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell>
                <AdminStatusBadge status={item.contacted ? "Contacted" : "Pending"} />
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

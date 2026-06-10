import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AdminEmptyState, AdminPageHeader, AdminStatusBadge, AdminTableShell } from "@/components/admin/admin-ui"
import { User, ArrowLeft } from "lucide-react"

export default async function AdminCustomersPage() {
  const customers = await prisma.user.findMany({
    where: { role: "customer" },
    include: {
      _count: { select: { orders: true, addresses: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Customers"
        title="Customer List"
        description={`${customers.length} registered customer${customers.length === 1 ? "" : "s"} in the system.`}
      />

      <Link href="/admin/customers" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group">
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
        Back to Customers Hub
      </Link>

      {customers.length === 0 ? (
        <AdminEmptyState title="No customers yet" description="Registered customers will appear here after they create an account." />
      ) : (
        <AdminTableShell>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="text-center">Orders</TableHead>
                <TableHead className="text-center">Addresses</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100">
                        <User className="h-4 w-4 text-neutral-500" />
                      </div>
                      <span className="font-medium">{customer.name || `${customer.firstName || ""} ${customer.lastName || ""}`.trim() || "—"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{customer.email || "—"}</TableCell>
                  <TableCell className="font-mono text-sm">{customer.phone || "—"}</TableCell>
                  <TableCell className="text-center tabular-nums">{customer._count.orders}</TableCell>
                  <TableCell className="text-center tabular-nums">{customer._count.addresses}</TableCell>
                  <TableCell>
                    <AdminStatusBadge status={customer.status} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {customer.createdAt.toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/admin/customers/${customer.id}`}
                      className="inline-flex h-8 items-center justify-center rounded-md px-2.5 text-xs font-bold hover:bg-muted"
                    >
                      View
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
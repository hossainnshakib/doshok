import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AdminEmptyState, AdminPageHeader, AdminStatusBadge, AdminTableShell } from "@/components/admin/admin-ui"
import { User } from "lucide-react"

export default async function AdminCustomersPage() {
  const customers = await prisma.user.findMany({
    where: { role: "customer" },
    include: {
      _count: { select: { orders: true, addresses: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Customers"
        title="Customer List"
        description={`${customers.length} registered customer${customers.length === 1 ? "" : "s"} in the system.`}
      />

      {customers.length === 0 ? (
        <AdminEmptyState title="No customers yet" description="Registered customers will appear here after they create an account." />
      ) : (
        <AdminTableShell>
          <Table>
            <TableHeader>
              <TableRow className="border-slate-100">
                <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Name</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Email</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Phone</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold text-center">Orders</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold text-center">Addresses</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Status</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Joined</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer) => (
                <TableRow key={customer.id} className="border-slate-50 hover:bg-slate-50/60">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100">
                        <User className="h-3.5 w-3.5 text-slate-400" />
                      </div>
                      <span className="text-xs font-semibold text-slate-800">{customer.name || `${customer.firstName || ""} ${customer.lastName || ""}`.trim() || "—"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">{customer.email || "—"}</TableCell>
                  <TableCell className="font-mono text-[11px] text-slate-600">{customer.phone || "—"}</TableCell>
                  <TableCell className="text-center text-xs tabular-nums font-semibold text-slate-700">{customer._count.orders}</TableCell>
                  <TableCell className="text-center text-xs tabular-nums font-semibold text-slate-700">{customer._count.addresses}</TableCell>
                  <TableCell>
                    <AdminStatusBadge status={customer.status} />
                  </TableCell>
                  <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                    {customer.createdAt.toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/admin/customers/${customer.id}`}
                      className="inline-flex h-7 items-center justify-center rounded-md px-2.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
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
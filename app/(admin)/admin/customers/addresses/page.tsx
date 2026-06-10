import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AdminEmptyState, AdminPageHeader, AdminStatusBadge, AdminTableShell } from "@/components/admin/admin-ui"
import { ArrowLeft } from "lucide-react"

export default async function AdminCustomerAddressesPage() {
  const addresses = await prisma.userAddress.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: true },
  })

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Customers"
        title="Customer Addresses"
        description={`${addresses.length} saved address${addresses.length === 1 ? "" : "es"} in the system.`}
      />

      <Link href="/admin/customers" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group">
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
        Back to Customers Hub
      </Link>

      {addresses.length === 0 ? (
        <AdminEmptyState title="No addresses saved yet" description="Customer delivery addresses will appear here after checkout." />
      ) : (
        <AdminTableShell>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Default</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {addresses.map((addr) => (
                <TableRow key={addr.id}>
                  <TableCell>
                    <div className="text-sm font-medium">{addr.user?.name || addr.user?.email || "—"}</div>
                    <div className="text-xs text-muted-foreground">{addr.user?.phone || "—"}</div>
                  </TableCell>
                  <TableCell>
                    <AdminStatusBadge status={addr.label} />
                  </TableCell>
                  <TableCell className="font-medium">{addr.recipientName}</TableCell>
                  <TableCell className="font-mono text-sm">{addr.phone}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                    {[addr.addressLine1, addr.city, addr.zone].filter(Boolean).join(", ") || "—"}
                  </TableCell>
                  <TableCell>
                    {addr.isDefault && <AdminStatusBadge status="Default" />}
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
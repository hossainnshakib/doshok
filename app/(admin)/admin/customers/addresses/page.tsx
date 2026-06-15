import { prisma } from "@/lib/prisma"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AdminEmptyState, AdminPageHeader, AdminStatusBadge, AdminTableShell } from "@/components/admin/admin-ui"
import { getPhoneDisplayE164 } from "@/lib/utils"

export default async function AdminCustomerAddressesPage() {
  const addresses = await prisma.userAddress.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: true },
  })

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Customers"
        title="Customer Addresses"
        description={`${addresses.length} saved address${addresses.length === 1 ? "" : "es"} in the system.`}
        backHref="/admin/customers/list"
      />

      {addresses.length === 0 ? (
        <AdminEmptyState title="No addresses saved yet" description="Customer delivery addresses will appear here after checkout." />
      ) : (
        <AdminTableShell>
          <Table>
            <TableHeader>
              <TableRow className="border-slate-100">
                <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Customer</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Label</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Recipient</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Phone</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Address</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Default</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {addresses.map((addr) => (
                <TableRow key={addr.id} className="border-slate-50 hover:bg-slate-50/60">
                  <TableCell>
                    <div className="text-xs font-semibold text-slate-800">{addr.user?.name || addr.user?.email || "—"}</div>
                    <div className="text-[10px] text-slate-400">{addr.user?.phone ? getPhoneDisplayE164(addr.user.phone) : "—"}</div>
                  </TableCell>
                  <TableCell>
                    <AdminStatusBadge status={addr.label} />
                  </TableCell>
                  <TableCell className="text-xs font-semibold text-slate-700">{addr.recipientName}</TableCell>
                  <TableCell className="font-mono text-[11px] text-slate-600">{getPhoneDisplayE164(addr.phone)}</TableCell>
                  <TableCell className="text-xs text-slate-500 max-w-[180px] truncate">
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
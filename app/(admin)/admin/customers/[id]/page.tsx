import Link from "next/link"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  AdminEmptyState,
  AdminPageHeader,
  AdminSectionCard,
  AdminStatCard,
  AdminStatusBadge,
  AdminTableShell,
} from "@/components/admin/admin-ui"
import { getPhoneDisplayE164 } from "@/lib/utils"
import { CreditCard, MapPin, Package, ShoppingCart, Truck } from "lucide-react"

export default async function AdminCustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const customer = await prisma.user.findUnique({
    where: { id },
    include: {
      orders: {
        orderBy: { createdAt: "desc" },
      },
      addresses: {
        orderBy: { isDefault: "desc" },
      },
    },
  })

  if (!customer) notFound()

  const recentOrders = customer.orders.slice(0, 10)

  const totalOrders = customer.orders.length
  const activeOrders = customer.orders.filter(
    (o) => !["delivered", "cancelled", "returned", "refunded"].includes(o.orderStatus),
  ).length
  const deliveredOrders = customer.orders.filter(
    (o) => o.orderStatus === "delivered",
  ).length
  const totalSpent = customer.orders
    .filter((o) => o.paymentStatus === "paid")
    .reduce((sum, o) => sum + o.total, 0)

  const displayName =
    customer.name ||
    `${customer.firstName || ""} ${customer.lastName || ""}`.trim() ||
    "—"

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Customers"
        title={displayName}
        description={`Member since ${customer.createdAt.toLocaleDateString()}. View customer profile, order history, and saved addresses.`}
        backHref="/admin/customers/list"
      />

      <AdminSectionCard
        title="Customer Information"
        description="Contact details and account status."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
          <div className="rounded-lg bg-slate-50/60 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Name
            </p>
            <p className="font-semibold text-slate-800">{displayName}</p>
          </div>
          <div className="rounded-lg bg-slate-50/60 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Email
            </p>
            <p className="font-medium text-slate-700">{customer.email || "—"}</p>
            {customer.emailVerified && (
              <p className="text-[10px] text-emerald-600 mt-0.5">Verified</p>
            )}
          </div>
          <div className="rounded-lg bg-slate-50/60 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Phone
            </p>
            <p className="font-mono font-semibold text-slate-800">
              {customer.phone || "—"}
            </p>
          </div>
          <div className="rounded-lg bg-slate-50/60 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Status
            </p>
            <AdminStatusBadge status={customer.status} />
          </div>
          <div className="rounded-lg bg-slate-50/60 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Role
            </p>
            <span className="font-medium text-slate-700 capitalize">
              {customer.role}
            </span>
          </div>
          <div className="rounded-lg bg-slate-50/60 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Joined
            </p>
            <p className="font-medium text-slate-700">
              {customer.createdAt.toLocaleDateString()}
            </p>
          </div>
        </div>
      </AdminSectionCard>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <AdminStatCard label="Total Orders" value={totalOrders} icon={ShoppingCart} />
        <AdminStatCard
          label="Active Orders"
          value={activeOrders}
          icon={Package}
          tone="warning"
        />
        <AdminStatCard
          label="Delivered"
          value={deliveredOrders}
          icon={Truck}
          tone="success"
        />
        <AdminStatCard
          label="Total Spent"
          value={`৳${totalSpent.toLocaleString()}`}
          icon={CreditCard}
        />
        <AdminStatCard
          label="Addresses"
          value={customer.addresses.length}
          icon={MapPin}
        />
      </div>

      <AdminSectionCard
        title="Recent Orders"
        description={`${totalOrders} order${totalOrders === 1 ? "" : "s"} total. Showing last ${Math.min(10, totalOrders)}.`}
      >
        {recentOrders.length === 0 ? (
          <AdminEmptyState
            title="No orders yet"
            description="This customer has not placed any orders."
          />
        ) : (
          <AdminTableShell>
            <Table>
              <TableHeader>
                <TableRow className="border-slate-100">
                  <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                    Order
                  </TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold text-right">
                    Total
                  </TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                    Payment
                  </TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                    Status
                  </TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                    Date
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOrders.map((order) => (
                  <TableRow
                    key={order.id}
                    className="border-slate-50 hover:bg-slate-50/60"
                  >
                    <TableCell className="font-mono text-[11px] font-semibold text-slate-700">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="hover:text-slate-900"
                      >
                        {order.orderNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right text-xs font-semibold tabular-nums text-slate-800">
                      ৳{order.total.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <AdminStatusBadge
                        status={
                          order.paymentStatus === "paid" ? "Paid" : "Pending"
                        }
                        type="payment"
                      />
                    </TableCell>
                    <TableCell>
                      <AdminStatusBadge status={order.orderStatus} type="order" />
                    </TableCell>
                    <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                      {order.createdAt.toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </AdminTableShell>
        )}
      </AdminSectionCard>

      <AdminSectionCard
        title="Saved Addresses"
        description={`${customer.addresses.length} saved address${customer.addresses.length === 1 ? "" : "es"} on file.`}
      >
        {customer.addresses.length === 0 ? (
          <AdminEmptyState
            title="No addresses saved"
            description="This customer has not saved any delivery addresses."
          />
        ) : (
          <AdminTableShell>
            <Table>
              <TableHeader>
                <TableRow className="border-slate-100">
                  <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                    Label
                  </TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                    Recipient
                  </TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                    Phone
                  </TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                    Location
                  </TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                    Address
                  </TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                    Default
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customer.addresses.map((addr) => (
                  <TableRow
                    key={addr.id}
                    className="border-slate-50 hover:bg-slate-50/60"
                  >
                    <TableCell>
                      <AdminStatusBadge status={addr.label} />
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-slate-700">
                      {addr.recipientName}
                    </TableCell>
                    <TableCell className="font-mono text-[11px] text-slate-600">
                      {getPhoneDisplayE164(addr.phone)}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {[addr.divisionName, addr.districtName, addr.upazilaName]
                        .filter(Boolean)
                        .join(", ") ||
                        [addr.city, addr.zone].filter(Boolean).join(", ") ||
                        "—"}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500 max-w-[180px] truncate">
                      {[addr.addressLine1, addr.addressLine2]
                        .filter(Boolean)
                        .join(", ") || "—"}
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
      </AdminSectionCard>
    </div>
  )
}

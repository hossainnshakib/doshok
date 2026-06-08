import Link from "next/link"
import { ShoppingCart, ShoppingBag, TrendingUp } from "lucide-react"
import { AdminHubCard, AdminPageHeader } from "@/components/admin/admin-ui"

const sections = [
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart, desc: "View and manage customer orders, update statuses, and process fulfillments" },
  { href: "/admin/abandoned", label: "Abandoned Checkouts", icon: ShoppingBag, desc: "Track and recover abandoned checkout attempts" },
]

export default function SalesOverviewPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader eyebrow="Sales" title="Sales Hub" description="Monitor orders, fulfillment status, and abandoned checkout recovery." />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {sections.map((section) => (
          <AdminHubCard key={section.href} href={section.href} title={section.label} description={section.desc} icon={section.icon} />
        ))}
      </div>
    </div>
  )
}

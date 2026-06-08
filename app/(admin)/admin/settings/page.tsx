import Link from "next/link"
import { Home, Settings, Wallet, MapPin, SlidersHorizontal } from "lucide-react"
import { AdminHubCard, AdminPageHeader } from "@/components/admin/admin-ui"

const sections = [
  { href: "/admin/homepage", label: "Homepage", icon: Home, desc: "Customize the storefront homepage content and banners" },
  { href: "/admin/site-settings", label: "Site Settings", icon: Settings, desc: "Configure store name, contact info, and global preferences" },
  { href: "/admin/payment-methods", label: "Payment Methods", icon: Wallet, desc: "Manage payment providers and checkout options" },
  { href: "/admin/delivery-zones", label: "Delivery Zones", icon: MapPin, desc: "Set up shipping zones, rates, and delivery areas" },
]

export default function SettingsOverviewPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader eyebrow="Settings" title="Settings Hub" description="Configure storefront content, public contact details, checkout methods, and delivery pricing." />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {sections.map((section) => (
          <AdminHubCard key={section.href} href={section.href} title={section.label} description={section.desc} icon={section.icon} />
        ))}
      </div>
    </div>
  )
}

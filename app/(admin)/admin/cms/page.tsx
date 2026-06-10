import Link from "next/link"
import { Home, FileText, MapPin, Tag, Image } from "lucide-react"
import { AdminHubCard, AdminPageHeader } from "@/components/admin/admin-ui"

const sections = [
  { href: "/admin/homepage", label: "Homepage", icon: Home, desc: "Hero banner, featured products, and storefront copy" },
  { href: "/admin/landing-pages", label: "Landing Pages", icon: FileText, desc: "Campaign landing pages for ad traffic" },
  { href: "/admin/cms/pages", label: "Pages", icon: FileText, desc: "Static pages and policy content overview" },
  { href: "/admin/cms/footer", label: "Footer", icon: MapPin, desc: "Footer content and information blocks" },
  { href: "/admin/cms/menus", label: "Menus", icon: Tag, desc: "Header and footer navigation links" },
  { href: "/admin/cms/banners", label: "Banners", icon: Image, desc: "Announcement bar and promotional banners" },
]

export default function CMSPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader eyebrow="CMS" title="CMS Hub" description="Manage storefront content, static pages, campaigns, and informational blocks." />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map((section) => (
          <AdminHubCard key={section.href} href={section.href} title={section.label} description={section.desc} icon={section.icon} />
        ))}
      </div>
    </div>
  )
}
import Link from "next/link"
import { Eye } from "lucide-react"
import { AdminPageHeader, AdminStatusBadge, AdminTableShell } from "@/components/admin/admin-ui"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const INFO_PAGES = [
  { title: "About", slug: "/about", description: "Brand story, values, and team" },
  { title: "Contact", slug: "/contact", description: "Contact form and support information" },
  { title: "FAQ", slug: "/faq", description: "Common questions about orders, delivery, and returns" },
  { title: "Delivery", slug: "/delivery", description: "Delivery timelines, zones, and tracking" },
  { title: "Shipping", slug: "/shipping", description: "Shipping policy and delivery details" },
  { title: "Return Policy", slug: "/return-policy", description: "Return window, steps, and refund info" },
  { title: "Returns", slug: "/returns", description: "Returns and exchanges guide" },
  { title: "Privacy Policy", slug: "/privacy", description: "How Doshok handles customer data" },
  { title: "Terms", slug: "/terms", description: "Terms and conditions for using Doshok" },
  { title: "Privacy", slug: "/privacy-policy", description: "Privacy notice and data handling" },
  { title: "Cookies", slug: "/cookies", description: "Cookie usage and preferences" },
  { title: "Size Guide", slug: "/size-guide", description: "Size measurements and fit guide" },
  { title: "Care Guide", slug: "/care-guide", description: "Fabric care and maintenance tips" },
  { title: "Accessibility", slug: "/accessibility", description: "Accessibility commitment and features" },
  { title: "Careers", slug: "/careers", description: "Job openings and hiring process" },
  { title: "Gift Cards", slug: "/gift-cards", description: "Gift card options and redemption" },
  { title: "Stories", slug: "/stories", description: "Editorial content and brand stories" },
  { title: "Store Locator", slug: "/store-locator", description: "Physical store locations" },
]

export default function CMSPagesPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader eyebrow="CMS" title="Pages" description="Manage static information pages shown across the storefront." backHref="/admin/cms" />

      <AdminTableShell>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Page</TableHead>
              <TableHead>Path</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {INFO_PAGES.map((page) => (
              <TableRow key={page.slug}>
                <TableCell className="font-medium">{page.title}</TableCell>
                <TableCell className="font-mono text-sm text-muted-foreground">{page.slug}</TableCell>
                <TableCell className="text-muted-foreground">{page.description}</TableCell>
                <TableCell>
                  <AdminStatusBadge status="Active" />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Link
                      href={page.slug}
                      target="_blank"
                      className="inline-flex items-center gap-1 rounded-md text-sm font-medium h-7 px-2.5 hover:bg-muted hover:text-foreground"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View
                    </Link>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </AdminTableShell>
    </div>
  )
}
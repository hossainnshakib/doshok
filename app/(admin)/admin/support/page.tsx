import Link from "next/link"
import { Headphones, MessageSquare, Ticket } from "lucide-react"
import { AdminHubCard, AdminPageHeader } from "@/components/admin/admin-ui"

const sections = [
  { href: "/admin/support/messages", label: "Contact Messages", icon: MessageSquare, desc: "Customer inquiries and contact form submissions", badge: "Active" as const },
  { href: "/admin/support/tickets", label: "Support Tickets", icon: Ticket, desc: "Formal support requests and issue tracking", badge: "Coming later" as const },
]

export default function SupportPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader eyebrow="Support" title="Support Hub" description="Manage customer inquiries, support tickets, and contact messages." />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {sections.map((section) => (
          <AdminHubCard key={section.href} href={section.href} title={section.label} description={section.desc} icon={section.icon} badge={section.badge} />
        ))}
      </div>
    </div>
  )
}
import { AdminEmptyState, AdminPageHeader } from "@/components/admin/admin-ui"

export default function SupportTicketsPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader eyebrow="Support" title="Support Tickets" description="Formal support requests and customer issue tracking." backHref="/admin/support" />
      <AdminEmptyState
          title="No support tickets"
          description="Support tickets and customer issues will appear here when submitted."
        />
    </div>
  )
}
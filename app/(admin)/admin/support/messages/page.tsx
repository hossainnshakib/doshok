import { AdminBackLink, AdminEmptyState, AdminPageHeader } from "@/components/admin/admin-ui"

export default function SupportMessagesPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader eyebrow="Support" title="Contact Messages" description="Customer inquiries submitted through the contact form." />
      <AdminBackLink href="/admin/support" label="Back to Support Hub" />
      <AdminEmptyState
          title="No contact messages yet"
          description="Customer inquiries submitted through the contact form will appear here."
        />
    </div>
  )
}
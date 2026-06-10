import { AdminEmptyState, AdminPageHeader } from "@/components/admin/admin-ui"
import { BriefcaseBusiness } from "lucide-react"

export default function CareersPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader eyebrow="CMS" title="Careers" description="Manage job listings and career page content." />
      <AdminEmptyState
          title="Careers module"
          description="Job listings and career page content management will be available here."
        />
    </div>
  )
}
import Link from "next/link"
import { MapPin } from "lucide-react"
import { AdminPageHeader } from "@/components/admin/admin-ui"

export default function CMSFooterPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader eyebrow="CMS" title="Footer Content" description="Manage footer brand info, contact details, social links, and menu links." backHref="/admin/cms" />

      <div className="rounded-[1.5rem] border border-dashed border-black/10 bg-white p-12 text-center">
        <MapPin className="mx-auto mb-4 h-10 w-10 text-neutral-300" />
        <h2 className="text-lg font-black tracking-[-0.02em]">Footer settings are managed in Site Settings</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-neutral-500">
          Footer brand info, contact details, social links, and footer menu links are configured through the Site Settings panel.
        </p>
        <Link
          href="/admin/site-settings"
          className="mt-5 inline-flex h-10 items-center justify-center rounded-full bg-neutral-950 px-5 text-sm font-bold text-white"
        >
          Go to Site Settings
        </Link>
      </div>
    </div>
  )
}
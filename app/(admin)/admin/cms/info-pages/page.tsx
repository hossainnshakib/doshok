import { prisma } from "@/lib/prisma"
import { requireAdminPagePermission } from "@/lib/auth/admin-page"
import Link from "next/link"
import { AdminPageHeader, AdminPageShell } from "@/components/admin/admin-ui"
import { FileText, ExternalLink } from "lucide-react"

const INFO_PAGES = [
  { slug: "about", label: "About", description: "Brand story, values, and process." },
  { slug: "terms", label: "Terms & Conditions", description: "Site usage, orders, pricing, and legal terms." },
  { slug: "delivery", label: "Delivery Policy", description: "Delivery zones, timelines, fees, and packaging." },
  { slug: "faq", label: "FAQ", description: "Frequently asked questions about orders and support." },
  { slug: "care-guide", label: "Care Guide", description: "Fabric care instructions for wardrobe staples." },
  { slug: "privacy", label: "Privacy Policy", description: "Data collection, usage, and protection." },
  { slug: "returns", label: "Return Policy", description: "Return window, process, and eligibility." },
  { slug: "cookies", label: "Cookie Policy", description: "Cookie usage and management." },
  { slug: "accessibility", label: "Accessibility", description: "Accessibility commitments and improvements." },
  { slug: "size-guide", label: "Size Guide", description: "Measurement guides for tops and bottoms." },
]

export default async function InfoPagesPage() {
  await requireAdminPagePermission("cms")

  const dbPages = await prisma.page.findMany({
    where: { slug: { in: INFO_PAGES.map((p) => p.slug) } },
    select: { slug: true, content: true, updatedAt: true },
  })

  const dbPageMap = new Map(dbPages.map((p) => [p.slug, p]))

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="CMS"
        title="Info Pages"
        description="Manage built-in structured information pages. Changes saved here override the default content."
        backHref="/admin/cms"
      />
      <div className="space-y-2">
        {INFO_PAGES.map(({ slug, label, description }) => {
          const dbPage = dbPageMap.get(slug)
          const hasOverride = dbPage?.content?.trim().startsWith("{")
          return (
            <Link
              key={slug}
              href={`/admin/cms/info-pages/${slug}`}
              className="flex items-center gap-4 rounded-xl border border-slate-200/60 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                <FileText className="h-5 w-5 text-slate-600" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-800">{label}</p>
                  <span className="text-[11px] text-slate-400 font-mono">/{slug}</span>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">{description}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                {hasOverride ? (
                  <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">
                    Customized
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-slate-500">
                    Default
                  </span>
                )}
                <ExternalLink className="h-4 w-4 text-slate-300" />
              </div>
            </Link>
          )
        })}
      </div>
    </AdminPageShell>
  )
}

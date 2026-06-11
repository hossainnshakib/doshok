import { AdminPageHeader } from "@/components/admin/admin-ui"

export default function InventoryStockOverviewPage() {
  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Inventory"
        title="Stock Overview"
        description="View all product stock levels across variants. Manage inventory counts and stock status."
      />
      <div className="rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
          <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M10 11.25h4M10 11.25H3.375M10 11.25H3.375m0 0l-.625 10.632a2.25 2.25 0 01-2.247 2.118H3.375a2.25 2.25 0 01-2.247-2.118L.375 7.5m0 0h10.5" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-slate-800">Inventory module coming soon</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
          Stock overview, variant management, and inventory tracking will be available here.
        </p>
      </div>
    </div>
  )
}